import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';

const router = Router();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
    try {
        const input = registerSchema.parse(req.body);
        const result = await authService.register(input);
        res.status(201).json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const input = loginSchema.parse(req.body);
        const result = await authService.login(input);
        res.json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
            return;
        }
        if (error instanceof Error) {
            res.status(401).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /auth/refresh
router.post('/refresh', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        const token = await authService.refreshToken(req.user.id);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user });
});

export const authRouter = router;
