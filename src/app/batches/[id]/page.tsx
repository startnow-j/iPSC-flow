'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useRouter } from 'next/navigation'
import { getStatusLabel, getStatusColor } from '@/lib/services'
import type { AvailableAction } from '@/lib/services'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  ArrowLeft,
  FlaskConical,
  Clock,
  User,
  Package,
  MapPin,
  Calendar,
  Hash,
  Loader2,
  FileText,
  ClipboardCheck,
  Activity,
  History,
  AlertCircle,
  RotateCcw,
  PlayCircle,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { EbprStepGuide } from '@/components/ebpr/ebpr-step-guide'
import { GenericTaskList } from '@/components/ebpr/generic-task-list'
import { QcForm } from '@/components/qc/qc-form'
import { QcResultsSummary } from '@/components/qc/qc-results-summary'
import { CoaDetail } from '@/components/coa/coa-detail'
import { ProductLineBadge } from '@/components/shared/product-line-badge'
import { AssignTaskDialog } from '@/components/batches/assign-task-dialog'

// ============================================
// Types
// ============================================

interface BatchDetail {
  id: string
  batchNo: string
  productCode: string
  productName: string
  specification: string
  unit: string
  status: string
  productLine?: string
  orderNo?: string
  plannedQuantity: number | null
  actualQuantity: number | null
  seedBatchNo: string | null
  seedPassage: string | null
  currentPassage: string | null
  storageLocation: string | null
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

interface QcRecord {
  id: string
  batchId: string
  batchNo: string
  qcType: string
  testResults: TestResultItem[]
  overallJudgment: string
  failReason?: string | null
  operatorId?: string | null
  operatorName?: string | null
  operatedAt?: string | null
  reviewerId?: string | null
  reviewerName?: string | null
  reviewComment?: string | null
  reviewedAt?: string | null
  createdAt: string
}

interface TestResultItem {
  itemCode: string
  itemName: string
  method: string
  standard: string
  resultValue?: string | number | null
  resultUnit?: string
  judgment?: string
}

interface CoaRecord {
  id: string
  batchId: string
  batchNo: string
  coaNo: string
  content: Record<string, unknown>
  status: string
  createdBy?: string | null
  createdByName?: string | null
  createdAt: string
  submittedBy?: string | null
  submittedAt?: string | null
  reviewedBy?: string | null
  reviewedByName?: string | null
  reviewComment?: string | null
  reviewedAt?: string | null
  approvedBy?: string | null
  approvedByName?: string | null
  approvedAt?: string | null
}

interface TimelineEntry {
  id: string
  eventType: string
  eventLabel: string
  targetType: string
  targetId: string
  operatorName?: string
  inputMode: string
  dataBefore?: Record<string, unknown>
  dataAfter?: Record<string, unknown>
  createdAt: string
}

// ============================================
// Helper Components
// ============================================

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number | null | undefined
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '-'}</p>
      </div>
    </div>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Event type color mapping for timeline dots
const EVENT_DOT_COLORS: Record<string, string> = {
  BATCH_CREATED: 'bg-teal-500 border-teal-500',
  BATCH_UPDATED: 'bg-sky-500 border-sky-500',
  BATCH_STATUS_CHANGED: 'bg-amber-500 border-amber-500',
  BATCH_SCRAPPED: 'bg-red-500 border-red-500',
  BATCH_RELEASED: 'bg-emerald-500 border-emerald-500',
  TASK_CREATED: 'bg-sky-400 border-sky-400',
  TASK_STARTED: 'bg-blue-500 border-blue-500',
  TASK_COMPLETED: 'bg-emerald-400 border-emerald-400',
  TASK_UPDATED: 'bg-sky-300 border-sky-300',
  QC_RECORD_CREATED: 'bg-amber-400 border-amber-400',
  QC_RECORD_UPDATED: 'bg-orange-400 border-orange-400',
  QC_STARTED: 'bg-orange-500 border-orange-500',
  QC_COMPLETED: 'bg-amber-500 border-amber-500',
  COA_GENERATED: 'bg-violet-500 border-violet-500',
  COA_SUBMITTED: 'bg-indigo-500 border-indigo-500',
  COA_APPROVED: 'bg-emerald-500 border-emerald-500',
  COA_REJECTED: 'bg-red-400 border-red-400',
  COA_RESUBMITTED: 'bg-indigo-400 border-indigo-400',
}

