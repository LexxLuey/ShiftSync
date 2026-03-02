import { Router } from 'express';
import { authenticate, restrictTo } from '../auth/middleware.js';
import {
    assignLocationManager,
    createLocationRecord,
    getLocations,
    removeLocationManager,
    updateLocationRecord,
} from './controller.js';

const locationsRouter = Router();

locationsRouter.use(authenticate);

locationsRouter.get('/', getLocations);
locationsRouter.post('/', restrictTo('ADMIN'), createLocationRecord);
locationsRouter.put('/:id', restrictTo('ADMIN'), updateLocationRecord);
locationsRouter.post('/:id/managers', restrictTo('ADMIN'), assignLocationManager);
locationsRouter.delete('/:id/managers/:userId', restrictTo('ADMIN'), removeLocationManager);

export default locationsRouter;
