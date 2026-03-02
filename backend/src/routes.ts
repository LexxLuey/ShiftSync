import { Router } from 'express';
// Import all module routers (empty for now, but structure is ready)
import authRouter from './modules/auth/routes.js';
import usersRouter from './modules/users/routes.js';
import locationsRouter from './modules/locations/routes.js';
import shiftsRouter from './modules/shifts/routes.js';
import swapsRouter from './modules/swaps/routes.js';
// If audit has routes, import here (middleware is not a router)

const mainRouter = Router();

mainRouter.use('/auth', authRouter);
mainRouter.use('/users', usersRouter);
mainRouter.use('/locations', locationsRouter);
mainRouter.use('/shifts', shiftsRouter);
mainRouter.use('/swaps', swapsRouter);
// Add more as needed

export default mainRouter;
