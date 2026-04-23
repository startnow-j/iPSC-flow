'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Beaker,
  ClipboardList,
  Hourglass,
  ChevronDown,
  ChevronUp,
  FileText,
  Link2,
  Package,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface TestResultItem {
  itemCode: string
  itemName: string
  method: string
  standard: string
  resultValue?: string | number | null
  resultUnit?: string
  judgment?: string
}

interface QcRecord {
  id: string
  batchId: string
  batchNo: string
  qcType: string
  testResults: TestResultItem[]
  overallJudgment: string
  failReason?: string | null
  sampleQuantity?: number | null
  operatorId?: string | null
  operatorName?: string | null
  operatedAt?: string | null
  reviewerId?: string | null
  reviewerName?: string | null
  reviewComment?: string | null
  reviewedAt?: string | null
  taskId?: string | null
  sampleInfo?: Record<string, unknown> | null
  linkedBatchId?: string | null
  linkedBatchNo?: string | null
  linkedBatchType?: string | null
  createdAt: string
}

interface QcResultsSummaryProps {
  batchId: string
}

// ============================================
// Helper
// ============================================

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(dateStr: string | null | undefined) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================
// Expandable Test Results Table (shared by all record types)
// ============================================

function TestResultsTable({ results }: { results: TestResultItem[] }) {
  if (!results || results.length === 0) return null
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">检测项目</th>
            <th className="px-3 py-2 text-left font-medium">检测方法</th>
            <th className="px-3 py-2 text-left font-medium">标准</th>
            <th className="px-3 py-2 text-left font-medium">检测结果</th>
            <th className="px-3 py-2 text-center font-medium">判定</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item) => (
            <tr key={item.itemCode} className="border-b last:border-b-0">
              <td className="px-3 py-2 font-medium">{item.itemName}</td>
              <td className="px-3 py-2 text-muted-foreground">{item.method}</td>
              <td className="px-3 py-2 text-muted-foreground">{item.standard}</td>
              <td className="px-3 py-2">
                {item.resultValue
                  ? `${item.resultValue}${item.resultUnit || ''}`
                  : '-'}
              </td>
              <td className="px-3 py-2 text-center">
                <Badge
                  variant="secondary"
                  className={
                    item.judgment === 'PASS'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }
                >
                  {item.judgment === 'PASS' ? '合格' : '不合格'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================
// Operator & Reviewer Info (shared)
// ============================================

function OperatorInfo({ record }: { record: QcRecord }) {
  const hasInfo = record.operatorName || record.operatedAt || record.reviewerName || record.reviewedAt || record.reviewComment
  if (!hasInfo) return null

  return (
    <div className="space-y-2">
      <Separator />
      <div className="grid gap-2 sm:grid-cols-2 text-sm">
        {record.operatorName && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>操作员: {record.operatorName}</span>
          </div>
        )}
        {record.operatedAt && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>操作时间: {formatDate(record.operatedAt)}</span>
          </div>
        )}
        {record.reviewerName && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>审核人: {record.reviewerName}</span>
          </div>
        )}
        {record.reviewedAt && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>审核时间: {formatDate(record.reviewedAt)}</span>
          </div>
        )}
      </div>
      {record.reviewComment && (
        <p className="text-sm text-muted-foreground">
          审核意见: {record.reviewComment}
        </p>
      )}
    </div>
  )
}

// ============================================
// IN_PROCESS Record Card — with expandable detail
// ============================================

