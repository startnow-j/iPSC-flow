'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  TestTubes,
  Link2,
  Search,
  Package,
  Beaker,
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
  selectOptions?: { value: string; label: string }[]
}

interface LinkedBatch {
  id: string
  batchNo: string
  productCode: string
  productName: string
  status: string
  productLine: string
}

interface QcFormProps {
  batchId: string
  batchNo: string
  batchActualQuantity: number | null
  batchUnit?: string
  productLine?: string
  onSubmitted: () => void
}

// ============================================
// QC Template Definitions (per product line)
// ============================================

/** 细胞产品 — 复苏活率 / 细胞形态 / 支原体检测 */
const CELL_PRODUCT_QC_TEMPLATE: TestResultItem[] = [
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
    selectOptions: [
      { value: 'PASS', label: '正常' },
      { value: 'FAIL', label: '异常' },
    ],
  },
  {
    itemCode: 'MYCOPLASMA',
    itemName: '支原体检测',
    method: 'PCR法',
    standard: '阴性',
    resultType: 'select',
    selectOptions: [
      { value: 'PASS', label: '阴性' },
      { value: 'FAIL', label: '阳性' },
    ],
  },
]

/** 试剂盒 — 外观检查 / 无菌检查 */
const KIT_QC_TEMPLATE: TestResultItem[] = [
  {
    itemCode: 'APPEARANCE',
    itemName: '外观检查',
    method: '目视检查',
    standard: '包装完好、无破损、标识清晰',
    resultType: 'select',
    selectOptions: [
      { value: 'PASS', label: '合格' },
      { value: 'FAIL', label: '不合格' },
    ],
  },
  {
    itemCode: 'STERILITY',
    itemName: '无菌检查',
    method: '薄膜过滤法',
    standard: '无菌生长',
    resultType: 'select',
    selectOptions: [
      { value: 'PASS', label: '无菌生长（合格）' },
      { value: 'FAIL', label: '有菌生长（不合格）' },
    ],
  },
]

// ============================================
// QC Form Component
// ============================================

