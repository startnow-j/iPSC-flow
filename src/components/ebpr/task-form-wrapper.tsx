'use client'

import { useState } from 'react'
import { SeedPrepForm } from './seed-prep-form'
import { ExpansionForm } from './expansion-form'
import { HarvestForm } from './harvest-form'
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
    id: string
    batchNo: string
    currentPassage: string | null
    seedBatchNo: string | null
    seedPassage: string | null
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

  // For completed tasks that aren't the current active one, show summary
  if (task.status === 'COMPLETED') {
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
      return (
        <ExpansionForm
          batch={batch}
          existingExpansions={existingExpansions}
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

    default:
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
