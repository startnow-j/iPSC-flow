'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FlaskConical,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface TestResultItem {
  itemCode: string
  itemName: string
  method: string
  standard: string
  resultType: 'number' | 'select'
  resultValue?: string | number | null
  judgment?: string
  resultUnit?: string
}

interface QcFormProps {
  batchId: string
  batchNo: string
  onSubmitted: () => void
}

// ============================================
// QC Template Definition
// ============================================

const QC_TEMPLATE: TestResultItem[] = [
  {
    itemCode: 'VIABILITY',
    itemName: '复苏活率',
    method: '台盼蓝染色',
    standard: '≥85%',
    resultType: 'number',
    resultUnit: '%',
  },
  {
    itemCode: 'MORPHOLOGY',
    itemName: '细胞形态',
    method: '显微镜观察',
    standard: '正常iPSC形态',
    resultType: 'select',
  },
  {
    itemCode: 'MYCOPLASMA',
    itemName: '支原体检测',
    method: 'PCR法',
    standard: '阴性',
    resultType: 'select',
  },
]

// ============================================
// QC Form Component
// ============================================

export function QcForm({ batchId, batchNo, onSubmitted }: QcFormProps) {
  const user = useAuthStore((s) => s.user)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<TestResultItem[]>(
    QC_TEMPLATE.map((item) => ({ ...item }))
  )

  // Update a specific test item
  const updateResult = (index: number, field: string, value: unknown) => {
    setResults((prev) => {
      const updated = [...prev]
      const item = { ...updated[index] }

      if (field === 'resultValue') {
        item.resultValue = value as string
        // Auto-judgment based on itemCode
        if (item.itemCode === 'VIABILITY') {
          const num = Number(value)
          item.judgment = (!isNaN(num) && num >= 85) ? 'PASS' : 'FAIL'
        }
      } else if (field === 'judgment') {
        item.judgment = value as string
      }

      updated[index] = item
      return updated
    })
  }

  // Calculate overall judgment
  const allFilled = results.every((item) => {
    if (item.itemCode === 'VIABILITY') {
      return item.resultValue !== undefined && item.resultValue !== null && String(item.resultValue).trim() !== ''
    }
    return !!item.judgment
  })

  const overallJudgment = allFilled
    ? results.every((item) => item.judgment === 'PASS')
      ? 'PASS'
      : 'FAIL'
    : null

  const passCount = results.filter((item) => item.judgment === 'PASS').length
  const failCount = results.filter((item) => item.judgment === 'FAIL').length

  const handleSubmit = async () => {
    if (!allFilled) {
      toast.error('请填写所有检测项')
      return
    }

    setSubmitting(true)
    try {
      // Create QC record
      const qcRes = await authFetch(`/api/batches/${batchId}/qc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testResults: results.map((item) => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            method: item.method,
            standard: item.standard,
            resultValue: item.resultValue,
            resultUnit: item.resultUnit,
            judgment: item.judgment,
          })),
          operatorId: user?.id,
          operatorName: user?.name,
        }),
      })

      if (!qcRes.ok) {
        const data = await qcRes.json()
        throw new Error(data.error || '提交失败')
      }

      // Trigger batch transition based on QC result
      const action = overallJudgment === 'PASS' ? 'pass_qc' : 'fail_qc'
      const transitionRes = await authFetch(`/api/batches/${batchId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!transitionRes.ok) {
        const data = await transitionRes.json()
        throw new Error(data.error || '状态转换失败')
      }

      // If QC passes, chain the auto generate_coa transition
      if (overallJudgment === 'PASS') {
        const coaRes = await authFetch(`/api/batches/${batchId}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate_coa' }),
        })
        if (!coaRes.ok) {
          console.error('Auto generate_coa failed, but QC pass was recorded')
        }
      }

      toast.success(
        overallJudgment === 'PASS'
          ? '质检合格，CoA草稿已自动生成'
          : '质检不合格，请安排返工或报废'
      )
      onSubmitted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Test Items */}
      <div className="space-y-4">
        {results.map((item, index) => (
          <TestItemCard
            key={item.itemCode}
            item={item}
            index={index}
            onUpdate={updateResult}
          />
        ))}
      </div>

      {/* Overall Judgment Preview */}
      <Card className={overallJudgment === 'PASS'
        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
        : overallJudgment === 'FAIL'
          ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
          : ''
      }>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">综合判定</p>
                {overallJudgment ? (
                  <p className="text-xs text-muted-foreground">
                    {passCount} 项合格 / {failCount} 项不合格
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">请填写所有检测项</p>
                )}
              </div>
            </div>
            {overallJudgment && (
              <Badge
                variant="secondary"
                className={
                  overallJudgment === 'PASS'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-sm px-3 py-1'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-sm px-3 py-1'
                }
              >
                {overallJudgment === 'PASS' ? (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                )}
                {overallJudgment === 'PASS' ? '合格' : '不合格'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Operator Info + Submit */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          操作员: {user?.name || '-'}
        </p>
        <Button
          onClick={handleSubmit}
          disabled={!allFilled || submitting}
          className="min-w-[120px]"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              提交中...
            </>
          ) : (
            <>
              提交质检
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ============================================
// Test Item Card
// ============================================

function TestItemCard({
  item,
  index,
  onUpdate,
}: {
  item: TestResultItem
  index: number
  onUpdate: (index: number, field: string, value: unknown) => void
}) {
  const hasJudgment = !!item.judgment
  const isPass = item.judgment === 'PASS'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              !hasJudgment
                ? 'bg-muted'
                : isPass
                  ? 'bg-emerald-100 dark:bg-emerald-900/40'
                  : 'bg-red-100 dark:bg-red-900/40'
            }`}>
              <FlaskConical className={`h-5 w-5 ${
                !hasJudgment
                  ? 'text-muted-foreground'
                  : isPass
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
              }`} />
            </div>
            <div>
              <CardTitle className="text-base">{item.itemName}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.method} · 标准: {item.standard}
              </p>
            </div>
          </div>
          {hasJudgment && (
            <Badge
              variant="secondary"
              className={
                isPass
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }
            >
              {isPass ? '合格' : '不合格'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {item.resultType === 'number' ? (
          <div className="space-y-2">
            <Label className="text-sm">检测结果</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="输入活率百分比"
                value={item.resultValue ?? ''}
                onChange={(e) => onUpdate(index, 'resultValue', e.target.value)}
                className="max-w-[200px]"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            {item.resultValue && !isNaN(Number(item.resultValue)) && (
              <p className="text-xs text-muted-foreground">
                {Number(item.resultValue) >= 85 ? (
                  <span className="text-emerald-600">≥85%，判定为合格</span>
                ) : (
                  <span className="text-red-600">&lt;85%，判定为不合格</span>
                )}
              </p>
            )}
          </div>
        ) : item.itemCode === 'MORPHOLOGY' ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">检测结果</Label>
              <Select
                value={item.judgment ?? ''}
                onValueChange={(val) => onUpdate(index, 'judgment', val)}
              >
                <SelectTrigger className="max-w-[200px]">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASS">正常</SelectItem>
                  <SelectItem value="FAIL">异常</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled className="text-xs">
                <Upload className="mr-1.5 h-3 w-3" />
                上传形态照片（即将上线）
              </Button>
            </div>
          </div>
        ) : item.itemCode === 'MYCOPLASMA' ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">检测结果</Label>
              <Select
                value={item.judgment ?? ''}
                onValueChange={(val) => onUpdate(index, 'judgment', val)}
              >
                <SelectTrigger className="max-w-[200px]">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASS">阴性</SelectItem>
                  <SelectItem value="FAIL">阳性</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled className="text-xs">
                <Upload className="mr-1.5 h-3 w-3" />
                上传检测报告（即将上线）
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
