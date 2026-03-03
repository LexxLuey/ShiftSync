'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import useAuditLogs from '@/hooks/useAuditLogs'
import useSocketEvents from '@/hooks/useSocketEvents'
import AuditLogTable from '@/components/shared/AuditLogTable'
import type { GetAuditLogsParams } from '@/lib/api/types'

export default function AuditLogsPage() {
    const { user } = useAuth()
    const [filters, setFilters] = useState<GetAuditLogsParams>({ limit: 50, offset: 0 })

    // Setup socket events
    useSocketEvents()

    // Fetch audit logs
    const auditLogsQuery = useAuditLogs({
        ...filters,
        limit: 50,
        offset: 0,
    })

    // Role-based access check
    const isAuthorized = user?.role === 'ADMIN' || user?.role === 'MANAGER'

    if (!isAuthorized) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p className="text-gray-600 mt-2">You don't have permission to view audit logs.</p>
            </div>
        )
    }

    const handleFiltersChange = (newFilters: Record<string, unknown>) => {
        setFilters({
            ...filters,
            ...newFilters,
            offset: 0, // Reset pagination on filter change
        })
    }

    const logs = auditLogsQuery.data?.data ?? []
    const count = auditLogsQuery.data?.count ?? 0

    return (
        <div className="space-y-6 p-4">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
                <p className="text-gray-600 mt-2">
                    View all system changes and user actions
                </p>
            </div>

            {/* Table */}
            <AuditLogTable
                logs={logs}
                isLoading={auditLogsQuery.isLoading}
                count={count}
                onFiltersChange={handleFiltersChange}
            />
        </div>
    )
}
