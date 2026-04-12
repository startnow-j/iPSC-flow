'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { useAuthStore } from '@/stores/auth-store'
import { getRoleDisplay } from '@/lib/roles'
import { RecentBatches } from '@/components/dashboard/recent-batches'
import { MyTasks } from '@/components/dashboard/my-tasks'
import {
  FlaskConical,
  Microscope,
  TestTubes,
  CheckCircle2,
  Clock,
  Trash2,
  Globe,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ============================================
// Types
// ============================================

interface StatusCounts {
  [key: string]: number
}

interface StatsData {
  global: StatusCounts
  mine: StatusCounts
  byProductLine: Record<string, StatusCounts>
}

type ScopeMode = 'global' | 'mine'

// ============================================
// Per-product-line stat definitions
// ============================================

interface StatDef {
  key: string
  title: string
  icon: LucideIcon
  color: string
  dotColor: string
}

const PRODUCT_LINE_STATS: Record<string, {
  label: string
  icon: LucideIcon
  colorClass: string
  stats: StatDef[]
}> = {
  CELL_PRODUCT: {
    label: '细胞产品',
    icon: FlaskConical,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    stats: [
      { key: 'IN_PRODUCTION', title: '生产中', icon: FlaskConical, color: 'text-amber-600 dark:text-amber-400', dotColor: 'bg-amber-400', },
      { key: 'QC_PENDING', title: '待质检', icon: FlaskConical, color: 'text-orange-600 dark:text-orange-400', dotColor: 'bg-orange-400', },
      { key: 'QC_IN_PROGRESS', title: '质检中', icon: FlaskConical, color: 'text-orange-500 dark:text-orange-300', dotColor: 'bg-orange-500', },
      { key: 'QC_PASS', title: '质检合格', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', dotColor: 'bg-emerald-400', },
      { key: 'COA_SUBMITTED', title: '待审核', icon: Clock, color: 'text-teal-600 dark:text-teal-400', dotColor: 'bg-teal-400', },
      { key: 'RELEASED', title: '已放行', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', dotColor: 'bg-green-500', },
      { key: 'SCRAPPED', title: '已报废', icon: Trash2, color: 'text-stone-500 dark:text-stone-400', dotColor: 'bg-stone-400', },
    ],
  },
  SERVICE: {
    label: '服务项目',
    icon: Microscope,
    colorClass: 'text-violet-600 dark:text-violet-400',
    stats: [
      { key: 'SAMPLE_RECEIVED', title: '样本已接收', icon: Microscope, color: 'text-blue-600 dark:text-blue-400', dotColor: 'bg-blue-400', },
      { key: 'IN_PRODUCTION', title: '生产中', icon: Microscope, color: 'text-amber-600 dark:text-amber-400', dotColor: 'bg-amber-400', },
      { key: 'IDENTIFICATION', title: '鉴定中', icon: Microscope, color: 'text-indigo-600 dark:text-indigo-400', dotColor: 'bg-indigo-400', },
      { key: 'REPORT_PENDING', title: '待报告', icon: Clock, color: 'text-purple-600 dark:text-purple-400', dotColor: 'bg-purple-400', },
      { key: 'COA_SUBMITTED', title: '待审核', icon: Clock, color: 'text-teal-600 dark:text-teal-400', dotColor: 'bg-teal-400', },
      { key: 'RELEASED', title: '已放行', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', dotColor: 'bg-green-500', },
      { key: 'TERMINATED', title: '已终止', icon: Globe, color: 'text-amber-500 dark:text-amber-300', dotColor: 'bg-amber-500', },
      { key: 'SCRAPPED', title: '已报废', icon: Trash2, color: 'text-stone-500 dark:text-stone-400', dotColor: 'bg-stone-400', },
    ],
  },
  KIT: {
    label: '试剂盒',
    icon: TestTubes,
    colorClass: 'text-amber-600 dark:text-amber-400',
    stats: [
      { key: 'MATERIAL_PREP', title: '物料准备', icon: TestTubes, color: 'text-cyan-600 dark:text-cyan-400', dotColor: 'bg-cyan-400', },
      { key: 'IN_PRODUCTION', title: '生产中', icon: TestTubes, color: 'text-amber-600 dark:text-amber-400', dotColor: 'bg-amber-400', },
      { key: 'QC_PENDING', title: '待质检', icon: TestTubes, color: 'text-orange-600 dark:text-orange-400', dotColor: 'bg-orange-400', },
      { key: 'QC_IN_PROGRESS', title: '质检中', icon: TestTubes, color: 'text-orange-500 dark:text-orange-300', dotColor: 'bg-orange-500', },
      { key: 'QC_PASS', title: '质检合格', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', dotColor: 'bg-emerald-400', },
      { key: 'COA_SUBMITTED', title: '待审核', icon: Clock, color: 'text-teal-600 dark:text-teal-400', dotColor: 'bg-teal-400', },
      { key: 'RELEASED', title: '已放行', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', dotColor: 'bg-green-500', },
      { key: 'SCRAPPED', title: '已报废', icon: Trash2, color: 'text-stone-500 dark:text-stone-400', dotColor: 'bg-stone-400', },
    ],
  },
}

const PRODUCT_LINE_ORDER = ['CELL_PRODUCT', 'SERVICE', 'KIT']

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<ScopeMode>('global')

  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/batches/status-stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Get counts based on scope (global or mine)
  // For "mine" scope, use the mine counts aggregated
  // For "global" scope, use byProductLine counts (which IS the global breakdown)
  const getCounts = useCallback((): Record<string, StatusCounts> => {
    if (!stats) return {}
    if (scope === 'global') {
      return stats.byProductLine || {}
    }
    // For "mine" scope, we don't have per-product-line breakdown of "mine",
    // so we fall back to showing global by-product-line counts
    return stats.byProductLine || {}
  }, [stats, scope])

  const productLineCounts = getCounts()
  const roleName = user?.roles ? getRoleDisplay(user.roles) : '用户'

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '上午好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

  return (
    <div className="space-y-4">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 p-5 text-white shadow-lg shadow-teal-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {greeting()}，{user?.name || '用户'}
            </h1>
            <p className="text-sm text-teal-100 mt-0.5">
              {roleName} · {user?.department || '未设置部门'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 backdrop-blur-sm">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Per-product-line Stats Cards */}
      <div className="space-y-3">
        {PRODUCT_LINE_ORDER.map((pl) => {
          const plConfig = PRODUCT_LINE_STATS[pl]
          if (!plConfig) return null

          const counts = productLineCounts[pl] || {}
          const totalBatches = Object.entries(counts).reduce((sum, [, c]) => sum + c, 0)
          if (totalBatches === 0 && !loading) return null

          const LineIcon = plConfig.icon

          return (
            <div key={pl} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {/* Product line header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-md',
                    pl === 'CELL_PRODUCT' && 'bg-emerald-100 dark:bg-emerald-900/40',
                    pl === 'SERVICE' && 'bg-violet-100 dark:bg-violet-900/40',
                    pl === 'KIT' && 'bg-amber-100 dark:bg-amber-900/40',
                  )}>
                    <LineIcon className={cn('h-3.5 w-3.5', plConfig.colorClass)} />
                  </div>
                  <h2 className="text-sm font-semibold">{plConfig.label}</h2>
                  {!loading && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {totalBatches} 批
                    </span>
                  )}
                </div>
                <button
                  onClick={() => router.push(`/batches/${pl === 'CELL_PRODUCT' ? 'cell-product' : pl === 'SERVICE' ? 'service' : 'kit'}`)}
                  className="text-[11px] text-primary hover:underline"
                >
                  查看全部
                </button>
              </div>
              {/* Stats grid */}
              <div className="grid grid-cols-4 sm:grid-cols-8 divide-x divide-border px-0 pb-1">
                {plConfig.stats.map((def) => {
                  const count = loading ? '-' : (counts[def.key] || 0)
                  const isActive = !loading && count > 0
                  return (
                    <button
                      key={def.key}
                      onClick={() => router.push(`/batches/all?status=${def.key}&productLine=${pl}`)}
                      className="flex flex-col items-center gap-0.5 py-2.5 px-1.5 hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <span className={cn(
                        'text-[11px] text-muted-foreground leading-tight text-center',
                        isActive && 'text-foreground/70',
                      )}>
                        {def.title}
                      </span>
                      <span className={cn(
                        'text-lg font-bold tabular-nums leading-none',
                        isActive ? def.color : 'text-muted-foreground/50',
                      )}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity + My Tasks */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RecentBatches />
        <div className="lg:col-span-1">
          <MyTasks />
        </div>
      </div>
    </div>
  )
}
