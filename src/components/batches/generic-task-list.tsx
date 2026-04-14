'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Lock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  User,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

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
  formData: Record<string, any> | null
  attachments: any[] | null
  notes: string | null
  actualStart: string | null
  actualEnd: string | null
  createdAt: string
  updatedAt: string
}

interface GenericTaskListProps {
  batchId: string
  tasks?: ProductionTask[]
  onTasksLoaded?: (tasks: ProductionTask[]) => void
  onRedoSuccess?: () => void
}

// ============================================
// Constants
// ============================================

const REDOABLE_TASK_CODES = ['REPROGRAM', 'GENE_EDITING', 'CLONE_SCREENING']

const STATUS_BADGE_STYLES: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  IN_PROGRESS: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REVIEWED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SKIPPED: 'bg-muted text-muted-foreground',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待开始',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  REVIEWED: '已复核',
  FAILED: '已失败',
  SKIPPED: '已跳过',
}

// ============================================
// Helpers
// ============================================

function parseRedoRound(stepGroup: string | null): number | null {
  if (!stepGroup) return null
  const match = stepGroup.match(/-R(\d+)$/)
  return match ? parseInt(match[1], 10) : null
}

function isRedoableTask(task: ProductionTask): boolean {
  return REDOABLE_TASK_CODES.includes(task.taskCode)
}

function canShowRedoButton(task: ProductionTask): boolean {
  return isRedoableTask(task) &&
    (task.status === 'COMPLETED' || task.status === 'REVIEWED' || task.status === 'FAILED')
}

/**
 * Check if a task is locked because its immediate predecessor (by sequenceNo)
 * is not COMPLETED or REVIEWED.
 * Only check within the same taskCode group for phase-type tasks,
 * or the task with the next lowest sequenceNo for single tasks.
 */
