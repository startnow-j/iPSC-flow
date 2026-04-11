'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { getStatusLabel, getStatusColor } from '@/lib/services'
import { PRODUCT_LINE_LABELS, PRODUCT_LINE_COLORS } from '@/lib/roles'
import { ProductLineBadge } from '@/components/shared/product-line-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  FlaskConical,
  Microscope,
  TestTubes,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Plus,
} from 'lucide-react'
import { CreateBatchDialog } from '@/components/batches/create-batch-dialog'
import type { LucideIcon } from 'lucide-react'

// ============================================
// Types
// ============================================

interface BatchItem {
  id: string
  batchNo: string
  productCode: string
  productName: string
  specification: string
  unit: string
  status: string
  productLine?: string
  orderNo?: string
  plannedQuantity: number | null
  actualQuantity: number | null
  seedBatchNo: string | null
  seedPassage: string | null
  currentPassage: string | null
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  storageLocation: string | null
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

interface BatchesResponse {
  batches: BatchItem[]
  total: number
  page: number
  pageSize: number
  statusCounts: Record<string, number>
}

// ============================================
// Status Filter Chips
// ============================================

const STATUS_FILTERS = [
  { key: '', label: '全部' },
  { key: 'NEW', label: '新建' },
  { key: 'SAMPLE_RECEIVED', label: '样本接收' },
  { key: 'IN_PRODUCTION', label: '生产中' },
  { key: 'HANDOVER', label: '交接中' },
  { key: 'IDENTIFICATION', label: '鉴定中' },
  { key: 'REPORT_PENDING', label: '待报告' },
  { key: 'QC_PENDING', label: '待质检' },
  { key: 'QC_IN_PROGRESS', label: '质检中' },
  { key: 'QC_PASS', label: '合格' },
  { key: 'COA_SUBMITTED', label: '已提交' },
  { key: 'COA_APPROVED', label: '已批准' },
  { key: 'RELEASED', label: '已放行' },
  { key: 'SCRAPPED', label: '已报废' },
]

// ============================================
// Product Line Filter Tabs
// ============================================

const PRODUCT_LINE_FILTERS = [
  { key: '', label: '全部' },
  { key: 'CELL_PRODUCT', label: '细胞产品' },
  { key: 'SERVICE', label: '服务项目' },
  { key: 'KIT', label: '试剂盒' },
]

// ============================================
// Product Line Icons
// ============================================

const PRODUCT_LINE_ICONS: Record<string, LucideIcon> = {
  CELL_PRODUCT: FlaskConical,
  SERVICE: Microscope,
  KIT: TestTubes,
}

// ============================================
// BatchListContent — reusable batch list with props
// ============================================

export interface BatchListContentProps {
  /** Force a specific product line filter */
  defaultProductLine?: string
  /** Hide the product line filter tabs */
  hideProductLineFilter?: boolean
  /** Override view mode: 'my' or 'all' */
  viewMode?: 'my' | 'all'
}

export function BatchListContent({
  defaultProductLine,
  hideProductLineFilter = false,
  viewMode: viewModeProp,
}: BatchListContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuthStore()

  // View mode: use prop if provided, otherwise derive from pathname
  // When defaultProductLine is set, default to 'all' unless explicitly 'my'
  const resolvedViewMode = viewModeProp ??
    (defaultProductLine ? 'all' : pathname === '/batches/all' ? 'all' : 'my')

  // State
  const [batches, setBatches] = useState<BatchItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')
  const [productLineFilter, setProductLineFilter] = useState(defaultProductLine || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      if (statusFilter) params.set('status', statusFilter)
      if (productLineFilter) params.set('productLine', productLineFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (resolvedViewMode === 'my' && user?.id) params.set('assignee', user.id)

      const res = await authFetch(`/api/batches?${params.toString()}`)
      if (res.ok) {
        const data: BatchesResponse = await res.json()
        setBatches(data.batches || [])
        setTotal(data.total || 0)
      }
    } catch {
      // Empty state
      setBatches([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, productLineFilter, searchQuery, resolvedViewMode, user?.id])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  // Reset page when filter/search changes
  useEffect(() => {
    setPage(1)
  }, [statusFilter, searchQuery, productLineFilter])

  // Search debounce
  const handleSearch = () => {
    setSearchQuery(searchInput)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {defaultProductLine
              ? (PRODUCT_LINE_LABELS[defaultProductLine] || defaultProductLine)
              : (resolvedViewMode === 'all' ? '所有批次' : '我的批次')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {defaultProductLine
              ? `${PRODUCT_LINE_LABELS[defaultProductLine] || defaultProductLine}的生产批次`
              : (resolvedViewMode === 'all' ? '查看系统中所有生产批次' : '查看您创建的生产批次')}
            {!loading && (
              <span className="ml-1">· 共 {total} 条</span>
            )}
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          新建批次
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Status Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === filter.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Product Line Filter + Search Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Product Line Filter Tabs — hidden when locked to a product line */}
          {!hideProductLineFilter && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {PRODUCT_LINE_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setProductLineFilter(filter.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    productLineFilter === filter.key
                      ? filter.key
                        ? `${PRODUCT_LINE_COLORS[filter.key] || ''} shadow-sm font-semibold`
                        : 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索批次号..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={handleSearch}
            >
              搜索
            </Button>
          </div>
        </div>
      </div>

      {/* Batch List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : batches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium mb-1">暂无批次数据</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery || statusFilter || productLineFilter
                ? '没有匹配的批次，请调整筛选条件'
                : '点击上方「新建批次」按钮创建第一个生产批次'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {batches.map((batch) => (
              <Card
                key={batch.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
                onClick={() => router.push(`/batches/${batch.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Batch Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        batch.productLine
                          ? `${PRODUCT_LINE_COLORS[batch.productLine]?.split(' ')[0] || 'bg-primary/10'}`
                          : 'bg-primary/10'
                      }`}>
                        {(() => {
                          const Icon = PRODUCT_LINE_ICONS[batch.productLine || ''] || FlaskConical
                          return <Icon className={`h-4 w-4 ${
                            batch.productLine
                              ? `${PRODUCT_LINE_COLORS[batch.productLine]?.split(' ')[1] || 'text-primary'}`
                              : 'text-primary'
                          }`} />
                        })()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">
                            {batch.batchNo}
                          </span>
                          <Badge
                            variant="secondary"
                            className={getStatusColor(batch.status)}
                          >
                            {getStatusLabel(batch.status)}
                          </Badge>
                          {batch.productLine && (
                            <ProductLineBadge productLine={batch.productLine} />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {batch.productName}
                          {batch.orderNo && (
                            <span className="ml-2 font-mono">订单: {batch.orderNo}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Meta */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground sm:text-right pl-12 sm:pl-0">
                      {batch.currentPassage && (
                        <span className="font-mono font-medium text-foreground">
                          {batch.currentPassage}
                        </span>
                      )}
                      <span className="hidden sm:inline">
                        {batch.createdByName}
                      </span>
                      <span>
                        {formatDate(batch.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Batch Dialog */}
      <CreateBatchDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchBatches}
        defaultProductLine={defaultProductLine}
      />
    </div>
  )
}

// ============================================
// Default Export — backward-compatible wrapper
// ============================================

export default function BatchListPage() {
  return <BatchListContent />
}
