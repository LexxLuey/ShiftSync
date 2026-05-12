'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulingService } from '@/lib/api/scheduling'
import type {
    GenerateScheduleRequest,
    GenerateScheduleResponse,
    NormalizedApiError,
} from '@/lib/api/types'

export default function useScheduleGeneration() {
    const queryClient = useQueryClient()

    const generateScheduleMutation = useMutation<
        { data: GenerateScheduleResponse },
        NormalizedApiError,
        GenerateScheduleRequest
    >({
        mutationFn: (payload) => schedulingService.generate(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
        },
    })

    return {
        generateScheduleMutation,
    }
}
