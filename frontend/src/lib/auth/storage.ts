import {
    ACCESS_TOKEN_STORAGE_KEY,
    CURRENT_USER_STORAGE_KEY,
} from './constants'
import type { AuthUser } from './types'

const hasWindow = () => typeof window !== 'undefined'

export const getToken = (): string | null => {
    if (!hasWindow()) {
        return null
    }

    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}

export const setToken = (token: string): void => {
    if (!hasWindow()) {
        return
    }

    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
}

export const clearToken = (): void => {
    if (!hasWindow()) {
        return
    }

    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
}

export const getCurrentUser = (): AuthUser | null => {
    if (!hasWindow()) {
        return null
    }

    const raw = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY)

    if (!raw) {
        return null
    }

    try {
        return JSON.parse(raw) as AuthUser
    } catch {
        return null
    }
}

export const setCurrentUser = (user: AuthUser): void => {
    if (!hasWindow()) {
        return
    }

    window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user))
}

export const clearCurrentUser = (): void => {
    if (!hasWindow()) {
        return
    }

    window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
}
