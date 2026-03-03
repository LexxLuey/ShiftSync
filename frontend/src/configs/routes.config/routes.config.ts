import authRoute from './authRoute'
import type { Routes } from '@/@types/routes'

export const protectedRoutes: Routes = {
    '/home': {
        key: 'home',
        authority: ['ADMIN'],
        meta: {
            pageBackgroundType: 'plain',
            pageContainerType: 'contained',
        },
    },
    '/schedule': {
        key: 'schedule',
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
        key: 'staff',
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
