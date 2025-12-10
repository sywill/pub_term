import { prisma } from '../../config/database.js';
import type { SessionRole, SessionStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface CreateSessionInput {
    name: string;
    description?: string;
    ownerId: string;
}

export interface InviteInput {
    sessionId: string;
    role: SessionRole;
    expiresInHours?: number;
}

export class SessionService {
    async create(input: CreateSessionInput) {
        const session = await prisma.session.create({
            data: {
                name: input.name,
                description: input.description,
                ownerId: input.ownerId,
                members: {
                    create: {
                        userId: input.ownerId,
                        role: 'OWNER',
                    },
                },
            },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                members: { include: { user: { select: { id: true, name: true } } } },
            },
        });

        return session;
    }

    async findById(sessionId: string) {
        return prisma.session.findUnique({
            where: { id: sessionId },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                members: { include: { user: { select: { id: true, name: true } } } },
                contextFiles: { select: { id: true, filename: true, mimeType: true, createdAt: true } },
            },
        });
    }

    async findAccessibleSessions(userId: string) {
        return prisma.session.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            include: {
                owner: { select: { id: true, name: true } },
                _count: { select: { members: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getUserRole(sessionId: string, userId: string): Promise<SessionRole | null> {
        const member = await prisma.sessionMember.findUnique({
            where: { userId_sessionId: { userId, sessionId } },
        });
        return member?.role ?? null;
    }

    async updateStatus(sessionId: string, status: SessionStatus) {
        return prisma.session.update({
            where: { id: sessionId },
            data: { status },
        });
    }

    async updateOutputBuffer(sessionId: string, output: string) {
        // Keep only last 10000 chars
        const truncated = output.slice(-10000);
        return prisma.session.update({
            where: { id: sessionId },
            data: { outputBuffer: truncated },
        });
    }

    async createInvite(input: InviteInput) {
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (input.expiresInHours ?? 24));

        return prisma.inviteToken.create({
            data: {
                token,
                sessionId: input.sessionId,
                role: input.role,
                expiresAt,
            },
        });
    }

    async redeemInvite(token: string, userId: string) {
        const invite = await prisma.inviteToken.findUnique({
            where: { token },
        });

        if (!invite) {
            throw new Error('Invalid invite token');
        }

        if (invite.usedAt) {
            throw new Error('Invite already used');
        }

        if (invite.expiresAt < new Date()) {
            throw new Error('Invite expired');
        }

        // Mark invite as used
        await prisma.inviteToken.update({
            where: { id: invite.id },
            data: { usedAt: new Date() },
        });

        // Add user as member
        return prisma.sessionMember.create({
            data: {
                userId,
                sessionId: invite.sessionId,
                role: invite.role,
            },
        });
    }

    async delete(sessionId: string) {
        return prisma.session.delete({
            where: { id: sessionId },
        });
    }
}

export const sessionService = new SessionService();
