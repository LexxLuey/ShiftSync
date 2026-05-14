'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { reportsService } from '@/lib/api/reportsService'
import type {
    NormalizedApiError,
    WhatIfShiftInput,
    HoursDistributionResponse,
    ProjectionResult,
    WhatIfResult,
} from '@/lib/api/types'

type HoursDistributionParams = {
    locationId: string
    weekStartDate: string
}

type ProjectionParams = {
    shiftId: string
    proposedUserId: string
}

export default function useReports() {
    const useHoursDistributionQuery = (params: HoursDistributionParams | null) =>
        useQuery<HoursDistributionResponse, NormalizedApiError>({
            queryKey: ['reports-hours-distribution', params],
            queryFn: () =>
                reportsService.getHoursDistribution(
                    params!.locationId,
                    params!.weekStartDate,
                ),
            enabled: Boolean(params?.locationId && params?.weekStartDate),
        })

    const useProjectionQuery = (params: ProjectionParams | null) =>
        useQuery<ProjectionResult, NormalizedApiError>({
            queryKey: ['reports-projection', params],
            queryFn: () => reportsService.getProjection(params!.shiftId, params!.proposedUserId),
            enabled: Boolean(params?.shiftId && params?.proposedUserId),
        })

    const whatIfMutation = useMutation<
        WhatIfResult,
        NormalizedApiError,
        WhatIfShiftInput[]
    >({
        mutationFn: (shifts) => reportsService.postWhatIf(shifts),
    })

    return {
        useHoursDistributionQuery,
        useProjectionQuery,
        whatIfMutation,
    }
}
