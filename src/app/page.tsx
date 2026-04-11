'use client'

import { useState, useEffect, useCallback } from 'react'
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
  { key: 'SCRAPPED', title: '已报废', icon: Trash2, color: 'text-stone-600 dark:text-stone-400', dotColor: 'bg-stone-400', href: '/batches/all?status=SCRAPPED' },
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
      {/* Welcome Banner + Compact Stats */}
      <div className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 p-5 text-white shadow-lg shadow-teal-500/20">
        {/* Row 1: Greeting + Date */}
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

        {/* Row 2: Compact Stats */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {/* Scope Toggle */}
          <div className="flex items-center gap-0.5 rounded-md bg-white/15 p-0.5 mr-1">
            <button
              onClick={() => setScope('global')}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-all',
                scope === 'global'
                  ? 'bg-white text-teal-700'
                  : 'text-white/80 hover:text-white',
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
                  ? 'bg-white text-teal-700'
                  : 'text-white/80 hover:text-white',
              )}
            >
              <User className="h-3 w-3" />
              我的
            </button>
          </div>

          {/* Stats Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STAT_DEFS.map((def) => {
              const count = currentCounts[def.key] || 0
              return (
                <button
                  key={def.key}
                  onClick={() => router.push(def.href)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all hover:bg-white/20',
                    count > 0 ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', def.dotColor)} />
                  {def.title}
                  <span className="font-bold tabular-nums">{count}</span>
                </button>
              )
            })}
          </div>
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

// Need to import useRouter since we use it
import { useRouter } from 'next/navigation'
