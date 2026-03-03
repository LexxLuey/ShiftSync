import { apiClient } from './client'
import type { NotificationsResponse, Notification } from './types'

export type GetNotificationsParams = {
    limit?: number
    offset?: number
    unreadOnly?: boolean
}

export const notificationsService = {
    getNotifications(params?: GetNotificationsParams) {
        return apiClient.get<NotificationsResponse>('/notifications', { params })
    },

    getUnreadCount() {
        return apiClient.get<{ count: number }>('/notifications/count')
    },

    markRead(notificationId: string) {
        return apiClient.put<Notification>(`/notifications/${notificationId}/read`, {})
    },

    markAllRead() {
        return apiClient.put<void>('/notifications/mark-all-read', {})
    },

    deleteNotification(notificationId: string) {
        return apiClient.del<void>(`/notifications/${notificationId}`)
    },
}
