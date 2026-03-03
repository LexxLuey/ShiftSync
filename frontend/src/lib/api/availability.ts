import { apiClient } from './client'
import type {
    Availability,
    CreateAvailabilityPayload,
    CreateExceptionPayload,
    Exception,
    UserAvailabilityResponse,
    CheckAvailabilityParams,
    CheckAvailabilityResponse,
} from './types'

export const availabilityService = {
    getUserAvailability(userId: string) {
        return apiClient.get<UserAvailabilityResponse>(
            `/users/${userId}/availability`,
        )
    },

    createAvailability(userId: string, payload: CreateAvailabilityPayload) {
        return apiClient.post<Availability, CreateAvailabilityPayload>(
            `/users/${userId}/availability`,
            payload,
        )
    },

    deleteAvailability(userId: string, availabilityId: string) {
        return apiClient.del<Availability>(
            `/users/${userId}/availability/${availabilityId}`,
        )
    },

    createException(userId: string, payload: CreateExceptionPayload) {
        return apiClient.post<Exception, CreateExceptionPayload>(
            `/users/${userId}/exceptions`,
            payload,
        )
    },

    deleteException(userId: string, exceptionId: string) {
        return apiClient.del<Exception>(
            `/users/${userId}/exceptions/${exceptionId}`,
        )
    },

    checkAvailability(userId: string, params: CheckAvailabilityParams) {
        return apiClient.get<CheckAvailabilityResponse>(
            `/users/${userId}/availability/check`,
            {
                params,
            },
        )
    },
}
