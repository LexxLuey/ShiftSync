'use client'

import { useState } from 'react'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

type ReportTableProps<T> = {
    data: T[]
    columns: ReturnType<ReturnType<typeof createColumnHelper<T>>['accessor']>[]
    title?: string
    onExport?: () => void
    isLoading?: boolean
}

export default function ReportTable<T>({ data, columns, title, onExport, isLoading }: ReportTableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([])

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    if (isLoading) {
        return (
            <Card className="w-full overflow-hidden">
                <div className="flex items-center justify-center p-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
                </div>
            </Card>
        )
    }

    return (
        <Card className="w-full overflow-x-auto">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
                {title && <h3 className="text-lg font-semibold">{title}</h3>}
                {onExport && (
                    <Button onClick={onExport} size="sm" variant="plain">
                        Export CSV
                    </Button>
                )}
            </div>
            <table className="w-full">
                <thead className="bg-gray-50">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th key={header.id} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    <button
                                        onClick={header.column.getToggleSortingHandler()}
                                        className="flex items-center gap-2 hover:text-gray-700"
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {header.column.getCanSort() && (
                                            <span className="text-xs">
                                                {header.column.getIsSorted() === 'asc' && ' ▲'}
                                                {header.column.getIsSorted() === 'desc' && ' ▼'}
                                            </span>
                                        )}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {table.getRowModel().rows.length === 0 ? (
                        <tr>
                            <td colSpan={table.getAllColumns().length} className="px-6 py-8 text-center text-gray-500">
                                No data available
                            </td>
                        </tr>
                    ) : (
                        table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="whitespace-nowrap px-6 py-4 text-sm">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </Card>
    )
}
