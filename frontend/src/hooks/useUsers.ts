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

    const createUserMutation = useMutation({
        mutationFn: userService.createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        },
    })

    const updateUserMutation = useMutation({
        mutationFn: ({
            userId,
            payload,
        }: {
            userId: string
            payload: Parameters<typeof userService.updateUser>[1]
        }) => userService.updateUser(userId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        },
    })

    const deactivateUserMutation = useMutation({
        mutationFn: userService.deactivateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        },
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
        createUserMutation,
        updateUserMutation,
        deactivateUserMutation,
        addCertificationMutation,
        revokeCertificationMutation,
    }
}
