'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, FlaskConical, ArrowUpDown, Snowflake, Microscope, Clock, User, ShieldCheck, Dna, Crosshair, ThermometerSun, Wand2, Search, PackageSearch, TestTubes, Printer, ChevronDown, ChevronUp, FileText } from 'lucide-react'

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
// Field label mapping (snake_case → 中文)
// ============================================

const FIELD_LABELS: Record<string, string> = {
  // 种子复苏
  recovery_time: '复苏耗时',
  recovery_method: '复苏方式',
  recovery_status: '复苏状态',
  thawed_vials: '复苏支数',
  // 扩增培养
  passage_from: '起始代次',
  passage_to: '目标代次',
  passage_date: '传代日期',
  passage_ratio: '传代比例',
  cell_density: '细胞密度',
  media_batch_no: '培养基批号',
  morphology: '细胞形态',
  // 分化
  diff_stage: '分化阶段',
  diff_date: '操作日期',
  culture_days: '培养天数',
  induction_factors: '诱导因子',
  medium: '培养基',
  // 收获
  cell_passage: '细胞代次',
  total_cells: '总细胞数',
  viability: '存活率',
  total_vials: '总支数',
  storage_location: '存储位置',
  // 鉴定
  sample_type: '样本类型',
  test_item: '检测项目',
  test_method: '检测方法',
  test_result: '检测结果',
  // 通用
  operator_name: '操作员',
  notes: '备注',
  sample_info: '样本信息',
  passage: '代次',
  result: '结果',
  operator: '操作员',
  date: '日期',
  time: '时间',
  description: '描述',
  batch_no: '批次号',
  product_name: '产品名称',
  specification: '规格',
}

// Fields that are already shown in the summary (will be de-emphasized in detail view)
const SUMMARY_FIELDS = new Set([
  'passage_date', 'passage_ratio', 'cell_density', 'morphology',
  'diff_stage', 'diff_date', 'culture_days', 'induction_factors', 'medium',
  'cell_passage', 'total_cells', 'viability', 'total_vials', 'storage_location',
  'recovery_time', 'recovery_method', 'recovery_status',
])

// Fields to skip in detail view
const SKIP_FIELDS = new Set(['operator_name', 'notes'])

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  // Date fields: only show date part
  if (typeof value === 'string' && (key.includes('_date') || key === 'date')) {
    const d = new Date(value)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }
  }
  return String(value)
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

function formatDateOnly(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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
    case 'DIFFERENTIATION':
      return <Microscope className={className} />
    case 'SAMPLE_PREP':
      return <FlaskConical className={className} />
    case 'REPROGRAM':
      return <Dna className={className} />
    case 'CLONE_PICKING':
      return <Crosshair className={className} />
    case 'FREEZE':
      return <Snowflake className={className} />
    case 'CELL_REVIVAL':
      return <ThermometerSun className={className} />
    case 'GENE_EDITING':
      return <Wand2 className={className} />
    case 'CLONE_SCREENING':
      return <Search className={className} />
    case 'MATERIAL_PREP':
      return <PackageSearch className={className} />
    case 'PREPARATION':
      return <TestTubes className={className} />
    case 'DISPENSING':
      return <Printer className={className} />
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
    <div className="grid gap-2 sm:grid-cols-5 text-sm">
      <div>
        <span className="text-xs text-muted-foreground">传代日期</span>
        <p className="font-medium">{formData.passage_date ? formatDateOnly(formData.passage_date) : '-'}</p>
      </div>
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

function DifferentiationSummary({ formData, stepGroup }: { formData: Record<string, any>; stepGroup: string | null }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3 text-sm">
      <div>
        <span className="text-xs text-muted-foreground">分化阶段</span>
        <p className="font-medium line-clamp-1">{formData.diff_stage ?? '-'}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">操作日期</span>
        <p>{formData.diff_date ? formatDateOnly(formData.diff_date) : '-'}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">培养天数</span>
        <p className="font-medium">{formData.culture_days ?? '-'} 天</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">诱导因子</span>
        <p className="font-medium line-clamp-1">{formData.induction_factors ?? '-'}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">培养基</span>
        <p className="font-medium">{formData.medium ?? '-'}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">细胞形态</span>
        <p>
          <Badge
            variant="secondary"
            className={
              formData.morphology === '正常'
                ? 'bg-emerald-100 text-emerald-700'
                : formData.morphology === '异常'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
            }
          >
            {formData.morphology ?? '-'}
          </Badge>
        </p>
      </div>
    </div>
  )
}

