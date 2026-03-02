'use client'

import { useEffect, useRef } from 'react'
import io from 'socket.io-client'
import appConfig from '@/configs/app.config'
import { useAppRealtimeStore } from '@/store/socketStore'

type UseSocketOptions = {
    enabled?: boolean
    token?: string
}

export default function useSocket(options: UseSocketOptions = {}) {
    const { enabled = true, token } = options
    const socketRef = useRef<any>(null)

    const isSocketConnected = useAppRealtimeStore(
        (state) => state.isSocketConnected,
    )
    const setSocketConnected = useAppRealtimeStore(
        (state) => state.setSocketConnected,
    )
    const setLastEvent = useAppRealtimeStore((state) => state.setLastEvent)
    const incrementUnread = useAppRealtimeStore((state) => state.incrementUnread)

    useEffect(() => {
        if (!enabled || !appConfig.apiBaseUrl) {
            return
        }

        const socket = io(appConfig.apiBaseUrl, {
            transports: ['websocket'],
            auth: token ? { token } : undefined,
        })

        socketRef.current = socket

        socket.on('connect', () => {
            setSocketConnected(true)
        })

        socket.on('disconnect', () => {
            setSocketConnected(false)
        })

        ;(socket as any).onAny(
            (eventName: string, payload: { entityId?: string } | undefined) => {
                setLastEvent({
                    type: String(eventName),
                    entityId: payload?.entityId,
                    timestamp: new Date().toISOString(),
                })

                if (String(eventName).startsWith('notification:')) {
                    incrementUnread(1)
                }
            },
        )

        return () => {
            socket.removeAllListeners()
            socket.disconnect()
            socketRef.current = null
            setSocketConnected(false)
        }
    }, [enabled, token, setSocketConnected, setLastEvent, incrementUnread])

    return {
        socket: socketRef.current,
        isSocketConnected,
    }
}
