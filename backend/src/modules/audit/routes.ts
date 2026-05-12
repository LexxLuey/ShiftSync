import { Router } from 'express';
import { authenticate, restrictTo } from '../auth/middleware.js';
import { exportAuditLogsHandler, getAuditLogsHandler } from './controller.js';

const auditRouter = Router();

auditRouter.use(authenticate);
auditRouter.use(restrictTo('ADMIN', 'MANAGER'));

auditRouter.get('/', getAuditLogsHandler);
auditRouter.get('/export', exportAuditLogsHandler);

export default auditRouter;
