import { Router } from 'express';
import { authenticate, restrictTo } from '../auth/middleware.js';
import {
  getFairnessHandler,
  getHoursDistributionHandler,
  getProjectionHandler,
  postWhatIfHandler,
} from './controller.js';

const reportsRouter = Router();

/**
 * GET /reports/fairness
 * Get fairness report for staff in a location over a date range
 * Requires: ADMIN or MANAGER role
 */
reportsRouter.get(
  '/fairness',
  authenticate,
  restrictTo('ADMIN', 'MANAGER'),
  getFairnessHandler
);

/**
 * GET /reports/hours-distribution
 * Get weekly hours distribution by staff member
 * Requires: ADMIN or MANAGER role
 */
reportsRouter.get(
  '/hours-distribution',
  authenticate,
  restrictTo('ADMIN', 'MANAGER'),
  getHoursDistributionHandler
);

/**
 * GET /shifts/:shiftId/projection
 * Get projection of hours if user were assigned to shift
 * Requires: ADMIN or MANAGER role
 * Query: proposedUserId (required)
 */
reportsRouter.get(
  '/projection',
  authenticate,
  restrictTo('ADMIN', 'MANAGER'),
  getProjectionHandler
);

/**
 * POST /reports/what-if
 * Simulate multiple assignments without writing to DB
 * Requires: ADMIN or MANAGER role
 * Body: { shifts: [{ shiftId, userId }, ...] }
 */
reportsRouter.post(
  '/what-if',
  authenticate,
  restrictTo('ADMIN', 'MANAGER'),
  postWhatIfHandler
);

export default reportsRouter;
