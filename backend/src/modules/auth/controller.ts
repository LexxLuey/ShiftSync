import type { NextFunction, Request, Response } from 'express';
import { validateSchema, loginSchema, registerSchema } from '../../lib/validation/index.js';
import { loginUser, registerUser } from './service.js';

export const register = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const payload = validateSchema(registerSchema, request.body);
        const result = await registerUser(payload);

        response.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

export const login = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const payload = validateSchema(loginSchema, request.body);
        const result = await loginUser(payload);

        response.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
