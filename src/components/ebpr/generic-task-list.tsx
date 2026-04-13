'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useAuthStore } from '@/stores/auth-store'
import { hasAnyRole } from '@/lib/roles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  FlaskConical,
  CheckCircle2,
  Circle,
  Clock,
  User,
  FileEdit,
  Construction,
  Package,
  Beaker,
  TestTubes,
  Layers,
  UserPlus,
  ShieldCheck,
} from 'lucide-react'
import { TaskFormWrapper } from './task-form-wrapper'

// ============================================
// Types
// ============================================

interface ProductionTask {
  id: string
  batchId: string
  batchNo: string
  taskCode: string
  taskName: string
  sequenceNo: number
  stepGroup: string | null
  status: string
  assigneeId: string | null
  assigneeName: string | null
  reviewerId: string | null
  reviewerName: string | null
  reviewedAt: string | null
  formData: Record<string, unknown> | null
  attachments: unknown[] | null
  notes: string | null
  actualStart: string | null
  actualEnd: string | null
  plannedStart: string | null
  plannedEnd: string | null
  createdAt: string
  updatedAt: string
}

interface AssignTaskRequest {
  taskId: string
  taskName: string
  productId: string
}

interface GenericTaskListProps {
  batchId: string
  productLine: string
  productId: string
  onBatchUpdated?: () => void
  onAssignTask?: (request: AssignTaskRequest) => void
}

// ============================================
// Task Status Badge
// ============================================

function TaskStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: '待开始',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
    IN_PROGRESS: {
      label: '进行中',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    },
    COMPLETED: {
      label: '已完成',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    REVIEWED: {
      label: '已复核',
      className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    },
    SKIPPED: {
      label: '已跳过',
      className: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
    },
  }

  const c = config[status] || { label: status, className: '' }

  return (
    <Badge variant="secondary" className={c.className}>
      {c.label}
    </Badge>
  )
}

// ============================================
// Task Icon
// ============================================

function TaskIcon({ taskCode, className = 'h-4 w-4 text-muted-foreground' }: { taskCode: string; className?: string }) {
  switch (taskCode) {
    case 'SEED_PREP':
      return <FlaskConical className={className} />
    case 'EXPANSION':
      return <Layers className={className} />
    case 'HARVEST':
      return <Package className={className} />
    case 'MATERIAL_PREP':
      return <Beaker className={className} />
    case 'PREPARATION':
      return <TestTubes className={className} />
    case 'DISPENSING':
      return <FileEdit className={className} />
    default:
      // Identification tasks (ID_*)
      if (taskCode.startsWith('ID_')) {
        return <FlaskConical className={className} />
      }
      return <Circle className={className} />
  }
}

// ============================================
// Date formatter
// ============================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================
// Single Task Card
// ============================================

