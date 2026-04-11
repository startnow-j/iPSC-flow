'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useAuthStore } from '@/stores/auth-store'
import { getRoleDisplay } from '@/lib/roles'
import { StatCard } from '@/components/dashboard/stat-card'
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

interface StatusCounts {
  [key: string]: number
}

interface StatsData {
  global: StatusCounts
  mine: StatusCounts
  since: string
}

type ScopeMode = 'global' | 'mine'

const STAT_CARD_DEFS = [
  {
    key: 'IN_PRODUCTION',
    title: '生产中批次',
    icon: FlaskConical,
    color: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    borderColor: 'bg-amber-500',
    href: '/batches/all?status=IN_PRODUCTION',
  },
  {
    key: 'QC_PENDING',
    title: '待质检',
    icon: ClipboardCheck,
    color: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-100 dark:bg-orange-900/40',
    borderColor: 'bg-orange-500',
    href: '/batches/all?status=QC_PENDING',
  },
  {
    key: 'COA_SUBMITTED',
    title: '待审核CoA',
    icon: FileCheck,
    color: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-100 dark:bg-teal-900/40',
    borderColor: 'bg-teal-500',
    href: '/batches/all?status=COA_SUBMITTED',
  },
  {
    key: 'COA_APPROVED',
    title: 'CoA已批准',
    icon: ShieldCheck,
    color: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/40',
    borderColor: 'bg-cyan-500',
    href: '/batches/all?status=COA_APPROVED',
  },
  {
    key: 'RELEASED',
    title: '已放行',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    borderColor: 'bg-emerald-500',
    href: '/batches/all?status=RELEASED',
  },
  {
    key: 'SCRAPPED',
    title: '已报废',
    icon: Trash2,
    color: 'text-stone-600 dark:text-stone-400',
    iconBg: 'bg-stone-100 dark:bg-stone-900/40',
    borderColor: 'bg-stone-400',
    href: '/batches/all?status=SCRAPPED',
  },
]

export default function HomePage() {
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
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 p-6 text-white shadow-lg shadow-teal-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting()}，{user?.name || '用户'}
            </h1>
            <p className="mt-1 text-teal-100">
              {roleName} · {user?.department || '未设置部门'}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 backdrop-blur-sm">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          批次概览
          <span className="text-xs font-normal text-muted-foreground">最近 90 天</span>
        </h2>
        {/* Scope Toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setScope('global')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              scope === 'global'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            全部
          </button>
          <button
            onClick={() => setScope('mine')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              scope === 'mine'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <User className="h-3.5 w-3.5" />
            我的
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {STAT_CARD_DEFS.map((def) => (
          <StatCard
            key={def.key}
            title={def.title}
            value={currentCounts[def.key] || 0}
            icon={def.icon}
            color={def.color}
            iconBg={def.iconBg}
            borderColor={def.borderColor}
            href={def.href}
            loading={loading}
          />
        ))}
      </div>

      {/* Recent Activity + My Tasks */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RecentBatches />
        <div className="lg:col-span-1">
          <MyTasks />
        </div>
      </div>
    </div>
  )
}