const INPUT_MODE_LABELS: Record<string, string> = {
  FORM_SUBMIT: '表单',
  AI_CONVERSATION: 'AI对话',
}

const INPUT_MODE_COLORS: Record<string, string> = {
  FORM_SUBMIT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  AI_CONVERSATION: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
}

function formatDiffData(
  dataBefore: Record<string, unknown> | undefined,
  dataAfter: Record<string, unknown> | undefined,
) {
  if (!dataBefore && !dataAfter) return null

  const entries: { key: string; before: unknown; after: unknown }[] = []
  const allKeys = new Set([
    ...Object.keys(dataBefore || {}),
    ...Object.keys(dataAfter || {}),
  ])

  // Skip certain internal keys
  const skipKeys = new Set(['id', 'createdAt', 'updatedAt'])

  for (const key of allKeys) {
    if (skipKeys.has(key)) continue
    const before = dataBefore?.[key]
    const after = dataAfter?.[key]
    if (JSON.stringify(before) === JSON.stringify(after)) continue
    entries.push({ key, before, after })
  }

  return entries.length > 0 ? entries : null
}

function TimelineCard({ timeline }: { timeline: TimelineEntry[] }) {
  if (timeline.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <History className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">暂无操作记录</p>
          <p className="text-xs text-muted-foreground/60 mt-1">批次操作将自动记录在此</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-5">
            {timeline.map((entry, index) => {
              const dotColor = EVENT_DOT_COLORS[entry.eventType] || ''
              const isLatest = index === timeline.length - 1
              const diffData = formatDiffData(entry.dataBefore, entry.dataAfter)

              return (
                <div key={entry.id} className="relative flex gap-4">
                  {/* Dot */}
                  <div className="relative z-10 mt-1 flex h-[22px] w-[22px] shrink-0 items-center justify-center">
                    <div
                      className={`h-2.5 w-2.5 rounded-full border-2 ${
                        dotColor
                          ? dotColor
                          : isLatest
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/40 bg-background'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{entry.eventLabel}</span>
                      {entry.operatorName && (
                        <span className="text-xs text-muted-foreground">
                          · {entry.operatorName}
                        </span>
                      )}
                      {entry.inputMode && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${INPUT_MODE_COLORS[entry.inputMode] || ''}`}
                        >
                          {INPUT_MODE_LABELS[entry.inputMode] || entry.inputMode}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTime(entry.createdAt)}
                    </p>

                    {/* Status change */}
                    {entry.dataBefore?.status && entry.dataAfter?.status && (
                      <div className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
                        <p>
                          <span className="text-muted-foreground">状态变更：</span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] mr-1 ${getStatusColor(entry.dataBefore.status as string)}`}
                          >
                            {getStatusLabel(entry.dataBefore.status as string)}
                          </Badge>
                          <span className="text-muted-foreground mx-1">→</span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${getStatusColor(entry.dataAfter.status as string)}`}
                          >
                            {getStatusLabel(entry.dataAfter.status as string)}
                          </Badge>
                        </p>
                      </div>
                    )}

                    {/* Generic data diff */}
                    {diffData && !entry.dataBefore?.status && !entry.dataAfter?.status && (
                      <div className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-xs space-y-1">
                        {diffData.map(({ key, before, after }) => (
                          <p key={key}>
                            <span className="text-muted-foreground">{key}：</span>
                            {before !== undefined && before !== null && (
                              <span className="line-through text-muted-foreground/60 mr-1">
                                {String(before)}
                              </span>
                            )}
                            {after !== undefined && after !== null && (
                              <span className="font-medium">{String(after)}</span>
                            )}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Action / BatchNo / Reason (legacy format) */}
                    {entry.dataAfter && !diffData && (
                      <div className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-xs space-y-1">
                        {entry.dataAfter.statusLabel && (
                          <p>
                            <span className="text-muted-foreground">状态：</span>
                            {entry.dataAfter.statusLabel}
                          </p>
                        )}
                        {entry.dataAfter.action && (
                          <p>
                            <span className="text-muted-foreground">操作：</span>
                            {entry.dataAfter.action}
                          </p>
                        )}
                        {entry.dataAfter.batchNo && (
                          <p>
                            <span className="text-muted-foreground">批次号：</span>
                            <span className="font-mono">{entry.dataAfter.batchNo as string}</span>
                          </p>
                        )}
                        {entry.dataAfter.reason && (
                          <p>
                            <span className="text-muted-foreground">原因：</span>
                            {entry.dataAfter.reason as string}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PlaceholderCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

// ============================================
// Main Detail Page
// ============================================

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [remainingQuantity, setRemainingQuantity] = useState<number | null>(null)
  const [totalConsumedVials, setTotalConsumedVials] = useState<number>(0)
  const [availableActions, setAvailableActions] = useState<AvailableAction[]>([])
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [qcRecords, setQcRecords] = useState<QcRecord[]>([])
  const [coa, setCoa] = useState<CoaRecord | null>(null)
  const [qcLoading, setQcLoading] = useState(false)
  const [coaLoading, setCoaLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)

  // Transition confirmation dialog
  const [confirmAction, setConfirmAction] = useState<AvailableAction | null>(null)

  // Assign task dialog
  const [assignDialog, setAssignDialog] = useState({ open: false, taskId: '', taskName: '', productId: '' })

  const fetchBatchDetail = useCallback(async () => {
    try {
      const res = await authFetch(`/api/batches/${id}`)
      if (res.ok) {
        const data = await res.json()
        setBatch(data.batch)
        setAvailableActions(data.availableActions || [])
        setRemainingQuantity(data.remainingQuantity ?? null)
        setTotalConsumedVials(data.totalConsumedVials ?? 0)
      } else {
        // Batch not found
        setBatch(null)
      }
    } catch {
      setBatch(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await authFetch(`/api/batches/${id}/timeline`)
      if (res.ok) {
        const data = await res.json()
        setTimeline(data.timeline || [])
      }
    } catch {
      // Silently fail
    }
  }, [id])

  useEffect(() => {
    fetchBatchDetail()
  }, [fetchBatchDetail])

  // Fetch timeline when tab switches (lazy load)
  const handleTabChange = (value: string) => {
    if (value === 'timeline' && timeline.length === 0) {
      fetchTimeline()
    }
    if (value === 'qc' && qcRecords.length === 0) {
      fetchQcRecords()
    }
    if (value === 'coa' && !coa) {
      fetchCoa()
    }
  }

  const handleProductionUpdate = async () => {
    await fetchBatchDetail()
    fetchTimeline()
  }

  const fetchQcRecords = useCallback(async () => {
    setQcLoading(true)
    try {
      const res = await authFetch(`/api/batches/${id}/qc`)
      if (res.ok) {
        const data = await res.json()
        setQcRecords(data.qcRecords || [])
      }
    } catch {
      // Silently fail
    } finally {
      setQcLoading(false)
    }
  }, [id])

  const fetchCoa = useCallback(async () => {
    setCoaLoading(true)
    try {
      const res = await authFetch(`/api/batches/${id}/coa`)
      if (res.ok) {
        const data = await res.json()
        setCoa(data.coa || null)
      }
    } catch {
      // Silently fail
    } finally {
      setCoaLoading(false)
    }
  }, [id])

  const handleQcSubmitted = async () => {
    await fetchBatchDetail()
    fetchTimeline()
    // After QC pass, the CoA is auto-generated, fetch it
    if (batch?.status === 'QC_PASS' || batch?.status === 'COA_PENDING') {
      fetchCoa()
    }
  }

  const handleCoaUpdated = async () => {
    await fetchBatchDetail()
    fetchTimeline()
    fetchCoa()
  }

  const handleStartQc = async () => {
    setTransitioning(true)
    try {
      const res = await authFetch(`/api/batches/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_qc' }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || '操作失败')
        return
      }
      toast.success('质检已开始')
      await fetchBatchDetail()
      fetchTimeline()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setTransitioning(false)
    }
  }

  const handleAssignTask = async () => {
    setAssignDialog(prev => ({ ...prev, open: false }))
    await fetchBatchDetail()
    fetchTimeline()
  }

  const handleTransition = async () => {
    if (!confirmAction) return

    setTransitioning(true)
    try {
      const res = await authFetch(`/api/batches/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: confirmAction.action }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '操作失败')
        return
      }

      // Success — refresh data
      setConfirmAction(null)
      await fetchBatchDetail()
      // Also refresh timeline
      fetchTimeline()
    } catch {
      alert('网络错误，请重试')
    } finally {
      setTransitioning(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  // Not found
  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">批次不存在</h2>
        <p className="text-sm text-muted-foreground mb-4">
          该批次可能已被删除或编号有误
        </p>
        <Button variant="outline" onClick={() => router.push('/batches')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回批次列表
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 shrink-0"
            onClick={() => router.push('/batches')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight font-mono">
                {batch.batchNo}
              </h1>
              <Badge
                variant="secondary"
                className={getStatusColor(batch.status)}
              >
                {getStatusLabel(batch.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {batch.productName} · {batch.productCode}
              </p>
              {batch.productLine && (
                <ProductLineBadge productLine={batch.productLine} />
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {availableActions.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {availableActions.map((action) => (
              <Button
                key={action.action}
                variant={
                  action.label.includes('报废') || action.label.includes('不合格')
                    ? 'destructive'
                    : 'default'
                }
                size="sm"
                onClick={() => setConfirmAction(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="production">
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            生产记录
          </TabsTrigger>
          <TabsTrigger value="qc">
            <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
            质检
          </TabsTrigger>
          <TabsTrigger value="coa">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            CoA
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <History className="mr-1.5 h-3.5 w-3.5" />
            时间线
          </TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* Overview Tab */}
        {/* ============================================ */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  基础信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow
                  icon={Hash}
                  label="批次编号"
                  value={batch.batchNo}
                />
                <InfoRow
                  icon={FlaskConical}
                  label="产品编码"
                  value={batch.productCode}
                />
                <InfoRow
                  icon={Package}
                  label="产品名称"
                  value={batch.productName}
                />
                <InfoRow
                  icon={Hash}
                  label="规格"
                  value={`${batch.specification} / ${batch.unit}`}
                />
                {batch.orderNo && (
                  <InfoRow
                    icon={Hash}
                    label="订单号"
                    value={batch.orderNo}
                  />
                )}
                <Separator className="my-1" />
                <InfoRow
                  icon={Package}
                  label="计划数量"
                  value={batch.plannedQuantity ? `${batch.plannedQuantity} ${batch.unit}` : null}
                />
                <InfoRow
                  icon={Package}
                  label="生产数量"
                  value={batch.actualQuantity ? `${batch.actualQuantity} ${batch.unit}` : null}
                />
                {remainingQuantity !== null && batch.actualQuantity !== null && batch.actualQuantity > 0 && (
                  <InfoRow
                    icon={Package}
                    label="剩余数量"
                    value={`${remainingQuantity} ${batch.unit}`}
                  />
                )}
                {totalConsumedVials > 0 && (
                  <InfoRow
                    icon={Package}
                    label="质检消耗"
                    value={`${totalConsumedVials} ${batch.unit}`}
                  />
                )}
              </CardContent>
            </Card>

            {/* Seed Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  种子信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow
                  icon={Hash}
                  label="种子批号"
                  value={batch.seedBatchNo}
                />
                <InfoRow
                  icon={Hash}
                  label="种子代次"
                  value={batch.seedPassage}
                />
                <InfoRow
                  icon={Hash}
                  label="当前代次"
                  value={batch.currentPassage}
                />
                <Separator className="my-1" />
                <InfoRow
                  icon={MapPin}
                  label="存储位置"
                  value={batch.storageLocation}
                />
              </CardContent>
            </Card>

            {/* Time Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  时间信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow
                  icon={Calendar}
                  label="计划交付日期"
                  value={formatDate(batch.plannedEndDate)}
                />
                <Separator className="my-1" />
                <InfoRow
                  icon={Clock}
                  label="实际开始日期"
                  value={formatDate(batch.actualStartDate)}
                />
                <InfoRow
                  icon={Clock}
                  label="实际完成日期"
                  value={formatDate(batch.actualEndDate)}
                />
              </CardContent>
            </Card>

            {/* Creator Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  创建信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow
                  icon={User}
                  label="创建人"
                  value={batch.createdByName}
                />
                <InfoRow
                  icon={Clock}
                  label="创建时间"
                  value={formatDate(batch.createdAt)}
                />
                <InfoRow
                  icon={Clock}
                  label="最后更新"
                  value={formatDate(batch.updatedAt)}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Production Tab */}
        <TabsContent value="production" className="mt-4">
          {batch.productLine === 'CELL_PRODUCT' ? (
            <EbprStepGuide
              batchId={id}
              batch={batch}
              onBatchUpdated={handleProductionUpdate}
            />
          ) : (
            <GenericTaskList
              batchId={id}
              productLine={batch.productLine || 'CELL_PRODUCT'}
              productId={batch.productCode || ''}
              onBatchUpdated={handleProductionUpdate}
              onAssignTask={(req) => setAssignDialog({
                open: true,
                taskId: req.taskId,
                taskName: req.taskName,
                productId: req.productId || batch.productCode || '',
              })}
            />
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* QC Tab */}
        {/* ============================================ */}
        <TabsContent value="qc" className="mt-4">
          {/* SERVICE product line: no independent QC flow */}
          {batch.productLine === 'SERVICE' && (
            <>
              {/* IDENTIFICATION status */}
              {batch.status === 'IDENTIFICATION' && (
                <Card className="border-violet/20 bg-violet/5">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet/10 mb-4">
                      <ClipboardCheck className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h3 className="text-base font-medium mb-2">鉴定进行中</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-xs">
                      鉴定进行中，鉴定结果即质检数据。请前往「生产记录」标签页查看鉴定任务进展。
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* REPORT_PENDING status */}
              {batch.status === 'REPORT_PENDING' && (
                <Card className="border-purple/20 bg-purple/5">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple/10 mb-4">
                      <FileText className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-base font-medium mb-2">鉴定已完成，请生成实验报告</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-xs">
                      鉴定已完成，请生成实验报告并提交审核。报告和CoA将一同提交。
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Post-report statuses: show CoA info */}
              {(batch.status === 'COA_SUBMITTED' || batch.status === 'RELEASED') && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald/10 mb-4">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-base font-medium mb-2">报告已提交</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-xs">
                      {batch.status === 'RELEASED'
                        ? '服务项目已交付，请前往「CoA」标签页查看分析证书。'
                        : '报告和CoA已提交审核，请等待主管审批。前往「CoA」标签页查看详情。'}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Other statuses: no QC yet */}
              {!['IDENTIFICATION', 'REPORT_PENDING', 'COA_SUBMITTED', 'RELEASED'].includes(batch.status) && (
                <PlaceholderCard
                  icon={ClipboardCheck}
                  title="服务项目"
                  description="服务项目无独立质检流程，质检信息将在鉴定和报告中体现。"
                />
              )}
            </>
          )}

          {/* CELL_PRODUCT / KIT: standard QC flow */}
          {batch.productLine !== 'SERVICE' && (
            <>
              {/* Status: before QC_PENDING — show message */}
              {(['NEW', 'IN_PRODUCTION', 'MATERIAL_PREP'].includes(batch.status)) && (
                <PlaceholderCard
                  icon={ClipboardCheck}
                  title="请先完成生产记录"
                  description="完成所有生产步骤并提交后，方可进行质检。"
                />
              )}

              {/* Status: QC_PENDING — show start QC button */}
              {batch.status === 'QC_PENDING' && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
                      <ClipboardCheck className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-base font-medium mb-2">准备质检</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
                      生产已完成，可以开始质检。质检将对复苏活率、细胞形态、支原体检测三个项目进行检验。
                    </p>
                    <Button onClick={handleStartQc} disabled={transitioning}>
                      {transitioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <PlayCircle className="mr-2 h-4 w-4" />
                      开始质检
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Status: QC_IN_PROGRESS — show QC form */}
              {batch.status === 'QC_IN_PROGRESS' && (
                <QcForm
                  batchId={id}
                  batchNo={batch.batchNo}
                  batchActualQuantity={remainingQuantity}
                  batchUnit={batch.unit}
                  onSubmitted={handleQcSubmitted}
                />
              )}

              {/* Post-QC statuses: show QC results summary */}
              {(batch.status === 'QC_PASS' || batch.status === 'QC_FAIL' ||
                batch.status === 'COA_PENDING' || batch.status === 'COA_SUBMITTED' ||
                batch.status === 'COA_APPROVED' ||
                batch.status === 'RELEASED') && (
                <>
                  {qcLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-48" />
                      <Skeleton className="h-24" />
                    </div>
                  ) : qcRecords.length > 0 ? (
                    <QcResultsSummary qcRecords={qcRecords} />
                  ) : (
                    <PlaceholderCard
                      icon={ClipboardCheck}
                      title="暂无质检记录"
                      description="质检记录功能将在第四阶段开发完成后可用，届时可在此查看细胞活力、形态学、支原体检测等质检结果。"
                    />
                  )}
                </>
              )}

              {/* Status: QC_FAIL — show results + rework button */}
              {batch.status === 'QC_FAIL' && (
                <div className="mt-4">
                  <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="text-sm font-medium">质检不合格</p>
                          <p className="text-xs text-muted-foreground">请联系主管安排返工或报废</p>
                        </div>
                      </div>
                      {availableActions.some(a => a.action === 'rework') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const reworkAction = availableActions.find(a => a.action === 'rework')
                            if (reworkAction) setConfirmAction(reworkAction)
                          }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          返工
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* SCRAPPED status */}
              {batch.status === 'SCRAPPED' && (
                <PlaceholderCard
                  icon={ClipboardCheck}
                  title="批次已报废"
                  description="该批次已报废，无法进行质检。"
                />
              )}
            </>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* CoA Tab */}
        {/* ============================================ */}
        <TabsContent value="coa" className="mt-4">
          {coaLoading ? (
            <Skeleton className="h-96" />
          ) : coa ? (
            <CoaDetail coa={coa} onUpdated={handleCoaUpdated} />
          ) : (
            ['QC_PASS', 'COA_PENDING', 'COA_SUBMITTED', 'COA_APPROVED', 'RELEASED', 'REPORT_PENDING'].includes(batch.status) ? (
              <PlaceholderCard
                icon={FileText}
                title="CoA生成中"
                description={batch.productLine === 'SERVICE'
                  ? '报告+CoA将在提交报告时生成，请稍后刷新查看。'
                  : 'CoA将自动生成，请稍后刷新查看。'}
              />
            ) : (
              <PlaceholderCard
                icon={FileText}
                title="暂无CoA"
                description={batch.productLine === 'SERVICE'
                  ? '分析证书（CoA）将在鉴定完成后生成，届时可在此查看、编辑、提交审核。'
                  : '分析证书（CoA）将在质检合格后自动生成，届时可在此查看、编辑、提交审核。'}
              />
            )
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* Timeline Tab */}
        {/* ============================================ */}
        <TabsContent value="timeline" className="mt-4">
          <TimelineCard timeline={timeline} />
        </TabsContent>
      </Tabs>

      {/* ============================================ */}
      {/* Assign Task Dialog */}
      {/* ============================================ */}
      <AssignTaskDialog
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog(prev => ({ ...prev, open }))}
        batchId={id}
        taskId={assignDialog.taskId}
        taskName={assignDialog.taskName}
        productId={assignDialog.productId}
        onSuccess={handleAssignTask}
      />

      {/* ============================================ */}
      {/* Transition Confirmation Dialog */}
      {/* ============================================ */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认操作</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.label === '报废' ? (
                <>
                  您确定要将批次 <span className="font-mono font-medium text-foreground">{batch.batchNo}</span> 标记为{' '}
                  <span className="text-destructive font-medium">已报废</span> 吗？此操作不可撤销。
                </>
              ) : confirmAction?.label === '质检不合格' ? (
                <>
                  您确定将批次 <span className="font-mono font-medium text-foreground">{batch.batchNo}</span> 标记为{' '}
                  <span className="text-destructive font-medium">质检不合格</span> 吗？后续可选择返工或报废。
                </>
              ) : (
                <>
                  确认对批次 <span className="font-mono font-medium text-foreground">{batch.batchNo}</span> 执行{' '}
                  <span className="font-medium text-foreground">{confirmAction?.label}</span> 操作？
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transitioning}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransition}
              disabled={transitioning}
              className={
                confirmAction?.label.includes('报废') || confirmAction?.label.includes('不合格')
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : ''
              }
            >
              {transitioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmAction?.label || '确认'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