function InProcessRecordCard({ record }: { record: QcRecord }) {
  const [showDetail, setShowDetail] = useState(false)
  const isPending = record.overallJudgment === 'PENDING'

  const detectionTypes = record.testResults
    .filter((r) => r.itemName)
    .map((r) => r.itemName)

  const sampleNumber = (record.sampleInfo as Record<string, string>)?.sampleNumber
  const sampleTime = (record.sampleInfo as Record<string, string>)?.sampleTime

  return (
    <div className="rounded-md border">
      {/* Summary row (always visible) */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setShowDetail(!showDetail)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isPending
              ? 'bg-amber-100 dark:bg-amber-900/40'
              : record.overallJudgment === 'PASS'
                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                : 'bg-red-100 dark:bg-red-900/40'
          }`}>
            {isPending ? (
              <Hourglass className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            ) : record.overallJudgment === 'PASS' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {detectionTypes.length > 0 ? (
                <span className="text-sm font-medium truncate">
                  {detectionTypes.join('、')}
                </span>
              ) : (
                <span className="text-sm font-medium">过程采样</span>
              )}
              {sampleNumber && (
                <span className="text-xs text-muted-foreground">
                  样本号: {sampleNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {sampleTime && (
                <span className="text-xs text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3 inline" />
                  {sampleTime}
                </span>
              )}
              {record.operatorName && (
                <span className="text-xs text-muted-foreground">
                  <User className="mr-1 h-3 w-3 inline" />
                  {record.operatorName}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDateShort(record.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="shrink-0 ml-3 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            {showDetail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {isPending ? (
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs"
            >
              等待检测
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className={
                record.overallJudgment === 'PASS'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-xs'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs'
              }
            >
              {record.overallJudgment === 'PASS' ? '合格' : '不合格'}
            </Badge>
          )}
        </div>
      </div>

      {/* Expandable detail */}
      {showDetail && (
        <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
          {/* Sample info */}
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            {record.sampleQuantity != null && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Beaker className="h-3.5 w-3.5" />
                <span>复苏支数: {record.sampleQuantity} 支</span>
              </div>
            )}
            {sampleNumber && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>样本号: {sampleNumber}</span>
              </div>
            )}
            {sampleTime && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>采样时间: {sampleTime}</span>
              </div>
            )}
          </div>

          {/* Test results */}
          <TestResultsTable results={record.testResults} />

          {/* Fail reason */}
          {record.failReason && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <span className="font-medium">不合格原因：</span>
              {record.failReason}
            </div>
          )}

          {/* Future: attachments placeholder */}
          {record.testResults.length === 0 && !record.failReason && (
            <p className="text-xs text-muted-foreground text-center py-2">
              暂无检测数据
            </p>
          )}

          <OperatorInfo record={record} />
        </div>
      )}
    </div>
  )
}

// ============================================
// ROUTINE Record Detail — always expanded (latest record)
// ============================================

function RoutineRecordDetail({ record }: { record: QcRecord }) {
  const hasFunctionalVerification = record.linkedBatchId && record.linkedBatchNo

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              record.overallJudgment === 'PASS'
                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                : 'bg-red-100 dark:bg-red-900/40'
            }`}>
              <FlaskConical className={`h-5 w-5 ${
                record.overallJudgment === 'PASS'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`} />
            </div>
            <div>
              <CardTitle className="text-base">
                质检结果
                {hasFunctionalVerification && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200 text-xs"
                  >
                    <Link2 className="mr-1 h-3 w-3" />
                    含功能验证
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(record.createdAt)}
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={
              record.overallJudgment === 'PASS'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-sm px-3 py-1'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-sm px-3 py-1'
            }
          >
            {record.overallJudgment === 'PASS' ? (
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
            )}
            {record.overallJudgment === 'PASS' ? '合格' : '不合格'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* QC Sample Info */}
        {record.sampleQuantity != null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Beaker className="h-3.5 w-3.5" />
            <span>复苏支数: {record.sampleQuantity} 支</span>
          </div>
        )}

        {/* Test Results Table */}
        <TestResultsTable results={record.testResults} />

        {/* Functional Verification Linked Batch */}
        {hasFunctionalVerification && (
          <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-medium text-violet-700 dark:text-violet-300">功能性验证</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                <span>关联批次: <span className="font-medium text-foreground">{record.linkedBatchNo}</span></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>类型: <span className="font-medium text-foreground">
                  {record.linkedBatchType === 'CELL_PRODUCT' ? '细胞产品' : '服务项目'}
                </span></span>
              </div>
            </div>
          </div>
        )}

        {/* Fail Reason */}
        {record.failReason && (
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <span className="font-medium">不合格原因：</span>
            {record.failReason}
          </div>
        )}

        <OperatorInfo record={record} />
      </CardContent>
    </Card>
  )
}

// ============================================
// Historical Routine Record Card — with expandable detail
// ============================================

