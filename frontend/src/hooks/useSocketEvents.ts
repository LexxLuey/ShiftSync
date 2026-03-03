'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from '@/components/ui/toast'
import useSocket from './useSocket'

export default function useSocketEvents() {
    const queryClient = useQueryClient()
    const { socket } = useSocket()

    useEffect(() => {
        if (!socket) {
            return
        }

        // Shift events
        socket.on('shift:created', () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['fairness'] })
            queryClient.invalidateQueries({ queryKey: ['hoursDistribution'] })
            queryClient.invalidateQueries({ queryKey: ['projection'] })
            toast.push('New shift created', { placement: 'top-end' })
        })

        socket.on('shift:updated', () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['fairness'] })
            queryClient.invalidateQueries({ queryKey: ['hoursDistribution'] })
            queryClient.invalidateQueries({ queryKey: ['projection'] })
            toast.push('Shift updated', { placement: 'top-end' })
        })

        socket.on('shift:published', () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['fairness'] })
            queryClient.invalidateQueries({ queryKey: ['hoursDistribution'] })
            queryClient.invalidateQueries({ queryKey: ['projection'] })
            toast.push('Shifts published', { placement: 'top-end' })
        })

        // Assignment events
        socket.on('assignment:changed', (payload: any) => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['assignments'] })
            queryClient.invalidateQueries({ queryKey: ['fairness'] })
            queryClient.invalidateQueries({ queryKey: ['hoursDistribution'] })
            queryClient.invalidateQueries({ queryKey: ['projection'] })
            const action =
                payload?.action === 'ASSIGNED'
                    ? 'Staff assigned to shift'
                    : 'Staff removed from shift'
            toast.push(action, { placement: 'top-end' })
        })

        // Swap events
        socket.on('swap:created', () => {
            queryClient.invalidateQueries({ queryKey: ['swaps'] })
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] })
            toast.push('Swap request received', { placement: 'top-end' })
        })

        socket.on('swap:updated', () => {
            queryClient.invalidateQueries({ queryKey: ['swaps'] })
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] })
            toast.push('Swap status changed', { placement: 'top-end' })
        })

        // Conflict events
        socket.on('conflict:detected', (payload: any) => {
            toast.push(payload?.message || 'Conflict detected', {
                placement: 'top-end',
            })
        })

        // Notification events (Phase 6)
        socket.on('notification:created', () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] })
        })

        return () => {
            socket.off('shift:created')
            socket.off('shift:updated')
            socket.off('shift:published')
            socket.off('assignment:changed')
            socket.off('swap:created')
            socket.off('swap:updated')
            socket.off('conflict:detected')
            socket.off('notification:created')
        }
    }, [socket, queryClient])

    return { isSetup: Boolean(socket) }
}
