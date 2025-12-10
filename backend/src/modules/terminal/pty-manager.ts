import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { env } from '../../config/env.js';

export interface PtySession {
    id: string;
    pty: pty.IPty;
    outputBuffer: string;
}

export class PtyManager extends EventEmitter {
    private sessions: Map<string, PtySession> = new Map();
    private readonly MAX_BUFFER_SIZE = 10000;

    /**
     * Spawn a new Claude CLI session
     */
    spawn(sessionId: string): PtySession {
        if (this.sessions.has(sessionId)) {
            throw new Error('Session already exists');
        }

        // Spawn Claude CLI in a pseudo-terminal
        const shell = env.CLAUDE_CLI_PATH;
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 120,
            rows: 30,
            cwd: process.cwd(),
            env: process.env as Record<string, string>,
        });

        const session: PtySession = {
            id: sessionId,
            pty: ptyProcess,
            outputBuffer: '',
        };

        // Handle output
        ptyProcess.onData((data) => {
            // Append to buffer, keep under max size
            session.outputBuffer += data;
            if (session.outputBuffer.length > this.MAX_BUFFER_SIZE) {
                session.outputBuffer = session.outputBuffer.slice(-this.MAX_BUFFER_SIZE);
            }

            // Emit output event
            this.emit('output', sessionId, data);
        });

        // Handle exit
        ptyProcess.onExit(({ exitCode, signal }) => {
            this.emit('exit', sessionId, exitCode, signal);
            this.sessions.delete(sessionId);
        });

        this.sessions.set(sessionId, session);
        return session;
    }

    /**
     * Send input to a session
     */
    write(sessionId: string, data: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        session.pty.write(data);
    }

    /**
     * Resize terminal
     */
    resize(sessionId: string, cols: number, rows: number): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        session.pty.resize(cols, rows);
    }

    /**
     * Get buffered output for late joiners
     */
    getBuffer(sessionId: string): string {
        const session = this.sessions.get(sessionId);
        return session?.outputBuffer ?? '';
    }

    /**
     * Kill a session
     */
    kill(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.pty.kill();
            this.sessions.delete(sessionId);
        }
    }

    /**
     * Check if session exists
     */
    exists(sessionId: string): boolean {
        return this.sessions.has(sessionId);
    }

    /**
     * Get all active session IDs
     */
    getActiveSessionIds(): string[] {
        return Array.from(this.sessions.keys());
    }
}

export const ptyManager = new PtyManager();
