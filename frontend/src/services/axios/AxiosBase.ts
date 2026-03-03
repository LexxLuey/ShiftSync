import axios from 'axios'
import AxiosResponseIntrceptorErrorCallback from './AxiosResponseIntrceptorErrorCallback'
import AxiosRequestIntrceptorConfigCallback from './AxiosRequestIntrceptorConfigCallback'
import appConfig from '@/configs/app.config'
import type { AxiosError } from 'axios'
import { AUTH_UNAUTHORIZED_EVENT } from '@/lib/auth/constants'

if (!appConfig.apiBaseUrl) {
    // Keep this warning explicit so misconfiguration fails fast during setup.
    console.warn(
        'NEXT_PUBLIC_API_BASE_URL is not configured. Backend API requests will fail.',
    )
}

const AxiosBase = axios.create({
    timeout: 60000,
    baseURL: appConfig.apiBaseUrl,
    withCredentials: true,
})

AxiosBase.interceptors.request.use(
    (config) => {
        return AxiosRequestIntrceptorConfigCallback(config)
    },
    (error) => {
        return Promise.reject(error)
    },
)

AxiosBase.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (typeof window !== 'undefined' && error.response?.status === 401) {
            window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
        }

        const normalizedError = AxiosResponseIntrceptorErrorCallback(error)
        return Promise.reject(normalizedError)
    },
)

export default AxiosBase
