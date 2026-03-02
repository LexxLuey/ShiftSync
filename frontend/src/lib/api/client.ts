import type { AxiosRequestConfig } from 'axios'
import appConfig from '@/configs/app.config'
import ApiService from '@/services/ApiService'

type RequestConfig<TBody = unknown> = Omit<
    AxiosRequestConfig<TBody>,
    'url' | 'method' | 'data'
>

const getBackendBaseUrl = () =>
    `${appConfig.apiBaseUrl}${appConfig.apiVersionPrefix}`

export const apiClient = {
    get<TResponse>(url: string, config?: RequestConfig) {
        return ApiService.fetchDataWithAxios<TResponse>({
            ...config,
            baseURL: getBackendBaseUrl(),
            url,
            method: 'get',
        })
    },
    post<TResponse, TBody = Record<string, unknown>>(
        url: string,
        body: TBody,
        config?: RequestConfig<TBody>,
    ) {
        return ApiService.fetchDataWithAxios<TResponse, TBody>({
            ...config,
            baseURL: getBackendBaseUrl(),
            url,
            method: 'post',
            data: body,
        })
    },
    put<TResponse, TBody = Record<string, unknown>>(
        url: string,
        body: TBody,
        config?: RequestConfig<TBody>,
    ) {
        return ApiService.fetchDataWithAxios<TResponse, TBody>({
            ...config,
            baseURL: getBackendBaseUrl(),
            url,
            method: 'put',
            data: body,
        })
    },
    del<TResponse>(url: string, config?: RequestConfig) {
        return ApiService.fetchDataWithAxios<TResponse>({
            ...config,
            baseURL: getBackendBaseUrl(),
            url,
            method: 'delete',
        })
    },
}
