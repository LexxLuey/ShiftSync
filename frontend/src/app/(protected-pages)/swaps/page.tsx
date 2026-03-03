'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import useShifts from '@/hooks/useShifts'
import useSwaps from '@/hooks/useSwaps'
import SwapRequestModal from '@/components/swaps/SwapRequestModal'
import SwapDetailModal from '@/components/swaps/SwapDetailModal'
import SwapList from '@/components/swaps/SwapList'
import Button from '@/components/ui/Button'
import type { SwapRequest, SwapStatus } from '@/@types/swaps'
import type { Shift } from '@/lib/api/types'

type TabType = 'my-shifts' | 'my-requests' | 'pickups' | 'pending-approvals'

export default function Page() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('my-shifts')
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false)
  const [selectedSwap, setSelectedSwap] = useState<SwapRequest | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<SwapStatus | undefined>()

  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  // Queries
  const { shiftsQuery } = useShifts(null)
  const { getSwapRequestsQuery } = useSwaps()

  const swapsQuery = getSwapRequestsQuery({
    status: statusFilter,
    limit: 100,
  })

  // Filter shifts to only assigned ones
  const myShifts = useMemo(() => {
    const shifts = (shiftsQuery.data?.data ?? shiftsQuery.data?.shifts ?? []) as Shift[]
    if (!shifts.length) return []
    return shifts.filter((shift: Shift) =>
      shift.assignments?.some((a) => a.userId === user?.id)
    )
  }, [shiftsQuery.data, user?.id])

  // Filter swaps for my requests (requester or target)
  const myRequests = useMemo(() => {
    if (!swapsQuery.data?.data) return []
    return swapsQuery.data.data.filter(
      (swap) => swap.requestingUserId === user?.id || swap.targetUserId === user?.id
    )
  }, [swapsQuery.data?.data, user?.id])

  // Filter swaps for pickups (drop requests available for pickup)
  const pickups = useMemo(() => {
    if (!swapsQuery.data?.data) return []
    return swapsQuery.data.data.filter((swap) => swap.type === 'DROP' && swap.status === 'PENDING')
  }, [swapsQuery.data?.data])

  // Filter swaps for manager approval
  const pendingApprovals = useMemo(() => {
    if (!swapsQuery.data?.data) return []
    return swapsQuery.data.data.filter((swap) => swap.status === 'PENDING')
  }, [swapsQuery.data?.data])

  const handleOpenSwapModal = (shiftId: string) => {
    setSelectedShiftId(shiftId)
    setIsSwapModalOpen(true)
  }

  const handleSwapDetail = (swap: SwapRequest) => {
    setSelectedSwap(swap)
    setIsDetailModalOpen(true)
  }

  const handleRefresh = () => {
    swapsQuery.refetch()
    shiftsQuery.refetch()
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Swap Requests</h1>
        <Button onClick={handleRefresh} variant="plain">
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-8">
        {!isManager && (
          <>
            <button
              onClick={() => setActiveTab('my-shifts')}
              className={`py-3 border-b-2 transition ${
                activeTab === 'my-shifts'
                  ? 'border-blue-500 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-600'
              }`}
            >
              My Shifts
            </button>
            <button
              onClick={() => setActiveTab('my-requests')}
              className={`py-3 border-b-2 transition ${
                activeTab === 'my-requests'
                  ? 'border-blue-500 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-600'
              }`}
            >
              My Requests
            </button>
            <button
              onClick={() => setActiveTab('pickups')}
              className={`py-3 border-b-2 transition ${
                activeTab === 'pickups'
                  ? 'border-blue-500 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-600'
              }`}
            >
              Pickups
            </button>
          </>
        )}
        {isManager && (
          <button
            onClick={() => setActiveTab('pending-approvals')}
            className={`py-3 border-b-2 transition ${
              activeTab === 'pending-approvals'
                ? 'border-blue-500 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600'
            }`}
          >
            Pending Approvals
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* My Shifts Tab */}
        {activeTab === 'my-shifts' && (
          <div className="space-y-4">
            {shiftsQuery.isLoading && <div className="text-center py-8">Loading shifts...</div>}

            {myShifts.length === 0 && !shiftsQuery.isLoading && (
              <div className="text-center py-8 text-gray-500">No assigned shifts</div>
            )}

            {myShifts.length > 0 && (
              <div className="grid gap-4">
                {myShifts.map((shift: Shift) => (
                  <div
                    key={shift.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{(shift as any).location?.name || 'Location'}</div>
                        <div className="text-gray-600 text-sm">
                          {new Date(shift.startTime).toLocaleDateString()} •{' '}
                          {new Date(shift.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          -{' '}
                          {new Date(shift.endTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-gray-600 text-sm">
                          Skill: {(shift as any).requiredSkill?.name || 'Any'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleOpenSwapModal(shift.id)}
                        >
                          Request Swap
                        </Button>
                        <Button
                          size="sm"
                          variant="plain"
                          onClick={() => handleOpenSwapModal(shift.id)}
                        >
                          Drop Shift
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Requests Tab */}
        {activeTab === 'my-requests' && (
          <SwapList
            swaps={myRequests}
            isLoading={swapsQuery.isLoading}
            onRowClick={handleSwapDetail}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        )}

        {/* Pickups Tab */}
        {activeTab === 'pickups' && (
          <SwapList
            swaps={pickups}
            isLoading={swapsQuery.isLoading}
            onRowClick={handleSwapDetail}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        )}

        {/* Pending Approvals Tab */}
        {activeTab === 'pending-approvals' && (
          <SwapList
            swaps={pendingApprovals}
            isLoading={swapsQuery.isLoading}
            onRowClick={handleSwapDetail}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        )}
      </div>

      {/* Modals */}
      <SwapRequestModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        shiftId={selectedShiftId || ''}
        onSuccess={() => {
          setIsSwapModalOpen(false)
          handleRefresh()
        }}
      />

      <SwapDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        swap={selectedSwap}
        onSuccess={() => {
          setIsDetailModalOpen(false)
          handleRefresh()
        }}
      />
    </div>
  )
}
