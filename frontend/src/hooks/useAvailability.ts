'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { availabilityService } from '@/lib/api/availability'
import type {
    CreateAvailabilityPayload,
    CreateExceptionPayload,
    NormalizedApiError,
} from '@/lib/api/types'

export default function useAvailability(userId?: string | null) {
    const queryClient = useQueryClient()

    const availabilityQuery = useQuery({
        queryKey: ['availability', userId],
        queryFn: () => availabilityService.getUserAvailability(userId as string),
        enabled: Boolean(userId),
    })

    const createAvailabilityMutation = useMutation<
        unknown,
        NormalizedApiError,
        CreateAvailabilityPayload
    >({
        mutationFn: (payload) =>
            availabilityService.createAvailability(userId as string, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['availability', userId],
            })
        },
    })

    const deleteAvailabilityMutation = useMutation<unknown, NormalizedApiError, string>({
        mutationFn: (availabilityId) =>
            availabilityService.deleteAvailability(userId as string, availabilityId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['availability', userId],
            })
        },
    })

    const createExceptionMutation = useMutation<
        unknown,
        NormalizedApiError,
        CreateExceptionPayload
    >({
        mutationFn: (payload) =>
            availabilityService.createException(userId as string, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['availability', userId],
            })
        },
    })

    const deleteExceptionMutation = useMutation<unknown, NormalizedApiError, string>({
        mutationFn: (exceptionId) =>
            availabilityService.deleteException(userId as string, exceptionId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['availability', userId],
            })
        },
    })

    return {
        availabilityQuery,
        createAvailabilityMutation,
        deleteAvailabilityMutation,
        createExceptionMutation,
        deleteExceptionMutation,
    }
}
