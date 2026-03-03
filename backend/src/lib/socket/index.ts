import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { verifyJwt } from '../../modules/auth/service.js';
import { AuthError } from '../errors/customErrors.js';
import prismaClient from '../db/prisma.js';
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

let io: Server;

export const initializeSocket = (httpServer: HttpServer): Server => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
    });

    // Authentication middleware for socket connection
    io.use(async (socket: Socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                throw new AuthError('Missing authentication token', null, ['Provide a valid token.']);
            }

            const payload = verifyJwt(token);

            // Attach user data to socket
            socket.data.user = {
                id: payload.sub,
                role: payload.role,
            };

            next();
        } catch (error) {
            const err = new Error('Unauthorized');
            (err as any).data = { content: 'Please retry later' };
            next(err);
        }
    });

    // Connection handler
    io.on('connection', async (socket: Socket) => {
        const userId = socket.data.user?.id;
        const userRole = socket.data.user?.role;

        if (!userId) {
            logger.error('Socket connection with missing user ID');
            socket.disconnect();
            return;
        }

        logger.info(`User ${userId} connected via socket`);

        // Join private user room
        socket.join(`user:${userId}`);

        // Join location rooms based on user's assignments or management
        try {
            if (userRole === 'ADMIN') {
                // Admins join all location rooms
                const locations = await prismaClient.location.findMany({
                    select: { id: true },
                });
                locations.forEach((loc) => {
                    socket.join(`location:${loc.id}`);
                });
            } else if (userRole === 'MANAGER') {
                // Managers join their assigned location rooms
                const assignments = await prismaClient.locationManager.findMany({
                    where: { userId },
                    select: { locationId: true },
                });
                assignments.forEach((a: { locationId: string }) => {
                    socket.join(`location:${a.locationId}`);
                });
            } else if (userRole === 'STAFF') {
                // Staff join location rooms based on assigned shifts
                const assignments = await prismaClient.shiftAssignment.findMany({
                    where: { userId },
                    include: { shift: { select: { locationId: true } } },
                });
                // Get unique locations
                const uniqueLocationIds = new Set(assignments.map((a) => a.shift.locationId));
                uniqueLocationIds.forEach((locId) => {
                    socket.join(`location:${locId}`);
                });
            }
        } catch (error) {
            logger.error(`Error joining location rooms for user ${userId}:`, error);
        }

        // Disconnection handler
        socket.on('disconnect', () => {
            logger.info(`User ${userId} disconnected`);
        });

        // Error handler
        socket.on('error', (error) => {
            logger.error(`Socket error for user ${userId}:`, error);
        });
    });

    logger.info('Socket.io initialized');
    return io;
};

export const getSocket = (): Server => {
    if (!io) {
        throw new Error('Socket.io not initialized. Call initializeSocket first.');
    }
    return io;
};

export { io };
