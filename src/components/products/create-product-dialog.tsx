'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import {
  PRODUCT_LINE_LABELS,
  CATEGORY_LABELS,
} from '@/lib/roles'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Sparkles } from 'lucide-react'

/** Category options by product line */
const CATEGORIES_BY_LINE: Record<string, { value: string; label: string }[]> = {
  CELL_PRODUCT: [
    { value: 'IPSC', label: 'iPSC细胞' },
    { value: 'NPC', label: 'NPC神经前体' },
    { value: 'CM', label: '心肌细胞' },
    { value: 'OTHER_CELL', label: '其他细胞' },
  ],
  SERVICE: [
    { value: 'REPROGRAM', label: '重编程建系' },
    { value: 'EDIT', label: '基因编辑' },
    { value: 'DIFF_SERVICE', label: '分化服务' },
    { value: 'IDENT_SERVICE', label: '鉴定服务' },
  ],
  KIT: [
    { value: 'DIFF_KIT', label: '分化试剂盒' },
    { value: 'MEDIUM', label: '培养基' },
    { value: 'REAGENT', label: '试剂' },
  ],
}

/** Unit options */
const UNIT_OPTIONS = [
  { value: '支', label: '支' },
  { value: '株', label: '株' },
  { value: '盒', label: '盒' },
  { value: '瓶', label: '瓶' },
  { value: '个', label: '个' },
  { value: '套', label: '套' },
]

export interface ProductItem {
  id?: string
  productCode: string
  productName: string
  productLine: string
  category: string
  cellType: string | null
  specification: string
  storageCondition: string | null
  shelfLife: string | null
  unit: string
  description: string | null
  active: boolean
}

interface CreateProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editProduct?: ProductItem | null
}

