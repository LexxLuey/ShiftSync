import AxiosBase from './axios/AxiosBase'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

const ApiService = {
    fetchDataWithAxios<Response = unknown, Request = Record<string, unknown>>(
        param: AxiosRequestConfig<Request>,
    ) {
        return new Promise<Response>((resolve, reject) => {
            AxiosBase(param)
                .then((response: AxiosResponse<Response>) => {
                    resolve(response.data)
                })
                .catch((errors: unknown) => {
                    reject(errors)
                })
        })
    },
}

export default ApiService
