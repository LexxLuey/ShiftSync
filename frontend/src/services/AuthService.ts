import ApiService from './ApiService'
import appConfig from '@/configs/app.config'

import type {
    SignUpCredential,
    ForgotPassword,
    ResetPassword,
    SignUpResponse,
} from '@/@types/auth'

export async function apiSignUp(data: SignUpCredential) {
    return ApiService.fetchDataWithAxios<SignUpResponse>({
        baseURL: appConfig.apiPrefix,
        url: '/auth/sign-up',
        method: 'post',
        data,
    })
}

export async function apiForgotPassword<T>(data: ForgotPassword) {
    return ApiService.fetchDataWithAxios<T>({
        baseURL: appConfig.apiPrefix,
        url: '/auth/forgot-password',
        method: 'post',
        data,
    })
}

export async function apiResetPassword<T>(data: ResetPassword) {
    return ApiService.fetchDataWithAxios<T>({
        baseURL: appConfig.apiPrefix,
        url: '/auth/reset-password',
        method: 'post',
        data,
    })
}
