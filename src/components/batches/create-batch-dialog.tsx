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
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { FlaskConical, Loader2, ShoppingCart } from 'lucide-react'

interface Product {
  id: string
  productCode: string
  productName: string
  specification: string
  unit: string
  productLine?: string
}

// 产品线显示顺序
const PRODUCT_LINE_ORDER = ['CELL_PRODUCT', 'SERVICE', 'KIT']

interface CreateBatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateBatchDialog({
  open,
  onOpenChange,
  onSuccess,
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

  // Derive selected product
  const selectedProduct = products.find((p) => p.productCode === productCode)

  // Batch number prefix based on product line
  const batchNoPrefix = selectedProduct?.productLine
    ? BATCH_NO_PREFIXES[selectedProduct.productLine] || 'IPSC'
    : 'IPSC'

  const isServiceProduct = selectedProduct?.productLine === 'SERVICE'

  // Batch number preview
  const batchNoPreview = (() => {
    if (!seedPassage) return ''
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
        const list: Product[] = data.products || []
        setProducts(list)
        // Auto-select first product if only one
        if (list.length === 1) {
          setProductCode(list[0].productCode)
        }
      }
    } catch {
      // Fallback to hardcoded product
      setProducts([
        {
          id: 'fallback',
          productCode: 'IPSC-WT-001',
          productName: 'iPSC细胞株(野生型)',
          specification: '1×10^6 cells/支',
          unit: '支',
          productLine: 'CELL_PRODUCT',
        },
      ])
      setProductCode('IPSC-WT-001')
    } finally {
      setProductsLoading(false)
    }
  }, [])

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
    setError('')
  }

  const handleSubmit = async () => {
    setError('')

    // Validation
    if (!productCode) {
      setError('请选择产品')
      return
    }

    if (seedPassage && !/^P\d+$/i.test(seedPassage)) {
      setError('种子代次格式不正确，应为 P 加数字（如 P3）')
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        productCode,
        plannedQuantity: plannedQuantity ? Number(plannedQuantity) : null,
        seedBatchNo: seedBatchNo || null,
        seedPassage: seedPassage || null,
        plannedEndDate: plannedEndDate || null,
      }
      // Add orderNo for SERVICE products
      if (isServiceProduct && orderNo.trim()) {
        body.orderNo = orderNo.trim()
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
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

          {/* Seed Batch No */}
          <div className="space-y-2">
            <Label htmlFor="seedBatchNo">种子批号</Label>
            <Input
              id="seedBatchNo"
              placeholder="如 IPSC-WSB-2603-002"
              value={seedBatchNo}
              onChange={(e) => setSeedBatchNo(e.target.value)}
            />
          </div>

          {/* Seed Passage */}
          <div className="space-y-2">
            <Label htmlFor="seedPassage">种子代次</Label>
            <Input
              id="seedPassage"
              placeholder="如 P3"
              value={seedPassage}
              onChange={(e) => setSeedPassage(e.target.value)}
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
          <Button onClick={handleSubmit} disabled={submitting || !productCode}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            确认创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
