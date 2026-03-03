'use client'

import { useMemo, useState } from 'react'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import Dialog from '@/components/ui/Dialog/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import toast from '@/components/ui/toast'
import { format } from 'date-fns'
import { auditService } from '@/lib/api/auditService'
import type { AuditLog, AuditAction, AuditEntity } from '@/lib/api/types'

interface AuditLogTableProps {
    logs: AuditLog[]
    isLoading?: boolean
    count?: number
    onFiltersChange?: (filters: Record<string, unknown>) => void
}

const columnHelper = createColumnHelper<AuditLog>()

const actionColors: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
    PUBLISH: 'bg-purple-100 text-purple-800',
    ASSIGN: 'bg-cyan-100 text-cyan-800',
    REASSIGN: 'bg-cyan-100 text-cyan-800',
    UNASSIGN: 'bg-yellow-100 text-yellow-800',
}

const entityColors: Record<string, string> = {
    SHIFT: 'bg-indigo-50 text-indigo-700',
    ASSIGNMENT: 'bg-pink-50 text-pink-700',
    SWAP_REQUEST: 'bg-orange-50 text-orange-700',
    USER: 'bg-teal-50 text-teal-700',
    LOCATION: 'bg-violet-50 text-violet-700',
    CERTIFICATION: 'bg-emerald-50 text-emerald-700',
}

export default function AuditLogTable({
    logs,
    isLoading = false,
    count = 0,
    onFiltersChange,
}: AuditLogTableProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [filterAction, setFilterAction] = useState<string>('')
    const [filterEntity, setFilterEntity] = useState<string>('')
    const [filterStartDate, setFilterStartDate] = useState<Date | null>(null)
    const [filterEndDate, setFilterEndDate] = useState<Date | null>(null)
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
    const [showDiffDialog, setShowDiffDialog] = useState(false)

    const handleApplyFilters = () => {
        const filters: Record<string, unknown> = {}
        if (filterAction) filters.action = filterAction
        if (filterEntity) filters.entityType = filterEntity
        if (filterStartDate) filters.startDate = filterStartDate.toISOString().split('T')[0]
        if (filterEndDate) filters.endDate = filterEndDate.toISOString().split('T')[0]
        onFiltersChange?.(filters)
    }

    const handleExport = async () => {
        try {
            const filters: Record<string, unknown> = {}
            if (filterAction) filters.action = filterAction
            if (filterEntity) filters.entityType = filterEntity
            if (filterStartDate) filters.startDate = filterStartDate.toISOString().split('T')[0]
            if (filterEndDate) filters.endDate = filterEndDate.toISOString().split('T')[0]

            const blob = await auditService.exportAuditLogs(filters)
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
            a.click()
            window.URL.revokeObjectURL(url)
            toast.push('Audit logs exported successfully', { placement: 'top-end' })
        } catch (error) {
            toast.push('Failed to export audit logs', { placement: 'top-end' })
        }
    }

    const toggleRowExpansion = (logId: string) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(logId)) {
            newExpanded.delete(logId)
        } else {
            newExpanded.add(logId)
        }
        setExpandedRows(newExpanded)
    }

    const columns = useMemo(
        () => [
            columnHelper.accessor('createdAt', {
                header: 'Timestamp',
                cell: (info) => (
                    <div className="text-sm">
                        {format(new Date(info.getValue()), 'MMM dd, yyyy HH:mm:ss')}
                    </div>
                ),
                size: 180,
            }),
            columnHelper.accessor('user', {
                header: 'User',
                cell: (info) => (
                    <div className="text-sm">
                        <div className="font-medium">
                            {info.getValue().firstName} {info.getValue().lastName}
                        </div>
                        <div className="text-gray-500 text-xs">{info.getValue().email}</div>
                    </div>
                ),
                size: 180,
            }),
            columnHelper.accessor('action', {
                header: 'Action',
                cell: (info) => (
                    <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                            actionColors[info.getValue()] ||
                            'bg-gray-100 text-gray-800'
                        }`}
                    >
                        {info.getValue()}
                    </span>
                ),
                size: 120,
            }),
            columnHelper.accessor('entityType', {
                header: 'Entity Type',
                cell: (info) => (
                    <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                            entityColors[info.getValue()] ||
                            'bg-gray-100 text-gray-800'
                        }`}
                    >
                        {info.getValue()}
                    </span>
                ),
                size: 130,
            }),
            columnHelper.accessor('entityId', {
                header: 'Entity ID',
                cell: (info) => <div className="text-sm font-mono text-gray-600">{info.getValue().substring(0, 8)}...</div>,
                size: 120,
            }),
            columnHelper.display({
                header: 'Actions',
                cell: (info) => (
                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                setSelectedLog(info.row.original)
                                setShowDiffDialog(true)
                            }}
                            size="sm"
                            variant="plain"
                            className="text-xs"
                        >
                            View
                        </Button>
                    </div>
                ),
                size: 100,
            }),
        ],
        []
    )

    const table = useReactTable({
        data: logs,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Action
                        </label>
                        <Input
                            type="text"
                            placeholder="Filter by action..."
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Entity Type
                        </label>
                        <Input
                            type="text"
                            placeholder="Filter by entity..."
                            value={filterEntity}
                            onChange={(e) => setFilterEntity(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date
                        </label>
                        <DatePicker
                            value={filterStartDate}
                            onChange={(val) => setFilterStartDate(val)}
                            placeholder="From..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Date
                        </label>
                        <DatePicker
                            value={filterEndDate}
                            onChange={(val) => setFilterEndDate(val)}
                            placeholder="To..."
                        />
                    </div>
                    <div className="flex gap-2 items-end">
                        <Button onClick={handleApplyFilters} size="sm">
                            Apply
                        </Button>
                        <Button onClick={handleExport} variant="plain" size="sm">
                            Export CSV
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="bg-gray-100 border-b">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-700"
                                        style={{
                                            width:
                                                header.getSize() === 150
                                                    ? undefined
                                                    : `${header.getSize()}px`,
                                        }}
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext(),
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    No audit logs found
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr key={row.id} className="border-b hover:bg-gray-50">
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className="px-4 py-3"
                                            style={{
                                                width:
                                                    cell.column.getSize() === 150
                                                        ? undefined
                                                        : `${cell.column.getSize()}px`,
                                            }}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination info */}
            <div className="text-sm text-gray-600">
                Showing {logs.length} of {count} logs
            </div>

            {/* Diff Dialog */}
            {selectedLog && (
                <Dialog
                    isOpen={showDiffDialog}
                    onRequestClose={() => {
                        setShowDiffDialog(false)
                        setSelectedLog(null)
                    }}
                >
                    <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                        <h2 className="text-lg font-semibold">Audit Log Details</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-700">
                                    Entity
                                </label>
                                <p className="text-sm text-gray-600">
                                    {selectedLog.entityType} ({selectedLog.entityId.substring(0, 8)}...)
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">
                                    Action
                                </label>
                                <p className="text-sm text-gray-600">{selectedLog.action}</p>
                            </div>
                        </div>

                        {selectedLog.beforeState && (
                            <div>
                                <label className="text-sm font-semibold text-gray-700">
                                    Before
                                </label>
                                <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-32">
                                    {JSON.stringify(selectedLog.beforeState, null, 2)}
                                </pre>
                            </div>
                        )}

                        {selectedLog.afterState && (
                            <div>
                                <label className="text-sm font-semibold text-gray-700">
                                    After
                                </label>
                                <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-32">
                                    {JSON.stringify(selectedLog.afterState, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </Dialog>
            )}
        </div>
    )
}
