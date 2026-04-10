'use client'

import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { getRoleDisplay, hasRole } from '@/lib/roles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getStatusLabel, getStatusColor } from '@/lib/services'
import {
  FlaskConical,
  ClipboardCheck,
  FileCheck,
  AlertCircle,
  Plus,
  Users,
  ListChecks,
} from 'lucide-react'

interface MyTask {
  id: string
  batchNo: string
  productName: string
  status: string
  action: string
}

export function MyTasks() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState<MyTask[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMyTasks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('pageSize', '10')

      const userRoles = user.roles || [user.role]

      // Build query based on roles (use first matching role's typical filter)
      if (hasRole(userRoles, 'OPERATOR')) {
        params.set('assignee', user.id)
        params.set('status', 'IN_PRODUCTION')
      } else if (hasRole(userRoles, 'SUPERVISOR')) {
        params.set('status', 'COA_SUBMITTED')
      } else if (hasRole(userRoles, 'QA')) {
        params.set('status', 'QC_PENDING')
      }
      // ADMIN sees everything

      const res = await authFetch(`/api/batches?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const myTasks: MyTask[] = (data.batches || []).map(
          (b: { id: string; batchNo: string; productName: string; status: string }) => {
            let action = '查看详情'
            if (hasRole(userRoles, 'OPERATOR') && b.status === 'IN_PRODUCTION') {
              action = '继续生产操作'
            } else if (hasRole(userRoles, 'SUPERVISOR') && b.status === 'COA_SUBMITTED') {
              action = '审核CoA'
            } else if (hasRole(userRoles, 'QA') && b.status === 'QC_PENDING') {
              action = '开始质检'
            }
            return {
              id: b.id,
              batchNo: b.batchNo,
              productName: b.productName,
              status: b.status,
              action,
            }
          },
        )
        setTasks(myTasks)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchMyTasks()
  }, [fetchMyTasks])

  const roleQuickActions = () => {
    if (!user) return []
    const userRoles = user.roles || [user.role]
    const actions: { label: string; icon: typeof Plus; href: string }[] = []

    // Collect actions from ALL roles the user has
    const seen = new Set<string>()

    if (hasRole(userRoles, 'ADMIN')) {
      if (!seen.has('users')) { actions.push({ label: '用户管理', icon: Users, href: '/users' }); seen.add('users') }
      if (!seen.has('audit')) { actions.push({ label: '审计日志', icon: ListChecks, href: '/audit' }); seen.add('audit') }
    }
    if (hasRole(userRoles, 'SUPERVISOR')) {
      if (!seen.has('batches-all')) { actions.push({ label: '所有批次', icon: FlaskConical, href: '/batches/all' }); seen.add('batches-all') }
    }
    if (hasRole(userRoles, 'OPERATOR')) {
      if (!seen.has('batches')) { actions.push({ label: '我的批次', icon: FlaskConical, href: '/batches' }); seen.add('batches') }
    }
    if (hasRole(userRoles, 'QA')) {
      if (!seen.has('qc-pending')) { actions.push({ label: '待质检批次', icon: ClipboardCheck, href: '/batches/all?status=QC_PENDING' }); seen.add('qc-pending') }
    }
    // Common action: add batch (available to OPERATOR, SUPERVISOR, ADMIN)
    if (hasRole(userRoles, 'OPERATOR') || hasRole(userRoles, 'SUPERVISOR') || hasRole(userRoles, 'ADMIN')) {
      if (!seen.has('new-batch')) { actions.unshift({ label: '新建批次', icon: Plus, href: '/batches' }); seen.add('new-batch') }
    }

    return actions
  }

  const roleName = user?.roles ? getRoleDisplay(user.roles) : '用户'

  return (
    <div className="space-y-4">
      {/* My Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            我的待办
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {roleName}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <FileCheck className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">暂无待办事项</p>
            </div>
          ) : (
            <div className="space-y-1">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg p-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/batches/${task.id}`)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium font-mono truncate">
                        {task.batchNo}
                      </p>
                      <p className="text-xs text-muted-foreground">{task.action}</p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 text-[10px] ${getStatusColor(task.status)}`}
                  >
                    {getStatusLabel(task.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">快捷操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {roleQuickActions().map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              className="w-full justify-start gap-3 h-10 px-3"
              onClick={() => router.push(action.href)}
            >
              <action.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