export function CreateProductDialog({
  open,
  onOpenChange,
  onSuccess,
  editProduct,
}: CreateProductDialogProps) {
  const isEdit = !!editProduct?.id

  const [productCode, setProductCode] = useState('')
  const [productName, setProductName] = useState('')
  const [productLine, setProductLine] = useState('CELL_PRODUCT')
  const [category, setCategory] = useState('')
  const [cellType, setCellType] = useState('')
  const [specification, setSpecification] = useState('')
  const [storageCondition, setStorageCondition] = useState('')
  const [shelfLife, setShelfLife] = useState('')
  const [unit, setUnit] = useState('支')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)

  // Reset form when dialog opens or editProduct changes
  const resetForm = () => {
    if (editProduct) {
      setProductCode(editProduct.productCode || '')
      setProductName(editProduct.productName || '')
      setProductLine(editProduct.productLine || 'CELL_PRODUCT')
      setCategory(editProduct.category || '')
      setCellType(editProduct.cellType || '')
      setSpecification(editProduct.specification || '')
      setStorageCondition(editProduct.storageCondition || '')
      setShelfLife(editProduct.shelfLife || '')
      setUnit(editProduct.unit || '支')
      setDescription(editProduct.description || '')
      setActive(editProduct.active !== false)
    } else {
      setProductCode('')
      setProductName('')
      setProductLine('CELL_PRODUCT')
      setCategory('')
      setCellType('')
      setSpecification('')
      setStorageCondition('')
      setShelfLife('')
      setUnit('支')
      setDescription('')
      setActive(true)
    }
  }

  // Reset form when dialog opens (covers both programmatic open via prop and user interaction)
  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open, editProduct])

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
  }

  // Auto-generate product code when product line changes (create mode only)
  useEffect(() => {
    if (!isEdit && open && !productCode) {
      generateProductCode()
    }
  }, [productLine, open]) // isEdit and productCode intentionally omitted

  const generateProductCode = async () => {
    setGeneratingCode(true)
    try {
      // Generate a preview code locally
      const prefixes: Record<string, string> = {
        CELL_PRODUCT: 'CP',
        SERVICE: 'SRV',
        KIT: 'KIT',
      }
      const prefix = prefixes[productLine] || 'PRD'
      // We'll try to fetch the next code from existing products
      const res = await authFetch(`/api/products?productLine=${productLine}`)
      if (res.ok) {
        const data = await res.json()
        const products = data.products || []
        let maxSeq = 0
        for (const p of products) {
          const parts = (p.productCode || '').split('-')
          const lastPart = parts[parts.length - 1]
          const seq = parseInt(lastPart, 10)
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq
          }
        }
        setProductCode(`${prefix}-${String(maxSeq + 1).padStart(3, '0')}`)
      } else {
        setProductCode(`${prefix}-001`)
      }
    } catch {
      const prefixes: Record<string, string> = {
        CELL_PRODUCT: 'CP',
        SERVICE: 'SRV',
        KIT: 'KIT',
      }
      const prefix = prefixes[productLine] || 'PRD'
      setProductCode(`${prefix}-001`)
    } finally {
      setGeneratingCode(false)
    }
  }

  // Get available categories for current product line
  const availableCategories = CATEGORIES_BY_LINE[productLine] || []
  const showCellType = productLine === 'SERVICE' || productLine === 'CELL_PRODUCT'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const body = {
        productCode: productCode.trim(),
        productName: productName.trim(),
        productLine,
        category: category.trim(),
        cellType: showCellType ? (cellType.trim() || null) : null,
        specification: specification.trim(),
        storageCondition: storageCondition.trim() || null,
        shelfLife: shelfLife.trim() || null,
        unit: unit.trim(),
        description: description.trim() || null,
        active,
      }

      if (isEdit && editProduct?.id) {
        // Update product
        const res = await authFetch(`/api/products/${editProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error || '更新失败')
          return
        }

        toast.success(`产品 ${productName} 已更新`)
      } else {
        // Create product
        const res = await authFetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error || '创建失败')
          return
        }

        toast.success(`产品 ${productName} 已创建`)
      }

      handleOpenChange(false)
      onSuccess()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  const isValid = productName.trim() && category.trim() && unit.trim() && productCode.trim()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑产品' : '新建产品'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? '修改产品信息。产品编码变更需确保唯一性。'
              : '创建新的产品。产品编码可自动生成，也可手动输入。'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Code */}
          <div className="space-y-2">
            <Label htmlFor="product-code" className="flex items-center gap-1.5">
              产品编码
              {!isEdit && (
                <span className="text-xs text-muted-foreground font-normal">
                  （自动生成 / 可编辑）
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                id="product-code"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="如 CP-001"
                disabled={loading}
                className="font-mono"
              />
              {!isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateProductCode}
                  disabled={generatingCode}
                  title="自动生成编码"
                >
                  {generatingCode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="product-name">产品名称 *</Label>
            <Input
              id="product-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="请输入产品名称"
              disabled={loading}
            />
          </div>

          {/* Product Line */}
          <div className="space-y-2">
            <Label>产品线 *</Label>
            <Select
              value={productLine}
              onValueChange={(v) => {
                setProductLine(v)
                setCategory('')
                if (!showCellType && (v === 'SERVICE' || v === 'CELL_PRODUCT')) {
                  // switching to a line that needs cell type
                } else if (showCellType && v === 'KIT') {
                  setCellType('')
                }
              }}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择产品线" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRODUCT_LINE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>产品分类 *</Label>
            <Select value={category} onValueChange={setCategory} disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cell Type (only for SERVICE/CELL_PRODUCT) */}
          {showCellType && (
            <div className="space-y-2">
              <Label htmlFor="cell-type">细胞类型</Label>
              <Select value={cellType} onValueChange={setCellType} disabled={loading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择细胞类型（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IPSC">iPSC</SelectItem>
                  <SelectItem value="NPC">NPC</SelectItem>
                  <SelectItem value="CM">CM</SelectItem>
                  <SelectItem value="OTHER">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Specification */}
          <div className="space-y-2">
            <Label htmlFor="specification">规格</Label>
            <Input
              id="specification"
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder="如 1×10^6 cells/支"
              disabled={loading}
            />
          </div>

          {/* Unit */}
          <div className="space-y-2">
            <Label>单位 *</Label>
            <Select value={unit} onValueChange={setUnit} disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择单位" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Storage Condition & Shelf Life - side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storage">存储条件</Label>
              <Input
                id="storage"
                value={storageCondition}
                onChange={(e) => setStorageCondition(e.target.value)}
                placeholder="如 液氮(-196°C)"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shelf-life">保质期</Label>
              <Input
                id="shelf-life"
                value={shelfLife}
                onChange={(e) => setShelfLife(e.target.value)}
                placeholder="如 5年"
                disabled={loading}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="产品描述（可选）"
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Active toggle (edit mode only) */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div>
                <Label className="text-sm font-medium">启用状态</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  禁用后，该产品将无法用于创建新批次
                </p>
              </div>
              <Switch
                checked={active}
                onCheckedChange={setActive}
                disabled={loading}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={!isValid || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? '保存修改' : '创建产品'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
