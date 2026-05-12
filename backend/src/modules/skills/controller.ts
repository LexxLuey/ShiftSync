import type { NextFunction, Request, Response } from 'express';
import { listSkills } from './service.js';

export const getSkills = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const skills = await listSkills();
    response.status(200).json({ data: skills, count: skills.length });
  } catch (error) {
    next(error);
  }
};
