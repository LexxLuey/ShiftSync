'use client'

import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { PiBellDuotone } from 'react-icons/pi'

const _NotificationPlaceholder = () => {
    return (
        <button
            type="button"
            className="text-xl p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Notifications"
            title="Notifications (coming soon)"
        >
            <PiBellDuotone />
        </button>
    )
}

const NotificationPlaceholder = withHeaderItem(_NotificationPlaceholder)

export default NotificationPlaceholder
