'use client'

import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { getRoleDisplay } from '@/lib/roles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductLineBadge } from '@/components/shared/product-line-badge'
import {
  FileCheck,
  Plus,
  Users,
  ListChecks,
  FlaskConical,
  ClipboardCheck,
  ArrowRight,
  ClipboardList,
  Eye,
} from 'lucide-react'

interface TaskItem {
  taskId: string
  batchId: string
  batchNo: string
  taskCode: string
  taskName: string
  productName: string
  productLine: string
  assigneeName: string | null
  reviewerName: string | null
  status: string
}

interface MyTasksData {
  toExecute: TaskItem[]
  toReview: TaskItem[]
  toExecuteCount: number
  toReviewCount: number
}

const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: '待开始',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
}

const TASK_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

export function MyTasks() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [data, setData] = useState<MyTasksData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMyTasks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await authFetch('/api/tasks/my-tasks')
      if (res.ok) {
        const json = await res.json()
        setData(json)
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

    const seen = new Set<string>()

    if (hasRoleCheck(userRoles, 'ADMIN')) {
      if (!seen.has('users')) { actions.push({ label: '用户管理', icon: Users, href: '/users' }); seen.add('users') }
      if (!seen.has('audit')) { actions.push({ label: '审计日志', icon: ListChecks, href: '/audit' }); seen.add('audit') }
    }
    if (hasRoleCheck(userRoles, 'SUPERVISOR')) {
      if (!seen.has('batches-all')) { actions.push({ label: '所有批次', icon: FlaskConical, href: '/batches/all' }); seen.add('batches-all') }
    }
    if (hasRoleCheck(userRoles, 'OPERATOR')) {
      if (!seen.has('batches')) { actions.push({ label: '我的批次', icon: FlaskConical, href: '/batches' }); seen.add('batches') }
    }
    if (hasRoleCheck(userRoles, 'QC')) {
      if (!seen.has('qc-pending')) { actions.push({ label: '待质检批次', icon: ClipboardCheck, href: '/batches/all?status=QC_PENDING' }); seen.add('qc-pending') }
      if (!seen.has('coa-submit')) { actions.push({ label: '待提交CoA', icon: FileCheck, href: '/batches/all?status=COA_SUBMITTED' }); seen.add('coa-submit') }
    }
    if (hasRoleCheck(userRoles, 'OPERATOR') || hasRoleCheck(userRoles, 'SUPERVISOR') || hasRoleCheck(userRoles, 'ADMIN')) {
      if (!seen.has('new-batch')) { actions.unshift({ label: '新建批次', icon: Plus, href: '/batches' }); seen.add('new-batch') }
    }

    return actions
  }

  const roleName = user?.roles ? getRoleDisplay(user.roles) : '用户'

  const hasAnyTasks = data && (data.toExecuteCount > 0 || data.toReviewCount > 0)

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
            <TaskListSkeleton />
          ) : !hasAnyTasks ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <FileCheck className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">暂无待办事项</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* To Execute Section */}
              {data && data.toExecuteCount > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">待执行</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {data.toExecuteCount}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {data.toExecute.slice(0, 5).map((task) => (
                      <TaskCard key={task.taskId} task={task} onClick={() => router.push(`/batches/${task.batchId}`)} />
                    ))}
                    {data.toExecuteCount > 5 && (
                      <button
                        className="w-full text-xs text-primary hover:underline py-1 flex items-center justify-center gap-1"
                        onClick={() => router.push('/batches')}
                      >
                        查看全部 {data.toExecuteCount} 项
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* To Review Section */}
              {data && data.toReviewCount > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">待复核</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {data.toReviewCount}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {data.toReview.slice(0, 5).map((task) => (
                      <TaskCard key={task.taskId} task={task} onClick={() => router.push(`/batches/${task.batchId}`)} />
                    ))}
                    {data.toReviewCount > 5 && (
                      <button
                        className="w-full text-xs text-primary hover:underline py-1 flex items-center justify-center gap-1"
                        onClick={() => router.push('/batches')}
                      >
                        查看全部 {data.toReviewCount} 项
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
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

/* ── Task Card ───────────────────────────────────── */

function TaskCard({ task, onClick }: { task: TaskItem; onClick: () => void }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg p-2.5 hover:bg-muted/50 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {task.taskName}
            </p>
            <ProductLineBadge productLine={task.productLine} />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {task.batchNo} · {task.assigneeName && task.reviewerName && task.assigneeName !== task.reviewerName
              ? `${task.assigneeName} → ${task.reviewerName}`
              : task.assigneeName || ''}
          </p>
        </div>
      </div>
      <Badge
        variant="secondary"
        className={`shrink-0 text-[10px] ${TASK_STATUS_COLORS[task.status] || ''}`}
      >
        {TASK_STATUS_LABELS[task.status] || task.status}
      </Badge>
    </div>
  )
}

/* ── Skeleton ────────────────────────────────────── */

function TaskListSkeleton() {
  return (
    <div className="space-y-4">
      {/* To Execute skeleton */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5">
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      {/* To Review skeleton */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <div className="space-y-1">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5">
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────── */

function hasRoleCheck(roles: string[], role: string): boolean {
  return roles.includes(role)
}
