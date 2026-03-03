'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userService, type UsersListParams } from '@/lib/api/users'
import type { NormalizedApiError } from '@/lib/api/types'

export default function useUsers(params: UsersListParams) {
    const queryClient = useQueryClient()

    const stableParams = useMemo(
        () => ({
            page: params.page ?? 1,
            limit: params.limit ?? 20,
            role: params.role || undefined,
            locationId: params.locationId || undefined,
        }),
        [params.limit, params.locationId, params.page, params.role],
    )

    const usersQuery = useQuery({
        queryKey: ['users', stableParams],
        queryFn: () => userService.listUsers(stableParams),
    })

    const addCertificationMutation = useMutation<
        unknown,
        NormalizedApiError,
        { userId: string; locationId: string }
    >({
        mutationFn: ({ userId, locationId }) =>
            userService.addCertification(userId, locationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
        },
    })

    const revokeCertificationMutation = useMutation<
        unknown,
        NormalizedApiError,
        { userId: string; locationId: string }
    >({
        mutationFn: ({ userId, locationId }) =>
            userService.revokeCertification(userId, locationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
        },
    })

    return {
        usersQuery,
        addCertificationMutation,
        revokeCertificationMutation,
    }
}
