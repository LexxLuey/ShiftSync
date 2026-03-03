'use client'

import { ApexOptions } from 'apexcharts'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'
const CHART_COLORS = {
    COLOR_1: '#10b981', // green
    COLOR_4: '#f59e0b', // amber
    COLOR_7: '#ef4444', // red
} as const
import Card from '@/components/ui/Card'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type FairnessChartProps = {
    data: Array<{
        name: string
        fairnessScore: number
    }>
    height?: number
}

export default function FairnessChart({ data, height = 400 }: FairnessChartProps) {
    const chartData = useMemo(() => {
        const series = [
            {
                name: 'Fairness Score',
                data: data.map((d) => d.fairnessScore),
            },
        ]

        const options: ApexOptions = {
            chart: {
                type: 'bar',
                height,
                sparkline: { enabled: false },
                foreColor: '#9CA3AF',
                toolbar: { show: false },
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    borderRadius: 4,
                    dataLabels: { position: 'top' },
                    colors: {
                        ranges: [
                            {
                                from: 0,
                                to: 0.8,
                                color: CHART_COLORS.COLOR_1, // Green - fair
                            },
                            {
                                from: 0.8,
                                to: 1.2,
                                color: CHART_COLORS.COLOR_4, // Yellow - balanced
                            },
                            {
                                from: 1.2,
                                to: 10,
                                color: CHART_COLORS.COLOR_7, // Red - unfair
                            },
                        ],
                    },
                },
            },
            dataLabels: {
                enabled: false,
            },
            stroke: { show: false },
            xaxis: {
                categories: data.map((d) => d.name),
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { fontSize: '11px' } },
            },
            yaxis: {
                title: { text: 'Fairness Score' },
                labels: {
                    formatter: (value) => value.toFixed(2),
                },
            },
            tooltip: {
                y: {
                    formatter: (value) => value.toFixed(2),
                },
            },
            grid: {
                borderColor: '#E5E7EB',
                strokeDashArray: 3,
            },
        }

        return { series, options }
    }, [data, height])

    return (
        <Card className="w-full p-4">
            <h3 className="mb-4 text-lg font-semibold">Fairness Distribution</h3>
            <Chart
                options={chartData.options}
                series={chartData.series}
                type="bar"
                height={height}
            />
        </Card>
    )
}
