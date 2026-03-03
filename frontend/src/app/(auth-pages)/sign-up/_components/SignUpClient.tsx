'use client'

import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import SignUp from '@/components/auth/SignUp'
import { apiClient } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import type { OnSignUpPayload } from '@/components/auth/SignUp'
import type { AuthResponse } from '@/lib/auth/types'
import type { NormalizedApiError } from '@/lib/api/types'

const resolveErrorMessage = (error: unknown): string => {
    const normalizedError = error as NormalizedApiError

    if (normalizedError?.message) {
        return normalizedError.message
    }

    return 'Unable to create your account. Please try again.'
}

const SignUpClient = () => {
    const router = useRouter()

    const handlSignUp = async ({
        values,
        setSubmitting,
        setMessage,
    }: OnSignUpPayload) => {
        try {
            setSubmitting(true)
            const payload = {
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                role: values.role,
                password: values.password,
                phone: values.phone || undefined,
            }
            await apiClient.post<AuthResponse, typeof payload>(
                '/auth/register',
                payload,
            )
            toast.push(
                <Notification title="Account created!" type="success">
                    You can now sign in from our sign in page
                </Notification>,
            )
            router.push('/sign-in')
        } catch (error) {
            setMessage(resolveErrorMessage(error))
        } finally {
            setSubmitting(false)
        }
    }

    return <SignUp onSignUp={handlSignUp} />
}

export default SignUpClient
