'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useAuthStore } from '@/stores/auth-store'
import { hasAnyRole } from '@/lib/roles'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskFormWrapper, TaskFormSkeleton } from './task-form-wrapper'
import { ExpansionForm } from './expansion-form'
import { DifferentiationForm } from './differentiation-form'
import {
  FlaskConical,
  ArrowUpDown,
  Snowflake,
  Microscope,
  CheckCircle2,
  Send,
  Loader2,
  UserPlus,
  ShieldCheck,
  User,
  Clock,
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

interface BatchInfo {
  id: string
  batchNo: string
  currentPassage: string | null
  seedBatchNo: string | null
  seedPassage: string | null
  status: string
}

interface AssignTaskRequest {
  taskId: string
  taskName: string
  productId: string
}

interface EbprStepGuideProps {
  batchId: string
  batch: BatchInfo
  category?: string | null
  onBatchUpdated: () => void
  onAssignTask?: (request: AssignTaskRequest) => void
}

// ============================================
// Step definitions
// ============================================

type StepCode = 'SEED_PREP' | 'EXPANSION' | 'DIFFERENTIATION' | 'HARVEST'

interface StepDef {
  code: StepCode
  name: string
  icon: React.ElementType
  sequenceNo: number
}

const ALL_STEP_DEFS: StepDef[] = [
  {
    code: 'SEED_PREP',
    name: '种子复苏',
    icon: FlaskConical,
    sequenceNo: 1,
  },
  {
    code: 'EXPANSION',
    name: '扩增培养',
    icon: ArrowUpDown,
    sequenceNo: 2,
  },
  {
    code: 'DIFFERENTIATION',
    name: '分化诱导',
    icon: Microscope,
    sequenceNo: 3,
  },
  {
    code: 'HARVEST',
    name: '收获冻存',
    icon: Snowflake,
    sequenceNo: 4,
  },
]

const DIFF_CATEGORIES = ['NPC', 'CM', 'DIFF_KIT', 'DIFF_SERVICE']

function isDiffCategory(category?: string | null): boolean {
  if (!category) return false
  return DIFF_CATEGORIES.some(
    (c) => category.startsWith(c) || category.includes('DIFF')
  )
}

// ============================================
// Step status helpers
// ============================================

function getStepStatus(
  stepCode: StepCode,
  tasks: ProductionTask[]
): 'completed' | 'current' | 'pending' {
  const stepTasks = tasks.filter((t) => t.taskCode === stepCode)

  if (stepTasks.length === 0) return 'pending'

  // SEED_PREP and HARVEST: check the single task
  if (stepCode === 'SEED_PREP') {
    const seedTask = stepTasks[0]
    if (seedTask.status === 'COMPLETED' || seedTask.status === 'REVIEWED') return 'completed'
    if (seedTask.status === 'IN_PROGRESS') return 'current'
    return 'pending'
  }

  // EXPANSION and DIFFERENTIATION: phase-type tasks
  if (stepCode === 'EXPANSION' || stepCode === 'DIFFERENTIATION') {
    const hasCompleted = stepTasks.some((t) => t.status === 'COMPLETED' || t.status === 'REVIEWED')
    const hasInProgress = stepTasks.some((t) => t.status === 'IN_PROGRESS')
    if (hasInProgress) return 'current'
    if (hasCompleted) return 'completed'
    return 'pending'
  }

  // HARVEST
  if (stepCode === 'HARVEST') {
    const harvestTask = stepTasks[0]
    if (harvestTask.status === 'COMPLETED' || harvestTask.status === 'REVIEWED') return 'completed'
    if (harvestTask.status === 'IN_PROGRESS') return 'current'
    return 'pending'
  }

  return 'pending'
}

function getStepCompletedCount(
  stepCode: StepCode,
  tasks: ProductionTask[]
): number {
  return tasks.filter(
    (t) => t.taskCode === stepCode && (t.status === 'COMPLETED' || t.status === 'REVIEWED')
  ).length
}

// ============================================
// Step Progress Icon (separate component to avoid render-time creation)
// ============================================

function StepProgressIcon({ code, large }: { code: StepCode; large: boolean }) {
  const cls = large ? 'h-5 w-5' : 'h-4 w-4'
  switch (code) {
    case 'SEED_PREP':
      return <FlaskConical className={cls} />
    case 'EXPANSION':
      return <ArrowUpDown className={cls} />
    case 'DIFFERENTIATION':
      return <Microscope className={cls} />
    case 'HARVEST':
      return <Snowflake className={cls} />
    default:
      return <CheckCircle2 className={cls} />
  }
}

// ============================================
// Step Progress Component
// ============================================

/**
 * Get the representative task for a step - the active/pending task,
 * or the most recent task for the step.
 */
function getRepresentativeTask(
  stepCode: StepCode,
  tasks: ProductionTask[]
): ProductionTask | null {
  const stepTasks = tasks.filter((t) => t.taskCode === stepCode)
  if (stepTasks.length === 0) return null

  // Prefer IN_PROGRESS or PENDING task
  const active = stepTasks.find(
    (t) => t.status === 'IN_PROGRESS' || t.status === 'PENDING'
  )
  if (active) return active

  // Fall back to the last task
  return stepTasks[stepTasks.length - 1]
}

function StepProgressBar({
  steps,
  tasks,
  activeStep,
  onStepClick,
}: {
  steps: StepDef[]
  tasks: ProductionTask[]
  activeStep: StepCode | null
  onStepClick: (code: StepCode) => void
}) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, idx) => {
        const status = getStepStatus(step.code, tasks)
        const isActive = activeStep === step.code
        const completedCount = getStepCompletedCount(step.code, tasks)
        // Show count badge for phase-type tasks (EXPANSION and DIFFERENTIATION)
        const showCount =
          (step.code === 'EXPANSION' || step.code === 'DIFFERENTIATION') &&
          completedCount > 0
        const repTask = getRepresentativeTask(step.code, tasks)
        return (
          <div key={step.code} className="flex items-center">
            {/* Step circle + label */}
            <button
              onClick={() => onStepClick(step.code)}
              className={`flex flex-col items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary/10 scale-105'
                  : 'hover:bg-muted cursor-pointer'
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  status === 'completed'
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : status === 'current'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30 bg-background text-muted-foreground'
                }`}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <StepProgressIcon code={step.code} large={status === 'current'} />
                )}
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-xs font-medium ${
                    isActive
                      ? 'text-primary'
                      : status === 'completed'
                        ? 'text-emerald-600'
                        : 'text-muted-foreground'
                  }`}
                >
                  {step.name}
                </span>
                {showCount && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 text-[10px] bg-emerald-100 text-emerald-700"
                  >
                    {completedCount}
                  </Badge>
                )}
              </div>
              {/* Assignee info under step name */}
              {repTask?.assigneeName && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <User className="h-2.5 w-2.5" />
                  {repTask.assigneeName}
                </span>
              )}
              {repTask && !repTask.assigneeId && (repTask.status === 'PENDING' || repTask.status === 'IN_PROGRESS') && status !== 'completed' && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  等待指派
                </span>
              )}
            </button>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-6 sm:w-12 mx-1 ${
                  status === 'completed' ? 'bg-emerald-500' : 'bg-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// Main EbprStepGuide Component
// ============================================

export function EbprStepGuide({
  batchId,
  batch,
  category,
  onBatchUpdated,
  onAssignTask,
}: EbprStepGuideProps) {
  const { user } = useAuthStore()
  const canAssign = hasAnyRole(user?.roles || [], ['ADMIN', 'SUPERVISOR'])

  // Dynamically determine steps based on category
  const showDifferentiation = isDiffCategory(category)
  const steps = useMemo<StepDef[]>(() => {
    if (showDifferentiation) {
      return [...ALL_STEP_DEFS] // all 4 steps
    }
    return ALL_STEP_DEFS.filter((s) => s.code !== 'DIFFERENTIATION')
  }, [showDifferentiation])

  const [tasks, setTasks] = useState<ProductionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState<StepCode | null>(null)
  const [submittingQc, setSubmittingQc] = useState(false)

  // Track whether the user has manually clicked a step — prevent auto-select from overriding
  const userSelectedRef = useRef(false)

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

  // Auto-select current step on mount and after task updates
  // Once the user manually clicks a step, auto-select is disabled
  useEffect(() => {
    if (tasks.length === 0) return
    // Don't override user's manual selection
    if (userSelectedRef.current) return

    // Find the first non-completed step
    for (const step of steps) {
      const status = getStepStatus(step.code, tasks)
      if (status === 'current') {
        setActiveStep(step.code)
        userSelectedRef.current = true
        return
      }
      // Also prefer pending steps over going back to completed steps
      if (status === 'pending') {
        setActiveStep(step.code)
        userSelectedRef.current = true
        return
      }
    }

    // If all completed, show the last one
    const lastCompleted = [...steps].reverse().find(
      (s) => getStepStatus(s.code, tasks) === 'completed'
    )
    if (lastCompleted) {
      setActiveStep(lastCompleted.code)
      userSelectedRef.current = true
      return
    }

    // Default to first step
    setActiveStep(steps[0]?.code ?? 'SEED_PREP')
    userSelectedRef.current = true
  }, [tasks, steps])

  const handleStepClick = (code: StepCode) => {
    userSelectedRef.current = true
    setActiveStep(code)
  }

  const handleTaskUpdated = () => {
    // Re-fetch tasks to get updated data
    fetchTasks()
    // Also notify parent to refresh batch data
    onBatchUpdated()
  }

  const handleSubmitQc = async () => {
    setSubmittingQc(true)
    try {
      const res = await authFetch(`/api/batches/${batchId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_production' }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '完成生产操作失败')
        return
      }

      toast.success('生产已完成，批次已进入待质检阶段')
      onBatchUpdated()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSubmittingQc(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4 py-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-0.5 w-12" />
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-0.5 w-12" />
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
        <TaskFormSkeleton />
      </div>
    )
  }

  // No tasks yet (batch not in production)
  if (tasks.length === 0) {
    const stepNames = steps.map((s) => s.name).join('、')
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <FlaskConical className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">暂无生产记录</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            开始生产后将自动创建{stepNames}等生产任务。
          </p>
        </CardContent>
      </Card>
    )
  }

  // Check if harvest is completed
  const harvestCompleted = getStepStatus('HARVEST', tasks) === 'completed'

  // Build all required step checks
  const seedPrepCompleted = getStepStatus('SEED_PREP', tasks) === 'completed'
  const expansionCompleted = getStepStatus('EXPANSION', tasks) === 'completed'
  const differentiationCompleted = showDifferentiation
    ? getStepStatus('DIFFERENTIATION', tasks) === 'completed'
    : true
  const allStepsCompleted =
    seedPrepCompleted && expansionCompleted && differentiationCompleted && harvestCompleted

  // ============================================
  // Single-line production flow: lock previous steps
  // Once a later step has started (IN_PROGRESS/PENDING) or is completed,
  // the earlier step cannot add more rounds.
  // ============================================
  const expansionSeqNo = 2
  const differentiationSeqNo = 3
  const harvestSeqNo = 4

  // Check if any later step has activity (PENDING/IN_PROGRESS/COMPLETED/REVIEWED)
  const hasLaterStepActivity = (stepCode: StepCode): boolean => {
    const seqMap: Record<string, number> = {
      SEED_PREP: 1,
      EXPANSION: 2,
      DIFFERENTIATION: 3,
      HARVEST: 4,
    }
    const currentSeq = seqMap[stepCode]
    return tasks.some((t) => {
      const tSeq = seqMap[t.taskCode]
      return tSeq !== undefined && tSeq > currentSeq &&
        ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED'].includes(t.status)
    })
  }

  // Compute pending phase tasks for assignment check
  const allExpansionTasks = tasks.filter((t) => t.taskCode === 'EXPANSION')
  const pendingExpansionTasks = allExpansionTasks.filter(
    (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS'
  )
  // Show expansion form only when: has expansion tasks, no pending/in-progress ones,
  // AND no later step has started (single-line flow)
  const expansionLocked = hasLaterStepActivity('EXPANSION')
  const showExpansionForm =
    allExpansionTasks.length > 0 &&
    pendingExpansionTasks.length === 0 &&
    !expansionLocked

  const allDifferentiationTasks = tasks.filter((t) => t.taskCode === 'DIFFERENTIATION')
  const pendingDifferentiationTasks = allDifferentiationTasks.filter(
    (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS'
  )
  const differentiationLocked = hasLaterStepActivity('DIFFERENTIATION')
  const showDifferentiationForm =
    showDifferentiation &&
    allDifferentiationTasks.length > 0 &&
    pendingDifferentiationTasks.length === 0 &&
    !differentiationLocked

  // Check if already submitted for QC
  const isQcSubmitted = batch.status === 'QC_PENDING' || batch.status === 'QC_IN_PROGRESS'

  return (
    <div className="space-y-4">
      {/* Step Progress */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex justify-center overflow-x-auto pb-1">
            <StepProgressBar
              steps={steps}
              tasks={tasks}
              activeStep={activeStep}
              onStepClick={handleStepClick}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Step Content */}
      {activeStep === 'EXPANSION' ? (
        <div className="space-y-3">
          {/* Completed expansion summaries */}
          {tasks
            .filter((t) => t.taskCode === 'EXPANSION' && t.status === 'COMPLETED')
            .map((t) => (
              <div key={t.id}>
                <TaskFormWrapper
                  task={t}
                  batch={batch}
                  allTasks={tasks}
                  onTaskUpdated={handleTaskUpdated}
                />
              </div>
            ))}

          {/* Expansion: show form, locked notice, or assignment cards */}
          {allExpansionTasks.length === 0 && getStepStatus('EXPANSION', tasks) !== 'completed' ? (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
                  <UserPlus className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-base font-medium mb-1">等待指派</h3>
                <p className="text-sm text-muted-foreground text-center max-w-xs mb-1">
                  扩增培养任务尚未创建或尚未指派操作员。
                </p>
              </CardContent>
            </Card>
          ) : expansionLocked && pendingExpansionTasks.length === 0 ? (
            <Card className="border-muted-foreground/20 bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium mb-1">步骤已锁定</h3>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  后续步骤已进入，扩增培养无法再添加新的传代记录。
                </p>
              </CardContent>
            </Card>
          ) : showExpansionForm ? (
            <ExpansionSection
              batch={batch}
              allTasks={tasks}
              onTaskUpdated={handleTaskUpdated}
            />
          ) : (
            pendingExpansionTasks.map((expTask) => (
              <ExpansionTaskWithAssignment
                key={expTask.id}
                task={expTask}
                batch={batch}
                allTasks={tasks}
                canAssign={canAssign}
                currentUserId={user?.id}
                onTaskUpdated={handleTaskUpdated}
                onAssignTask={onAssignTask}
                productCode={batch.id}
              />
            ))
          )}
        </div>
      ) : activeStep === 'DIFFERENTIATION' && showDifferentiation ? (
        <div className="space-y-3">
          {/* Completed differentiation summaries */}
          {tasks
            .filter((t) => t.taskCode === 'DIFFERENTIATION' && t.status === 'COMPLETED')
            .map((t) => (
              <div key={t.id}>
                <TaskFormWrapper
                  task={t}
                  batch={batch}
                  allTasks={tasks}
                  onTaskUpdated={handleTaskUpdated}
                />
              </div>
            ))}

          {/* Differentiation: show form, locked notice, or assignment cards */}
          {allDifferentiationTasks.length === 0 && getStepStatus('DIFFERENTIATION', tasks) !== 'completed' ? (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
                  <UserPlus className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-base font-medium mb-1">等待指派</h3>
                <p className="text-sm text-muted-foreground text-center max-w-xs mb-1">
                  分化诱导任务尚未创建或尚未指派操作员。
                </p>
              </CardContent>
            </Card>
          ) : differentiationLocked && pendingDifferentiationTasks.length === 0 ? (
            <Card className="border-muted-foreground/20 bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium mb-1">步骤已锁定</h3>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  后续步骤已进入，分化诱导无法再添加新的分化记录。
                </p>
              </CardContent>
            </Card>
          ) : showDifferentiationForm ? (
            <DifferentiationSection
              batch={batch}
              allTasks={tasks}
              onTaskUpdated={handleTaskUpdated}
            />
          ) : (
            pendingDifferentiationTasks.map((diffTask) => (
              <DifferentiationTaskWithAssignment
                key={diffTask.id}
                task={diffTask}
                batch={batch}
                allTasks={tasks}
                canAssign={canAssign}
                currentUserId={user?.id}
                onTaskUpdated={handleTaskUpdated}
                onAssignTask={onAssignTask}
                productCode={batch.id}
              />
            ))
          )}
        </div>
      ) : (
        activeStep && (
          <TaskWithAssignment
            task={
              tasks.find(
                (t) =>
                  t.taskCode === activeStep &&
                  t.status !== 'COMPLETED' &&
                  t.status !== 'REVIEWED' &&
                  t.status !== 'SKIPPED'
              ) ?? tasks.find((t) => t.taskCode === activeStep)
            }
            batch={batch}
            allTasks={tasks}
            canAssign={canAssign}
            currentUserId={user?.id}
            onTaskUpdated={handleTaskUpdated}
            onAssignTask={onAssignTask}
            productCode={batch.id}
          />
        )
      )}

      {/* Submit QC Prompt */}
      {allStepsCompleted && !isQcSubmitted && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">所有生产步骤已完成</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    所有生产任务已完成，请点击完成生产以进入质检阶段
                  </p>
                </div>
              </div>
              <Button onClick={handleSubmitQc} disabled={submittingQc}>
                {submittingQc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                完成生产
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Already submitted for QC */}
      {isQcSubmitted && (
        <Card className="border-emerald/20 bg-emerald/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-emerald-700">
                  生产已完成
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  批次已进入待质检阶段，请前往质检标签页查看详情
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// Task Assignment Wrapper - for SEED_PREP & HARVEST
// ============================================

function TaskWithAssignment({
  task,
  batch,
  allTasks,
  canAssign,
  currentUserId,
  onTaskUpdated,
  onAssignTask,
  productCode,
}: {
  task: ProductionTask | undefined
  batch: BatchInfo
  allTasks: ProductionTask[]
  canAssign: boolean
  currentUserId?: string
  onTaskUpdated: () => void
  onAssignTask?: (request: AssignTaskRequest) => void
  productCode: string
}) {
  if (!task) return null

  const needsAssignment = task.status === 'PENDING' && !task.assigneeId
  const isLockedOut = task.assigneeId && task.assigneeId !== currentUserId && !canAssign

  // Task is waiting for assignment
  if (needsAssignment) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <UserPlus className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-base font-medium mb-1">等待指派</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-1">
            {task.taskName} 尚未指派操作员，请先指派后再开始操作。
          </p>
          {task.reviewerName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
              <ShieldCheck className="h-3 w-3" />
              复核人: {task.reviewerName}
            </p>
          )}
          {canAssign && onAssignTask && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5"
              onClick={() => onAssignTask({
                taskId: task.id,
                taskName: task.taskName,
                productId: productCode,
              })}
            >
              <UserPlus className="h-4 w-4" />
              指派操作员
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // User is not the assignee and cannot assign
  if (isLockedOut) {
    return (
      <Card className="border-muted-foreground/20 bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <ShieldCheck className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">非指派人员</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-1">
            该任务已指派给 <span className="font-medium text-foreground">{task.assigneeName}</span>，仅被指派人员可以操作。
          </p>
          {task.reviewerName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              复核人: {task.reviewerName}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Show assignee info header for assigned tasks that are still pending/in-progress
  if (task.assigneeName && task.status !== 'COMPLETED' && task.status !== 'REVIEWED') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
          {task.assigneeName && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              操作员: {task.assigneeName}
            </span>
          )}
          {task.reviewerName && (
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              复核人: {task.reviewerName}
            </span>
          )}
          {task.actualStart && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              开始: {new Date(task.actualStart).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <TaskFormWrapper
          task={task}
          batch={batch}
          allTasks={allTasks}
          onTaskUpdated={onTaskUpdated}
        />
      </div>
    )
  }

  // Default: show normal task form (completed/reviewed tasks, or admin override)
  return (
    <TaskFormWrapper
      task={task}
      batch={batch}
      allTasks={allTasks}
      onTaskUpdated={onTaskUpdated}
    />
  )
}

// ============================================
// Expansion Task Assignment Wrapper
// ============================================

function ExpansionTaskWithAssignment({
  task,
  batch,
  allTasks,
  canAssign,
  currentUserId,
  onTaskUpdated,
  onAssignTask,
  productCode,
}: {
  task: ProductionTask
  batch: BatchInfo
  allTasks: ProductionTask[]
  canAssign: boolean
  currentUserId?: string
  onTaskUpdated: () => void
  onAssignTask?: (request: AssignTaskRequest) => void
  productCode: string
}) {
  const needsAssignment = task.status === 'PENDING' && !task.assigneeId
  const isLockedOut = task.assigneeId && task.assigneeId !== currentUserId && !canAssign

  // Task is waiting for assignment
  if (needsAssignment) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <UserPlus className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-base font-medium mb-1">等待指派</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-1">
            {task.taskName}{task.stepGroup ? ` (${task.stepGroup})` : ''} 尚未指派操作员。
          </p>
          {task.reviewerName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
              <ShieldCheck className="h-3 w-3" />
              复核人: {task.reviewerName}
            </p>
          )}
          {canAssign && onAssignTask && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5"
              onClick={() => onAssignTask({
                taskId: task.id,
                taskName: task.taskName,
                productId: productCode,
              })}
            >
              <UserPlus className="h-4 w-4" />
              指派操作员
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // User is not the assignee and cannot assign
  if (isLockedOut) {
    return (
      <Card className="border-muted-foreground/20 bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <ShieldCheck className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">非指派人员</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-1">
            该任务已指派给 <span className="font-medium text-foreground">{task.assigneeName}</span>，仅被指派人员可以操作。
          </p>
          {task.reviewerName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              复核人: {task.reviewerName}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Show assignee info header for assigned tasks
  if (task.assigneeName && task.status !== 'COMPLETED' && task.status !== 'REVIEWED') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
          {task.assigneeName && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              操作员: {task.assigneeName}
            </span>
          )}
          {task.reviewerName && (
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              复核人: {task.reviewerName}
            </span>
          )}
        </div>
        <TaskFormWrapper
          task={task}
          batch={batch}
          allTasks={allTasks}
          onTaskUpdated={onTaskUpdated}
        />
      </div>
    )
  }

  // Default: show normal task form
  return (
    <TaskFormWrapper
      task={task}
      batch={batch}
      allTasks={allTasks}
      onTaskUpdated={onTaskUpdated}
    />
  )
}

// ============================================
// Differentiation Task Assignment Wrapper
// ============================================

function DifferentiationTaskWithAssignment({
  task,
  batch,
  allTasks,
  canAssign,
  currentUserId,
  onTaskUpdated,
  onAssignTask,
  productCode,
}: {
  task: ProductionTask
  batch: BatchInfo
  allTasks: ProductionTask[]
  canAssign: boolean
  currentUserId?: string
  onTaskUpdated: () => void
  onAssignTask?: (request: AssignTaskRequest) => void
  productCode: string
}) {
  const needsAssignment = task.status === 'PENDING' && !task.assigneeId
  const isLockedOut = task.assigneeId && task.assigneeId !== currentUserId && !canAssign

  // Task is waiting for assignment
  if (needsAssignment) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <UserPlus className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-base font-medium mb-1">等待指派</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-1">
            {task.taskName}{task.stepGroup ? ` (${task.stepGroup})` : ''} 尚未指派操作员。
          </p>
          {task.reviewerName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
              <ShieldCheck className="h-3 w-3" />
              复核人: {task.reviewerName}
            </p>
          )}
          {canAssign && onAssignTask && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5"
              onClick={() => onAssignTask({
                taskId: task.id,
                taskName: task.taskName,
                productId: productCode,
              })}
            >
              <UserPlus className="h-4 w-4" />
              指派操作员
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // User is not the assignee and cannot assign
  if (isLockedOut) {
    return (
      <Card className="border-muted-foreground/20 bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <ShieldCheck className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">非指派人员</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-1">
            该任务已指派给 <span className="font-medium text-foreground">{task.assigneeName}</span>，仅被指派人员可以操作。
          </p>
          {task.reviewerName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              复核人: {task.reviewerName}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Show assignee info header for assigned tasks
  if (task.assigneeName && task.status !== 'COMPLETED' && task.status !== 'REVIEWED') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
          {task.assigneeName && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              操作员: {task.assigneeName}
            </span>
          )}
          {task.reviewerName && (
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              复核人: {task.reviewerName}
            </span>
          )}
        </div>
        <TaskFormWrapper
          task={task}
          batch={batch}
          allTasks={allTasks}
          onTaskUpdated={onTaskUpdated}
        />
      </div>
    )
  }

  // Default: show normal task form
  return (
    <TaskFormWrapper
      task={task}
      batch={batch}
      allTasks={allTasks}
      onTaskUpdated={onTaskUpdated}
    />
  )
}

// ============================================
// Expansion Section (for inline rendering)
// ============================================

function ExpansionSection({
  batch,
  allTasks,
  onTaskUpdated,
}: {
  batch: BatchInfo
  allTasks: ProductionTask[]
  onTaskUpdated: () => void
}) {
  const completedExpansions = allTasks.filter(
    (t) => t.taskCode === 'EXPANSION' && t.status === 'COMPLETED'
  )
  // Derive assigned operator from any task with assigneeName
  const assignedOperatorName = allTasks.find(t => t.assigneeName)?.assigneeName || undefined

  return (
    <ExpansionForm
      batch={batch}
      existingExpansions={completedExpansions}
      assignedOperatorName={assignedOperatorName}
      onSuccess={onTaskUpdated}
    />
  )
}

// ============================================
// Differentiation Section (for inline rendering)
// ============================================

function DifferentiationSection({
  batch,
  allTasks,
  onTaskUpdated,
}: {
  batch: BatchInfo
  allTasks: ProductionTask[]
  onTaskUpdated: () => void
}) {
  const completedDifferentiations = allTasks.filter(
    (t) => t.taskCode === 'DIFFERENTIATION' && t.status === 'COMPLETED'
  )
  // Derive assigned operator from any task with assigneeName
  const assignedOperatorName = allTasks.find(t => t.assigneeName)?.assigneeName || undefined

  return (
    <DifferentiationForm
      batch={batch}
      existingDifferentiations={completedDifferentiations}
      assignedOperatorName={assignedOperatorName}
      onSuccess={onTaskUpdated}
    />
  )
}
