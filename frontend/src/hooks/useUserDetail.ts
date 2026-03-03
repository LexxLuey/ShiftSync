'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/lib/api/users'
import type { NormalizedApiError } from '@/lib/api/types'

export default function useUserDetail(userId: string) {
    const queryClient = useQueryClient()

    const userQuery = useQuery({
        queryKey: ['users', 'detail', userId],
        queryFn: () => userService.getUserById(userId),
        enabled: Boolean(userId),
    })

    const addCertificationMutation = useMutation<
        unknown,
        NormalizedApiError,
        { locationId: string }
    >({
        mutationFn: ({ locationId }) => userService.addCertification(userId, locationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId] })
            queryClient.invalidateQueries({ queryKey: ['users'] })
        },
    })

    const revokeCertificationMutation = useMutation<
        unknown,
        NormalizedApiError,
        { locationId: string }
    >({
        mutationFn: ({ locationId }) =>
            userService.revokeCertification(userId, locationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId] })
            queryClient.invalidateQueries({ queryKey: ['users'] })
        },
    })

    return {
        userQuery,
        addCertificationMutation,
        revokeCertificationMutation,
    }
}
