import { apiClient } from './client'
import type { AppRole } from '@/lib/auth/types'

export type UserLocation = {
    id: string
    name: string
    timezone?: string
}

export type UserCertification = {
    id: string
    locationId: string
    revokedAt?: string | null
    location?: UserLocation
}

export type UserSkill = {
    id: string
    name: string
}

export type UserRecord = {
    id: string
    email: string
    firstName: string
    lastName: string
    role: AppRole
    phone?: string | null
    certifications?: UserCertification[]
    skills?: UserSkill[]
}

export type UsersListParams = {
    page?: number
    limit?: number
    role?: AppRole | ''
    locationId?: string
}

export type UsersListResponse = {
    data: UserRecord[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export type UserDetailResponse = {
    data: {
        id: string
        email: string
        firstName: string
        lastName: string
        role: AppRole
        phone?: string | null
        certifications?: Array<{
            id: string
            locationId: string
            revokedAt?: string | null
            location?: UserLocation
        }>
        skills?: Array<{
            skill?: UserSkill
        }>
        managerLocations?: Array<{
            location?: UserLocation
        }>
    }
}

export type UpdateUserPayload = {
    firstName?: string
    lastName?: string
    phone?: string | null
    role?: AppRole
}

export const userService = {
    listUsers(params: UsersListParams) {
        return apiClient.get<UsersListResponse>('/users', {
            params,
        })
    },
    getUserById(userId: string) {
        return apiClient.get<UserDetailResponse>(`/users/${userId}`)
    },
    updateUser(userId: string, payload: UpdateUserPayload) {
        return apiClient.put<UserDetailResponse['data'], UpdateUserPayload>(
            `/users/${userId}`,
            payload,
        )
    },
    addCertification(userId: string, locationId: string) {
        return apiClient.post<{ data: UserCertification }, { locationId: string }>(
            `/users/${userId}/certifications`,
            { locationId },
        )
    },
    revokeCertification(userId: string, locationId: string) {
        return apiClient.del<{ data: UserCertification }>(
            `/users/${userId}/certifications/${locationId}`,
        )
    },
}
