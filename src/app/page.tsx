'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { StatCard } from '@/components/dashboard/stat-card'
import { RecentBatches } from '@/components/dashboard/recent-batches'
import { MyTasks } from '@/components/dashboard/my-tasks'
import {
  FlaskConical,
  ClipboardCheck,
  FileCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react'

interface StatusCounts {
  IN_PRODUCTION?: number
  QC_PENDING?: number
  COA_SUBMITTED?: number
  RELEASED?: number
  [key: string]: number | undefined
}

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({})
  const [loading, setLoading] = useState(true)

  const fetchStatusCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/batches?pageSize=1')
      if (res.ok) {
        const data = await res.json()
        setStatusCounts(data.statusCounts || {})
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatusCounts()
  }, [fetchStatusCounts])

  const roleName = {
    ADMIN: '管理员',
    SUPERVISOR: '生产主管',
    OPERATOR: '操作员',
    QA: 'QA',
  }[user?.role || 'OPERATOR'] || user?.role || '用户'

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '上午好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

  const statCards = [
    {
      title: '生产中批次',
      value: statusCounts.IN_PRODUCTION || 0,
      icon: FlaskConical,
      color: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      borderColor: 'bg-amber-500',
      href: '/batches/all?status=IN_PRODUCTION',
    },
    {
      title: '待质检',
      value: statusCounts.QC_PENDING || 0,
      icon: ClipboardCheck,
      color: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-100 dark:bg-orange-900/40',
      borderColor: 'bg-orange-500',
      href: '/batches/all?status=QC_PENDING',
    },
    {
      title: '待审核CoA',
      value: statusCounts.COA_SUBMITTED || 0,
      icon: FileCheck,
      color: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-100 dark:bg-teal-900/40',
      borderColor: 'bg-teal-500',
      href: '/batches/all?status=COA_SUBMITTED',
    },
    {
      title: '已放行',
      value: statusCounts.RELEASED || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      borderColor: 'bg-emerald-500',
      href: '/batches/all?status=RELEASED',
    },
  ]

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

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            iconBg={card.iconBg}
            borderColor={card.borderColor}
            href={card.href}
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
