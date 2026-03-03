import { apiClient } from './client'
import type { HoursDistributionResponse, ProjectionResult, WhatIfResult, WhatIfShiftInput } from './types'

export const reportsService = {
    getHoursDistribution(locationId: string, weekStartDate: string) {
        return apiClient.get<HoursDistributionResponse>('/reports/hours-distribution', {
            params: { locationId, weekStartDate },
        })
    },

    getProjection(shiftId: string, proposedUserId: string) {
        return apiClient.get<ProjectionResult>('/reports/projection', {
            params: { proposedUserId },
        })
    },

    postWhatIf(shifts: WhatIfShiftInput[]) {
        return apiClient.post<WhatIfResult>('/reports/what-if', { shifts })
    },
}
