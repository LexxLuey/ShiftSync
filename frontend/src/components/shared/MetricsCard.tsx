'use client'

import Card from '@/components/ui/Card'

type MetricsCardProps = {
    label: string
    value: string | number
    subtext?: string
    color?: 'green' | 'yellow' | 'red' | 'blue'
    progress?: number
}

export default function MetricsCard({ label, value, subtext, color = 'blue', progress }: MetricsCardProps) {
    const colorClasses = {
        green: 'bg-green-50 border-green-200',
        yellow: 'bg-yellow-50 border-yellow-200',
        red: 'bg-red-50 border-red-200',
        blue: 'bg-blue-50 border-blue-200',
    }

    const textColorClasses = {
        green: 'text-green-700',
        yellow: 'text-yellow-700',
        red: 'text-red-700',
        blue: 'text-blue-700',
    }

    const progressColorClasses = {
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        red: 'bg-red-500',
        blue: 'bg-blue-500',
    }

    return (
        <Card className={`border-2 p-4 ${colorClasses[color]}`}>
            <p className="text-xs font-medium text-gray-600">{label}</p>
            <p className={`mt-2 text-3xl font-bold ${textColorClasses[color]}`}>{value}</p>
            {subtext && <p className="mt-1 text-xs text-gray-500">{subtext}</p>}
            {progress !== undefined && (
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                        className={`h-full ${progressColorClasses[color]} transition-all duration-300`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                </div>
            )}
        </Card>
    )
}
