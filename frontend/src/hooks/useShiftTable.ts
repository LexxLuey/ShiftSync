'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { shiftService } from '@/lib/api/shifts'
import type {
    CreateShiftPayload,
    ListShiftsParams,
    NormalizedApiError,
    UpdateShiftPayload,
} from '@/lib/api/types'

export default function useShiftTable(params: ListShiftsParams) {
    const queryClient = useQueryClient()

    const stableParams = useMemo(
        () => ({
            page: params.page ?? 1,
            limit: params.limit ?? 20,
            locationId: params.locationId || undefined,
            startDate: params.startDate || undefined,
            endDate: params.endDate || undefined,
            status: params.status || undefined,
            title: params.title || undefined,
            assignedUserId: params.assignedUserId || undefined,
        }),
        [
            params.assignedUserId,
            params.endDate,
            params.limit,
            params.locationId,
            params.page,
            params.startDate,
            params.status,
            params.title,
        ],
    )

    const shiftsQuery = useQuery({
        queryKey: ['shifts-table', stableParams],
        queryFn: () => shiftService.listShifts(stableParams),
    })

    const createShiftMutation = useMutation<
        unknown,
        NormalizedApiError,
        CreateShiftPayload
    >({
        mutationFn: (payload) => shiftService.createShift(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts-table'] })
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['calendar'] })
        },
    })

    const updateShiftMutation = useMutation<
        unknown,
        NormalizedApiError,
        { id: string; payload: UpdateShiftPayload }
    >({
        mutationFn: ({ id, payload }) => shiftService.updateShift(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts-table'] })
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['calendar'] })
        },
    })

    const deleteShiftMutation = useMutation<unknown, NormalizedApiError, string>({
        mutationFn: (shiftId) => shiftService.deleteShift(shiftId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts-table'] })
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['calendar'] })
        },
    })

    const publishShiftMutation = useMutation<unknown, NormalizedApiError, string>({
        mutationFn: (shiftId) => shiftService.publishShift(shiftId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts-table'] })
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['calendar'] })
        },
    })

    return {
        shiftsQuery,
        createShiftMutation,
        updateShiftMutation,
        deleteShiftMutation,
        publishShiftMutation,
    }
}
