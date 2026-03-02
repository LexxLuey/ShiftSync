import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../errors/customErrors.js';

const roleEnum = z.enum(['ADMIN', 'MANAGER', 'STAFF']);

const isValidIanaTimezone = (timezone: string): boolean => {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
    } catch (error) {
        return false;
    }
};

export const uuidParamSchema = z.object({
    id: z.uuid(),
});

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    role: roleEnum.optional(),
    locationId: z.uuid().optional(),
});

export const registerSchema = z.object({
    email: z.email().transform((value) => value.trim().toLowerCase()),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: roleEnum,
    phone: z.string().min(3).optional(),
});

export const loginSchema = z.object({
    email: z.email().transform((value) => value.trim().toLowerCase()),
    password: z.string().min(8),
});

export const updateUserSchema = z
    .object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().min(3).nullable().optional(),
        role: roleEnum.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one field is required',
    });

export const addCertificationSchema = z.object({
    locationId: z.uuid(),
});

export const createLocationSchema = z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    timezone: z.string().min(1).refine(isValidIanaTimezone, {
        message: 'Invalid IANA timezone',
    }),
});

export const updateLocationSchema = z
    .object({
        name: z.string().min(1).optional(),
        address: z.string().min(1).optional(),
        timezone: z.string().min(1).refine(isValidIanaTimezone, {
            message: 'Invalid IANA timezone',
        }).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one field is required',
    });

export const assignManagerSchema = z.object({
    userId: z.uuid(),
});

export const validateSchema = <T extends z.ZodTypeAny>(
    schema: T,
    payload: unknown,
): z.output<T> => {
    const result = schema.safeParse(payload);
    if (!result.success) {
        throw new ValidationError('Invalid request payload', result.error.flatten(), [
            'Fix the invalid fields and try again.',
        ]);
    }

    return result.data;
};

export const validateRequest =
    <T extends z.ZodTypeAny>(schema: T, source: 'body' | 'params' | 'query') =>
        (request: Request, response: Response, next: NextFunction): void => {
            try {
                const parsed = validateSchema(schema, request[source]);
                (request as Request & Record<string, unknown>)[source] = parsed;
                next();
            } catch (error) {
                next(error);
            }
        };
