'use client'

import SignIn from '@/components/auth/SignIn'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/context/AuthContext'
import { getRoleHomePath } from '@/lib/auth/types'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useRouter, useSearchParams } from 'next/navigation'
import type { OnSignInPayload } from '@/components/auth/SignIn'
import type { AuthResponse } from '@/lib/auth/types'
import type { NormalizedApiError } from '@/lib/api/types'

const resolveErrorMessage = (error: unknown): string => {
    const normalizedError = error as NormalizedApiError

    if (normalizedError?.message) {
        return normalizedError.message
    }

    return 'Unable to sign in. Please try again.'
}

const SignInClient = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { login } = useAuth()
    const callbackUrl = searchParams.get(REDIRECT_URL_KEY)

    const handleSignIn = async ({
        values,
        setSubmitting,
        setMessage,
    }: OnSignInPayload) => {
        setSubmitting(true)

        try {
            const response = await apiClient.post<AuthResponse, typeof values>(
                '/auth/login',
                values,
            )
            login(response)
            router.replace(callbackUrl || getRoleHomePath(response.user.role))
        } catch (error) {
            setMessage(resolveErrorMessage(error))
        } finally {
            setSubmitting(false)
        }
    }

    return <SignIn onSignIn={handleSignIn} />
}

export default SignInClient
