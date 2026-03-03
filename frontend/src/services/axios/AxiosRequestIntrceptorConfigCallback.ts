import type { InternalAxiosRequestConfig } from 'axios'
import { ACCESS_TOKEN_STORAGE_KEY } from '@/lib/auth/constants'

const AxiosRequestIntrceptorConfigCallback = (
    config: InternalAxiosRequestConfig,
) => {
    if (typeof window === 'undefined') {
        return config
    }

    const token = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)

    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
}

export default AxiosRequestIntrceptorConfigCallback
