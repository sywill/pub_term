import { EventEmitter } from 'events';
import { createRequire } from 'module';
import { env } from '../../config/env.js';

// Create require function for ESM compatibility
const require = createRequire(import.meta.url);

// Define interfaces for PTY
export interface IPty {
    write(data: string): void;
    resize(cols: number, rows: number): void;
    kill(signal?: string): void;
    onData(listener: (data: string) => void): void;
    onExit(listener: (e: { exitCode: number; signal?: number }) => void): void;
}

export interface PtySession {
    id: string;
    pty: IPty;
    outputBuffer: string;
}

// Mock PTY for development when node-pty is not available
class MockPty extends EventEmitter implements IPty {
    private dataListeners: ((data: string) => void)[] = [];
    private exitListeners: ((e: { exitCode: number; signal?: number }) => void)[] = [];

    constructor(command: string, args: string[], options: Record<string, unknown>) {
        super();
        console.log(`[MockPTY] Created mock PTY for: ${command}`);
        // Send initial message after a short delay
        setTimeout(() => {
            this.dataListeners.forEach(listener => {
                listener('\x1b[33m[MockPTY] node-pty is not available on Node ' + process.version + '\r\n');
                listener('This is a mock terminal for development purposes.\r\n');
                listener('Please use Node v20 LTS for full terminal functionality.\x1b[0m\r\n\r\n');
                listener('$ ');
            });
        }, 100);
    }

    write(data: string): void {
        // Echo input and simulate response
        this.dataListeners.forEach(listener => {
            listener(data);
            if (data.includes('\r') || data.includes('\n')) {
                setTimeout(() => listener('\r\n[MockPTY] Command received. Mock terminal active.\r\n$ '), 50);
            }
        });
    }

    resize(cols: number, rows: number): void {
        console.log(`[MockPTY] Resize: ${cols}x${rows}`);
    }

    kill(signal?: string): void {
        console.log(`[MockPTY] Kill: ${signal}`);
        this.exitListeners.forEach(listener => listener({ exitCode: 0 }));
    }

    onData(listener: (data: string) => void): void {
        this.dataListeners.push(listener);
    }

    onExit(listener: (e: { exitCode: number; signal?: number }) => void): void {
        this.exitListeners.push(listener);
    }
}

// Try to load node-pty, fall back to mock
type PtySpawnFn = (file: string, args: string[], options: Record<string, unknown>) => IPty;
let nodePtySpawn: PtySpawnFn | null = null;
let ptyAvailable = false;

// Initialize PTY - this runs at module load time
function initializePty() {
    try {
        const nodePty = require('node-pty');
        nodePtySpawn = nodePty.spawn;
        ptyAvailable = true;
        console.log('[PtyManager] node-pty loaded successfully');
    } catch (error) {
        console.warn('[PtyManager] node-pty not available, using mock PTY');
        console.warn('[PtyManager] For full terminal functionality, use Node v20 LTS');
    }
}

initializePty();

export class PtyManager extends EventEmitter {
    private sessions: Map<string, PtySession> = new Map();
    private readonly MAX_BUFFER_SIZE = 10000;

    /**
     * Check if real PTY is available
     */
    isPtyAvailable(): boolean {
        return ptyAvailable;
    }

    /**
     * Spawn a new Claude CLI session
     */
    spawn(sessionId: string): PtySession {
        if (this.sessions.has(sessionId)) {
            throw new Error('Session already exists');
        }

        let ptyProcess: IPty;
        const shell = env.CLAUDE_CLI_PATH;
        const options = {
            name: 'xterm-256color',
            cols: 120,
            rows: 30,
            cwd: process.cwd(),
            env: process.env as Record<string, string>,
        };

        if (nodePtySpawn && ptyAvailable) {
            // Use real node-pty
            ptyProcess = nodePtySpawn(shell, [], options);
        } else {
            // Use mock PTY
            ptyProcess = new MockPty(shell, [], options);
        }

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
