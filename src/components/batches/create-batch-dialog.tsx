'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useAuthStore } from '@/stores/auth-store'
import {
  PRODUCT_LINE_LABELS,
  BATCH_NO_PREFIXES,
} from '@/lib/roles'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/simple-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { IDENTIFICATION_OPTIONS, DEFAULT_IDENTIFICATION_REQUIREMENTS } from '@/lib/services/task-templates'
import { Textarea } from '@/components/ui/textarea'
import { FlaskConical, Loader2, ShoppingCart, ClipboardCheck, User, ShieldCheck, AlertTriangle, MessageSquare } from 'lucide-react'

interface Product {
  id: string
  productCode: string
  productName: string
  specification: string
  unit: string
  productLine?: string
}

interface AvailableUser {
  id: string
  name: string
  email: string
  roles: string[]
}

// 产品线显示顺序
const PRODUCT_LINE_ORDER = ['CELL_PRODUCT', 'SERVICE', 'KIT']

interface CreateBatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  /** Lock product selection to a specific product line */
  defaultProductLine?: string
}

export function CreateBatchDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultProductLine,
}: CreateBatchDialogProps) {
  const { user } = useAuthStore()

  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [productCode, setProductCode] = useState('')
  const [plannedQuantity, setPlannedQuantity] = useState('')
  const [seedBatchNo, setSeedBatchNo] = useState('')
  const [seedPassage, setSeedPassage] = useState('')
  const [plannedEndDate, setPlannedEndDate] = useState('')
  const [orderNo, setOrderNo] = useState('') // 订单号（仅服务项目）
  const [notes, setNotes] = useState('') // 生产要求备注（所有产品线）
  const [identificationRequirements, setIdentificationRequirements] = useState<string[]>([...DEFAULT_IDENTIFICATION_REQUIREMENTS])

  // Pre-assignment state (v3.0)
  const [operators, setOperators] = useState<AvailableUser[]>([])
  const [qcUsers, setQcUsers] = useState<AvailableUser[]>([])
  const [assignLoading, setAssignLoading] = useState(false)
  const [selectedOperatorId, setSelectedOperatorId] = useState('')
  const [selectedQcId, setSelectedQcId] = useState('')

  // Derive selected product
  const selectedProduct = products.find((p) => p.productCode === productCode)

  // Batch number prefix based on product line
  const batchNoPrefix = selectedProduct?.productLine
    ? BATCH_NO_PREFIXES[selectedProduct.productLine] || 'IPSC'
    : 'IPSC'

  const isServiceProduct = selectedProduct?.productLine === 'SERVICE'
  const isKitProduct = selectedProduct?.productLine === 'KIT'
  const isCellProduct = selectedProduct?.productLine === 'CELL_PRODUCT'

  // Batch number preview — only show for cell products (has passage suffix)
  const batchNoPreview = (() => {
    if (!isCellProduct || !seedPassage) return ''
    const now = new Date()
    const dateStr =
      String(now.getFullYear()).slice(-2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0')
    return `${batchNoPrefix}-${dateStr}-XXX-${seedPassage}`
  })()

  const fetchProducts = useCallback(async () => {
    try {
      const res = await authFetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        let list: Product[] = data.products || []
        // If locked to a product line, filter products
        if (defaultProductLine) {
          list = list.filter((p) => p.productLine === defaultProductLine)
        }
        setProducts(list)
        // Auto-select first product if only one, or if locked to a product line
        if (defaultProductLine && list.length > 0) {
          setProductCode(list[0].productCode)
        } else if (list.length === 1) {
          setProductCode(list[0].productCode)
        }
      }
    } catch {
      // Fallback to hardcoded product
      let fallbackList: Product[] = [
        {
          id: 'fallback',
          productCode: 'IPSC-WT-001',
          productName: 'iPSC细胞株(野生型)',
          specification: '1×10^6 cells/支',
          unit: '支',
          productLine: 'CELL_PRODUCT',
        },
      ]
      if (defaultProductLine) {
        fallbackList = fallbackList.filter((p) => p.productLine === defaultProductLine)
      }
      setProducts(fallbackList)
      if (fallbackList.length > 0) {
        setProductCode(fallbackList[0].productCode)
      }
    } finally {
      setProductsLoading(false)
    }
  }, [defaultProductLine])

  // Fetch available users when product is selected
  useEffect(() => {
    if (!open || !selectedProduct) return
    setAssignLoading(true)
    setSelectedOperatorId('')
    setSelectedQcId('')

    const fetchUsers = async () => {
      try {
        const [opRes, qcRes] = await Promise.all([
          authFetch(`/api/product-roles/available-users?productId=${selectedProduct.id}&role=operator`),
          authFetch(`/api/product-roles/available-users?productId=${selectedProduct.id}&role=qc`),
        ])
        if (opRes.ok) {
          const opData = await opRes.json()
          setOperators(opData.users || [])
        }
        if (qcRes.ok) {
          const qcData = await qcRes.json()
          setQcUsers(qcData.users || [])
        }
      } catch {
        // Silently fail — assignment is optional
      } finally {
        setAssignLoading(false)
      }
    }

    fetchUsers()
  }, [open, selectedProduct?.id])

  useEffect(() => {
    if (open) {
      fetchProducts()
    }
  }, [open, fetchProducts])

  const resetForm = () => {
    setProductCode('')
    setPlannedQuantity('')
    setSeedBatchNo('')
    setSeedPassage('')
    setPlannedEndDate('')
    setOrderNo('')
    setNotes('')
    setIdentificationRequirements([...DEFAULT_IDENTIFICATION_REQUIREMENTS])
    setSelectedOperatorId('')
    setSelectedQcId('')
    setOperators([])
    setQcUsers([])
    setError('')
  }

  const handleSubmit = async () => {
    setError('')

    // Validation
    if (!productCode) {
      setError('请选择产品')
      return
    }

    if (isCellProduct && seedPassage && !/^P\d+$/i.test(seedPassage)) {
      setError('种子代次格式不正确，应为 P 加数字（如 P3）')
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        productCode,
        plannedQuantity: plannedQuantity ? Number(plannedQuantity) : null,
        plannedEndDate: plannedEndDate || null,
        notes: notes.trim() || null,
        ...(isCellProduct ? { seedBatchNo: seedBatchNo || null, seedPassage: seedPassage || null } : {}),
      }
      // Add orderNo for SERVICE products
      if (isServiceProduct && orderNo.trim()) {
        body.orderNo = orderNo.trim()
      }
      // Pre-assignment (v3.0)
      if (selectedOperatorId) {
        body.productionOperatorId = selectedOperatorId
        const op = operators.find(u => u.id === selectedOperatorId)
        if (op) body.productionOperatorName = op.name
      }
      if (selectedQcId) {
        body.qcOperatorId = selectedQcId
        const qc = qcUsers.find(u => u.id === selectedQcId)
        if (qc) body.qcOperatorName = qc.name
      }
      // Add identificationRequirements for SERVICE products
      if (isServiceProduct) {
        body.identificationRequirements = identificationRequirements
      }

      const res = await authFetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '创建失败')
        return
      }

      // Success
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  // Group products by product line
  const groupedProducts = (() => {
    const groups: Record<string, Product[]> = {}
    for (const p of products) {
      const line = p.productLine || 'CELL_PRODUCT'
      if (!groups[line]) groups[line] = []
      groups[line].push(p)
    }
    return groups
  })()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            新建批次
          </DialogTitle>
          <DialogDescription>
            创建一个新的生产批次，请填写必要信息
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Product Select — Grouped by Product Line */}
          <div className="space-y-2">
            <Label htmlFor="product">
              产品选择 <span className="text-destructive">*</span>
            </Label>
            {productsLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={productCode} onValueChange={setProductCode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择产品" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_LINE_ORDER.filter((line) => groupedProducts[line]?.length).map(
                    (line, lineIdx) => (
                      <SelectGroup key={line}>
                        <SelectLabel className="font-semibold text-foreground">
                          {PRODUCT_LINE_LABELS[line] || line}
                        </SelectLabel>
                        {groupedProducts[line].map((p) => (
                          <SelectItem key={p.id} value={p.productCode}>
                            <span className="font-medium">{p.productName}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({p.productCode})
                            </span>
                          </SelectItem>
                        ))}
                        {lineIdx < PRODUCT_LINE_ORDER.length - 1 && (
                          <div className="my-1 border-b" />
                        )}
                      </SelectGroup>
                    ),
                  )}
                </SelectContent>
              </Select>
            )}
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                规格：{selectedProduct.specification || '-'}，
                单位：{selectedProduct.unit || '-'}
                {selectedProduct.productLine && (
                  <span className="ml-1">
                    · {PRODUCT_LINE_LABELS[selectedProduct.productLine] || selectedProduct.productLine}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Batch No Preview */}
          {batchNoPreview && (
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                批次编号预览：<span className="font-mono font-medium text-foreground">{batchNoPreview}</span>
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                前缀 {batchNoPrefix}- 由产品线自动确定
              </p>
            </div>
          )}

          {/* Order No — Only for SERVICE products */}
          {isServiceProduct && (
            <div className="space-y-2">
              <Label htmlFor="orderNo" className="flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" />
                订单号
                <span className="text-xs text-muted-foreground font-normal">（可选，服务项目关联订单）</span>
              </Label>
              <Input
                id="orderNo"
                placeholder="如 ORD-2026-0001"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
              />
            </div>
          )}

          {/* Identification Requirements — Only for SERVICE products */}
          {isServiceProduct && (
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5" />
                鉴定项目
                <span className="text-xs text-muted-foreground font-normal">（选择需要进行的鉴定检测）</span>
              </Label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-md border border-border p-3">
                {IDENTIFICATION_OPTIONS.map((opt) => {
                  const checked = identificationRequirements.includes(opt.value)
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(checked) => {
                          setIdentificationRequirements((prev) =>
                            checked
                              ? [...prev, opt.value]
                              : prev.filter((v) => v !== opt.value)
                          )
                        }}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  )
                })}
              </div>
              {identificationRequirements.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  提示：建议至少选择多能性鉴定和支原体检测作为基础鉴定项目
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Pre-assignment (v3.0) — shown when product is selected */}
          {selectedProduct && (
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                预指派人员
                <span className="text-xs text-muted-foreground font-normal">（可选）</span>
              </Label>

              {/* Four-eye warning */}
              {selectedOperatorId && selectedQcId && selectedOperatorId === selectedQcId && (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  四眼原则：生产操作员和质检员不能是同一人
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Production Operator */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    生产操作员
                  </Label>
                  {assignLoading ? (
                    <Skeleton className="h-9 w-full" />
                  ) : (
                    <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择操作员" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">暂无可用操作员</div>
                        ) : operators.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* QC Operator */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    质检员
                  </Label>
                  {assignLoading ? (
                    <Skeleton className="h-9 w-full" />
                  ) : (
                    <Select value={selectedQcId} onValueChange={setSelectedQcId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择质检员" />
                      </SelectTrigger>
                      <SelectContent>
                        {qcUsers.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">暂无可用质检员</div>
                        ) : qcUsers.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground/70">
                可选填，SUPERVISOR 后续可在批次详情页重新指派
              </p>
            </div>
          )}

          <Separator />

          {/* Planned Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">计划数量</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              placeholder="请输入计划数量"
              value={plannedQuantity}
              onChange={(e) => setPlannedQuantity(e.target.value)}
            />
          </div>

          {/* Seed Batch No / Seed Passage — Only for CELL_PRODUCT */}
          {isCellProduct && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="seedBatchNo">种子批号</Label>
                <Input
                  id="seedBatchNo"
                  placeholder="如 IPSC-WSB-2603-002"
                  value={seedBatchNo}
                  onChange={(e) => setSeedBatchNo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seedPassage">种子代次</Label>
                <Input
                  id="seedPassage"
                  placeholder="如 P3"
                  value={seedPassage}
                  onChange={(e) => setSeedPassage(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* 生产要求备注 — All product lines */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              生产要求备注
              <span className="text-xs text-muted-foreground font-normal">（可选，记录特殊要求或注意事项）</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="如：客户要求无菌检测增加真菌项；使用指定品牌培养基"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Planned End Date */}
          <div className="space-y-2">
            <Label htmlFor="plannedEndDate">计划交付日期</Label>
            <Input
              id="plannedEndDate"
              type="date"
              value={plannedEndDate}
              onChange={(e) => setPlannedEndDate(e.target.value)}
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Creator Info */}
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            创建人：{user?.name || '-'} · {user?.roles?.length ? user.roles.join(' / ') : user?.role || '-'}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !productCode || (selectedOperatorId === selectedQcId && !!selectedOperatorId)}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            确认创建
          </Button>
        </DialogFooter>
    </Dialog>
  )
}
