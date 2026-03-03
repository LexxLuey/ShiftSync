'use client'

import { formatDistanceToNow } from 'date-fns'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { ActiveShift } from '@/lib/api/types'

interface ActiveShiftsListProps {
    shifts: ActiveShift[]
    isLoading?: boolean
}

export default function ActiveShiftsList({
    shifts,
    isLoading = false,
}: ActiveShiftsListProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-200 rounded-lg h-32 animate-pulse" />
                ))}
            </div>
        )
    }

    if (shifts.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No active shifts right now</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift) => (
                <Card key={shift.id} className="p-4">
                    <div className="space-y-3">
                        {/* Header */}
                        <div>
                            <h3 className="font-semibold text-lg text-gray-900">
                                {shift.locationName}
                            </h3>
                            <Badge className="mt-1">
                                {shift.skill?.name || 'Unknown Skill'}
                            </Badge>
                        </div>

                        {/* Time Info */}
                        <div className="text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                                <span>
                                    Currently working
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {new Date(shift.startTime).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}{' '}
                                to{' '}
                                {new Date(shift.endTime).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                        </div>

                        {/* Staffing Info */}
                        <div className="border-t pt-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">
                                Staff ({shift.assignedStaff.length}/{shift.headcountNeeded})
                            </div>
                            <div className="space-y-1">
                                {shift.assignedStaff.map((staff) => (
                                    <div
                                        key={staff.id}
                                        className="text-sm text-gray-600 flex items-center gap-2"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                                            {staff.firstName.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {staff.firstName} {staff.lastName}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {shift.assignedStaff.length < shift.headcountNeeded && (
                                <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                                    {shift.headcountNeeded - shift.assignedStaff.length} more staff
                                    needed
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}
