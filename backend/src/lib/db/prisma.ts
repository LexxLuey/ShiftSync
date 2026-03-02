import { PrismaClient } from '@prisma/client';
import { createRequire } from 'node:module';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const require = createRequire(import.meta.url);

const createPrismaClient = (): PrismaClient => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error(
            'DATABASE_URL is not configured. Set DATABASE_URL in backend/.env before starting the server.',
        );
    }

    let PrismaPg: new (options: { connectionString: string }) => unknown;
    try {
        ({ PrismaPg } = require('@prisma/adapter-pg') as {
            PrismaPg: new (options: { connectionString: string }) => unknown;
        });
    } catch (error) {
        throw new Error(
            'Missing dependency "@prisma/adapter-pg". Install it with: npm install @prisma/adapter-pg',
        );
    }

    return new PrismaClient({
        adapter: new PrismaPg({ connectionString }) as never,
    });
};

const prismaClient =
    globalForPrisma.prisma ??
    createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaClient;
}

export default prismaClient;
