import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import openApiSpec from './openapi.js';
import { enforceDocsAccess } from './middleware.js';

const docsRouter = Router();

docsRouter.get('/docs.json', enforceDocsAccess, (request, response) => {
    response.status(200).json(openApiSpec);
});

docsRouter.use(
    '/docs',
    enforceDocsAccess,
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
        customSiteTitle: 'ShiftSync API Docs',
        explorer: true,
    }),
);

export default docsRouter;
