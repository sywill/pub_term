import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service.js';

// Mock dependencies
vi.mock('../../config/database.js', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
    },
}));

vi.mock('../../config/env.js', () => ({
    env: {
        JWT_SECRET: 'test-secret-key',
        JWT_EXPIRES_IN: '1h',
    },
}));

// Import the mocked prisma
import { prisma } from '../../config/database.js';

describe('AuthService', () => {
    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService();
        vi.clearAllMocks();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                role: 'VIEWER',
            };

            vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.user.create).mockResolvedValue(mockUser as any);

            const result = await authService.register({
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            });

            expect(result.user).toEqual(mockUser);
            expect(result.token).toBeDefined();
            expect(typeof result.token).toBe('string');
        });

        it('should throw error if email already exists', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'existing-user',
                email: 'test@example.com',
                password: 'hashed',
                name: 'Existing',
                role: 'VIEWER',
            } as any);

            await expect(
                authService.register({
                    email: 'test@example.com',
                    password: 'password123',
                    name: 'Test User',
                })
            ).rejects.toThrow('Email already registered');
        });

        it('should hash the password before storing', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                role: 'VIEWER',
            };

            vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.user.create).mockResolvedValue(mockUser as any);

            await authService.register({
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
            });

            // Verify create was called with hashed password (not plain text)
            expect(prisma.user.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        email: 'test@example.com',
                        name: 'Test User',
                        password: expect.not.stringMatching(/^password123$/),
                    }),
                })
            );
        });
    });

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            const hashedPassword = await bcrypt.hash('password123', 12);
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword,
                role: 'VIEWER',
            };

            vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

            const result = await authService.login({
                email: 'test@example.com',
                password: 'password123',
            });

            expect(result.user.id).toBe('user-123');
            expect(result.user.email).toBe('test@example.com');
            expect(result.token).toBeDefined();
        });

        it('should throw error with invalid email', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

            await expect(
                authService.login({
                    email: 'nonexistent@example.com',
                    password: 'password123',
                })
            ).rejects.toThrow('Invalid credentials');
        });

        it('should throw error with invalid password', async () => {
            const hashedPassword = await bcrypt.hash('correctpassword', 12);
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword,
                role: 'VIEWER',
            } as any);

            await expect(
                authService.login({
                    email: 'test@example.com',
                    password: 'wrongpassword',
                })
            ).rejects.toThrow('Invalid credentials');
        });
    });

    describe('refreshToken', () => {
        it('should refresh token for valid user', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'user-123',
                email: 'test@example.com',
            } as any);

            const token = await authService.refreshToken('user-123');

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            // Verify the token is valid
            const decoded = jwt.verify(token, 'test-secret-key') as any;
            expect(decoded.userId).toBe('user-123');
            expect(decoded.email).toBe('test@example.com');
        });

        it('should throw error for non-existent user', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

            await expect(authService.refreshToken('nonexistent')).rejects.toThrow(
                'User not found'
            );
        });
    });
});