function HistoricalRoutineCard({ record }: { record: QcRecord }) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <div className="rounded-md border">
      {/* Summary row */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setShowDetail(!showDetail)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Badge
            variant="secondary"
            className={
              record.overallJudgment === 'PASS'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-xs'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs'
            }
          >
            {record.overallJudgment === 'PASS' ? '合格' : '不合格'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatDate(record.createdAt)}
          </span>
          {record.operatorName && (
            <span className="text-xs text-muted-foreground">
              · {record.operatorName}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0 ml-2"
        >
          {showDetail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Expandable detail */}
      {showDetail && (
        <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
          {/* Sample info */}
          {record.sampleQuantity != null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Beaker className="h-3.5 w-3.5" />
              <span>复苏支数: {record.sampleQuantity} 支</span>
            </div>
          )}

          {/* Test results */}
          <TestResultsTable results={record.testResults} />

          {/* Fail reason */}
          {record.failReason && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <span className="font-medium">不合格原因：</span>
              {record.failReason}
            </div>
          )}

          {/* Future: attachments placeholder */}
          {/* {record.attachments && record.attachments.length > 0 && (
            <div className="mt-2">
              ...
            </div>
          )} */}

          <OperatorInfo record={record} />
        </div>
      )}
    </div>
  )
}

// ============================================
// QC Results Summary Component
// ============================================

export function QcResultsSummary({ batchId }: QcResultsSummaryProps) {
  const [inProcessRecords, setInProcessRecords] = useState<QcRecord[]>([])
  const [routineRecords, setRoutineRecords] = useState<QcRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchQcRecords = useCallback(async () => {
    setLoading(true)
    try {
      const [inProcessRes, routineRes] = await Promise.all([
        authFetch(`/api/batches/${batchId}/qc?qcType=IN_PROCESS`),
        authFetch(`/api/batches/${batchId}/qc?qcType=ROUTINE`),
      ])

      if (inProcessRes.ok) {
        const data = await inProcessRes.json()
        setInProcessRecords(data.qcRecords || [])
      }
      if (routineRes.ok) {
        const data = await routineRes.json()
        setRoutineRecords(data.qcRecords || [])
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [batchId])

  useEffect(() => {
    fetchQcRecords()
  }, [fetchQcRecords])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  const totalRecords = inProcessRecords.length + routineRecords.length
  if (totalRecords === 0) {
    return null
  }

  const pendingInProcess = inProcessRecords.filter(
    (r) => r.overallJudgment === 'PENDING'
  ).length

  const hasInProcess = inProcessRecords.length > 0
  const hasRoutine = routineRecords.length > 0

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-none bg-muted/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/40">
              <Beaker className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProcessRecords.length}</p>
              <p className="text-xs text-muted-foreground">条过程采样</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-muted/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40">
              <ClipboardList className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{routineRecords.length}</p>
              <p className="text-xs text-muted-foreground">条终检</p>
            </div>
          </CardContent>
        </Card>
        {pendingInProcess > 0 && (
          <Card className="border-none bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Hourglass className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{pendingInProcess}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">等待检测中</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs or single section */}
      {hasInProcess && hasRoutine ? (
        <Tabs defaultValue="in-process">
          <TabsList>
            <TabsTrigger value="in-process">
              <Beaker className="mr-1.5 h-3.5 w-3.5" />
              过程采样记录
              {inProcessRecords.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                  {inProcessRecords.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="routine">
              <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
              终检记录
              {routineRecords.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                  {routineRecords.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="in-process" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  过程采样记录 ({inProcessRecords.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {inProcessRecords.map((record) => (
                    <InProcessRecordCard key={record.id} record={record} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="routine" className="mt-4">
            <div className="space-y-4">
              {routineRecords.map((record, index) => (
                index === 0 ? (
                  <RoutineRecordDetail key={record.id} record={record} />
                ) : (
                  <HistoricalRoutineCard key={record.id} record={record} />
                )
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : hasInProcess ? (
        /* Only IN_PROCESS records */
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              过程采样记录 ({inProcessRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {inProcessRecords.map((record) => (
                <InProcessRecordCard key={record.id} record={record} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Only ROUTINE records — all with detail view */
        <div className="space-y-4">
          {/* Latest record: full detail */}
          {routineRecords[0] && (
            <RoutineRecordDetail key={routineRecords[0].id} record={routineRecords[0]} />
          )}
          {/* Historical records: expandable cards */}
          {routineRecords.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  历史质检记录 ({routineRecords.length - 1})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {routineRecords.slice(1).map((record) => (
                    <HistoricalRoutineCard key={record.id} record={record} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
