'use client'

import { useMemo } from 'react'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import Button from '@/components/ui/Button'
import type { SwapRequest, SwapStatus } from '@/@types/swaps'
import { formatShiftTime } from '@/lib/utils/dateFormatting'

interface SwapListProps {
  swaps: SwapRequest[]
  isLoading?: boolean
  onRowClick?: (swap: SwapRequest) => void
  statusFilter?: SwapStatus
  onStatusFilterChange?: (status: SwapStatus | undefined) => void
}

const columnHelper = createColumnHelper<SwapRequest>()

const statusColorMap = {
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-800', label: 'Pending' },
  APPROVED: { bg: 'bg-green-50', text: 'text-green-800', label: 'Approved' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-800', label: 'Rejected' },
  CANCELLED: { bg: 'bg-gray-50', text: 'text-gray-800', label: 'Cancelled' },
  EXPIRED: { bg: 'bg-gray-50', text: 'text-gray-800', label: 'Expired' },
}

const typeColorMap = {
  SWAP: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Swap' },
  DROP: { bg: 'bg-red-100', text: 'text-red-800', label: 'Drop' },
}

export default function SwapList({
  swaps,
  isLoading,
  onRowClick,
  statusFilter,
  onStatusFilterChange,
}: SwapListProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('shift', {
        header: 'Shift',
        cell: (info) => (
          <div className="text-sm">
            <div className="font-medium">{info.getValue().location.name}</div>
            <div className="text-gray-600 text-xs">
              {formatShiftTime(
                info.getValue().startTime,
                info.getValue().endTime,
                info.getValue().location.timezone
              )}
            </div>
          </div>
        ),
        size: 140,
      }),
      columnHelper.accessor('requestingUser', {
        header: 'Requester',
        cell: (info) => (
          <div className="text-sm">
            <div className="font-medium">
              {info.getValue().firstName} {info.getValue().lastName}
            </div>
          </div>
        ),
        size: 120,
      }),
      columnHelper.accessor('targetUser', {
        header: 'Target',
        cell: (info) => {
          const target = info.getValue()
          return (
            <div className="text-sm">
              {target ? (
                <div className="font-medium">
                  {target.firstName} {target.lastName}
                </div>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          )
        },
        size: 120,
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => {
          const type = info.getValue()
          const colors = typeColorMap[type]
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
              {colors.label}
            </span>
          )
        },
        size: 90,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue()
          const colors = statusColorMap[status]
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
              {colors.label}
            </span>
          )
        },
        size: 100,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="plain"
            onClick={() => onRowClick?.(row.original)}
          >
            View
          </Button>
        ),
        size: 80,
      }),
    ],
    [onRowClick]
  )

  const table = useReactTable({
    data: swaps,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (swaps.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No swap requests found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === undefined ? 'solid' : 'plain'}
          onClick={() => onStatusFilterChange?.(undefined)}
          size="sm"
        >
          All
        </Button>
        {(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'] as const).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'solid' : 'plain'}
            onClick={() => onStatusFilterChange?.(status)}
            size="sm"
          >
            {statusColorMap[status].label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-semibold text-gray-700"
                    style={{ width: header.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b hover:bg-gray-50 cursor-pointer transition"
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3"
                    style={{ width: cell.column.columnDef.size }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
