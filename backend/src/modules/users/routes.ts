import { Router } from 'express';
import { authenticate, restrictTo } from '../auth/middleware.js';
import {
    createCertification,
    getUser,
    getUsers,
    removeCertification,
    updateUserProfile,
} from './controller.js';

const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get('/', restrictTo('ADMIN'), getUsers);
usersRouter.get('/:id', getUser);
usersRouter.put('/:id', updateUserProfile);
usersRouter.post('/:id/certifications', restrictTo('ADMIN', 'MANAGER'), createCertification);
usersRouter.delete(
    '/:id/certifications/:locationId',
    restrictTo('ADMIN', 'MANAGER'),
    removeCertification,
);

export default usersRouter;
