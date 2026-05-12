import { Router } from 'express';
import { authenticate } from '../auth/middleware.js';
import { getSkills } from './controller.js';

const skillsRouter = Router();

skillsRouter.use(authenticate);

skillsRouter.get('/', getSkills);

export default skillsRouter;
