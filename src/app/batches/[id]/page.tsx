'use client'

import { useState, useEffect, useCallback, use } from 'react'
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
} from 'lucide-react'
import { EbprStepGuide } from '@/components/ebpr/ebpr-step-guide'

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

function TimelineCard({ timeline }: { timeline: TimelineEntry[] }) {
  if (timeline.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <History className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">暂无时间线记录</p>
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

          <div className="space-y-6">
            {timeline.map((entry, index) => (
              <div key={entry.id} className="relative flex gap-4">
                {/* Dot */}
                <div className="relative z-10 mt-1 flex h-[22px] w-[22px] shrink-0 items-center justify-center">
                  <div
                    className={`h-2.5 w-2.5 rounded-full border-2 ${
                      index === timeline.length - 1
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
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(entry.createdAt)}
                  </p>

                  {/* Data changes */}
                  {entry.dataAfter && (
                    <div className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-xs space-y-1">
                      {entry.dataBefore?.status && entry.dataAfter.status && (
                        <p>
                          <span className="text-muted-foreground">状态变更：</span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] mr-1 ${getStatusColor(entry.dataBefore.status as string)}`}
                          >
                            {getStatusLabel(entry.dataBefore.status as string)}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ml-1 ${getStatusColor(entry.dataAfter.status as string)}`}
                          >
                            {getStatusLabel(entry.dataAfter.status as string)}
                          </Badge>
                        </p>
                      )}
                      {entry.dataAfter.statusLabel && !entry.dataBefore?.status && (
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
            ))}
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
  const [availableActions, setAvailableActions] = useState<AvailableAction[]>([])
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)

  // Transition confirmation dialog
  const [confirmAction, setConfirmAction] = useState<AvailableAction | null>(null)

  const fetchBatchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/batches/${id}`)
      if (res.ok) {
        const data = await res.json()
        setBatch(data.batch)
        setAvailableActions(data.availableActions || [])
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
      const res = await fetch(`/api/batches/${id}/timeline`)
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
  }

  const handleProductionUpdate = async () => {
    await fetchBatchDetail()
    fetchTimeline()
  }

  const handleTransition = async () => {
    if (!confirmAction) return

    setTransitioning(true)
    try {
      const res = await fetch(`/api/batches/${id}/transition`, {
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
            <p className="text-sm text-muted-foreground mt-1">
              {batch.productName} · {batch.productCode}
            </p>
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
                <Separator className="my-1" />
                <InfoRow
                  icon={Package}
                  label="计划数量"
                  value={batch.plannedQuantity ? `${batch.plannedQuantity} ${batch.unit}` : null}
                />
                <InfoRow
                  icon={Package}
                  label="实际数量"
                  value={batch.actualQuantity ? `${batch.actualQuantity} ${batch.unit}` : null}
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
                  label="计划开始日期"
                  value={formatDate(batch.plannedStartDate)}
                />
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
          <EbprStepGuide
            batchId={id}
            batch={batch}
            onBatchUpdated={handleProductionUpdate}
          />
        </TabsContent>

        {/* ============================================ */}
        {/* QC Tab (Placeholder) */}
        {/* ============================================ */}
        <TabsContent value="qc" className="mt-4">
          <PlaceholderCard
            icon={ClipboardCheck}
            title="暂无质检记录"
            description="质检记录功能将在第四阶段开发完成后可用，届时可在此查看细胞活力、形态学、支原体检测等质检结果。"
          />
        </TabsContent>

        {/* ============================================ */}
        {/* CoA Tab (Placeholder) */}
        {/* ============================================ */}
        <TabsContent value="coa" className="mt-4">
          <PlaceholderCard
            icon={FileText}
            title="暂无CoA"
            description="分析证书（CoA）将在质检合格后自动生成，届时可在此查看、编辑、提交审核。"
          />
        </TabsContent>

        {/* ============================================ */}
        {/* Timeline Tab */}
        {/* ============================================ */}
        <TabsContent value="timeline" className="mt-4">
          <TimelineCard timeline={timeline} />
        </TabsContent>
      </Tabs>

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
