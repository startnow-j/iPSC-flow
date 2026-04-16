'use client'

import { useState, useEffect, useCallback, use, useMemo } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStatusLabel, getStatusColor } from '@/lib/services'
import { TERMINATION_REASONS, TERMINATION_REASON_LABELS } from '@/lib/services/state-machine'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  PlayCircle,
  CheckCircle2,
  TriangleAlert,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { EbprStepGuide } from '@/components/ebpr/ebpr-step-guide'
import { GenericTaskList } from '@/components/ebpr/generic-task-list'
import { QcForm } from '@/components/qc/qc-form'
import { QcResultsSummary } from '@/components/qc/qc-results-summary'
import { CoaDetail } from '@/components/coa/coa-detail'
import { ProductLineBadge } from '@/components/shared/product-line-badge'
import { BatchReassignDialog } from '@/components/batches/batch-reassign-dialog'
import { AssignTaskDialog } from '@/components/batches/assign-task-dialog'

// ============================================
// Types
// ============================================

interface BatchDetail {
  id: string
  batchNo: string
  productCode: string
  productId: string
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
  // v3.0 pre-assignment
  productionOperatorId?: string | null
  productionOperatorName?: string | null
  qcOperatorId?: string | null
  qcOperatorName?: string | null
  // 3B-2: product category for differentiation
  productCategory?: string | null
  // Termination info
  terminationReason?: string | null
  scrapReason?: string | null
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
  const searchParams = useSearchParams()

  // Determine default tab from URL query param
  const defaultTab = searchParams.get('tab') || 'overview'

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