export function QcForm({ batchId, batchNo, batchActualQuantity, batchUnit, productLine, onSubmitted }: QcFormProps) {
  const user = useAuthStore((s) => s.user)
  const [submitting, setSubmitting] = useState(false)
  const [thawedVials, setThawedVials] = useState<string>('1')

  const isKit = productLine === 'KIT'
  const template = isKit ? KIT_QC_TEMPLATE : CELL_PRODUCT_QC_TEMPLATE

  const [results, setResults] = useState<TestResultItem[]>(
    template.map((item) => ({ ...item }))
  )

  // Functional verification state (KIT only)
  const [enableFV, setEnableFV] = useState(false)
  const [linkedBatchType, setLinkedBatchType] = useState<'CELL_PRODUCT' | 'SERVICE'>('CELL_PRODUCT')
  const [linkedBatchSearch, setLinkedBatchSearch] = useState('')
  const [linkedBatchCandidates, setLinkedBatchCandidates] = useState<LinkedBatch[]>([])
  const [searchingBatches, setSearchingBatches] = useState(false)
  const [selectedLinkedBatch, setSelectedLinkedBatch] = useState<LinkedBatch | null>(null)

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

  // Parsed thawed vials for validation display
  const parsedThawedVialsDisplay = Number(thawedVials)
  const isThawedVialsValid = thawedVials && !isNaN(parsedThawedVialsDisplay) && parsedThawedVialsDisplay >= 1

  // Search linked batches for functional verification
  const searchLinkedBatches = useCallback(async (searchTerm: string, batchType: 'CELL_PRODUCT' | 'SERVICE') => {
    if (!searchTerm.trim()) {
      setLinkedBatchCandidates([])
      return
    }
    setSearchingBatches(true)
    try {
      const params = new URLSearchParams({
        productLine: batchType,
        search: searchTerm.trim(),
        excludeBatchId: batchId,
      })
      const res = await authFetch(`/api/batches/search?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLinkedBatchCandidates(data.batches || [])
      }
    } catch {
      // Silently fail
    } finally {
      setSearchingBatches(false)
    }
  }, [batchId])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (linkedBatchSearch.trim().length >= 2) {
        searchLinkedBatches(linkedBatchSearch, linkedBatchType)
      } else {
        setLinkedBatchCandidates([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [linkedBatchSearch, linkedBatchType, searchLinkedBatches])

  const handleSubmit = async () => {
    if (!allFilled) {
      toast.error('请填写所有检测项')
      return
    }

    if (!isKit) {
      const parsedThawedVials = Number(thawedVials)
      if (!thawedVials || isNaN(parsedThawedVials) || parsedThawedVials < 1) {
        toast.error('请填写有效的复苏支数（至少1支）')
        return
      }
    }

    setSubmitting(true)
    try {
      // For select-type items, map judgment to human-readable resultValue
      const SELECT_RESULT_MAP: Record<string, Record<string, string>> = {
        MORPHOLOGY: { PASS: '正常', FAIL: '异常' },
        MYCOPLASMA: { PASS: '阴性', FAIL: '阳性' },
        APPEARANCE: { PASS: '合格', FAIL: '不合格' },
        STERILITY: { PASS: '无菌生长', FAIL: '有菌生长' },
      }

      const qcRes = await authFetch(`/api/batches/${batchId}/qc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testResults: results.map((item) => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            method: item.method,
            standard: item.standard,
            resultValue: item.resultValue ?? (item.judgment && SELECT_RESULT_MAP[item.itemCode]?.[item.judgment]) ?? null,
            resultUnit: item.resultUnit,
            judgment: item.judgment,
          })),
          thawedVials: isKit ? null : Number(thawedVials),
          operatorId: user?.id,
          operatorName: user?.name,
          ...(isKit && enableFV && selectedLinkedBatch ? {
            functionalVerification: {
              linkedBatchId: selectedLinkedBatch.id,
              linkedBatchNo: selectedLinkedBatch.batchNo,
              linkedBatchType: linkedBatchType,
            },
          } : {}),
        }),
      })

      if (!qcRes.ok) {
        const data = await qcRes.json()
        throw new Error(data.error || '提交失败')
      }

      // v3.0: If QC fails, submit record but don't transition (supervisor handles rework/scrap)
      if (overallJudgment !== 'PASS') {
        toast.error('质检不合格，请联系主管安排返工或报废')
        onSubmitted()
        return
      }

      // Trigger batch transition: pass_qc (auto-generates CoA draft on backend)
      const transitionRes = await authFetch(`/api/batches/${batchId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pass_qc' }),
      })

      if (!transitionRes.ok) {
        const data = await transitionRes.json()
        throw new Error(data.error || '状态转换失败')
      }

      // v3.0: pass_qc auto-generates CoA draft on backend, no separate generate_coa call
      toast.success('质检合格，CoA草稿已自动生成')
      onSubmitted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Thawed Vials Section — only for cell products */}
      {!isKit && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TestTubes className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              复苏信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {batchActualQuantity !== null && batchActualQuantity !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">实际数量:</span>
                <span className="font-medium">{batchActualQuantity} {batchUnit || '支'}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="thawedVials" className="text-sm">
                复苏支数 <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="thawedVials"
                  type="number"
                  min={1}
                  max={batchActualQuantity || undefined}
                  step={1}
                  placeholder="输入本次质检复苏的支数"
                  value={thawedVials}
                  onChange={(e) => setThawedVials(e.target.value)}
                  className="max-w-[200px]"
                />
                <span className="text-sm text-muted-foreground">{batchUnit || '支'}</span>
              </div>
              {batchActualQuantity && isThawedVialsValid && parsedThawedVialsDisplay > batchActualQuantity && (
                <p className="text-xs text-red-600">
                  复苏支数不能超过实际数量 {batchActualQuantity} {batchUnit || '支'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Functional Verification Section — KIT only */}
      {isKit && (
        <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Link2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                功能性验证（可选）
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="enableFV" className="text-xs text-muted-foreground cursor-pointer">
                  启用功能性验证
                </Label>
                <Checkbox
                  id="enableFV"
                  checked={enableFV}
                  onCheckedChange={(checked) => {
                    setEnableFV(!!checked)
                    if (!checked) {
                      setSelectedLinkedBatch(null)
                      setLinkedBatchCandidates([])
                      setLinkedBatchSearch('')
                    }
                  }}
                />
              </div>
            </div>
          </CardHeader>
          {enableFV && (
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                功能性验证用于定期确认试剂盒的实际功能。选择一个已完成的细胞生产批次或服务项目批次作为验证依据。
              </p>

              {/* Batch Type Selector */}
              <div className="space-y-2">
                <Label className="text-sm">关联批次类型</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={linkedBatchType === 'CELL_PRODUCT' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setLinkedBatchType('CELL_PRODUCT')
                      setSelectedLinkedBatch(null)
                      setLinkedBatchCandidates([])
                      setLinkedBatchSearch('')
                    }}
                  >
                    <Beaker className="mr-1.5 h-3.5 w-3.5" />
                    细胞产品批次
                  </Button>
                  <Button
                    type="button"
                    variant={linkedBatchType === 'SERVICE' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setLinkedBatchType('SERVICE')
                      setSelectedLinkedBatch(null)
                      setLinkedBatchCandidates([])
                      setLinkedBatchSearch('')
                    }}
                  >
                    <Package className="mr-1.5 h-3.5 w-3.5" />
                    服务项目批次
                  </Button>
                </div>
              </div>

              {/* Search Linked Batch */}
              {!selectedLinkedBatch && (
                <div className="space-y-2">
                  <Label className="text-sm">搜索关联批次</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-[400px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="输入批次号或产品编码搜索..."
                        value={linkedBatchSearch}
                        onChange={(e) => setLinkedBatchSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {searchingBatches && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>

                  {/* Search Results */}
                  {linkedBatchCandidates.length > 0 && (
                    <div className="rounded-md border max-h-48 overflow-y-auto">
                      {linkedBatchCandidates.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
                          onClick={() => {
                            setSelectedLinkedBatch(b)
                            setLinkedBatchCandidates([])
                            setLinkedBatchSearch('')
                          }}
                        >
                          <div>
                            <p className="text-sm font-medium">{b.batchNo}</p>
                            <p className="text-xs text-muted-foreground">
                              {b.productName} · {b.productCode}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                            {b.status === 'RELEASED' ? '已放行' : b.status === 'QC_PASS' ? '质检合格' : b.status}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {linkedBatchSearch.trim().length >= 2 && linkedBatchCandidates.length === 0 && !searchingBatches && (
                    <p className="text-xs text-muted-foreground">未找到匹配的批次</p>
                  )}
                </div>
              )}

              {/* Selected Linked Batch */}
              {selectedLinkedBatch && (
                <div className="flex items-center gap-3 rounded-md border border-violet-200 bg-white dark:bg-muted/30 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                    <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{selectedLinkedBatch.batchNo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedLinkedBatch.productName} · {selectedLinkedBatch.productCode}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {linkedBatchType === 'CELL_PRODUCT' ? '细胞产品' : '服务项目'}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setSelectedLinkedBatch(null)
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

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
// Test Item Card (Generic)
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
              <span className="text-sm text-muted-foreground">{item.resultUnit || '%'}</span>
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
        ) : item.resultType === 'select' && item.selectOptions ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">检测结果</Label>
              <Select
                value={item.judgment ?? ''}
                onValueChange={(val) => onUpdate(index, 'judgment', val)}
              >
                <SelectTrigger className="max-w-[240px]">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {item.selectOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Future: attachment upload placeholder */}
            {(item.itemCode === 'MORPHOLOGY' || item.itemCode === 'MYCOPLASMA') && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled className="text-xs">
                  <Upload className="mr-1.5 h-3 w-3" />
                  {item.itemCode === 'MORPHOLOGY' ? '上传形态照片（即将上线）' : '上传检测报告（即将上线）'}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
