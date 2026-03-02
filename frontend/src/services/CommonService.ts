import ApiService from './ApiService'
import appConfig from '@/configs/app.config'

export async function apiGetNotificationCount() {
    return ApiService.fetchDataWithAxios<{
        count: number
    }>({
        baseURL: appConfig.apiPrefix,
        url: '/notifications/count',
        method: 'get',
    })
}

export async function apiGetNotificationList() {
    return ApiService.fetchDataWithAxios<
        {
            id: string
            target: string
            description: string
            date: string
            image: string
            type: number
            location: string
            locationLabel: string
            status: string
            readed: boolean
        }[]
    >({
        baseURL: appConfig.apiPrefix,
        url: '/notifications',
        method: 'get',
    })
}

export async function apiGetSearchResult<T>(params: { query: string }) {
    return ApiService.fetchDataWithAxios<T>({
        baseURL: appConfig.apiPrefix,
        url: '/search',
        method: 'get',
        params,
    })
}
