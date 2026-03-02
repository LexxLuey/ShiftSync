import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import prismaClient from '../../lib/db/prisma.js';
import { AuthError, ConflictError } from '../../lib/errors/customErrors.js';

const SALT_ROUNDS = 10;

const userPublicSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    phone: true,
    createdAt: true,
    updatedAt: true,
} as const;

const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }

    return secret;
};

const getJwtExpiresIn = (): Exclude<jwt.SignOptions['expiresIn'], undefined> =>
    (process.env.JWT_EXPIRES_IN as Exclude<jwt.SignOptions['expiresIn'], undefined>) || '1d';

export const signJwt = (payload: { sub: string; role: Role }): string =>
    jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() });

export const verifyJwt = (token: string): { sub: string; role: Role } => {
    try {
        return jwt.verify(token, getJwtSecret()) as { sub: string; role: Role };
    } catch (error) {
        throw new AuthError('Invalid or expired token', null, ['Login again to continue.']);
    }
};

export const registerUser = async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
    phone?: string | undefined;
}): Promise<{ token: string; user: Record<string, unknown> }> => {
    const existingUser = await prismaClient.user.findUnique({
        where: { email: payload.email },
        select: { id: true },
    });

    if (existingUser) {
        throw new ConflictError('Email is already registered', { email: payload.email }, [
            'Use a different email address.',
            'Try logging in instead.',
        ]);
    }

    const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

    const createdUser = await prismaClient.user.create({
        data: {
            email: payload.email,
            password: passwordHash,
            firstName: payload.firstName,
            lastName: payload.lastName,
            role: payload.role,
            phone: payload.phone ?? null,
        },
        select: userPublicSelect,
    });

    const token = signJwt({
        sub: createdUser.id,
        role: createdUser.role,
    });

    return {
        token,
        user: createdUser as unknown as Record<string, unknown>,
    };
};

export const loginUser = async (payload: {
    email: string;
    password: string;
}): Promise<{ token: string; user: Record<string, unknown> }> => {
    const user = await prismaClient.user.findUnique({
        where: { email: payload.email },
        select: {
            id: true,
            email: true,
            password: true,
            firstName: true,
            lastName: true,
            role: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!user) {
        throw new AuthError('Invalid email or password', null, ['Check your credentials and retry.']);
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.password);
    if (!passwordMatches) {
        throw new AuthError('Invalid email or password', null, ['Check your credentials and retry.']);
    }

    const token = signJwt({
        sub: user.id,
        role: user.role,
    });

    const { password, ...safeUser } = user;
    return {
        token,
        user: safeUser as unknown as Record<string, unknown>,
    };
};
