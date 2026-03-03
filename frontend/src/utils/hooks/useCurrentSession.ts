import { useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { AuthSession } from '@/lib/auth/types'

const useCurrentSession = () => {
    const { user } = useAuth()

    const session = useMemo<AuthSession>(() => {
        if (!user) {
            return null
        }

        return {
            user: {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                authority: [user.role],
                image: null,
            },
        }
    }, [user])

    return {
        session,
    }
}

export default useCurrentSession
