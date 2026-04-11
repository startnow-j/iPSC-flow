'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { isAdmin, hasAnyRole, ROLE_LABELS, ROLE_COLORS } from '@/lib/roles'
import { ProductLineBadge } from '@/components/shared/product-line-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Save,
  Search,
  FlaskConical,
  Microscope,
  TestTubes,
  CheckCircle2,
} from 'lucide-react'

// ========================
// Types
// ========================

interface ProductItem {
  id: string
  productCode: string
  productName: string
  productLine: string
}

interface AssignableUser {
  id: string
  name: string
  email: string
  roles: string[]
  productLines: string[]
  department?: string | null
}

interface RoleAssignment {
  productId: string
  roles: string[]
}

// ========================
// Page Component
// ========================

export default function ProductRolesPage() {
  const { user: currentUser, isLoading: authLoading } = useAuthStore()
  const userRoles = currentUser?.roles || []

  // Access control
  const canAccess = isAdmin(userRoles) || hasAnyRole(userRoles, ['SUPERVISOR'])
  const isCurrentUserAdmin = isAdmin(userRoles)

  // Data
  const [products, setProducts] = useState<ProductItem[]>([])
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
  const [assignments, setAssignments] = useState<Record<string, RoleAssignment>>({})
  const [originalAssignments, setOriginalAssignments] = useState<Record<string, RoleAssignment>>({})

  // UI
  const [selectedLine, setSelectedLine] = useState('ALL')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Determine which product lines the user can see (memoized)
  const visibleProductLines = useMemo(() => {
    return isCurrentUserAdmin
      ? ['CELL_PRODUCT', 'SERVICE', 'KIT']
      : (currentUser?.productLines || [])
  }, [isCurrentUserAdmin, currentUser?.productLines])

  // Fetch products
  const fetchProducts = useCallback(async (line: string) => {
    try {
      const url = line === 'ALL'
        ? '/api/products'
        : `/api/products?productLine=${line}`
      const res = await authFetch(url)
      if (res.ok) {
        const data = await res.json()
        let filtered = data.products || []
        // Non-admin: only show products in their product lines
        if (!isCurrentUserAdmin) {
          filtered = filtered.filter((p: ProductItem) =>
            visibleProductLines.includes(p.productLine)
          )
        }
        setProducts(filtered)
      }
    } catch {
      // ignore
    }
  }, [isCurrentUserAdmin, visibleProductLines])

  // Fetch assignable users via the new endpoint (both ADMIN and SUPERVISOR can access)
  const fetchAssignableUsers = useCallback(async () => {
    try {
      const res = await authFetch('/api/product-roles/available-users')
      if (res.ok) {
        const data = await res.json()
        setAssignableUsers(data.users || [])
      } else {
        console.error('Failed to fetch assignable users:', res.status)
        toast.error('获取用户列表失败，请确认权限配置')
      }
    } catch {
      // ignore
    }
  }, [])

  // Fetch assignments for selected user
  const fetchAssignments = useCallback(async (userId: string) => {
    if (!userId) {
      setAssignments({})
      setOriginalAssignments({})
      return
    }
    try {
      const res = await authFetch(`/api/product-roles?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, RoleAssignment> = {}
        for (const a of (data.assignments || [])) {
          map[a.productId] = { productId: a.productId, roles: a.roles || [] }
        }
        setAssignments(map)
        setOriginalAssignments(JSON.parse(JSON.stringify(map)))
      }
    } catch {
      // ignore
    }
  }, [])

  // Load everything
  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchProducts(selectedLine), fetchAssignableUsers()])
    setLoading(false)
  }, [fetchProducts, fetchAssignableUsers, selectedLine])

  useEffect(() => {
    if (!authLoading && canAccess) {
      loadAll()
    }
  }, [authLoading, canAccess, loadAll])

  // When user is selected, fetch their assignments
  useEffect(() => {
    fetchAssignments(selectedUserId)
  }, [selectedUserId, fetchAssignments])

  // Filter products by: selected line, search, AND selected user's product lines
  const userProductLines = selectedUser?.productLines || []
  const filteredProducts = products.filter((p) => {
    // Only show products in the user's assigned product lines
    if (!isCurrentUserAdmin && userProductLines.length > 0 && !userProductLines.includes(p.productLine)) {
      return false
    }
    // Even for admin, only show products matching the user's product lines
    // (API will reject assignments to products outside user's lines)
    if (isCurrentUserAdmin && userProductLines.length > 0 && !userProductLines.includes(p.productLine)) {
      return false
    }
    if (selectedLine !== 'ALL' && p.productLine !== selectedLine) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        p.productCode.toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Filter assignable users by search
  const filteredUsers = useMemo(() => {
    return assignableUsers
  }, [assignableUsers])

  // Selected user info
  const selectedUser = assignableUsers.find((u) => u.id === selectedUserId)

  // Check if has changes
  const hasChanges = JSON.stringify(assignments) !== JSON.stringify(originalAssignments)

  // Toggle role for a product
  const toggleProductRole = (productId: string, role: string) => {
    if (!selectedUser) return
    // Check if user has this role globally
    if (!selectedUser.roles.includes(role)) return

    setAssignments((prev) => {
      const current = prev[productId]?.roles || []
      const newRoles = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role]
      // If empty, remove the entry
      if (newRoles.length === 0) {
        const next = { ...prev }
        delete next[productId]
        return next
      }
      return {
        ...prev,
        [productId]: { productId, roles: newRoles },
      }
    })
  }

  // Save all changes at once
  const handleSave = async () => {
    if (!selectedUser || !hasChanges) return
    setSaving(true)
    try {
      // Collect all changes
      const changes: Array<{ productId: string; roles: string[]; action: 'upsert' | 'delete' }> = []

      // Find changed or new entries
      for (const productId of Object.keys(assignments)) {
        const current = assignments[productId].roles
        const original = originalAssignments[productId]?.roles || []
        if (JSON.stringify(current) !== JSON.stringify(original)) {
          changes.push({ productId, roles: current, action: 'upsert' })
        }
      }

      // Find deleted entries
      for (const productId of Object.keys(originalAssignments)) {
        if (!assignments[productId]) {
          changes.push({ productId, roles: [], action: 'delete' })
        }
      }

      if (changes.length === 0) {
        toast.info('无变更需要保存')
        setSaving(false)
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const change of changes) {
        try {
          if (change.action === 'delete') {
            const res = await authFetch(
              `/api/product-roles/${selectedUserId}/${change.productId}`,
              { method: 'DELETE' }
            )
            if (res.ok) {
              successCount++
            } else {
              const errData = await res.json().catch(() => ({}))
              console.error('DELETE failed:', errData)
              errorCount++
            }
          } else {
            const res = await authFetch('/api/product-roles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: selectedUserId,
                productId: change.productId,
                roles: change.roles,
              }),
            })
            if (res.ok) {
              successCount++
            } else {
              const errData = await res.json().catch(() => ({}))
              console.error('POST failed:', errData)
              errorCount++
            }
          }
        } catch (err) {
          console.error('Save error for product', change.productId, err)
          errorCount++
        }
      }

      if (successCount === changes.length) {
        toast.success(`已保存 ${selectedUser.name} 的产品权限（${successCount} 项变更）`)
        // Refresh original assignments
        setOriginalAssignments(JSON.parse(JSON.stringify(assignments)))
      } else if (successCount > 0) {
        toast.warning(`部分保存成功（${successCount}/${changes.length}），请检查失败的项`)
        setOriginalAssignments(JSON.parse(JSON.stringify(assignments)))
      } else {
        toast.error('保存失败，请检查用户是否属于对应产品线')
      }
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSaving(false)
    }
  }

  // ========================
  // Loading / Access denied
  // ========================

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-56" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">无权限</h2>
        <p className="text-sm text-muted-foreground mt-1">
          仅管理员和生产主管可以访问产品权限配置
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">权限配置</h1>
          <p className="text-sm text-muted-foreground mt-1">
            为操作人员分配具体产品的 OPERATOR / QC 角色权限
          </p>
        </div>
        {hasChanges && selectedUser && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存变更
          </Button>
        )}
      </div>

      {/* User Selection Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">选择用户</CardTitle>
          <CardDescription>
            选择需要配置产品权限的操作人员（需有 OPERATOR 或 QC 全局角色）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Skeleton className="h-10 w-full sm:w-80" />
          ) : (
            <>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder={
                    assignableUsers.length === 0
                      ? '暂无可分配权限的用户'
                      : '请选择用户'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      暂无可分配权限的用户
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <span>{u.name}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                          <div className="flex gap-1">
                            {u.roles.map((r) => (
                              <Badge
                                key={r}
                                variant="secondary"
                                className={`text-[9px] px-1 ${ROLE_COLORS[r] || ''}`}
                              >
                                {ROLE_LABELS[r]}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Selected user info */}
              {selectedUser && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm rounded-lg border p-3 bg-muted/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="font-medium">{selectedUser.name}</span>
                      <span className="text-muted-foreground">{selectedUser.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedUser.roles.map((r) => (
                      <Badge
                        key={r}
                        variant="secondary"
                        className={`text-[10px] ${ROLE_COLORS[r] || ''}`}
                      >
                        {ROLE_LABELS[r]}
                      </Badge>
                    ))}
                    <span className="text-muted-foreground mx-0.5">|</span>
                    {selectedUser.productLines?.map((pl) => (
                      <ProductLineBadge key={pl} productLine={pl} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Products + Roles Table */}
      {selectedUser && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">产品角色分配</CardTitle>
                <CardDescription>
                  勾选 {selectedUser.name} 在各产品上的操作角色
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="搜索产品编码/名称..."
                  className="pl-8 h-8 text-sm w-full sm:w-56"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Info bar */}
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {selectedUser.name} 的全局角色：{selectedUser.roles.map((r) => ROLE_LABELS[r]).join('、')}
                {userProductLines.length > 0
                  ? `，归属产品线：${userProductLines.map((pl) => {
                      const labels: Record<string, string> = { SERVICE: '服务项目', CELL_PRODUCT: '细胞产品', KIT: '试剂盒' }
                      return labels[pl] || pl
                    }).join('、')}`
                  : '，未分配产品线（请在用户管理中配置）'}
                。只能为用户分配其归属产品线内的产品角色。
              </p>
            </div>

            {/* Product line filter chips — only show user's product lines */}
            {userProductLines.length > 0 && (
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                <Button
                  variant={selectedLine === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedLine('ALL')}
                >
                  全部 ({userProductLines.length} 线)
                </Button>
                {userProductLines.map((pl) => {
                  const lineConfig: Record<string, { label: string; icon: React.ElementType }> = {
                    CELL_PRODUCT: { label: '细胞产品', icon: FlaskConical },
                    SERVICE: { label: '服务项目', icon: Microscope },
                    KIT: { label: '试剂盒', icon: TestTubes },
                  }
                  const cfg = lineConfig[pl]
                  if (!cfg) return null
                  const Icon = cfg.icon
                  return (
                    <Button
                      key={pl}
                      variant={selectedLine === pl ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setSelectedLine(pl)}
                    >
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Button>
                  )
                })}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mb-2" />
                <p className="text-sm">无匹配产品</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px] sm:w-[220px]">产品</TableHead>
                      <TableHead className="hidden sm:table-cell">产品线</TableHead>
                      <TableHead className="w-[100px] text-center">OPERATOR</TableHead>
                      <TableHead className="w-[100px] text-center">QC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const productAssignment = assignments[product.id]?.roles || []
                      const hasOperatorGlobally = selectedUser.roles.includes('OPERATOR')
                      const hasQcGlobally = selectedUser.roles.includes('QC')
                      const isOperatorChecked = productAssignment.includes('OPERATOR')
                      const isQcChecked = productAssignment.includes('QC')

                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-mono text-xs font-medium">
                                {product.productCode}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {product.productName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <ProductLineBadge productLine={product.productLine} />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={isOperatorChecked}
                                disabled={!hasOperatorGlobally}
                                onCheckedChange={() =>
                                  toggleProductRole(product.id, 'OPERATOR')
                                }
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={isQcChecked}
                                disabled={!hasQcGlobally}
                                onCheckedChange={() =>
                                  toggleProductRole(product.id, 'QC')
                                }
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
