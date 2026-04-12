'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  operatorId?: string | null
  operatorName?: string | null
  operatedAt?: string | null
  reviewerId?: string | null
  reviewerName?: string | null
  reviewComment?: string | null
  reviewedAt?: string | null
  taskId?: string | null
  sampleInfo?: Record<string, unknown> | null
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
// IN_PROCESS Record Card
// ============================================

function InProcessRecordCard({ record }: { record: QcRecord }) {
  const isPending = record.overallJudgment === 'PENDING'

  // Extract detection type from testResults or sampleInfo
  const detectionTypes = record.testResults
    .filter((r) => r.itemName)
    .map((r) => r.itemName)

  // Extract sample info
  const sampleNumber = (record.sampleInfo as Record<string, string>)?.sampleNumber
  const sampleTime = (record.sampleInfo as Record<string, string>)?.sampleTime

  return (
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
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
      <div className="shrink-0 ml-3">
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
  )
}

// ============================================
// ROUTINE Record Detail (existing behavior)
// ============================================

function RoutineRecordDetail({ record }: { record: QcRecord }) {
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
              <CardTitle className="text-base">质检结果</CardTitle>
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
        {/* Test Results Table */}
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
              {record.testResults.map((item) => (
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

        {/* Fail Reason */}
        {record.failReason && (
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <span className="font-medium">不合格原因：</span>
            {record.failReason}
          </div>
        )}

        <Separator className="my-3" />

        {/* Operator Info */}
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
          <p className="mt-2 text-sm text-muted-foreground">
            审核意见: {record.reviewComment}
          </p>
        )}
      </CardContent>
    </Card>
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
            {/* Latest ROUTINE record detail */}
            <div className="space-y-4">
              {routineRecords.map((record, index) => (
                index === 0 ? (
                  <RoutineRecordDetail key={record.id} record={record} />
                ) : (
                  <Card key={record.id}>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {routineRecords.slice(1).map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between rounded-md border px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={
                                  r.overallJudgment === 'PASS'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-xs'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs'
                                }
                              >
                                {r.overallJudgment === 'PASS' ? '合格' : '不合格'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(r.createdAt)}
                              </span>
                              {r.operatorName && (
                                <span className="text-xs text-muted-foreground">
                                  · {r.operatorName}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
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
        /* Only ROUTINE records — backward compatible display */
        <div className="space-y-4">
          {routineRecords.map((record, index) => (
            index === 0 ? (
              <RoutineRecordDetail key={record.id} record={record} />
            ) : null
          ))}
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
                    <div
                      key={record.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
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
                    </div>
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
