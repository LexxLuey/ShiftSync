import type { InternalAxiosRequestConfig } from 'axios'

const AxiosRequestIntrceptorConfigCallback = (
    config: InternalAxiosRequestConfig,
) => {
    if (typeof window === 'undefined') {
        return config
    }

    const token =
        window.localStorage.getItem('accessToken') ||
        window.localStorage.getItem('token')

    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
}

export default AxiosRequestIntrceptorConfigCallback
