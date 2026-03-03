import { format } from 'date-fns'
import type { Shift } from '@/lib/api/types'

interface ShiftCardProps {
    shift: Shift
}

export default function ShiftCard({ shift }: ShiftCardProps) {
    const statusColor =
        shift.status === 'PUBLISHED' ? 'bg-green-100 border-green-300' : 'bg-blue-100 border-blue-300'

    const startTime = format(new Date(shift.startTime), 'h:mm a')
    const endTime = format(new Date(shift.endTime), 'h:mm a')

    return (
        <div className={`rounded-md p-2 text-xs border ${statusColor}`}>
            <div className="font-semibold truncate">{startTime}</div>
            <div className="text-gray-600">{shift.headcountNeeded} staff</div>
            <div className="text-gray-500">{shift.status}</div>
        </div>
    )
}
