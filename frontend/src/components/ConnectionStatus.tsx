import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
    socket: Socket | null;
}

export function ConnectionStatus({ socket }: ConnectionStatusProps) {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    useEffect(() => {
        if (!socket) {
            setStatus('disconnected');
            return;
        }

        const handleConnect = () => setStatus('connected');
        const handleDisconnect = () => setStatus('disconnected');
        const handleConnectError = () => setStatus('disconnected');

        // Check initial state
        if (socket.connected) {
            setStatus('connected');
        }

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
        };
    }, [socket]);

    const statusConfig = {
        connecting: { color: 'var(--yellow)', label: 'Connecting...' },
        connected: { color: 'var(--green)', label: 'Connected' },
        disconnected: { color: 'var(--red)', label: 'Disconnected' },
    };

    const { color, label } = statusConfig[status];

    return (
        <div className="connection-status" title={`WebSocket: ${label}`}>
            <span className="status-dot" style={{ backgroundColor: color }} />
            <span className="status-label">{label}</span>
        </div>
    );
}
