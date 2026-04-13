'use client'

import { useState } from 'react'
import { SeedPrepForm } from './seed-prep-form'
import { ExpansionForm } from './expansion-form'
import { DifferentiationForm } from './differentiation-form'
import { HarvestForm } from './harvest-form'
import { SamplePrepForm } from './sample-prep-form'
import { ReprogramForm } from './reprogram-form'
import { ClonePickingForm } from './clone-picking-form'
import { FreezeForm } from './freeze-form'
import { CellRevivalForm } from './cell-revival-form'
import { GeneEditingForm } from './gene-editing-form'
import { CloneScreeningForm } from './clone-screening-form'
import { MaterialPrepForm } from './material-prep-form'
import { PreparationForm } from './preparation-form'
import { DispensingForm } from './dispensing-form'
import { TaskSummary } from './task-summary'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'
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

interface TaskFormWrapperProps {
  task: ProductionTask
  batch: {
    id?: string
    batchNo: string
    currentPassage?: string | null
    seedBatchNo?: string | null
    seedPassage?: string | null
  }
  allTasks: ProductionTask[]
  onTaskUpdated: () => void
}

// ============================================
// TaskFormWrapper Component
// ============================================

export function TaskFormWrapper({
  task,
  batch,
  allTasks,
  onTaskUpdated,
}: TaskFormWrapperProps) {
  const [saving, setSaving] = useState(false)

  const handleSuccess = async (shouldPromptQc?: boolean) => {
    setSaving(true)
    onTaskUpdated()
    // Brief delay to allow state to refresh
    setTimeout(() => {
      setSaving(false)
    }, 500)
  }

  // For completed or reviewed tasks that aren't the current active one, show summary
  if (task.status === 'COMPLETED' || task.status === 'REVIEWED') {
    return <TaskSummary task={task} />
  }

  // For skipped tasks
  if (task.status === 'SKIPPED') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          此步骤已跳过
        </CardContent>
      </Card>
    )
  }

  // Render appropriate form based on taskCode
  switch (task.taskCode) {
    case 'SEED_PREP':
      return (
        <SeedPrepForm
          task={task}
          batch={batch}
          onSuccess={() => handleSuccess()}
        />
      )

    case 'EXPANSION': {
      // Get all completed expansion tasks for the history display
      const existingExpansions = allTasks.filter(
        (t) => t.taskCode === 'EXPANSION' && t.status === 'COMPLETED'
      )
      // Derive assigned operator from any expansion task with assigneeName
      const assignedOp = task.assigneeName || allTasks.find(t => t.assigneeName)?.assigneeName || null
      return (
        <ExpansionForm
          batch={batch}
          existingExpansions={existingExpansions}
          assignedOperatorName={assignedOp}
          onSuccess={() => handleSuccess()}
        />
      )
    }

    case 'DIFFERENTIATION': {
      // Get all completed differentiation tasks for the history display
      const existingDifferentiations = allTasks.filter(
        (t) => t.taskCode === 'DIFFERENTIATION' && t.status === 'COMPLETED'
      )
      // Derive assigned operator from any differentiation task with assigneeName
      const assignedOp = task.assigneeName || allTasks.find(t => t.assigneeName)?.assigneeName || null
      return (
        <DifferentiationForm
          batch={batch}
          existingDifferentiations={existingDifferentiations}
          assignedOperatorName={assignedOp}
          onSuccess={() => handleSuccess()}
        />
      )
    }

    case 'HARVEST':
      return (
        <HarvestForm
          task={task}
          batch={batch}
          onSuccess={(shouldPromptQc) => handleSuccess(shouldPromptQc)}
        />
      )

    case 'SAMPLE_PREP':
      return <SamplePrepForm task={task} batch={batch} onSuccess={() => handleSuccess()} />

    case 'REPROGRAM':
      return <ReprogramForm task={task} batch={batch} onSuccess={() => handleSuccess()} />

    case 'CLONE_PICKING': {
      const existingPickings = allTasks.filter(t => t.taskCode === 'CLONE_PICKING' && t.status === 'COMPLETED')
      return <ClonePickingForm task={task} batch={batch} existingPickings={existingPickings} onSuccess={() => handleSuccess()} />
    }

    case 'FREEZE':
      return <FreezeForm task={task} batch={batch} onSuccess={() => handleSuccess()} />

    case 'CELL_REVIVAL':
      return <CellRevivalForm task={task} batch={batch} onSuccess={() => handleSuccess()} />

    case 'GENE_EDITING':
      return <GeneEditingForm task={task} batch={batch} onSuccess={() => handleSuccess()} />

    case 'CLONE_SCREENING': {
      const existingScreenings = allTasks.filter(t => t.taskCode === 'CLONE_SCREENING' && t.status === 'COMPLETED')
      return <CloneScreeningForm task={task} batch={batch} existingScreenings={existingScreenings} onSuccess={() => handleSuccess()} />
    }

    case 'MATERIAL_PREP':
      return <MaterialPrepForm task={task} batch={batch} onSuccess={() => handleSuccess()} />

    case 'PREPARATION':
      return <PreparationForm task={task} batch={batch} onSuccess={() => handleSuccess()} />

    case 'DISPENSING':
      return <DispensingForm task={task} batch={batch} onSuccess={() => handleSuccess()} />

    default:
      // Generic fallback for SERVICE/KIT/ID_* identification tasks
      if (task.taskCode.startsWith('ID_') || task.formData) {
        return <TaskSummary task={task} />
      }
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            未知的任务类型: {task.taskCode}
          </CardContent>
        </Card>
      )
  }
}

// ============================================
// Loading Skeleton
// ============================================

export function TaskFormSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="flex justify-end">
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}
