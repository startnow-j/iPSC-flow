'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { FlaskConical, Loader2 } from 'lucide-react'

interface Product {
  id: string
  productCode: string
  productName: string
  specification: string
  unit: string
}

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

  // Batch number preview
  const batchNoPreview = (() => {
    if (!seedPassage) return ''
    const now = new Date()
    const dateStr =
      String(now.getFullYear()).slice(-2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0')
    return `IPSC-${dateStr}-XXX-${seedPassage}`
  })()

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
        // Auto-select first product if only one
        if (data.products?.length === 1) {
          setProductCode(data.products[0].productCode)
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
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productCode,
          plannedQuantity: plannedQuantity ? Number(plannedQuantity) : null,
          seedBatchNo: seedBatchNo || null,
          seedPassage: seedPassage || null,
          plannedEndDate: plannedEndDate || null,
        }),
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
          {/* Product Select */}
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
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.productCode}>
                      <span className="font-medium">{p.productName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({p.productCode})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {productCode && (
              <p className="text-xs text-muted-foreground">
                规格：{products.find((p) => p.productCode === productCode)?.specification || '-'}，
                单位：{products.find((p) => p.productCode === productCode)?.unit || '-'}
              </p>
            )}
          </div>

          {/* Planned Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">计划数量</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              placeholder="请输入计划数量（支）"
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
            {batchNoPreview && (
              <p className="text-xs text-muted-foreground">
                批次编号预览：<span className="font-mono font-medium">{batchNoPreview}</span>
              </p>
            )}
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
            创建人：{user?.name || '-'} · {user?.role || '-'}
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