function TaskCard({ task, allTasks, onAssignTask, canAssign, onRefreshTasks, productId }: { task: ProductionTask; allTasks: ProductionTask[]; onAssignTask?: (request: AssignTaskRequest) => void; canAssign: boolean; onRefreshTasks: () => void; productId: string }) {
  const isCompleted = task.status === 'COMPLETED'
  const isReviewed = task.status === 'REVIEWED'
  const isSkipped = task.status === 'SKIPPED'
  const isIdTask = task.taskCode.startsWith('ID_')
  const showAssignButton = canAssign && task.status === 'PENDING' && !task.assigneeId

  return (
    <Card className={isCompleted || isReviewed ? 'border-emerald/20 bg-emerald/5' : isSkipped ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5 ${
            isCompleted || isReviewed
              ? 'bg-emerald/10'
              : task.status === 'IN_PROGRESS'
                ? 'bg-blue/10'
                : 'bg-muted'
          }`}>
            {isCompleted || isReviewed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : task.status === 'IN_PROGRESS' ? (
              <Construction className="h-4 w-4 text-blue-600" />
            ) : (
              <TaskIcon taskCode={task.taskCode} />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            {/* Header: task name + status badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <TaskIcon taskCode={task.taskCode} className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{task.taskName}</span>
              <TaskStatusBadge status={task.status} />
              {task.stepGroup && (
                <Badge variant="outline" className="font-mono text-xs">
                  {task.stepGroup}
                </Badge>
              )}
              {isIdTask && (
                <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
                  鉴定
                </Badge>
              )}
            </div>

            {/* Assign button for PENDING tasks without assignee */}
            {showAssignButton && (
              <div className="flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onAssignTask?.({
                    taskId: task.id,
                    taskName: task.taskName,
                    productId,
                  })}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  指派
                </Button>
              </div>
            )}

            {/* Assignee + reviewer + dates */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {task.assigneeName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {task.assigneeName}
                </span>
              )}
              {task.reviewerName && (
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  复核: {task.reviewerName}
                </span>
              )}
              {task.actualStart && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  开始: {formatDate(task.actualStart)}
                </span>
              )}
              {task.actualEnd && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  完成: {formatDate(task.actualEnd)}
                </span>
              )}
              {!task.actualStart && task.plannedStart && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  计划: {formatDate(task.plannedStart)}
                </span>
              )}
            </div>

            {/* Notes */}
            {task.notes && (
              <p className="text-xs text-muted-foreground bg-background/50 rounded px-2.5 py-1.5">
                {task.notes}
              </p>
            )}

            {/* IN_PROGRESS: Show actual form */}
            {task.status === 'IN_PROGRESS' && (
              <TaskFormWrapper
                task={task}
                batch={{ batchNo: task.batchNo }}
                allTasks={allTasks}
                onTaskUpdated={onRefreshTasks}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Progress Summary
// ============================================

function ProgressSummary({ tasks }: { tasks: ProductionTask[] }) {
  const total = tasks.length
  const completed = tasks.filter(t => t.status === 'COMPLETED').length
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="flex items-center gap-4 px-1">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{completed}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{total}</span>
        <span className="text-muted-foreground">任务完成</span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 max-w-xs">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <span className="text-xs font-medium text-muted-foreground">{percentage}%</span>

      {inProgress > 0 && (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
          {inProgress} 进行中
        </Badge>
      )}
    </div>
  )
}

// ============================================
// Main GenericTaskList Component
// ============================================

export function GenericTaskList({ batchId, productLine, productId, onBatchUpdated, onAssignTask }: GenericTaskListProps) {
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState<ProductionTask[]>([])
  const [loading, setLoading] = useState(true)

  const canAssign = hasAnyRole(user?.roles || [], ['ADMIN', 'SUPERVISOR'])

  const fetchTasks = useCallback(async () => {
    try {
      const res = await authFetch(`/api/batches/${batchId}/tasks`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [batchId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }

  // No tasks yet
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <Layers className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">暂无生产任务</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            开始生产后，系统将自动创建生产任务
          </p>
        </CardContent>
      </Card>
    )
  }

  // Group tasks: for SERVICE, separate identification tasks (ID_*) from production tasks
  const identificationTasks = productLine === 'SERVICE'
    ? tasks.filter(t => t.taskCode.startsWith('ID_'))
    : []

  const regularTasks = productLine === 'SERVICE'
    ? tasks.filter(t => !t.taskCode.startsWith('ID_'))
    : tasks

  // Sort each group by sequenceNo then createdAt
  const sortBySeq = (a: ProductionTask, b: ProductionTask) =>
    a.sequenceNo - b.sequenceNo || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

  identificationTasks.sort(sortBySeq)
  regularTasks.sort(sortBySeq)

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <Card>
        <CardContent className="p-4">
          <ProgressSummary tasks={tasks} />
        </CardContent>
      </Card>

      {/* Regular production tasks */}
      {regularTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">
              {productLine === 'KIT' ? '配制任务' : '生产任务'}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {regularTasks.length}
            </Badge>
          </div>
          {regularTasks.map(task => (
            <TaskCard key={task.id} task={task} allTasks={tasks} onAssignTask={onAssignTask} canAssign={canAssign} onRefreshTasks={fetchTasks} productId={productId} />
          ))}
        </div>
      )}

      {/* Identification tasks section (SERVICE only) */}
      {identificationTasks.length > 0 && (
        <>
          {regularTasks.length > 0 && <Separator />}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <TestTubes className="h-4 w-4 text-violet-500" />
              <h3 className="text-sm font-semibold">鉴定任务</h3>
              <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
                {identificationTasks.length}
              </Badge>
            </div>
            {identificationTasks.map(task => (
              <TaskCard key={task.id} task={task} allTasks={tasks} onAssignTask={onAssignTask} canAssign={canAssign} onRefreshTasks={fetchTasks} productId={productId} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
