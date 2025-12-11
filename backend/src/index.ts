import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.controller.js';
import { sessionRouter } from './modules/session/session.controller.js';
import { setupTerminalGateway } from './modules/terminal/terminal.gateway.js';
import { requestLogger, errorHandler, logger, setupSecurity } from './middleware/index.js';
import { swaggerDocument } from './docs/swagger.js';

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

// Security middleware (helmet + rate limiting)
setupSecurity(app);

// Core middleware
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionRouter);

// Setup WebSocket gateway
setupTerminalGateway(io);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
httpServer.listen(Number(env.PORT), () => {
    logger.info(`🚀 PubTerm server running`, {
        port: env.PORT,
        environment: env.NODE_ENV,
        cors: env.CORS_ORIGIN,
        docs: `http://localhost:${env.PORT}/api/docs`,
    });
});

