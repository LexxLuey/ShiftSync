import { Router } from 'express';
import { authenticate, restrictTo } from '../auth/middleware.js';
import { deleteSkillHandler, getSkills, patchSkill, postSkill } from './controller.js';

const skillsRouter = Router();

skillsRouter.use(authenticate);

skillsRouter.get('/', getSkills);
skillsRouter.post('/', restrictTo('ADMIN','MANAGER'), postSkill);
skillsRouter.patch('/:id', restrictTo('ADMIN', 'MANAGER'), patchSkill);
skillsRouter.delete('/:id', restrictTo('ADMIN', 'MANAGER'), deleteSkillHandler);

export default skillsRouter;
