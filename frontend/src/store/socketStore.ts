import { create } from 'zustand'

export type RealtimeEvent = {
    type: string
    entityId?: string
    timestamp: string
}

type AppRealtimeState = {
    isSocketConnected: boolean
    unreadNotificationCount: number
    lastEvent?: RealtimeEvent
    setSocketConnected: (isConnected: boolean) => void
    setUnreadNotificationCount: (count: number) => void
    incrementUnread: (by?: number) => void
    setLastEvent: (event: RealtimeEvent) => void
    resetRealtimeState: () => void
}

export const useAppRealtimeStore = create<AppRealtimeState>((set) => ({
    isSocketConnected: false,
    unreadNotificationCount: 0,
    lastEvent: undefined,
    setSocketConnected: (isConnected) =>
        set({ isSocketConnected: isConnected }),
    setUnreadNotificationCount: (count) =>
        set({ unreadNotificationCount: Math.max(0, count) }),
    incrementUnread: (by = 1) =>
        set((state) => ({
            unreadNotificationCount: Math.max(
                0,
                state.unreadNotificationCount + by,
            ),
        })),
    setLastEvent: (event) => set({ lastEvent: event }),
    resetRealtimeState: () =>
        set({
            isSocketConnected: false,
            unreadNotificationCount: 0,
            lastEvent: undefined,
        }),
}))
