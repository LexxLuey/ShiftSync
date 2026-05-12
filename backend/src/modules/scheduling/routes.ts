import { Router } from 'express';
import { authenticate, restrictTo } from '../auth/middleware.js';
import { postGenerateSchedule } from './controller.js';

const schedulingRouter = Router();

schedulingRouter.use(authenticate);
schedulingRouter.use(restrictTo('ADMIN', 'MANAGER'));

schedulingRouter.post('/generate', postGenerateSchedule);

export default schedulingRouter;
