import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.controller.js';
import { sessionRouter } from './modules/session/session.controller.js';
import { setupTerminalGateway } from './modules/terminal/terminal.gateway.js';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
    cors: {
        origin: env.CORS_ORIGIN,
        credentials: true,
    },
});

// Middleware
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionRouter);

// Setup WebSocket gateway
setupTerminalGateway(io);

// Start server
httpServer.listen(Number(env.PORT), () => {
    console.log(`🚀 PubTerm server running on port ${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   CORS origin: ${env.CORS_ORIGIN}`);
});