  // Terminate dialog (SERVICE product line)
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false)
  const [terminateCategory, setTerminateCategory] = useState('')
  const [terminateReason, setTerminateReason] = useState('')

  // Scrap dialog (all product lines)
  const [scrapDialogOpen, setScrapDialogOpen] = useState(false)
  const [scrapReason, setScrapReason] = useState('')

  // Assign task dialog
  const [assignDialog, setAssignDialog] = useState({ open: false, taskId: '', taskName: '', productId: '' })

  // Batch reassign dialog (v3.0)
  const [reassignDialog, setReassignDialog] = useState(false)
  const { user } = useAuthStore()
  const isSupervisorOrAdmin = user?.roles?.some((r) => r === 'SUPERVISOR' || r === 'ADMIN')

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

  // Fetch tab-specific data on mount based on URL query param
  useEffect(() => {
    if (defaultTab === 'qc') {
      fetchQcRecords()
    } else if (defaultTab === 'timeline') {
      fetchTimeline()
    } else if (defaultTab === 'coa') {
      fetchCoa()
    }
  }, [defaultTab, fetchQcRecords, fetchTimeline, fetchCoa])

  const handleQcSubmitted = async () => {
    const res = await authFetch(`/api/batches/${id}`)
    if (res.ok) {
      const data = await res.json()
      setBatch(data.batch)
      setAvailableActions(data.availableActions || [])
      setRemainingQuantity(data.remainingQuantity ?? null)
      setTotalConsumedVials(data.totalConsumedVials ?? 0)
      if (data.batch.status === 'QC_PASS' || data.batch.status === 'COA_SUBMITTED') {
        fetchCoa()
      }
    }
    fetchTimeline()
    // v3.1: Always refresh QC records after submission (needed for QC fail display)
    fetchQcRecords()
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
      // v3.1: Refresh QC records to show any previous failed records
      fetchQcRecords()
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
        toast.error(data.error || '操作失败')
        return
      }

      // Success — refresh data
      toast.success(confirmAction.label ? `${confirmAction.label}成功` : '操作成功')
      setConfirmAction(null)
      await fetchBatchDetail()
      // Also refresh timeline
      fetchTimeline()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setTransitioning(false)
    }
  }

  const handleScrap = async () => {
    if (!scrapReason.trim()) {
      toast.error('请输入报废原因')
      return
    }

    setTransitioning(true)
    try {
      const res = await authFetch(`/api/batches/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scrap',
          reason: scrapReason.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '报废操作失败')
        return
      }

      toast.success('批次已报废')
      setScrapDialogOpen(false)
      setScrapReason('')
      await fetchBatchDetail()
      fetchTimeline()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setTransitioning(false)
    }
  }

  const handleTerminate = async () => {
    if (!terminateCategory) {
      toast.error('请选择终止原因分类')
      return
    }
    if (!terminateReason.trim()) {
      toast.error('请输入终止原因说明')
      return
    }

    setTransitioning(true)
    try {
      const res = await authFetch(`/api/batches/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'terminate',
          reason: terminateReason.trim(),
          terminationReason: terminateCategory,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '终止操作失败')
        return
      }

      toast.success('项目已终止')
      setTerminateDialogOpen(false)
      setTerminateCategory('')
      setTerminateReason('')
      await fetchBatchDetail()
      fetchTimeline()
    } catch {
      toast.error('网络错误，请重试')
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

        {/* TERMINATED Status Banner */}
        {batch.status === 'TERMINATED' && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/40">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  此项目已终止
                </p>
                {batch.terminationReason && (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      <span className="font-medium">终止原因分类：</span>
                      {TERMINATION_REASON_LABELS[batch.terminationReason] || batch.terminationReason}
                    </p>
                    {batch.scrapReason && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        <span className="font-medium">详细原因：</span>
                        {batch.scrapReason}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1.5">
                  所有已完成的生产和鉴定记录将保留为只读。此操作不可撤销。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SCRAPPED Status Banner */}
        {batch.status === 'SCRAPPED' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
            <div className="flex items-center gap-2 text-red-700">
              <TriangleAlert className="h-5 w-5" />
              <span className="font-medium">该批次已报废</span>
            </div>
            {batch.scrapReason && (
              <p className="mt-2 text-sm text-red-600">原因：{batch.scrapReason}</p>
            )}
          </div>
        )}

        {/* Action Buttons — hidden when TERMINATED */}
        {availableActions.length > 0 && batch.status !== 'TERMINATED' && (
          <div className="flex gap-2 flex-wrap">
            {availableActions.map((action) => (
              <Button
                key={action.action}
                variant={
                  action.label.includes('报废') || action.label.includes('终止')
                    ? 'destructive'
                    : 'default'
                }
                size="sm"
                onClick={() => {
                  if (action.action === 'terminate') {
                    setTerminateCategory('')
                    setTerminateReason('')
                    setTerminateDialogOpen(true)
                    return
                  }
                  if (action.action === 'scrap') {
                    setScrapReason('')
                    setScrapDialogOpen(true)
                    return
                  }
                  setConfirmAction(action)
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} onValueChange={handleTabChange}>
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

            {/* Assignment Info (v3.0) */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    指派信息
                  </CardTitle>
                  {isSupervisorOrAdmin && 
                    !['RELEASED', 'SCRAPPED', 'TERMINATED'].includes(batch.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setReassignDialog(true)}
                    >
                      重新指派
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow
                  icon={User}
                  label="生产操作员"
                  value={batch.productionOperatorName}
                />
                <InfoRow
                  icon={ClipboardCheck}
                  label="质检员"
                  value={batch.qcOperatorName}
                />
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
          {['TERMINATED', 'RELEASED'].includes(batch.status) ? (
            <PlaceholderCard icon={Lock} title="生产记录已锁定" description="该批次已结束，生产记录不可修改" />
          ) : batch.productLine === 'CELL_PRODUCT' ? (
            <EbprStepGuide
              key={`prod-${batch.productionOperatorId}-${batch.qcOperatorId}-${batch.updatedAt}`}
              batchId={id}
              batch={batch}
              category={batch.productCategory}
              onBatchUpdated={handleProductionUpdate}
              onAssignTask={(req) => setAssignDialog({
                open: true,
                taskId: req.taskId,
                taskName: req.taskName,
                productId: batch.productId || req.productId || '',
              })}
              readOnly={batch.status === 'SCRAPPED'}
            />
          ) : (
            <GenericTaskList
              key={`prod-${batch.productionOperatorId}-${batch.qcOperatorId}-${batch.updatedAt}`}
              batchId={id}
              productLine={batch.productLine || 'CELL_PRODUCT'}
              productId={batch.productId || ''}
              onBatchUpdated={handleProductionUpdate}
              onAssignTask={(req) => setAssignDialog({
                open: true,
                taskId: req.taskId,
                taskName: req.taskName,
                productId: batch.productId || req.productId || '',
              })}
              readOnly={batch.status === 'SCRAPPED'}
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

              {/* TERMINATED status */}
              {batch.status === 'TERMINATED' && (
                <PlaceholderCard
                  icon={AlertCircle}
                  title="项目已终止"
                  description="该服务项目已终止，无法进行质检。"
                />
              )}

              {/* Other statuses: no QC yet */}
              {!['IDENTIFICATION', 'REPORT_PENDING', 'COA_SUBMITTED', 'RELEASED', 'TERMINATED'].includes(batch.status) && (
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
              {(['NEW', 'IN_PRODUCTION'].includes(batch.status)) && (
                <PlaceholderCard
                  icon={ClipboardCheck}
                  title="请先完成生产记录"
                  description="完成所有生产步骤并提交后，方可进行质检。"
                />
              )}

              {batch.status === 'MATERIAL_PREP' && (
                <PlaceholderCard
                  icon={ClipboardCheck}
                  title="请先完成物料准备"
                  description="完成物料准备后，方可进行质检。"
                />
              )}

              {/* Status: QC_PENDING — show start QC button + any previous QC records */}
              {batch.status === 'QC_PENDING' && (
                <div className="space-y-6">
                  {/* v3.1: Show previous QC records (e.g., from failed attempts before rework) */}
                  {qcRecords.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">
                        历史质检记录（返工前）
                      </h3>
                      <QcResultsSummary key={`qc-pending-${qcRecords.length}`} batchId={id} />
                    </div>
                  )}
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
                        <ClipboardCheck className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="text-base font-medium mb-2">准备质检</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
                        生产已完成，可以开始质检。请完成质检流程。
                      </p>
                      <Button onClick={handleStartQc} disabled={transitioning}>
                        {transitioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <PlayCircle className="mr-2 h-4 w-4" />
                        开始质检
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Status: QC_IN_PROGRESS — show existing QC records + QC form */}
              {batch.status === 'QC_IN_PROGRESS' && (
                <div className="space-y-6">
                  {/* v3.1: Show previous QC records (e.g., failed attempts) */}
                  <QcResultsSummary key={`qc-records-${qcRecords.length}`} batchId={id} />
                  <QcForm
                    batchId={id}
                    batchNo={batch.batchNo}
                    batchActualQuantity={remainingQuantity}
                    batchUnit={batch.unit}
                    onSubmitted={handleQcSubmitted}
                  />
                </div>
              )}

              {/* Post-QC statuses: show QC results summary */}
              {(batch.status === 'QC_PASS' ||
                batch.status === 'COA_SUBMITTED' ||
                batch.status === 'RELEASED' ||
                batch.status === 'SCRAPPED') && (
                <>
                  {qcLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-48" />
                      <Skeleton className="h-24" />
                    </div>
                  ) : qcRecords.length > 0 ? (
                    <QcResultsSummary batchId={id} />
                  ) : (
                    <PlaceholderCard
                      icon={ClipboardCheck}
                      title={batch.status === 'SCRAPPED' ? '批次已报废' : '暂无质检记录'}
                      description={batch.status === 'SCRAPPED' ? '该批次已报废，无质检记录。' : '暂无质检记录。'}
                    />
                  )}
                </>
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
          ) : batch.status === 'SCRAPPED' ? (
            <PlaceholderCard
              icon={FileText}
              title="无法生成CoA"
              description="该批次已报废，无法生成分析证书。"
            />
          ) : batch.status === 'TERMINATED' ? (
            <PlaceholderCard
              icon={FileText}
              title="无法生成CoA"
              description="该批次已终止，无法生成分析证书。"
            />
          ) : ['QC_PASS', 'COA_SUBMITTED', 'RELEASED', 'REPORT_PENDING'].includes(batch.status) ? (
              <PlaceholderCard
                icon={FileText}
                title="CoA生成中"
                description={batch.productLine === 'SERVICE'
                  ? '报告+CoA将在提交报告时生成，请稍后刷新查看。'
                  : 'CoA草稿将在质检合格后自动生成，请稍后刷新查看。'}
              />
            ) : (
              <PlaceholderCard
                icon={FileText}
                title="暂无CoA"
                description={batch.productLine === 'SERVICE'
                  ? '分析证书（CoA）将在鉴定完成后生成，届时可在此查看、编辑、提交审核。'
                  : '分析证书（CoA）将在质检合格后自动生成，届时可在此查看、编辑、提交审核。'}
              />
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
      {/* Batch Reassign Dialog (v3.0) */}
      {/* ============================================ */}
      <BatchReassignDialog
        open={reassignDialog}
        onOpenChange={setReassignDialog}
        batchId={id}
        batchNo={batch.batchNo}
        productId={batch.productId}
        currentProductionOperatorId={batch.productionOperatorId}
        currentProductionOperatorName={batch.productionOperatorName}
        currentQcOperatorId={batch.qcOperatorId}
        currentQcOperatorName={batch.qcOperatorName}
        onSuccess={handleProductionUpdate}
      />

      {/* ============================================ */}
      {/* Transition Confirmation Dialog (non-terminate) */}
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
                confirmAction?.label.includes('报废')
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

      {/* ============================================ */}
      {/* Terminate Dialog (SERVICE product line) */}
      {/* ============================================ */}
      <Dialog open={terminateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setTerminateDialogOpen(false)
          setTerminateCategory('')
          setTerminateReason('')
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>终止项目</DialogTitle>
            <DialogDescription>
              终止后，所有已完成的生产和鉴定记录将保留为只读。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Reason Category */}
            <div className="space-y-2">
              <Label htmlFor="terminate-category">
                终止原因分类 <span className="text-destructive">*</span>
              </Label>
              <Select value={terminateCategory} onValueChange={setTerminateCategory}>
                <SelectTrigger id="terminate-category">
                  <SelectValue placeholder="请选择终止原因分类" />
                </SelectTrigger>
                <SelectContent>
                  {TERMINATION_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {TERMINATION_REASON_LABELS[reason]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Detailed Reason */}
            <div className="space-y-2">
              <Label htmlFor="terminate-reason">
                详细原因 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="terminate-reason"
                placeholder="请输入终止原因..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTerminateDialogOpen(false)}
              disabled={transitioning}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={transitioning || !terminateCategory || !terminateReason.trim()}
            >
              {transitioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认终止
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* Scrap Dialog (all product lines) */}
      {/* ============================================ */}
      <Dialog open={scrapDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setScrapDialogOpen(false)
          setScrapReason('')
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>报废批次</DialogTitle>
            <DialogDescription>
              报废后，该批次将标记为已报废状态。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="scrap-reason">
                报废原因 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="scrap-reason"
                placeholder="请输入报废原因..."
                value={scrapReason}
                onChange={(e) => setScrapReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScrapDialogOpen(false)}
              disabled={transitioning}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleScrap}
              disabled={transitioning || !scrapReason.trim()}
            >
              {transitioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认报废
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
