import { Router } from 'express';
// Import all module routers (empty for now, but structure is ready)
import authRouter from './modules/auth/routes.js';
import usersRouter from './modules/users/routes.js';
import locationsRouter from './modules/locations/routes.js';
import shiftsRouter from './modules/shifts/routes.js';
import swapsRouter from './modules/swaps/routes.js';
import availabilityRouter from './modules/availability/routes.js';
import assignmentsRouter from './modules/assignments/routes.js';
import reportsRouter from './modules/reports/routes.js';
// If audit has routes, import here (middleware is not a router)

const mainRouter = Router();

mainRouter.use('/auth', authRouter);
mainRouter.use('/users', usersRouter);
mainRouter.use('/users', availabilityRouter);
mainRouter.use('/locations', locationsRouter);
mainRouter.use('/locations', shiftsRouter);
mainRouter.use('/shifts', shiftsRouter);
mainRouter.use('/shifts', assignmentsRouter);
mainRouter.use('/assignments', assignmentsRouter);
mainRouter.use('/shifts', swapsRouter);
mainRouter.use('/swap-requests', swapsRouter);
mainRouter.use('/reports', reportsRouter);
mainRouter.use('/shifts', reportsRouter);
// Add more as needed

export default mainRouter;
