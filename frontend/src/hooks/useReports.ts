import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reportsService } from '@/lib/api/reportsService'
import type { NormalizedApiError, WhatIfShiftInput } from '@/lib/api/types'

export default function useReports() {
    const queryClient = useQueryClient()

    // Hours distribution query
    const hoursQuery = useQuery({
        queryKey: ['hoursDistribution'],
        queryFn: () => reportsService.getHoursDistribution('', ''),
        enabled: false, // Must be manually triggered with specific params
    })

    // Projection mutation (GET but simpler to implement as query)
    const projectionQuery = useQuery({
        queryKey: ['projection'],
        queryFn: () => reportsService.getProjection('', ''),
        enabled: false,
    })

    // What-if mutation
    const whatIfMutation = useMutation<any, NormalizedApiError, WhatIfShiftInput[]>({
        mutationFn: (shifts) => reportsService.postWhatIf(shifts),
        onSuccess: () => {
            // Cache invalidation handled by component if needed
        },
    })

    return {
        hoursQuery,
        projectionQuery,
        whatIfMutation,
    }
}
