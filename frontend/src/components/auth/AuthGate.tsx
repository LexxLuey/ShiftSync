'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { getRoleHomePath } from '@/lib/auth/types'
import { useAuth } from '@/context/AuthContext'

type AuthGateProps = {
    children: React.ReactNode
    mode: 'protected' | 'guest'
}

const AuthGate = ({ children, mode }: AuthGateProps) => {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { user, isAuthenticated, isHydrated } = useAuth()

    useEffect(() => {
        if (!isHydrated) {
            return
        }

        if (mode === 'protected' && !isAuthenticated) {
            const query = searchParams.toString()
            const redirectPath = query ? `${pathname}?${query}` : pathname
            const encodedRedirect = encodeURIComponent(redirectPath)

            router.replace(`/sign-in?${REDIRECT_URL_KEY}=${encodedRedirect}`)
            return
        }

        if (mode === 'guest' && isAuthenticated) {
            router.replace(getRoleHomePath(user?.role))
        }
    }, [
        isAuthenticated,
        isHydrated,
        mode,
        pathname,
        router,
        searchParams,
        user?.role,
    ])

    if (!isHydrated) {
        return null
    }

    if (mode === 'protected' && !isAuthenticated) {
        return null
    }

    if (mode === 'guest' && isAuthenticated) {
        return null
    }

    return <>{children}</>
}

export default AuthGate
