'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { isAdmin, hasAnyRole, CATEGORY_LABELS, PRODUCT_LINE_LABELS } from '@/lib/roles'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import { ProductLineBadge } from '@/components/shared/product-line-badge'
import { CreateProductDialog, type ProductItem } from '@/components/products/create-product-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Plus,
  Search,
  ShieldAlert,
  Package,
  Edit3,
  FlaskConical,
  Wrench,
  Box,
} from 'lucide-react'
// Tab filter options
const LINE_TABS = [
  { key: 'ALL', label: '全部' },
  { key: 'CELL_PRODUCT', label: '细胞产品' },
  { key: 'SERVICE', label: '服务项目' },
  { key: 'KIT', label: '试剂盒' },
] as const

// Icon mapping for product lines
const LINE_ICONS: Record<string, React.ElementType> = {
  CELL_PRODUCT: FlaskConical,
  SERVICE: Wrench,
  KIT: Box,
}

export default function ProductsPage() {
  const { user } = useAuthStore()
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<ProductItem | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const userRoles = user?.roles || [user?.role || 'OPERATOR']
  const canManage = hasAnyRole(userRoles, ['ADMIN', 'SUPERVISOR'])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab !== 'ALL') params.set('productLine', activeTab)
      if (searchQuery) params.set('search', searchQuery)

      const res = await authFetch(`/api/products?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      } else {
        toast.error('获取产品列表失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchQuery])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
  }

  const handleEdit = (product: ProductItem) => {
    setEditProduct(product)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
  }

  const handleToggleActive = async (product: ProductItem) => {
    if (togglingId) return
    setTogglingId(product.id || '')
    try {
      const res = await authFetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !product.active }),
      })
      if (res.ok) {
        toast.success(product.active ? `已停用 ${product.productName}` : `已启用 ${product.productName}`)
        fetchProducts()
      } else {
        const data = await res.json()
        toast.error(data.error || '操作失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setTogglingId(null)
    }
  }

  // Group products by product line
  const grouped = products.reduce<Record<string, ProductItem[]>>((acc, product) => {
    const line = product.productLine
    if (!acc[line]) acc[line] = []
    acc[line].push(product)
    return acc
  }, {})

  // Access control
  if (!user || !canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">无权限</h2>
        <p className="text-sm text-muted-foreground">
          仅管理员或生产主管可访问产品管理页面
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">产品管理</h1>
          <p className="text-sm text-muted-foreground">
            管理细胞产品、服务项目和试剂盒
          </p>
        </div>
        {isAdmin(userRoles) && (
          <Button
            onClick={() => {
              setEditProduct(null)
              setDialogOpen(true)
            }}
            className="shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            新建产品
          </Button>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索产品编码或名称..."
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="outline">
          搜索
        </Button>
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearchQuery('')
              setSearchInput('')
            }}
          >
            清除
          </Button>
        )}
      </form>

      {/* Product Line Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {LINE_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            className="text-sm"
          >
            {tab.label}
            {tab.key !== 'ALL' && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                {grouped[tab.key]?.length || 0}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Product Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Package className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? '没有找到匹配的产品' : '暂无产品'}
          </p>
        </div>
      ) : (
        // Group products by product line
        Object.entries(grouped).map(([line, lineProducts]) => {
          const LineIcon = LINE_ICONS[line] || Package
          return (
            <div key={line} className="space-y-3">
              {/* Section Header */}
              <div className="flex items-center gap-2">
                <LineIcon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {PRODUCT_LINE_LABELS[line] || line}
                </h2>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {lineProducts.length}
                </Badge>
              </div>

              {/* Product Cards Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lineProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`transition-colors ${
                      !product.active ? 'opacity-60' : ''
                    }`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Top row: code + badge + actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {product.productCode}
                            </code>
                            <ProductLineBadge productLine={product.productLine} />
                          </div>
                          <h3 className="text-sm font-semibold mt-1.5 leading-tight truncate">
                            {product.productName}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isAdmin(userRoles) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isAdmin(userRoles) && (
                            <Switch
                              checked={product.active}
                              onCheckedChange={() => handleToggleActive(product)}
                              disabled={togglingId === product.id}
                              className="scale-75"
                            />
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Details */}
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 w-16 text-right">分类</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                            {CATEGORY_LABELS[product.category] || product.category}
                          </Badge>
                        </div>

                        {product.specification && (
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 w-16 text-right">规格</span>
                            <span className="truncate">{product.specification}</span>
                            {product.unit && (
                              <span className="shrink-0">/ {product.unit}</span>
                            )}
                          </div>
                        )}

                        {product.cellType && (
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 w-16 text-right">细胞类型</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                              {product.cellType}
                            </Badge>
                          </div>
                        )}

                        {product.storageCondition && (
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 w-16 text-right">存储</span>
                            <span className="truncate">{product.storageCondition}</span>
                          </div>
                        )}

                        {product.shelfLife && (
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 w-16 text-right">保质期</span>
                            <span>{product.shelfLife}</span>
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      {!product.active && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 w-fit">
                          已停用
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* Create/Edit Dialog — conditionally rendered to avoid Radix usePresence infinite loop */}
      {dialogOpen && (
        <CreateProductDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          onSuccess={fetchProducts}
          editProduct={editProduct}
        />
      )}
    </div>
  )
}
