import 'dotenv/config';
import { createServer } from 'http';
import expressApp from './app.js';
import { initializeSocket } from './lib/socket/index.js';
import winston from 'winston';

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

const portNumber = process.env.PORT || 4000;

const httpServer = createServer(expressApp);

// Initialize Socket.io
initializeSocket(httpServer);

httpServer.listen(portNumber, () => {
    logger.info(`Server running on port ${portNumber}`);
});
