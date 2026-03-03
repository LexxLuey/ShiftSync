'use client'

import { useQuery } from '@tanstack/react-query'
import { activeShiftsService } from '@/lib/api/activeShiftsService'
import type { NormalizedApiError } from '@/lib/api/types'

export default function useActiveShifts(locationId: string | null) {
    const activeShiftsQuery = useQuery<unknown, NormalizedApiError>({
        queryKey: ['activeShifts', locationId],
        queryFn: () => activeShiftsService.getActiveShifts(locationId as string),
        enabled: Boolean(locationId),
        refetchInterval: 30000, // 30 seconds for polling
        staleTime: 0, // Always consider stale
    })

    return {
        ...activeShiftsQuery,
    }
}
