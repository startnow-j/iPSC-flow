'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Clock,
  User,
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
  createdAt: string
}

interface QcResultsSummaryProps {
  qcRecords: QcRecord[]
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

// ============================================
// QC Results Summary Component
// ============================================

export function QcResultsSummary({ qcRecords }: QcResultsSummaryProps) {
  if (qcRecords.length === 0) {
    return null
  }

  // Show the latest record in detail
  const latest = qcRecords[0]

  return (
    <div className="space-y-4">
      {/* Latest Record Detail */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                latest.overallJudgment === 'PASS'
                  ? 'bg-emerald-100 dark:bg-emerald-900/40'
                  : 'bg-red-100 dark:bg-red-900/40'
              }`}>
                <FlaskConical className={`h-5 w-5 ${
                  latest.overallJudgment === 'PASS'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`} />
              </div>
              <div>
                <CardTitle className="text-base">质检结果</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(latest.createdAt)}
                </p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={
                latest.overallJudgment === 'PASS'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-sm px-3 py-1'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-sm px-3 py-1'
              }
            >
              {latest.overallJudgment === 'PASS' ? (
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
              )}
              {latest.overallJudgment === 'PASS' ? '合格' : '不合格'}
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
                {latest.testResults.map((item) => (
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
          {latest.failReason && (
            <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <span className="font-medium">不合格原因：</span>
              {latest.failReason}
            </div>
          )}

          <Separator className="my-3" />

          {/* Operator Info */}
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            {latest.operatorName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>操作员: {latest.operatorName}</span>
              </div>
            )}
            {latest.operatedAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>操作时间: {formatDate(latest.operatedAt)}</span>
              </div>
            )}
            {latest.reviewerName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>审核人: {latest.reviewerName}</span>
              </div>
            )}
            {latest.reviewedAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>审核时间: {formatDate(latest.reviewedAt)}</span>
              </div>
            )}
          </div>

          {latest.reviewComment && (
            <p className="mt-2 text-sm text-muted-foreground">
              审核意见: {latest.reviewComment}
            </p>
          )}
        </CardContent>
      </Card>

      {/* History Records (collapsed) */}
      {qcRecords.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              历史质检记录 ({qcRecords.length - 1})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {qcRecords.slice(1).map((record) => (
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
  )
}
