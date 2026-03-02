import { apiClient } from './client'
import type {
    CreateShiftPayload,
    GetShiftsByLocationParams,
    Shift,
} from './types'

type ShiftListResponse = {
    data?: Shift[]
    shifts?: Shift[]
} & Record<string, unknown>

export const shiftService = {
    getShiftsByLocation(params: GetShiftsByLocationParams) {
        const { locationId, ...query } = params

        return apiClient.get<ShiftListResponse>(`/locations/${locationId}/shifts`, {
            params: query,
        })
    },
    createShift(payload: CreateShiftPayload) {
        const { locationId, ...body } = payload

        return apiClient.post<Shift, Omit<CreateShiftPayload, 'locationId'>>(
            `/locations/${locationId}/shifts`,
            body,
        )
    },
    getShiftById(id: string) {
        return apiClient.get<Shift>(`/shifts/${id}`)
    },
    publishShift(id: string) {
        return apiClient.post<Shift, Record<string, never>>(
            `/shifts/${id}/publish`,
            {},
        )
    },
}
