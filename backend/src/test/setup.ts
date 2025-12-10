/**
 * Test setup file - runs before all tests
 */
import { beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Create a test prisma client
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file::memory:?cache=shared',
        },
    },
});

beforeAll(async () => {
    // Push the schema to the in-memory database
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS User (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'VIEWER',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS Session (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            ownerId TEXT NOT NULL,
            outputBuffer TEXT DEFAULT '',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ownerId) REFERENCES User(id)
        )
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS SessionMember (
            id TEXT PRIMARY KEY,
            role TEXT NOT NULL DEFAULT 'VIEWER',
            userId TEXT NOT NULL,
            sessionId TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
            FOREIGN KEY (sessionId) REFERENCES Session(id) ON DELETE CASCADE,
            UNIQUE(userId, sessionId)
        )
    `);
});

afterEach(async () => {
    // Clean up data after each test
    await prisma.$executeRawUnsafe('DELETE FROM SessionMember');
    await prisma.$executeRawUnsafe('DELETE FROM Session');
    await prisma.$executeRawUnsafe('DELETE FROM User');
});

afterAll(async () => {
    await prisma.$disconnect();
});

export { prisma };