function HarvestSummary({ formData }: { formData: Record<string, any> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-5 text-sm">
      <div>
        <span className="text-xs text-muted-foreground">细胞代次</span>
        <p className="font-mono font-medium">{formData.cell_passage ?? '-'}</p>
      </div>
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
// Full Detail View (all formData fields)
// ============================================

function TaskFullDetail({ formData }: { formData: Record<string, any> }) {
  const entries = Object.entries(formData).filter(([key]) => !SKIP_FIELDS.has(key))

  // Separate into: already-in-summary fields vs additional fields
  const summaryEntries = entries.filter(([key]) => SUMMARY_FIELDS.has(key))
  const additionalEntries = entries.filter(([key]) => !SUMMARY_FIELDS.has(key))

  if (entries.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Additional fields (not shown in summary) */}
      {additionalEntries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            补充信息
          </p>
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            {additionalEntries.map(([key, value]) => (
              <div key={key} className="rounded-md bg-background/50 px-3 py-2">
                <span className="text-xs text-muted-foreground">{getFieldLabel(key)}</span>
                <p className="font-medium whitespace-pre-wrap break-all mt-0.5">
                  {formatFieldValue(key, value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All fields (complete data table) */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          完整数据
        </p>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <tbody>
              {entries.map(([key, value], idx) => (
                <tr key={key} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="px-3 py-2 text-muted-foreground font-medium whitespace-nowrap align-top w-40">
                    {getFieldLabel(key)}
                  </td>
                  <td className="px-3 py-2 whitespace-pre-wrap break-all">
                    {formatFieldValue(key, value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================
// TaskSummary Component
// ============================================

export function TaskSummary({ task }: TaskSummaryProps) {
  const data = task.formData ?? {}
  const [showDetail, setShowDetail] = useState(false)

  // Check if there are additional fields beyond what's shown in summary
  const allKeys = Object.keys(data).filter(key => !SKIP_FIELDS.has(key))
  const hasAdditionalFields = allKeys.some(key => !SUMMARY_FIELDS.has(key))
  const hasFormData = allKeys.length > 0

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
            {task.taskCode === 'DIFFERENTIATION' && (
              <DifferentiationSummary formData={data} stepGroup={task.stepGroup} />
            )}

            {/* Generic fallback for SERVICE/KIT/ID tasks */}
            {!['SEED_PREP', 'EXPANSION', 'DIFFERENTIATION', 'HARVEST'].includes(task.taskCode) && Object.keys(data).length > 0 && (
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                {Object.entries(data).filter(([key]) => !['operator_name', 'notes'].includes(key)).slice(0, 6).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-xs text-muted-foreground">{getFieldLabel(key)}</span>
                    <p className="font-medium line-clamp-1">{formatFieldValue(key, value)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Expandable Detail */}
            {hasFormData && (
              <>
                <Separator />
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground px-0"
                    onClick={() => setShowDetail(!showDetail)}
                  >
                    <FileText className="mr-1.5 h-3 w-3" />
                    {showDetail ? '收起详情' : '查看详情'}
                    {showDetail
                      ? <ChevronUp className="ml-1 h-3 w-3" />
                      : <ChevronDown className="ml-1 h-3 w-3" />
                    }
                  </Button>
                  {showDetail && (
                    <div className="mt-3">
                      <TaskFullDetail formData={data} />
                    </div>
                  )}
                </div>
              </>
            )}

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
