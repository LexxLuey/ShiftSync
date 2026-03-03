'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    clearCurrentUser,
    clearToken,
    getCurrentUser,
    getToken,
    setCurrentUser,
    setToken,
} from '@/lib/auth/storage'
import {
    AUTH_UNAUTHORIZED_EVENT,
    ACCESS_TOKEN_STORAGE_KEY,
} from '@/lib/auth/constants'
import { useAppRealtimeStore } from '@/store/socketStore'
import type { AuthResponse, AuthUser } from '@/lib/auth/types'

type AuthContextValue = {
    user: AuthUser | null
    token: string | null
    isHydrated: boolean
    isAuthenticated: boolean
    login: (payload: AuthResponse) => void
    logout: () => void
    refreshFromStorage: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const hydrateAuthState = (): { user: AuthUser | null; token: string | null } => {
    return {
        user: getCurrentUser(),
        token: getToken(),
    }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [token, setAuthToken] = useState<string | null>(null)
    const [isHydrated, setIsHydrated] = useState(false)

    const resetRealtimeState = useAppRealtimeStore(
        (state) => state.resetRealtimeState,
    )

    const logout = useCallback(() => {
        clearToken()
        clearCurrentUser()
        setUser(null)
        setAuthToken(null)
        resetRealtimeState()
    }, [resetRealtimeState])

    const refreshFromStorage = useCallback(() => {
        const state = hydrateAuthState()
        setUser(state.user)
        setAuthToken(state.token)
        setIsHydrated(true)
    }, [])

    const login = useCallback((payload: AuthResponse) => {
        setToken(payload.token)
        setCurrentUser(payload.user)
        setAuthToken(payload.token)
        setUser(payload.user)
    }, [])

    useEffect(() => {
        refreshFromStorage()
    }, [refreshFromStorage])

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        const handleUnauthorized = () => {
            logout()
            if (window.location.pathname !== '/sign-in') {
                window.location.assign('/sign-in')
            }
        }

        const handleStorageSync = (event: StorageEvent) => {
            if (
                event.key === ACCESS_TOKEN_STORAGE_KEY ||
                event.key === null
            ) {
                refreshFromStorage()
            }
        }

        window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
        window.addEventListener('storage', handleStorageSync)

        return () => {
            window.removeEventListener(
                AUTH_UNAUTHORIZED_EVENT,
                handleUnauthorized,
            )
            window.removeEventListener('storage', handleStorageSync)
        }
    }, [logout, refreshFromStorage])

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            token,
            isHydrated,
            isAuthenticated: Boolean(token && user),
            login,
            logout,
            refreshFromStorage,
        }),
        [isHydrated, login, logout, refreshFromStorage, token, user],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }

    return context
}
