import express from 'express';
import type { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mainRouter from './routes.js';
import winston from 'winston';
import errorHandler from './middleware/errorHandler.js';

// Winston logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
    ],
});

const expressApp: Application = express();

// Middleware
expressApp.use(cors());
expressApp.use(helmet());
expressApp.use(compression());
expressApp.use(express.json());

// Logging middleware
expressApp.use((request: Request, response: Response, next: NextFunction) => {
    logger.info(`${request.method} ${request.originalUrl}`);
    next();
});

// Main API router
expressApp.use('/api/v1', mainRouter);

// Health check endpoint
expressApp.get('/health', (request: Request, response: Response) => {
    response.status(200).json({ status: 'ok' });
});

// Health check endpoint
expressApp.get('/', (request: Request, response: Response) => {
    response.status(200).json({ status: 'ok' });
});

// Error handler
expressApp.use((error: Error, request: Request, response: Response, next: NextFunction) => {
    logger.error(error.stack || error.message);
    next(error);
});
expressApp.use(errorHandler);

export default expressApp;
