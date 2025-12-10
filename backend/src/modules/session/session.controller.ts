import { Router, Response } from 'express';
import { z } from 'zod';
import { sessionService } from './session.service.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

const createSessionSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
});

const createInviteSchema = z.object({
    role: z.enum(['VIEWER', 'OPERATOR']),
    expiresInHours: z.number().min(1).max(168).optional(), // max 1 week
});

// POST /sessions - Create new session
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const input = createSessionSchema.parse(req.body);
        const session = await sessionService.create({
            ...input,
            ownerId: req.user!.id,
        });
        res.status(201).json(session);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /sessions - List accessible sessions
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const sessions = await sessionService.findAccessibleSessions(req.user!.id);
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /sessions/:id - Get session details
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const session = await sessionService.findById(req.params.id);

        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        // Check access
        const role = await sessionService.getUserRole(session.id, req.user!.id);
        if (!role && req.user!.role !== 'ADMIN') {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        res.json({ session, userRole: role });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /sessions/:id/invite - Create invite link
router.post('/:id/invite', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const input = createInviteSchema.parse(req.body);

        // Check if user is owner
        const role = await sessionService.getUserRole(req.params.id, req.user!.id);
        if (role !== 'OWNER' && req.user!.role !== 'ADMIN') {
            res.status(403).json({ error: 'Only owners can create invites' });
            return;
        }

        const invite = await sessionService.createInvite({
            sessionId: req.params.id,
            role: input.role,
            expiresInHours: input.expiresInHours,
        });

        res.status(201).json({
            token: invite.token,
            expiresAt: invite.expiresAt,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /sessions/join/:token - Join via invite
router.post('/join/:token', async (req: AuthenticatedRequest, res: Response) => {
    try {
        await sessionService.redeemInvite(req.params.token, req.user!.id);
        res.json({ message: 'Successfully joined session' });
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /sessions/:id - Delete session
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const role = await sessionService.getUserRole(req.params.id, req.user!.id);
        if (role !== 'OWNER' && req.user!.role !== 'ADMIN') {
            res.status(403).json({ error: 'Only owners can delete sessions' });
            return;
        }

        await sessionService.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export const sessionRouter = router;
