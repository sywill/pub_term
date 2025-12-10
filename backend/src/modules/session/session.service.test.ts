import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from './session.service.js';

// Mock dependencies
vi.mock('../../config/database.js', () => ({
    prisma: {
        session: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        sessionMember: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        inviteToken: {
            create: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock('crypto', () => ({
    randomBytes: vi.fn(() => ({
        toString: () => 'mock-token-123',
    })),
}));

// Import the mocked prisma
import { prisma } from '../../config/database.js';

describe('SessionService', () => {
    let sessionService: SessionService;

    beforeEach(() => {
        sessionService = new SessionService();
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('should create a new session with owner as member', async () => {
            const mockSession = {
                id: 'session-123',
                name: 'Test Session',
                description: 'A test session',
                ownerId: 'user-123',
                owner: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
                members: [{ user: { id: 'user-123', name: 'Test User' }, role: 'OWNER' }],
            };

            vi.mocked(prisma.session.create).mockResolvedValue(mockSession as any);

            const result = await sessionService.create({
                name: 'Test Session',
                description: 'A test session',
                ownerId: 'user-123',
            });

            expect(result).toEqual(mockSession);
            expect(prisma.session.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        name: 'Test Session',
                        description: 'A test session',
                        ownerId: 'user-123',
                        members: {
                            create: {
                                userId: 'user-123',
                                role: 'OWNER',
                            },
                        },
                    }),
                })
            );
        });
    });

    describe('findById', () => {
        it('should find session by id with includes', async () => {
            const mockSession = {
                id: 'session-123',
                name: 'Test Session',
                owner: { id: 'user-123', name: 'Test', email: 'test@test.com' },
                members: [],
                contextFiles: [],
            };

            vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any);

            const result = await sessionService.findById('session-123');

            expect(result).toEqual(mockSession);
            expect(prisma.session.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'session-123' },
                })
            );
        });

        it('should return null for non-existent session', async () => {
            vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

            const result = await sessionService.findById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('getUserRole', () => {
        it('should return user role for session member', async () => {
            vi.mocked(prisma.sessionMember.findUnique).mockResolvedValue({
                role: 'OPERATOR',
            } as any);

            const result = await sessionService.getUserRole('session-123', 'user-123');

            expect(result).toBe('OPERATOR');
        });

        it('should return null for non-member', async () => {
            vi.mocked(prisma.sessionMember.findUnique).mockResolvedValue(null);

            const result = await sessionService.getUserRole('session-123', 'user-456');

            expect(result).toBeNull();
        });
    });

    describe('redeemInvite', () => {
        it('should redeem valid invite and add user as member', async () => {
            const mockInvite = {
                id: 'invite-123',
                token: 'valid-token',
                sessionId: 'session-123',
                role: 'OPERATOR',
                expiresAt: new Date(Date.now() + 86400000), // 1 day from now
                usedAt: null,
            };

            const mockMember = {
                id: 'member-123',
                userId: 'user-123',
                sessionId: 'session-123',
                role: 'OPERATOR',
            };

            vi.mocked(prisma.inviteToken.findUnique).mockResolvedValue(mockInvite as any);
            vi.mocked(prisma.inviteToken.update).mockResolvedValue({} as any);
            vi.mocked(prisma.sessionMember.create).mockResolvedValue(mockMember as any);

            const result = await sessionService.redeemInvite('valid-token', 'user-123');

            expect(result).toEqual(mockMember);
        });

        it('should throw error for invalid token', async () => {
            vi.mocked(prisma.inviteToken.findUnique).mockResolvedValue(null);

            await expect(
                sessionService.redeemInvite('invalid-token', 'user-123')
            ).rejects.toThrow('Invalid invite token');
        });

        it('should throw error for already used invite', async () => {
            vi.mocked(prisma.inviteToken.findUnique).mockResolvedValue({
                token: 'used-token',
                usedAt: new Date(),
                expiresAt: new Date(Date.now() + 86400000),
            } as any);

            await expect(
                sessionService.redeemInvite('used-token', 'user-123')
            ).rejects.toThrow('Invite already used');
        });

        it('should throw error for expired invite', async () => {
            vi.mocked(prisma.inviteToken.findUnique).mockResolvedValue({
                token: 'expired-token',
                usedAt: null,
                expiresAt: new Date(Date.now() - 86400000), // 1 day ago
            } as any);

            await expect(
                sessionService.redeemInvite('expired-token', 'user-123')
            ).rejects.toThrow('Invite expired');
        });
    });

    describe('delete', () => {
        it('should delete session by id', async () => {
            vi.mocked(prisma.session.delete).mockResolvedValue({} as any);

            await sessionService.delete('session-123');

            expect(prisma.session.delete).toHaveBeenCalledWith({
                where: { id: 'session-123' },
            });
        });
    });
});
