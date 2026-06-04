import { Router } from 'express';
// Import all module routers (empty for now, but structure is ready)
import authRouter from './modules/auth/routes.js';
import usersRouter from './modules/users/routes.js';
import locationsRouter from './modules/locations/routes.js';
import shiftsRouter from './modules/shifts/routes.js';
import { shiftSwapsRouter, swapRequestsRouter } from './modules/swaps/routes.js';
import availabilityRouter from './modules/availability/routes.js';
import assignmentsRouter from './modules/assignments/routes.js';
import reportsRouter from './modules/reports/routes.js';
import notificationsRouter from './modules/notifications/routes.js';
import auditRouter from './modules/audit/routes.js';
import eventTemplatesRouter from './modules/event-templates/routes.js';
import schedulingRouter from './modules/scheduling/routes.js';
import skillsRouter from './modules/skills/routes.js';
import calendarRouter from './modules/calendar/routes.js';
import dashboardRouter from './modules/dashboard/routes.js';

const mainRouter = Router();

mainRouter.use('/auth', authRouter);
mainRouter.use('/users', usersRouter);
mainRouter.use('/users', availabilityRouter);
mainRouter.use('/locations', locationsRouter);
mainRouter.use('/locations', shiftsRouter);
mainRouter.use('/shifts', shiftsRouter);
mainRouter.use('/shifts', assignmentsRouter);
mainRouter.use('/assignments', assignmentsRouter);
mainRouter.use('/shifts', shiftSwapsRouter);
mainRouter.use('/swap-requests', swapRequestsRouter);
mainRouter.use('/reports', reportsRouter);
mainRouter.use('/shifts', reportsRouter);
mainRouter.use('/notifications', notificationsRouter);
mainRouter.use('/audit-logs', auditRouter);
mainRouter.use('/event-templates', eventTemplatesRouter);
mainRouter.use('/schedules', schedulingRouter);
mainRouter.use('/skills', skillsRouter);
mainRouter.use('/calendar', calendarRouter);
mainRouter.use('/dashboard', dashboardRouter);
// Add more as needed

export default mainRouter;
