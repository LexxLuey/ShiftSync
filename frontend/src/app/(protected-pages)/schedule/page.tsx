'use client'

import { useState, useMemo } from 'react'
import { format, addDays, startOfWeek, parse } from 'date-fns'
import useShifts from '@/hooks/useShifts'
import useLocations from '@/hooks/useLocations'
import { Select } from '@/components/ui'
import ShiftCard from '@/components/shifts/ShiftCard'
import ShiftCreateModal from '@/components/shifts/ShiftCreateModal'
import ShiftDetailModal from '@/components/shifts/ShiftDetailModal'
import type { Shift } from '@/lib/api/types'

export default function SchedulePage() {
    const [locationId, setLocationId] = useState<string>('')
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
        date: Date
        hour: number
    } | null>(null)

    const { locationsQuery } = useLocations()
    const { shiftsQuery, createShiftMutation, updateShiftMutation, deleteShiftMutation, publishShiftMutation } = useShifts(
        locationId
            ? {
                  locationId,
                  startDate: format(addDays(startOfWeek(selectedDate), 0), 'yyyy-MM-dd'),
                  endDate: format(addDays(startOfWeek(selectedDate), 6), 'yyyy-MM-dd'),
              }
            : null,
    )

    const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate])
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    }, [weekStart])

    const hours = Array.from({ length: 14 }, (_, i) => i + 9) // 9am to 11pm

    const shiftsMap = useMemo(() => {
        const map = new Map<string, Shift[]>()
        shiftsQuery.data?.shifts?.forEach((shift: Shift) => {
            const date = format(new Date(shift.startTime), 'yyyy-MM-dd')
            if (!map.has(date)) {
                map.set(date, [])
            }
            map.get(date)!.push(shift)
        })
        return map
    }, [shiftsQuery.data])

    const getShiftsForSlot = (date: Date, hour: number): Shift[] => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayShifts = shiftsMap.get(dateStr) || []
        return dayShifts.filter((shift) => {
            const startHour = parseInt(shift.startTime.split('T')[1].split(':')[0])
            return startHour === hour
        })
    }

    if (!locationsQuery.data?.data?.length) {
        return (
            <div className="p-6">
                <p>No locations available. Please contact an administrator.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-end gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <Select
                        instanceId="location-select"
                        options={locationsQuery.data.data.map((loc: any) => ({
                            label: loc.name,
                            value: loc.id,
                        }))}
                        value={
                            locationsQuery.data.data
                                .map((loc: any) => ({
                                    label: loc.name,
                                    value: loc.id,
                                }))
                                .find((opt: any) => opt.value === locationId) || null
                        }
                        onChange={(val: any) => setLocationId(val?.value || '')}
                        placeholder="Select location..."
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() =>
                            setSelectedDate(addDays(selectedDate, -7))
                        }
                        className="px-3 py-2 border rounded hover:bg-gray-50"
                    >
                        ← Prev Week
                    </button>
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="px-3 py-2 border rounded hover:bg-gray-50"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                        className="px-3 py-2 border rounded hover:bg-gray-50"
                    >
                        Next Week →
                    </button>
                </div>
            </div>

            {locationId && (
                <div className="overflow-x-auto border rounded-lg">
                    <div className="min-w-max">
                        {/* Header */}
                        <div className="flex bg-gray-100 border-b">
                            <div className="w-16 flex-shrink-0 border-r p-2 text-sm font-semibold">
                                Time
                            </div>
                            {weekDays.map((day) => (
                                <div
                                    key={day.toISOString()}
                                    className="flex-1 min-w-32 border-r p-2 text-center text-sm font-semibold"
                                >
                                    <div>{format(day, 'EEE')}</div>
                                    <div className="text-xs text-gray-600">
                                        {format(day, 'MMM d')}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Time slots */}
                        {hours.map((hour) => (
                            <div key={hour} className="flex border-b">
                                <div className="w-16 flex-shrink-0 border-r p-2 text-xs font-medium text-gray-600">
                                    {hour}:00
                                </div>
                                {weekDays.map((day) => {
                                    const shiftsInSlot = getShiftsForSlot(day, hour)
                                    return (
                                        <div
                                            key={`${day.toISOString()}-${hour}`}
                                            className="flex-1 min-w-32 border-r p-2 min-h-20 bg-white hover:bg-gray-50 cursor-pointer relative"
                                            onClick={() => {
                                                if (shiftsInSlot.length === 0) {
                                                    setSelectedTimeSlot({ date: day, hour })
                                                    setIsCreateModalOpen(true)
                                                }
                                            }}
                                        >
                                            {shiftsInSlot.length > 0 ? (
                                                <div className="space-y-1">
                                                    {shiftsInSlot.map((shift) => (
                                                        <div
                                                            key={shift.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setSelectedShift(shift)
                                                                setIsDetailModalOpen(true)
                                                            }}
                                                        >
                                                            <ShiftCard shift={shift} />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-400">+</div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <ShiftCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false)
                    setSelectedTimeSlot(null)
                }}
                locationId={locationId}
                initialDate={selectedTimeSlot?.date}
                initialHour={selectedTimeSlot?.hour}
            />

            {selectedShift && (
                <ShiftDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => {
                        setIsDetailModalOpen(false)
                        setSelectedShift(null)
                    }}
                    shift={selectedShift}
                    locationId={locationId}
                />
            )}
        </div>
    )
}
