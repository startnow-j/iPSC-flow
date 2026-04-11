'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
import { Textarea } from '@/components/ui/textarea'
import {
  FileText,
  CheckCircle2,
  XCircle,
  Send,
  ShieldCheck,
  RotateCcw,
  Loader2,
  Stamp,
  Eye,
  EyeOff,
  PackageMinus,
  FlaskConical,
  GitBranch,
  PenLine,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { hasRole } from '@/lib/roles'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

interface CoaContent {
  productCode?: string
  productName?: string
  batchNo?: string
  specification?: string
  seedBatchNo?: string
  seedPassage?: string
  currentPassage?: string
  plannedQuantity?: number | null
  actualQuantity?: number | null
  storageLocation?: string | null
  testResults?: TestResultItem[]
  overallJudgment?: string
  actualStartDate?: string | null
  actualEndDate?: string | null
  releaseQuantity?: number | null
  totalConsumedVials?: number | null
}

interface CoaRecord {
  id: string
  batchId: string
  batchNo: string
  coaNo: string
  content: CoaContent
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
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

interface CoaDetailProps {
  coa: CoaRecord
  onUpdated?: () => void
}

type ViewMode = 'internal' | 'customer'

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

const COA_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: '草稿', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  SUBMITTED: { label: '待审核', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  APPROVED: { label: '已批准', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  REJECTED: { label: '已退回', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
}

// ============================================
// CoA Detail Component
// ============================================

export function CoaDetail({ coa, onUpdated }: CoaDetailProps) {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'submit' | 'approve' | 'reject' | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('internal')

  const statusConfig = COA_STATUS_CONFIG[coa.status] || COA_STATUS_CONFIG.DRAFT
  const userRoles = user?.roles || [user?.role || 'OPERATOR']
  const isSupervisorOrQA = hasRole(userRoles, 'SUPERVISOR') || hasRole(userRoles, 'QA')
  const isSupervisor = hasRole(userRoles, 'SUPERVISOR')

  const isCustomerView = viewMode === 'customer'

  const handleAction = async () => {
    if (!confirmAction) return

    setLoading(true)
    try {
      const body: Record<string, string> = { action: confirmAction }
      if (confirmAction === 'reject' && rejectComment.trim()) {
        body.reviewComment = rejectComment.trim()
      }

      const res = await authFetch(`/api/coa/${coa.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '操作失败')
      }

      toast.success(data.message || '操作成功')
      setConfirmAction(null)
      setRejectComment('')
      onUpdated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* CoA Document */}
      <Card className={cn('overflow-hidden', isCustomerView && 'ring-2 ring-amber-400/50 dark:ring-amber-500/30')}>
        {/* Document Header */}
        <div className="border-b bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-wide">分析证书</h2>
              <p className="text-sm opacity-90 mt-1">Certificate of Analysis</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="mt-4 flex items-center gap-1 rounded-lg bg-white/15 p-1 w-fit">
            <button
              onClick={() => setViewMode('internal')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                !isCustomerView
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              内部视图
            </button>
            <button
              onClick={() => setViewMode('customer')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                isCustomerView
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              )}
            >
              <EyeOff className="h-3.5 w-3.5" />
              客户版本
            </button>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* CoA Number + Batch Number */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">CoA编号</p>
              <p className="text-sm font-mono font-semibold mt-1">{coa.coaNo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">批号</p>
              <p className="text-sm font-mono font-semibold mt-1">{coa.batchNo}</p>
            </div>
          </div>

          <Separator />

          {/* Product Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              产品信息
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <InfoItem label="产品编码" value={coa.content.productCode} />
              <InfoItem label="产品名称" value={coa.content.productName} />
              <InfoItem label="规格" value={coa.content.specification} />
            </div>
          </div>

          <Separator />

          {/* Production Information — only in internal view */}
          {!isCustomerView && (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Stamp className="h-4 w-4 text-primary" />
                  生产信息
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <InfoItem label="种子批号" value={coa.content.seedBatchNo} />
                  <InfoItem label="种子代次" value={coa.content.seedPassage} />
                  <InfoItem label="当前代次" value={coa.content.currentPassage} />
                  <InfoItem label="计划数量" value={coa.content.plannedQuantity ? `${coa.content.plannedQuantity} 支` : null} />
                  <InfoItem label="生产数量" value={coa.content.actualQuantity ? `${coa.content.actualQuantity} 支` : null} />
                  <InfoItem label="存储位置" value={coa.content.storageLocation} />
                  <InfoItem
                    label="质检消耗"
                    value={coa.content.totalConsumedVials != null && coa.content.totalConsumedVials > 0
                      ? `${coa.content.totalConsumedVials} 支`
                      : '0 支'}
                  />
                  <InfoItem
                    label="可发放数量"
                    value={coa.content.releaseQuantity != null ? `${coa.content.releaseQuantity} 支` : null}
                  />
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Passage Information — only in customer view */}
          {isCustomerView && (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  代次信息
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <InfoItem label="种子代次" value={coa.content.seedPassage} />
                  <InfoItem label="最终代次" value={coa.content.currentPassage} />
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* QC Results Table */}
          {coa.content.testResults && coa.content.testResults.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                质检结果
              </h3>
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
                    {coa.content.testResults.map((item) => (
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

              {/* Overall Judgment */}
              {coa.content.overallJudgment && (
                <div className={`mt-3 flex items-center justify-center gap-2 rounded-md px-4 py-3 ${
                  coa.content.overallJudgment === 'PASS'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30'
                    : 'bg-red-50 dark:bg-red-950/30'
                }`}>
                  <Badge
                    variant="secondary"
                    className={
                      coa.content.overallJudgment === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-sm px-3 py-1'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-sm px-3 py-1'
                    }
                  >
                    {coa.content.overallJudgment === 'PASS' ? (
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    综合判定: {coa.content.overallJudgment === 'PASS' ? '合格' : '不合格'}
                  </Badge>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Review History — internal view shows full history */}
          {!isCustomerView && (
            <div>
              <h3 className="text-sm font-semibold mb-3">审核记录</h3>
              <div className="space-y-2 text-sm">
                <InfoItem label="创建人" value={coa.createdByName} extra={coa.createdAt ? formatDate(coa.createdAt) : ''} />
                {coa.submittedByName && (
                  <InfoItem label="提交人" value={coa.submittedByName} extra={coa.submittedAt ? formatDate(coa.submittedAt) : ''} />
                )}
                {coa.reviewedByName && (
                  <InfoItem label="审核人" value={coa.reviewedByName} extra={coa.reviewedAt ? formatDate(coa.reviewedAt) : ''} />
                )}
                {coa.reviewComment && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">审核意见: </span>
                    <span>{coa.reviewComment}</span>
                  </div>
                )}
                {coa.approvedByName && (
                  <InfoItem label="批准人" value={coa.approvedByName} extra={coa.approvedAt ? formatDate(coa.approvedAt) : ''} />
                )}
              </div>
            </div>
          )}

          {/* Approval Signature — only in customer view (final review) */}
          {isCustomerView && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <PenLine className="h-4 w-4 text-primary" />
                审核签字
              </h3>
              <div className="space-y-2 text-sm">
                <InfoItem label="审核批准人" value={coa.approvedByName} />
                <InfoItem label="批准日期" value={coa.approvedAt ? formatDate(coa.approvedAt) : null} />
              </div>
            </div>
          )}

          {/* Customer View Watermark Footer */}
          {isCustomerView && (
            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5" />
              客户版本 · 生产信息已隐藏
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons based on status */}
      <div className="flex gap-2 flex-wrap">
        {coa.status === 'DRAFT' && (
          <Button onClick={() => setConfirmAction('submit')}>
            <Send className="mr-2 h-4 w-4" />
            提交审核
          </Button>
        )}

        {coa.status === 'SUBMITTED' && isSupervisorOrQA && (
          <>
            <Button onClick={() => setConfirmAction('approve')}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              批准
            </Button>
            <Button variant="destructive" onClick={() => setConfirmAction('reject')}>
              <XCircle className="mr-2 h-4 w-4" />
              退回
            </Button>
          </>
        )}

        {coa.status === 'APPROVED' && isSupervisor && (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-3 py-1"
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            已批准
          </Badge>
        )}

        {coa.status === 'REJECTED' && (
          <Button onClick={() => setConfirmAction('submit')}>
            <RotateCcw className="mr-2 h-4 w-4" />
            重新提交
          </Button>
        )}
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog
        open={confirmAction === 'submit'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认提交审核</AlertDialogTitle>
            <AlertDialogDescription>
              确认提交 CoA ({coa.coaNo}) 进入审核流程？提交后将无法修改。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认提交
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog
        open={confirmAction === 'approve'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批准 CoA</AlertDialogTitle>
            <AlertDialogDescription>
              确认批准 CoA ({coa.coaNo})？批准后该批次可进入放行流程。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              批准
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog
        open={confirmAction === 'reject'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退回 CoA</AlertDialogTitle>
            <AlertDialogDescription>
              确认退回 CoA ({coa.coaNo})？退回后需要重新提交审核。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-1.5 block">退回原因（可选）</label>
            <Textarea
              placeholder="请输入退回原因..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={loading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              退回
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================
// Helper Component
// ============================================

function InfoItem({
  label,
  value,
  extra,
}: {
  label: string
  value?: string | number | null
  extra?: string
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium">{value || '-'}</span>
      {extra && (
        <span className="text-xs text-muted-foreground ml-1">({extra})</span>
      )}
    </div>
  )
}
