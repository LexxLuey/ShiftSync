'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/lib/api/dashboard'

export default function useDashboardSummary(locationId?: string) {
    return useQuery({
        queryKey: ['dashboard-summary', locationId || 'all'],
        queryFn: () => dashboardService.getSummary(locationId),
    })
}
