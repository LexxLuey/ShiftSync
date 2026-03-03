import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsService } from '@/lib/api/notificationsService'
import type { NormalizedApiError } from '@/lib/api/types'

export default function useNotifications() {
    const queryClient = useQueryClient()

    const notificationsQuery = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsService.getNotifications({ limit: 20, offset: 0 }),
    })

    const unreadCountQuery = useQuery({
        queryKey: ['notificationsUnreadCount'],
        queryFn: () => notificationsService.getUnreadCount(),
    })

    const markReadMutation = useMutation<unknown, NormalizedApiError, string>({
        mutationFn: (notificationId) => notificationsService.markRead(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] })
        },
    })

    const markAllReadMutation = useMutation<unknown, NormalizedApiError, void>({
        mutationFn: () => notificationsService.markAllRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] })
        },
    })

    const deleteMutation = useMutation<unknown, NormalizedApiError, string>({
        mutationFn: (notificationId) => notificationsService.deleteNotification(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] })
        },
    })

    return {
        notificationsQuery,
        unreadCountQuery,
        markReadMutation,
        markAllReadMutation,
        deleteMutation,
    }
}
