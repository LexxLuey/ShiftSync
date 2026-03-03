export type AppRole = 'ADMIN' | 'MANAGER' | 'STAFF'

export type AuthUser = {
    id: string
    email: string
    firstName: string
    lastName: string
    role: AppRole
    phone?: string | null
    createdAt?: string
    updatedAt?: string
}

export type AuthResponse = {
    token: string
    user: AuthUser
}

export type AuthSessionUser = {
    id: string
    name: string
    email: string
    authority: AppRole[]
    image?: string | null
}

export type AuthSession = {
    user: AuthSessionUser
} | null

export const getRoleHomePath = (role?: AppRole | null): string => {
    if (role === 'MANAGER') {
        return '/schedule'
    }

    if (role === 'STAFF') {
        return '/shifts'
    }

    return '/home'
}
