import { apiClient } from './client'
import type {
    CreateShiftPayload,
    UpdateShiftPayload,
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
    updateShift(id: string, payload: UpdateShiftPayload) {
        return apiClient.put<Shift, UpdateShiftPayload>(`/shifts/${id}`, payload)
    },
    deleteShift(id: string) {
        return apiClient.del<Shift>(`/shifts/${id}`)
    },
    publishShift(id: string) {
        return apiClient.post<Shift, Record<string, never>>(
            `/shifts/${id}/publish`,
            {},
        )
    },
}
