'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { shiftService } from '@/lib/api/shifts'
import type {
    CreateShiftPayload,
    GetShiftsByLocationParams,
    NormalizedApiError,
} from '@/lib/api/types'

export default function useShifts(params?: GetShiftsByLocationParams | null) {
    const queryClient = useQueryClient()

    const shiftsQuery = useQuery({
        queryKey: ['shifts', params],
        queryFn: () => shiftService.getShiftsByLocation(params as GetShiftsByLocationParams),
        enabled: Boolean(params?.locationId),
    })

    const createShiftMutation = useMutation<
        unknown,
        NormalizedApiError,
        CreateShiftPayload
    >({
        mutationFn: (payload) => shiftService.createShift(payload),
        onSuccess: () => {
            if (params?.locationId) {
                queryClient.invalidateQueries({
                    queryKey: ['shifts', params],
                })
            }
        },
    })

    const publishShiftMutation = useMutation<unknown, NormalizedApiError, string>({
        mutationFn: (shiftId) => shiftService.publishShift(shiftId),
        onSuccess: () => {
            if (params?.locationId) {
                queryClient.invalidateQueries({
                    queryKey: ['shifts', params],
                })
            }
        },
    })

    return {
        shiftsQuery,
        createShiftMutation,
        publishShiftMutation,
    }
}
