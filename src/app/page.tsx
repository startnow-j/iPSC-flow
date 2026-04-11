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
  ClipboardCheck,
  FileCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Trash2,
  Globe,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatusCounts {
  [key: string]: number
}

interface StatsData {
  global: StatusCounts
  mine: StatusCounts
}

type ScopeMode = 'global' | 'mine'

const STAT_DEFS: {
  key: string
  title: string
  icon: LucideIcon
  color: string
  dotColor: string
  href: string
}[] = [
  { key: 'IN_PRODUCTION', title: '生产中', icon: FlaskConical, color: 'text-amber-600 dark:text-amber-400', dotColor: 'bg-amber-400', href: '/batches/all?status=IN_PRODUCTION' },
  { key: 'QC_PENDING', title: '待质检', icon: ClipboardCheck, color: 'text-orange-600 dark:text-orange-400', dotColor: 'bg-orange-400', href: '/batches/all?status=QC_PENDING' },
  { key: 'COA_SUBMITTED', title: '待审核', icon: FileCheck, color: 'text-teal-600 dark:text-teal-400', dotColor: 'bg-teal-400', href: '/batches/all?status=COA_SUBMITTED' },
  { key: 'COA_APPROVED', title: '已批准', icon: ShieldCheck, color: 'text-cyan-600 dark:text-cyan-400', dotColor: 'bg-cyan-400', href: '/batches/all?status=COA_APPROVED' },
  { key: 'RELEASED', title: '已放行', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', dotColor: 'bg-emerald-400', href: '/batches/all?status=RELEASED' },
  { key: 'SCRAPPED', title: '已报废', icon: Trash2, color: 'text-stone-500 dark:text-stone-400', dotColor: 'bg-stone-400', href: '/batches/all?status=SCRAPPED' },
]

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

  const currentCounts = stats
    ? scope === 'global'
      ? stats.global
      : stats.mine
    : {}

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

      {/* Compact Stats Bar */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-sm font-semibold">批次概览</h2>
          <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
            <button
              onClick={() => setScope('global')}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-all',
                scope === 'global'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Globe className="h-3 w-3" />
              全部
            </button>
            <button
              onClick={() => setScope('mine')}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-all',
                scope === 'mine'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <User className="h-3 w-3" />
              我的
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-border px-0 pb-1">
          {STAT_DEFS.map((def) => {
            const count = loading ? '-' : (currentCounts[def.key] || 0)
            const isActive = !loading && count > 0
            return (
              <button
                key={def.key}
                onClick={() => router.push(def.href)}
                className="flex flex-col items-center gap-0.5 py-3 px-2 hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <span className={cn('text-xs text-muted-foreground', isActive && 'text-foreground/70')}>
                  {def.title}
                </span>
                <span className={cn(
                  'text-xl font-bold tabular-nums leading-none',
                  isActive ? def.color : 'text-muted-foreground/50',
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
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
