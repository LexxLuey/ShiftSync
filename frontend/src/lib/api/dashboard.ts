import { apiClient } from './client'
import type { AppRole } from '@/lib/auth/types'

export type DashboardStats = {
    centers: number
    users: number
    draftShifts: number
    publishedShifts: number
    openHeadcount: number
    upcomingShifts: number
}

export type DashboardUpcomingShift = {
    id: string
    title: string
    status: 'DRAFT' | 'PUBLISHED'
    startTime: string
    endTime: string
    headcountNeeded: number
    assignedCount: number
    openHeadcount: number
    location: {
        id: string
        name: string
        timezone: string
    }
}

export type DashboardSummary = {
    scope: {
        role: AppRole
        locationIds: string[] | 'ALL'
    }
    stats: DashboardStats
    upcoming: DashboardUpcomingShift[]
    nextActions: string[]
}

export type DashboardSummaryResponse = {
    data: DashboardSummary
}

export const dashboardService = {
    getSummary(locationId?: string) {
        return apiClient.get<DashboardSummaryResponse>('/dashboard/summary', {
            params: locationId ? { locationId } : undefined,
        })
    },
}
