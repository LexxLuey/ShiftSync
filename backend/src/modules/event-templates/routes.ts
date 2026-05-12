import { Router } from 'express';
import { authenticate, restrictTo } from '../auth/middleware.js';
import {
  deleteEventTemplate,
  getEventTemplate,
  getEventTemplates,
  postEventTemplate,
  putEventTemplate,
} from './controller.js';

const eventTemplatesRouter = Router();

eventTemplatesRouter.use(authenticate);
eventTemplatesRouter.use(restrictTo('ADMIN', 'MANAGER'));

eventTemplatesRouter.post('/', postEventTemplate);
eventTemplatesRouter.get('/', getEventTemplates);
eventTemplatesRouter.get('/:id', getEventTemplate);
eventTemplatesRouter.put('/:id', putEventTemplate);
eventTemplatesRouter.delete('/:id', deleteEventTemplate);

export default eventTemplatesRouter;
