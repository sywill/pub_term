import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { sessionService } from '../session/session.service.js';
import { ptyManager } from './pty-manager.js';
import type { JwtPayload } from '../../middleware/auth.middleware.js';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    sessionId?: string;
    sessionRole?: string;
}

export function setupTerminalGateway(io: Server) {
    // Authentication middleware
    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
            });

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.userId = user.id;
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
        console.log(`User ${socket.userId} connected`);

        // Join a terminal session
        socket.on('session:join', async (sessionId: string) => {
            try {
                // Check access
                const role = await sessionService.getUserRole(sessionId, socket.userId!);
                if (!role) {
                    socket.emit('error', { message: 'Access denied' });
                    return;
                }

                socket.sessionId = sessionId;
                socket.sessionRole = role;
                socket.join(`session:${sessionId}`);

                // Send buffered output to late joiner
                const buffer = ptyManager.getBuffer(sessionId);
                if (buffer) {
                    socket.emit('session:output', buffer);
                }

                // If no PTY exists for this session, spawn one
                if (!ptyManager.exists(sessionId)) {
                    ptyManager.spawn(sessionId);
                }

                socket.emit('session:joined', { sessionId, role });
                console.log(`User ${socket.userId} joined session ${sessionId} as ${role}`);
            } catch (error) {
                socket.emit('error', { message: 'Failed to join session' });
            }
        });

        // Send input to terminal (operators/owners only)
        socket.on('session:input', (data: string) => {
            if (!socket.sessionId) {
                socket.emit('error', { message: 'Not in a session' });
                return;
            }

            if (socket.sessionRole === 'VIEWER') {
                socket.emit('error', { message: 'Viewers cannot send input' });
                return;
            }

            try {
                ptyManager.write(socket.sessionId, data);
            } catch (error) {
                socket.emit('error', { message: 'Failed to send input' });
            }
        });

        // Resize terminal
        socket.on('session:resize', ({ cols, rows }: { cols: number; rows: number }) => {
            if (!socket.sessionId) return;

            try {
                ptyManager.resize(socket.sessionId, cols, rows);
            } catch (error) {
                // Ignore resize errors
            }
        });

        // Leave session
        socket.on('session:leave', () => {
            if (socket.sessionId) {
                socket.leave(`session:${socket.sessionId}`);
                socket.sessionId = undefined;
                socket.sessionRole = undefined;
            }
        });

        socket.on('disconnect', () => {
            console.log(`User ${socket.userId} disconnected`);
        });
    });

    // Forward PTY output to connected clients
    ptyManager.on('output', (sessionId: string, data: string) => {
        io.to(`session:${sessionId}`).emit('session:output', data);

        // Persist to database periodically (debounced in production)
        sessionService.updateOutputBuffer(sessionId, ptyManager.getBuffer(sessionId)).catch(() => { });
    });

    ptyManager.on('exit', (sessionId: string, exitCode: number) => {
        io.to(`session:${sessionId}`).emit('session:exit', { exitCode });
        sessionService.updateStatus(sessionId, 'TERMINATED').catch(() => { });
    });
}
