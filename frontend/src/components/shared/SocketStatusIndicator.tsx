'use client'

import useSocket from '@/hooks/useSocket'

export default function SocketStatusIndicator() {
    const { isSocketConnected } = useSocket()

    return (
        <div className="flex items-center gap-2">
            <div
                className={`w-2.5 h-2.5 rounded-full ${
                    isSocketConnected ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`}
            />
            <span className="text-xs font-medium text-gray-600">
                {isSocketConnected ? 'Live' : 'Offline'}
            </span>
        </div>
    )
}
