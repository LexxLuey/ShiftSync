export type AppConfig = {
    apiBaseUrl: string
    socketUrl: string
    apiVersionPrefix: string
    apiPrefix: string
    authenticatedEntryPath: string
    unAuthenticatedEntryPath: string
    locale: string
    activeNavTranslation: boolean
}

const appConfig: AppConfig = {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || '',
    apiVersionPrefix: '/api/v1',
    apiPrefix: '/api',
    authenticatedEntryPath: '/home',
    unAuthenticatedEntryPath: '/sign-in',
    locale: 'en',
    activeNavTranslation: false,
}

export default appConfig
