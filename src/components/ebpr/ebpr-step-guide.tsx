'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskFormWrapper, TaskFormSkeleton } from './task-form-wrapper'
import {
  FlaskConical,
  ArrowUpDown,
  Snowflake,
  CheckCircle2,
  Send,
  Loader2,
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

interface EbprStepGuideProps {
  batchId: string
  batch: BatchInfo
  onBatchUpdated: () => void
}

// ============================================
// Step definitions
// ============================================

const STEPS = [
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
    code: 'HARVEST',
    name: '收获冻存',
    icon: Snowflake,
    sequenceNo: 3,
  },
] as const

type StepCode = 'SEED_PREP' | 'EXPANSION' | 'HARVEST'

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
    if (seedTask.status === 'COMPLETED') return 'completed'
    if (seedTask.status === 'IN_PROGRESS') return 'current'
    return 'pending'
  }

  // EXPANSION: at least one completed means it's been worked on
  if (stepCode === 'EXPANSION') {
    const hasCompleted = stepTasks.some((t) => t.status === 'COMPLETED')
    const hasInProgress = stepTasks.some((t) => t.status === 'IN_PROGRESS')
    if (hasInProgress) return 'current'
    if (hasCompleted) return 'completed'
    return 'pending'
  }

  // HARVEST
  if (stepCode === 'HARVEST') {
    const harvestTask = stepTasks[0]
    if (harvestTask.status === 'COMPLETED') return 'completed'
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
    (t) => t.taskCode === stepCode && t.status === 'COMPLETED'
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
    case 'HARVEST':
      return <Snowflake className={cls} />
    default:
      return <CheckCircle2 className={cls} />
  }
}

// ============================================
// Step Progress Component
// ============================================

function StepProgressBar({
  steps,
  tasks,
  activeStep,
  onStepClick,
}: {
  steps: typeof STEPS
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
        const showCount = step.code === 'EXPANSION' && completedCount > 0
        return (
          <div key={step.code} className="flex items-center">
            {/* Step circle + label */}
            <button
              onClick={() => onStepClick(step.code)}
              className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
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
            </button>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-12 mx-1 ${
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
  onBatchUpdated,
}: EbprStepGuideProps) {
  const [tasks, setTasks] = useState<ProductionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState<StepCode | null>(null)
  const [submittingQc, setSubmittingQc] = useState(false)

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
  useEffect(() => {
    if (tasks.length === 0) return

    // Find the first non-completed step
    for (const step of STEPS) {
      const status = getStepStatus(step.code, tasks)
      if (status === 'current') {
        setActiveStep(step.code)
        return
      }
    }

    // If all completed, show the last one
    const lastCompleted = [...STEPS].reverse().find(
      (s) => getStepStatus(s.code, tasks) === 'completed'
    )
    if (lastCompleted) {
      setActiveStep(lastCompleted.code)
      return
    }

    // Default to first step
    setActiveStep('SEED_PREP')
  }, [tasks])

  const handleStepClick = (code: StepCode) => {
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
        toast.error(data.error || '提交质检失败')
        return
      }

      toast.success('已提交质检，批次状态已更新')
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
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <FlaskConical className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">暂无生产记录</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            开始生产后将自动创建种子复苏、扩增培养、收获冻存等生产任务。
          </p>
        </CardContent>
      </Card>
    )
  }

  // Get the active task to display in the form
  const activeTask = activeStep
    ? tasks.find(
        (t) =>
          t.taskCode === activeStep &&
          (activeStep === 'EXPANSION'
            ? t.status === 'IN_PROGRESS' || t.status === 'PENDING'
            : t.status !== 'COMPLETED' && t.status !== 'SKIPPED')
      ) ?? tasks.find((t) => t.taskCode === activeStep)
    : null

  // Check if harvest is completed
  const harvestCompleted = getStepStatus('HARVEST', tasks) === 'completed'
  const allStepsCompleted =
    getStepStatus('SEED_PREP', tasks) === 'completed' &&
    getStepStatus('EXPANSION', tasks) === 'completed' &&
    harvestCompleted

  // Check if already submitted for QC
  const isQcSubmitted = batch.status === 'QC_PENDING' || batch.status === 'QC_IN_PROGRESS'

  return (
    <div className="space-y-4">
      {/* Step Progress */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex justify-center overflow-x-auto pb-1">
            <StepProgressBar
              steps={[...STEPS]}
              tasks={tasks}
              activeStep={activeStep}
              onStepClick={handleStepClick}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Step Content */}
      {activeStep === 'EXPANSION' ? (
        // For expansion, show completed summaries + the form
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

          {/* Expansion form (for adding new passage) */}
          {getStepStatus('EXPANSION', tasks) !== 'completed' && (
            <ExpansionSection
              batch={batch}
              allTasks={tasks}
              onTaskUpdated={handleTaskUpdated}
            />
          )}
        </div>
      ) : (
        activeTask && (
          <TaskFormWrapper
            task={activeTask}
            batch={batch}
            allTasks={tasks}
            onTaskUpdated={handleTaskUpdated}
          />
        )
      )}

      {/* Submit QC Prompt */}
      {harvestCompleted && !isQcSubmitted && (
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
                    收获冻存已完成，请提交质检以进入下一阶段
                  </p>
                </div>
              </div>
              <Button onClick={handleSubmitQc} disabled={submittingQc}>
                {submittingQc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                提交质检
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
                  已提交质检
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  批次已进入质检阶段，请前往质检标签页查看详情
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
// Expansion Section (for inline rendering)
// ============================================

import { ExpansionForm } from './expansion-form'

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

  return (
    <ExpansionForm
      batch={batch}
      existingExpansions={completedExpansions}
      onSuccess={onTaskUpdated}
    />
  )
}
