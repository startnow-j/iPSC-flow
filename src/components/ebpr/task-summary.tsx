'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, FlaskConical, ArrowUpDown, Snowflake, Clock, User, ShieldCheck } from 'lucide-react'

// ============================================
// Types
// ============================================

interface TaskSummaryProps {
  task: {
    id: string
    taskCode: string
    taskName: string
    stepGroup: string | null
    status: string
    formData: Record<string, any> | null
    assigneeName: string | null
    reviewerName: string | null
    reviewedAt: string | null
    actualStart: string | null
    actualEnd: string | null
    notes: string | null
  }
}

// ============================================
// Helper
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
// TaskIcon — rendered as a proper component (not variable)
// ============================================

function TaskIcon({ taskCode, className = 'h-4 w-4 text-muted-foreground' }: { taskCode: string; className?: string }) {
  switch (taskCode) {
    case 'SEED_PREP':
      return <FlaskConical className={className} />
    case 'EXPANSION':
      return <ArrowUpDown className={className} />
    case 'HARVEST':
      return <Snowflake className={className} />
    default:
      return <CheckCircle2 className={className} />
  }
}

// ============================================
// Summary renderers per task type
// ============================================

function SeedPrepSummary({ formData }: { formData: Record<string, any> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3 text-sm">
      <div>
        <span className="text-xs text-muted-foreground">复苏耗时</span>
        <p className="font-medium">{formData.recovery_time ?? '-'} 分钟</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">复苏方式</span>
        <p className="font-medium">{formData.recovery_method ?? '-'}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">复苏状态</span>
        <p>
          <Badge
            variant="secondary"
            className={
              formData.recovery_status === '正常'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }
          >
            {formData.recovery_status ?? '-'}
          </Badge>
        </p>
      </div>
    </div>
  )
}

function ExpansionSummary({ formData, stepGroup }: { formData: Record<string, any>; stepGroup: string | null }) {
  return (
    <div className="grid gap-2 sm:grid-cols-4 text-sm">
      <div>
        <span className="text-xs text-muted-foreground">代次</span>
        <p className="font-mono font-medium">{stepGroup ?? '-'}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">传代比例</span>
        <p className="font-medium">{formData.passage_ratio ?? '-'}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">细胞密度</span>
        <p className="font-medium">
          {formData.cell_density ? `${Number(formData.cell_density).toLocaleString()} cells/cm²` : '-'}
        </p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">细胞形态</span>
        <p className="font-medium line-clamp-1">{formData.morphology ?? '-'}</p>
      </div>
    </div>
  )
}

function HarvestSummary({ formData }: { formData: Record<string, any> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-4 text-sm">
      <div>
        <span className="text-xs text-muted-foreground">总细胞数</span>
        <p className="font-medium">
          {formData.total_cells ? Number(formData.total_cells).toLocaleString() : '-'}
        </p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">存活率</span>
        <p className="font-medium">{formData.viability ?? '-'}%</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">总支数</span>
        <p className="font-bold text-primary">{formData.total_vials ?? '-'} 支</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">存储位置</span>
        <p className="font-medium">{formData.storage_location ?? '-'}</p>
      </div>
    </div>
  )
}

// ============================================
// TaskSummary Component
// ============================================

export function TaskSummary({ task }: TaskSummaryProps) {
  const data = task.formData ?? {}

  return (
    <Card className="border-emerald/20 bg-emerald/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald/10 mt-0.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <TaskIcon taskCode={task.taskCode} />
              <span className="text-sm font-medium">{task.taskName}</span>
              {task.stepGroup && (
                <Badge variant="outline" className="font-mono text-xs">
                  {task.stepGroup}
                </Badge>
              )}
            </div>

            {/* Data Summary */}
            {task.taskCode === 'SEED_PREP' && <SeedPrepSummary formData={data} />}
            {task.taskCode === 'EXPANSION' && (
              <ExpansionSummary formData={data} stepGroup={task.stepGroup} />
            )}
            {task.taskCode === 'HARVEST' && <HarvestSummary formData={data} />}

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
              {task.actualEnd && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(task.actualEnd)}
                </span>
              )}
            </div>

            {/* Notes */}
            {task.notes && (
              <p className="text-xs text-muted-foreground bg-background/50 rounded px-2 py-1.5">
                {task.notes}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