function isTaskLocked(task: ProductionTask, allTasks: ProductionTask[]): boolean {
  if (task.status !== 'PENDING' && task.status !== 'IN_PROGRESS') return false

  // Find the task with the immediately lower sequenceNo
  const predecessors = allTasks.filter(
    (t) => t.sequenceNo < task.sequenceNo && t.id !== task.id
  )

  if (predecessors.length === 0) return false

  // Get the immediate predecessor (highest sequenceNo less than current)
  const sortedPredecessors = [...predecessors].sort(
    (a, b) => b.sequenceNo - a.sequenceNo
  )
  const immediatePredecessor = sortedPredecessors[0]

  return (
    immediatePredecessor.status !== 'COMPLETED' &&
    immediatePredecessor.status !== 'REVIEWED' &&
    immediatePredecessor.status !== 'SKIPPED'
  )
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================
// Task Status Icon
// ============================================

function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
    case 'REVIEWED':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'IN_PROGRESS':
      return <Clock className="h-4 w-4 text-sky-500" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

// ============================================
// Task Card Item
// ============================================

function TaskCardItem({
  task,
  allTasks,
  onRedo,
}: {
  task: ProductionTask
  allTasks: ProductionTask[]
  onRedo: (task: ProductionTask) => void
}) {
  const locked = isTaskLocked(task, allTasks)
  const redoRound = parseRedoRound(task.stepGroup)
  const showRedo = canShowRedoButton(task)

  // Determine if this is a redo task (has "-R{n}" pattern)
  const isRedoTask = redoRound !== null

  return (
    <div
      className={`flex items-center gap-3 rounded-md border px-3 py-3 text-sm transition-colors ${
        locked
          ? 'border-muted-foreground/20 bg-muted/30 opacity-70'
          : task.status === 'FAILED'
            ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
            : 'hover:bg-muted/50'
      }`}
    >
      {/* Status Icon */}
      <div className="shrink-0">
        {locked ? (
          <Lock className="h-4 w-4 text-muted-foreground" />
        ) : (
          <TaskStatusIcon status={task.status} />
        )}
      </div>

      {/* Task Info */}
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-0.5">
        <div className="sm:col-span-1">
          <span className="text-xs text-muted-foreground">任务名称</span>
          <p className="font-medium flex items-center gap-1.5">
            {task.taskName}
            {/* Redo round indicator */}
            {isRedoTask && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 font-mono border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
              >
                R{redoRound}
              </Badge>
            )}
            {/* New pending redo task label */}
            {!isRedoTask && task.status === 'PENDING' && isRedoableTask(task) && task.notes?.includes('重做') && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-primary/50 text-primary"
              >
                {(() => {
                  const roundMatch = task.stepGroup?.match(/-R(\d+)$/)
                  if (roundMatch) return `重做 (第${roundMatch[1]}轮)`
                  return '重做'
                })()}
              </Badge>
            )}
          </p>
        </div>

        <div>
          <span className="text-xs text-muted-foreground">操作员</span>
          <p className="flex items-center gap-1 text-xs">
            <User className="h-3 w-3 text-muted-foreground" />
            {task.assigneeName || (
              <span className="text-muted-foreground">未指派</span>
            )}
          </p>
        </div>

        <div>
          <span className="text-xs text-muted-foreground">完成时间</span>
          <p className="text-xs">
            {task.actualEnd ? formatDateTime(task.actualEnd) : '-'}
          </p>
        </div>
      </div>

      {/* Right side: Status Badge + Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Locked indicator */}
        {locked && (
          <Badge
            variant="secondary"
            className="text-[10px] px-2 bg-muted text-muted-foreground"
          >
            <Lock className="h-3 w-3 mr-1" />
            锁定
          </Badge>
        )}

        {/* Status Badge */}
        {!locked && (
          <Badge
            variant="secondary"
            className={`text-[10px] px-2 ${STATUS_BADGE_STYLES[task.status] || ''}`}
          >
            {task.status === 'FAILED' ? (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                已失败
              </span>
            ) : (
              STATUS_LABELS[task.status] || task.status
            )}
          </Badge>
        )}

        {/* Redo Button */}
        {showRedo && !locked && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950/30"
            onClick={(e) => {
              e.stopPropagation()
              onRedo(task)
            }}
          >
            <RotateCcw className="h-3 w-3" />
            重做
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================
// Main GenericTaskList Component
// ============================================

export function GenericTaskList({
  batchId,
  tasks: externalTasks,
  onTasksLoaded,
  onRedoSuccess,
}: GenericTaskListProps) {
  const [tasks, setTasks] = useState<ProductionTask[]>(externalTasks || [])
  const [loading, setLoading] = useState(!externalTasks)
  const [redoTarget, setRedoTarget] = useState<ProductionTask | null>(null)
  const [redoing, setRedoing] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await authFetch(`/api/batches/${batchId}/tasks`)
      if (res.ok) {
        const data = await res.json()
        const loadedTasks = data.tasks || []
        setTasks(loadedTasks)
        onTasksLoaded?.(loadedTasks)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [batchId, onTasksLoaded])

  useEffect(() => {
    if (!externalTasks) {
      fetchTasks()
    }
  }, [externalTasks, fetchTasks])

  // Sync with external tasks if provided
  useEffect(() => {
    if (externalTasks) {
      setTasks(externalTasks)
    }
  }, [externalTasks])

  const handleRedo = (task: ProductionTask) => {
    setRedoTarget(task)
  }

  const confirmRedo = async () => {
    if (!redoTarget) return

    setRedoing(true)
    try {
      const res = await authFetch(
        `/api/batches/${batchId}/tasks/${redoTarget.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'redo' }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '重做任务失败')
        return
      }

      toast.success(
        `已创建重做任务：${redoTarget.taskName}（第${data.redoInfo?.round || '?'}轮）`
      )
      setRedoTarget(null)
      fetchTasks()
      onRedoSuccess?.()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setRedoing(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
          <Clock className="h-8 w-8 mb-2 text-muted-foreground/50" />
          <p>暂无生产任务</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Task List */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCardItem
                key={task.id}
                task={task}
                allTasks={tasks}
                onRedo={handleRedo}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Redo Confirmation Dialog */}
      <AlertDialog open={!!redoTarget} onOpenChange={(open) => !open && setRedoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              确认重做任务
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  确认重做任务 <span className="font-semibold text-foreground">{redoTarget?.taskName}</span>？
                </p>
                {redoTarget?.stepGroup && (
                  <p className="text-xs text-muted-foreground">
                    当前步骤组: {redoTarget.stepGroup}
                  </p>
                )}
                <p className="text-sm text-destructive">
                  原任务将标记为失败，并创建新的待办任务。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={redoing}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRedo}
              disabled={redoing}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {redoing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认重做
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
