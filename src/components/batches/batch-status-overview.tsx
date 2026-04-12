'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { cn } from '@/lib/utils'
import { PRODUCT_LINE_LABELS, PRODUCT_LINE_COLORS } from '@/lib/roles'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FlaskConical,
  Microscope,
  TestTubes,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ============================================
// 按产品线定义状态展示顺序
// ============================================

interface StatusDisplayItem {
  key: string
  label: string
  dotClass: string
}

const PRODUCT_LINE_STATUS_MAP: Record<string, StatusDisplayItem[]> = {
  CELL_PRODUCT: [
    { key: 'NEW', label: '新建', dotClass: 'bg-gray-400' },
    { key: 'IN_PRODUCTION', label: '生产中', dotClass: 'bg-amber-400' },
    { key: 'QC_PENDING', label: '待质检', dotClass: 'bg-yellow-400' },
    { key: 'QC_IN_PROGRESS', label: '质检中', dotClass: 'bg-orange-400' },
    { key: 'QC_PASS', label: '质检合格', dotClass: 'bg-emerald-400' },
    { key: 'COA_SUBMITTED', label: 'CoA已提交', dotClass: 'bg-sky-400' },
    { key: 'RELEASED', label: '已放行', dotClass: 'bg-green-500' },
    { key: 'SCRAPPED', label: '已报废', dotClass: 'bg-stone-400' },
  ],
  SERVICE: [
    { key: 'NEW', label: '新建', dotClass: 'bg-gray-400' },
    { key: 'SAMPLE_RECEIVED', label: '样本已接收', dotClass: 'bg-blue-400' },
    { key: 'IN_PRODUCTION', label: '生产中', dotClass: 'bg-amber-400' },
    { key: 'IDENTIFICATION', label: '鉴定中', dotClass: 'bg-indigo-400' },
    { key: 'REPORT_PENDING', label: '待生成报告', dotClass: 'bg-purple-400' },
    { key: 'COA_SUBMITTED', label: 'CoA已提交', dotClass: 'bg-sky-400' },
    { key: 'RELEASED', label: '已放行', dotClass: 'bg-green-500' },
    { key: 'TERMINATED', label: '已终止', dotClass: 'bg-amber-500' },
    { key: 'SCRAPPED', label: '已报废', dotClass: 'bg-stone-400' },
  ],
  KIT: [
    { key: 'NEW', label: '新建', dotClass: 'bg-gray-400' },
    { key: 'MATERIAL_PREP', label: '物料准备中', dotClass: 'bg-cyan-400' },
    { key: 'IN_PRODUCTION', label: '生产中', dotClass: 'bg-amber-400' },
    { key: 'QC_PENDING', label: '待质检', dotClass: 'bg-yellow-400' },
    { key: 'QC_IN_PROGRESS', label: '质检中', dotClass: 'bg-orange-400' },
    { key: 'QC_PASS', label: '质检合格', dotClass: 'bg-emerald-400' },
    { key: 'COA_SUBMITTED', label: 'CoA已提交', dotClass: 'bg-sky-400' },
    { key: 'RELEASED', label: '已放行', dotClass: 'bg-green-500' },
    { key: 'SCRAPPED', label: '已报废', dotClass: 'bg-stone-400' },
  ],
}

const PRODUCT_LINE_ORDER = ['CELL_PRODUCT', 'SERVICE', 'KIT']
const PRODUCT_LINE_ICONS: Record<string, LucideIcon> = {
  CELL_PRODUCT: FlaskConical,
  SERVICE: Microscope,
  KIT: TestTubes,
}

interface StatusCounts {
  [status: string]: number
}

interface ByProductLine {
  [productLine: string]: StatusCounts
}

interface BatchStatusOverviewProps {
  maxItems?: number
  className?: string
}

export function BatchStatusOverview({ className }: BatchStatusOverviewProps) {
  const [byProductLine, setByProductLine] = useState<ByProductLine>({})
  const [loading, setLoading] = useState(true)
  const [expandedLines, setExpandedLines] = useState<Set<string>>(
    new Set(PRODUCT_LINE_ORDER)
  )

  useEffect(() => {
    fetchStatusCounts()
  }, [])

  const fetchStatusCounts = async () => {
    try {
      const res = await authFetch('/api/batches/status-stats')
      if (res.ok) {
        const data = await res.json()
        setByProductLine(data.byProductLine || {})
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  const toggleLine = (line: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev)
      if (next.has(line)) {
        next.delete(line)
      } else {
        next.add(line)
      }
      return next
    })
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5 px-2 py-1">
            <Skeleton className="h-4 w-20" />
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between px-2 py-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2.5 w-2.5 rounded-full" />
                  <Skeleton className="h-3.5 w-12" />
                </div>
                <Skeleton className="h-3.5 w-5" />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  // Check if there's any data at all
  const hasAnyData = PRODUCT_LINE_ORDER.some(
    (pl) => byProductLine[pl] && Object.values(byProductLine[pl]).some((c) => c > 0)
  )

  if (!hasAnyData) {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <div className="px-2 py-1.5 text-sm text-muted-foreground">
          暂无批次数据
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {PRODUCT_LINE_ORDER.map((productLine) => {
        const counts = byProductLine[productLine] || {}
        const statusDefs = PRODUCT_LINE_STATUS_MAP[productLine] || []
        const totalBatches = Object.values(counts).reduce((a, b) => a + b, 0)

        // Skip product lines with no batches
        if (totalBatches === 0) return null

        const isExpanded = expandedLines.has(productLine)
        const Icon = PRODUCT_LINE_ICONS[productLine]
        const label = PRODUCT_LINE_LABELS[productLine] || productLine

        // Only show statuses with count > 0
        const activeStatuses = statusDefs.filter(
          (s) => (counts[s.key] || 0) > 0
        )

        return (
          <div key={productLine} className="rounded-lg bg-muted/30">
            {/* Product line header — clickable to expand/collapse */}
            <button
              onClick={() => toggleLine(productLine)}
              className="flex items-center justify-between w-full px-2 py-1.5 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <span className="text-xs font-medium">{label}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {totalBatches}
                </span>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>

            {/* Status list — expanded view */}
            {isExpanded && (
              <div className="pb-1.5">
                {activeStatuses.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between px-2 pl-7 py-1 text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'inline-block h-2 w-2 rounded-full shrink-0',
                          item.dotClass
                        )}
                      />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="font-medium tabular-nums text-[11px]">
                      {counts[item.key] || 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
