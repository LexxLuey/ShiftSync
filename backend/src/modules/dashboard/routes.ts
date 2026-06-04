import { Router } from 'express';
import { authenticate, restrictTo } from '../auth/middleware.js';
import { getSummary } from './controller.js';

const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get('/summary', restrictTo('ADMIN', 'MANAGER', 'STAFF'), getSummary);

export default dashboardRouter;
