import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import type { JwtPayload } from '../../middleware/auth.middleware.js';

const SALT_ROUNDS = 12;

export interface RegisterInput {
    email: string;
    password: string;
    name: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
    token: string;
}

export class AuthService {
    async register(input: RegisterInput): Promise<AuthResponse> {
        const existingUser = await prisma.user.findUnique({
            where: { email: input.email },
        });

        if (existingUser) {
            throw new Error('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

        const user = await prisma.user.create({
            data: {
                email: input.email,
                password: hashedPassword,
                name: input.name,
            },
            select: { id: true, email: true, name: true, role: true },
        });

        const token = this.generateToken(user.id, user.email);

        return { user, token };
    }

    async login(input: LoginInput): Promise<AuthResponse> {
        const user = await prisma.user.findUnique({
            where: { email: input.email },
        });

        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isValidPassword = await bcrypt.compare(input.password, user.password);

        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken(user.id, user.email);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            token,
        };
    }

    async refreshToken(userId: string): Promise<string> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true },
        });

        if (!user) {
            throw new Error('User not found');
        }

        return this.generateToken(user.id, user.email);
    }

    private generateToken(userId: string, email: string): string {
        const payload: JwtPayload = { userId, email };
        return jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
        });
    }
}

export const authService = new AuthService();
