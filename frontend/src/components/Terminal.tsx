import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
    socket: Socket | null;
    sessionId: string;
    canWrite: boolean;
}

export function Terminal({ socket, sessionId, canWrite }: TerminalProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    useEffect(() => {
        if (!containerRef.current || !socket) return;

        // Create terminal
        const terminal = new XTerm({
            theme: {
                background: '#0a0a12',
                foreground: '#e4e4ef',
                cursor: '#6366f1',
                cursorAccent: '#0a0a12',
                selectionBackground: '#6366f180',
                black: '#1a1a2e',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#f59e0b',
                blue: '#3b82f6',
                magenta: '#a855f7',
                cyan: '#06b6d4',
                white: '#e4e4ef',
                brightBlack: '#6b6b80',
                brightRed: '#f87171',
                brightGreen: '#4ade80',
                brightYellow: '#fbbf24',
                brightBlue: '#60a5fa',
                brightMagenta: '#c084fc',
                brightCyan: '#22d3ee',
                brightWhite: '#ffffff',
            },
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 14,
            lineHeight: 1.2,
            cursorBlink: true,
            cursorStyle: 'bar',
            scrollback: 10000,
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(containerRef.current);
        fitAddon.fit();

        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;

        // Handle resize
        const handleResize = () => {
            fitAddon.fit();
            socket.emit('session:resize', { cols: terminal.cols, rows: terminal.rows });
        };

        window.addEventListener('resize', handleResize);

        // Handle input (only if user can write)
        if (canWrite) {
            terminal.onData((data) => {
                socket.emit('session:input', data);
            });
        }

        // Socket event handlers
        const handleOutput = (data: string) => {
            terminal.write(data);
        };

        const handleJoined = (info: { sessionId: string; role: string }) => {
            setConnectionStatus('connected');
            terminal.write(`\r\n\x1b[32m✓ Connected as ${info.role}\x1b[0m\r\n\r\n`);
        };

        const handleError = (error: { message: string }) => {
            terminal.write(`\r\n\x1b[31m✗ Error: ${error.message}\x1b[0m\r\n`);
        };

        const handleExit = (info: { exitCode: number }) => {
            terminal.write(`\r\n\x1b[33m⚠ Session ended (exit code: ${info.exitCode})\x1b[0m\r\n`);
            setConnectionStatus('disconnected');
        };

        socket.on('session:output', handleOutput);
        socket.on('session:joined', handleJoined);
        socket.on('error', handleError);
        socket.on('session:exit', handleExit);
        socket.on('disconnect', () => setConnectionStatus('disconnected'));
        socket.on('connect', () => {
            if (sessionId) {
                socket.emit('session:join', sessionId);
            }
        });

        // Join session
        if (socket.connected) {
            socket.emit('session:join', sessionId);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            socket.off('session:output', handleOutput);
            socket.off('session:joined', handleJoined);
            socket.off('error', handleError);
            socket.off('session:exit', handleExit);
            socket.emit('session:leave');
            terminal.dispose();
        };
    }, [socket, sessionId, canWrite]);

    // Re-fit on mount with delay (for container sizing)
    useEffect(() => {
        const timer = setTimeout(() => {
            fitAddonRef.current?.fit();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div style={{ position: 'relative', height: '100%' }}>
            {/* Status indicator */}
            <div style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '1rem',
                background: 'rgba(0, 0, 0, 0.6)',
                fontSize: '0.75rem',
            }}>
                <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: connectionStatus === 'connected' ? '#22c55e' :
                        connectionStatus === 'connecting' ? '#f59e0b' : '#ef4444',
                    animation: connectionStatus === 'connecting' ? 'pulse 1.5s infinite' : 'none',
                }} />
                <span style={{ color: '#9898b0' }}>
                    {connectionStatus === 'connected' ? 'Connected' :
                        connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </span>
                {!canWrite && connectionStatus === 'connected' && (
                    <span style={{ color: '#6b6b80', marginLeft: '0.5rem' }}>(Read-only)</span>
                )}
            </div>

            {/* Terminal container */}
            <div
                ref={containerRef}
                style={{
                    height: '100%',
                    padding: '1rem',
                    background: '#0a0a12',
                    borderRadius: '0.75rem',
                }}
            />
        </div>
    );
}
