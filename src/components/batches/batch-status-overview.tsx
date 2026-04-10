'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { cn } from '@/lib/utils'
import { getStatusColor } from '@/lib/services'
import { Skeleton } from '@/components/ui/skeleton'

interface StatusCounts {
  [status: string]: number
}

const STATUS_DISPLAY = [
  { key: 'IN_PRODUCTION', label: '生产中', dotClass: 'bg-amber-400' },
  { key: 'QC_PENDING', label: '待质检', dotClass: 'bg-yellow-400' },
  { key: 'QC_IN_PROGRESS', label: '质检中', dotClass: 'bg-orange-400' },
  { key: 'QC_PASS', label: '质检合格', dotClass: 'bg-emerald-400' },
  { key: 'COA_PENDING', label: '待生成CoA', dotClass: 'bg-violet-400' },
  { key: 'COA_SUBMITTED', label: 'CoA已提交', dotClass: 'bg-sky-400' },
  { key: 'COA_APPROVED', label: 'CoA已批准', dotClass: 'bg-teal-400' },
  { key: 'RELEASED', label: '已放行', dotClass: 'bg-green-500' },
  { key: 'QC_FAIL', label: '不合格', dotClass: 'bg-red-400' },
  { key: 'REJECTED', label: '已退回', dotClass: 'bg-rose-400' },
  { key: 'SCRAPPED', label: '已报废', dotClass: 'bg-gray-400' },
]

interface BatchStatusOverviewProps {
  /** Max number of items to show (default: all) */
  maxItems?: number
  /** Show skeleton placeholder */
  className?: string
}

export function BatchStatusOverview({ maxItems, className }: BatchStatusOverviewProps) {
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatusCounts()
  }, [])

  const fetchStatusCounts = async () => {
    try {
      const res = await authFetch('/api/batches?pageSize=1')
      if (res.ok) {
        const data = await res.json()
        setStatusCounts(data.statusCounts || {})
      }
    } catch {
      // Silently fail, show zeros
    } finally {
      setLoading(false)
    }
  }

  const displayItems = maxItems
    ? STATUS_DISPLAY.slice(0, maxItems)
    : STATUS_DISPLAY

  if (loading) {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-4 w-6" />
          </div>
        ))}
      </div>
    )
  }

  // Filter to only show statuses with count > 0
  const activeItems = displayItems.filter(
    (item) => (statusCounts[item.key] || 0) > 0
  )

  if (activeItems.length === 0) {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <div className="px-2 py-1.5 text-sm text-muted-foreground">
          暂无批次数据
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {activeItems.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between px-2 py-1.5 text-sm"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 rounded-full shrink-0',
                item.dotClass
              )}
            />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
          <span className="font-medium tabular-nums">
            {statusCounts[item.key] || 0}
          </span>
        </div>
      ))}
    </div>
  )
}
