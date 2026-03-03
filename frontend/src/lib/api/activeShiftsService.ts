import { apiClient } from './client'
import type { ActiveShiftsResponse } from './types'

export const activeShiftsService = {
    getActiveShifts(locationId: string) {
        return apiClient.get<ActiveShiftsResponse>(
            `/locations/${locationId}/active-shifts`,
        )
    },
}
