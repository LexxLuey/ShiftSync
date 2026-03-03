'use client'

import { useEffect, useState } from 'react'
import useNotifications from '@/hooks/useNotifications'
import Button from '@/components/ui/Button'
import Drawer from '@/components/ui/Drawer'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false)
    const { notificationsQuery, unreadCountQuery, markReadMutation, markAllReadMutation, deleteMutation } =
        useNotifications()

    const unreadCount = unreadCountQuery.data?.count ?? 0

    const handleMarkRead = (notificationId: string) => {
        markReadMutation.mutate(notificationId)
    }

    const handleMarkAllRead = () => {
        markAllReadMutation.mutate()
    }

    const handleDelete = (notificationId: string) => {
        deleteMutation.mutate(notificationId)
    }

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'shift:assigned':
                return '📅'
            case 'shift:updated':
                return '✏️'
            case 'shift:cancelled':
                return '❌'
            case 'shift:published':
                return '📢'
            case 'swap:created':
                return '🔄'
            case 'swap:approved':
                return '✅'
            case 'swap:rejected':
                return '❌'
            case 'overtime:warning':
                return '⚠️'
            default:
                return '🔔'
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="relative inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100"
            >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} title="Notifications">
                <div className="flex flex-col gap-3 p-4">
                    {unreadCount > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleMarkAllRead}
                                className="flex-1 rounded bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600"
                            >
                                Mark All Read
                            </button>
                        </div>
                    )}

                    {notificationsQuery.isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                        </div>
                    ) : notificationsQuery.data?.data.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-500">No notifications</div>
                    ) : (
                        <div className="space-y-2">
                            {notificationsQuery.data?.data.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`flex gap-3 rounded-lg border p-3 ${
                                        notification.isRead ? 'bg-white' : 'bg-blue-50'
                                    }`}
                                >
                                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                        {!notification.isRead && (
                                            <button
                                                onClick={() => handleMarkRead(notification.id)}
                                                className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                                            >
                                                Read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(notification.id)}
                                            className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Drawer>
        </>
    )
}
