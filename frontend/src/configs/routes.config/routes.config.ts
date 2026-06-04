import authRoute from './authRoute'
import type { Routes } from '@/@types/routes'

export const protectedRoutes: Routes = {
    '/home': {
        key: 'home',
        authority: ['ADMIN', 'MANAGER', 'STAFF'],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/centers': {
        key: 'centers',
        authority: ['ADMIN'],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/skills': {
        key: 'skills',
        authority: ['ADMIN','MANAGER'],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/schedule': {
        key: 'schedule',
        authority: ['ADMIN', 'MANAGER', 'STAFF'],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/event-templates': {
        key: 'eventTemplates',
        authority: ['ADMIN', 'MANAGER'],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/schedule-builder': {
        key: 'scheduleBuilder',
        authority: ['ADMIN', 'MANAGER'],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/shifts': {
        key: 'shifts',
        authority: ['ADMIN', 'MANAGER', 'STAFF'],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/swaps': {
        key: 'swaps',
        authority: ['ADMIN', 'MANAGER', 'STAFF'],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/availability': {
        key: 'availability',
        authority: ['STAFF'],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/staff': {
        key: 'users',
        authority: ['ADMIN', 'MANAGER'],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/staff/[id]': {
        key: 'staffDetail',
        authority: ['ADMIN', 'MANAGER'],
        dynamicRoute: true,
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
}

export const publicRoutes: Routes = {}

export const authRoutes = authRoute
