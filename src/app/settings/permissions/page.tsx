'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  isAdmin,
  hasAnyRole,
  hasRole,
  ROLE_LABELS,
  ROLE_COLORS,
  MANAGEMENT_ROLES,
  PRODUCT_LINE_LABELS,
} from '@/lib/roles'
import { ProductLineBadge } from '@/components/shared/product-line-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  FlaskConical,
  Microscope,
  TestTubes,
  ChevronDown,
  Eye,
} from 'lucide-react'

// ========================
// Types
// ========================

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  roles: string[]
  department: string | null
  active: boolean
  productLines: string[]
}

interface ProductRoleItem {
  userId: string
  userName: string
  productId: string
  productCode: string
  productName: string
  productLine: string
  roles: string[]
}

// ========================
// Product line tabs
// ========================

const PRODUCT_LINE_TABS = [
  { key: 'ALL', label: '全部', icon: ShieldCheck },
  { key: 'SERVICE', label: '服务项目', icon: Microscope },
  { key: 'CELL_PRODUCT', label: '细胞产品', icon: FlaskConical },
  { key: 'KIT', label: '试剂盒', icon: TestTubes },
]

// ========================
// Page Component
// ========================

export default function PermissionsOverviewPage() {
  const { user: currentUser, isLoading: authLoading } = useAuthStore()
  const userRoles = currentUser?.roles || []
  const isCurrentUserAdmin = isAdmin(userRoles)
  const isSupervisor = hasAnyRole(userRoles, ['SUPERVISOR'])
  const isOperationalOnly = hasAnyRole(userRoles, ['OPERATOR', 'QC']) && !isCurrentUserAdmin && !isSupervisor

  // Data
  const [users, setUsers] = useState<UserItem[]>([])
  const [productRoles, setProductRoles] = useState<ProductRoleItem[]>([])
  const [loading, setLoading] = useState(false)

  // UI
  const [selectedLine, setSelectedLine] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())

  // Build merged data: user + their product roles grouped
  const userProductRolesMap = useMemo(() => {
    const map: Record<string, ProductRoleItem[]> = {}
    for (const pr of productRoles) {
      if (!map[pr.userId]) map[pr.userId] = []
      map[pr.userId].push(pr)
    }
    return map
  }, [productRoles])

  // Check if a user has any management role
  const hasManagementRole = (roles: string[]) =>
    roles.some((r) => MANAGEMENT_ROLES.includes(r))

  // Determine visible product lines for filtering
  const visibleProductLines = isCurrentUserAdmin
    ? ['CELL_PRODUCT', 'SERVICE', 'KIT']
    : (currentUser?.productLines || [])

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        authFetch('/api/users'),
        authFetch('/api/product-roles'),
      ])

      let fetchedUsers: UserItem[] = []
      if (usersRes.ok) {
        const data = await usersRes.json()
        fetchedUsers = data.users || []
      }

      let fetchedRoles: ProductRoleItem[] = []
      if (rolesRes.ok) {
        const data = await rolesRes.json()
        fetchedRoles = data.assignments || []
      }

      // Access control filtering
      if (isOperationalOnly) {
        // Only show own row
        fetchedUsers = fetchedUsers.filter((u) => u.id === currentUser?.id)
        fetchedRoles = fetchedRoles.filter((r) => r.userId === currentUser?.id)
      } else if (isSupervisor) {
        // Only show users in their product lines
        fetchedUsers = fetchedUsers.filter((u) =>
          u.productLines?.some((pl) => visibleProductLines.includes(pl))
        )
        fetchedRoles = fetchedRoles.filter((r) =>
          visibleProductLines.includes(r.productLine)
        )
      }

      setUsers(fetchedUsers.filter((u) => u.active))
      setProductRoles(fetchedRoles)
    } catch {
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [isCurrentUserAdmin, isSupervisor, isOperationalOnly, visibleProductLines, currentUser])

  useEffect(() => {
    if (!authLoading) {
      fetchData()
    }
  }, [authLoading, fetchData])

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Product line filter
      if (selectedLine !== 'ALL') {
        if (!u.productLines?.includes(selectedLine)) return false
      }
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [users, selectedLine, searchQuery])

  // Toggle expanded row
  const toggleExpanded = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  // ========================
  // Loading / Access denied
  // ========================

  if (authLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // All authenticated users can view (at least their own permissions)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">权限总览</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isOperationalOnly
              ? '查看您当前的权限配置'
              : '查看所有用户的全局角色、产品线归属与产品级权限'}
          </p>
        </div>
      </div>

      {/* Product Line Tabs */}
      {!isOperationalOnly && (
        <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/30 overflow-x-auto">
          {PRODUCT_LINE_TABS.filter((tab) => {
            if (isCurrentUserAdmin) return true
            if (tab.key === 'ALL') return true
            return visibleProductLines.includes(tab.key)
          }).map((tab) => (
            <Button
              key={tab.key}
              variant={selectedLine === tab.key ? 'default' : 'ghost'}
              size="sm"
              className="flex items-center gap-1.5 text-xs"
              onClick={() => setSelectedLine(tab.key)}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="搜索用户..."
          className="pl-8 h-9 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <ShieldAlert className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium">无匹配用户</p>
              <p className="text-xs mt-1">
                {searchQuery ? '尝试修改搜索条件' : '当前筛选条件下无用户'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">用户名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>全局角色</TableHead>
                      <TableHead>产品线</TableHead>
                      <TableHead>产品权限详情</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const userPr = userProductRolesMap[user.id] || []
                      const isManagement = hasManagementRole(user.roles)
                      const isExpanded = expandedUsers.has(user.id)

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              {user.roles.map((r) => (
                                <Badge
                                  key={r}
                                  variant="secondary"
                                  className={`text-[10px] ${ROLE_COLORS[r] || ''}`}
                                >
                                  {ROLE_LABELS[r]}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              {(user.productLines || []).map((pl) => (
                                <ProductLineBadge key={pl} productLine={pl} />
                              ))}
                              {(!user.productLines || user.productLines.length === 0) && (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isManagement ? (
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] bg-primary/10 text-primary"
                                >
                                  {hasRole(user.roles, 'QA') ? '整线质保' : '整线管理'}
                                </Badge>
                              </div>
                            ) : userPr.length === 0 ? (
                              <span className="text-xs text-muted-foreground">暂无产品权限</span>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                    <Eye className="h-3 w-3" />
                                    查看 ({userPr.length})
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-72 max-h-64 overflow-y-auto">
                                  <div className="p-2 space-y-1.5">
                                    {userPr.map((pr) => (
                                      <div
                                        key={`${pr.productId}-${pr.roles.join()}`}
                                        className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1.5"
                                      >
                                        <Badge
                                          variant="secondary"
                                          className="text-[9px] font-mono bg-primary/10 text-primary"
                                        >
                                          {pr.productCode}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground truncate">
                                          {pr.productName}
                                        </span>
                                        <div className="flex gap-0.5 ml-auto shrink-0">
                                          {pr.roles.map((r) => (
                                            <Badge
                                              key={r}
                                              variant="secondary"
                                              className={`text-[9px] ${ROLE_COLORS[r] || ''}`}
                                            >
                                              {ROLE_LABELS[r]}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y">
                {filteredUsers.map((user) => {
                  const userPr = userProductRolesMap[user.id] || []
                  const isManagement = hasManagementRole(user.roles)
                  const isExpanded = expandedUsers.has(user.id)

                  return (
                    <div key={user.id} className="p-4 space-y-3">
                      {/* User header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {user.roles.map((r) => (
                            <Badge
                              key={r}
                              variant="secondary"
                              className={`text-[10px] ${ROLE_COLORS[r] || ''}`}
                            >
                              {ROLE_LABELS[r]}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Product lines */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {(user.productLines || []).map((pl) => (
                          <ProductLineBadge key={pl} productLine={pl} />
                        ))}
                        {(!user.productLines || user.productLines.length === 0) && (
                          <span className="text-xs text-muted-foreground">未分配产品线</span>
                        )}
                      </div>

                      {/* Product roles */}
                      {isManagement ? (
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-primary/10 text-primary"
                          >
                            {hasRole(user.roles, 'QA') ? '整线质保' : '整线管理'}
                          </Badge>
                        </div>
                      ) : userPr.length > 0 ? (
                        <div>
                          <button
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => toggleExpanded(user.id)}
                          >
                            <ChevronDown
                              className={`h-3 w-3 transition-transform ${
                                isExpanded ? 'rotate-0' : '-rotate-90'
                              }`}
                            />
                            产品权限 ({userPr.length})
                          </button>
                          {isExpanded && (
                            <div className="mt-2 space-y-1.5">
                              {userPr.map((pr) => (
                                <div
                                  key={`${pr.productId}-${pr.roles.join()}`}
                                  className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1.5"
                                >
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] font-mono bg-primary/10 text-primary"
                                  >
                                    {pr.productCode}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {pr.productName}
                                  </span>
                                  <div className="flex gap-0.5 ml-auto shrink-0">
                                    {pr.roles.map((r) => (
                                      <Badge
                                        key={r}
                                        variant="secondary"
                                        className={`text-[9px] ${ROLE_COLORS[r] || ''}`}
                                      >
                                        {ROLE_LABELS[r]}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">暂无产品权限</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary stats */}
      {!loading && filteredUsers.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>共 {filteredUsers.length} 名用户</span>
          {isOperationalOnly && (
            <Badge variant="secondary" className="text-[10px]">
              仅显示当前用户
            </Badge>
          )}
          {isSupervisor && (
            <Badge variant="secondary" className="text-[10px]">
              仅显示所属产品线用户
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
