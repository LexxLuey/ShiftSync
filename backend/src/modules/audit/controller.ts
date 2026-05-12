import type { NextFunction, Request, Response } from 'express';
import { listAuditLogs } from './service.js';

const parseDate = (value: unknown): Date | undefined => {
    if (typeof value !== 'string' || !value.trim()) {
        return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return undefined;
    }

    return parsed;
};

const parseNumber = (value: unknown, fallback: number): number => {
    if (typeof value !== 'string') {
        return fallback;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return parsed;
};

const toCsvValue = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '';
    }

    const raw =
        typeof value === 'string'
            ? value
            : value instanceof Date
                ? value.toISOString()
                : JSON.stringify(value);

    return `"${raw.replace(/"/g, '""')}"`;
};

export const getAuditLogsHandler = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const startDate = parseDate(request.query.startDate);
        const endDate = parseDate(request.query.endDate);
        const entityType =
            typeof request.query.entityType === 'string' ? request.query.entityType : undefined;
        const action = typeof request.query.action === 'string' ? request.query.action : undefined;
        const userId = typeof request.query.userId === 'string' ? request.query.userId : undefined;

        const result = await listAuditLogs({
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
            ...(entityType ? { entityType } : {}),
            ...(action ? { action } : {}),
            ...(userId ? { userId } : {}),
            limit: parseNumber(request.query.limit, 50),
            offset: parseNumber(request.query.offset, 0),
        });

        response.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const exportAuditLogsHandler = async (
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const startDate = parseDate(request.query.startDate);
        const endDate = parseDate(request.query.endDate);
        const entityType =
            typeof request.query.entityType === 'string' ? request.query.entityType : undefined;
        const action = typeof request.query.action === 'string' ? request.query.action : undefined;
        const userId = typeof request.query.userId === 'string' ? request.query.userId : undefined;

        const result = await listAuditLogs({
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
            ...(entityType ? { entityType } : {}),
            ...(action ? { action } : {}),
            ...(userId ? { userId } : {}),
            limit: 10000,
            offset: 0,
        });

        const rows = [
            [
                'id',
                'timestamp',
                'action',
                'entityType',
                'entityId',
                'userId',
                'userName',
                'userEmail',
                'beforeState',
                'afterState',
            ].join(','),
            ...result.data.map((log) =>
                [
                    toCsvValue(log.id),
                    toCsvValue(log.createdAt),
                    toCsvValue(log.action),
                    toCsvValue(log.entityType),
                    toCsvValue(log.entityId),
                    toCsvValue(log.userId),
                    toCsvValue(`${log.user.firstName} ${log.user.lastName}`),
                    toCsvValue(log.user.email),
                    toCsvValue(log.beforeState),
                    toCsvValue(log.afterState),
                ].join(','),
            ),
        ];

        const csv = rows.join('\n');
        response.setHeader('Content-Type', 'text/csv; charset=utf-8');
        response.setHeader(
            'Content-Disposition',
            `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        );
        response.status(200).send(csv);
    } catch (error) {
        next(error);
    }
};
