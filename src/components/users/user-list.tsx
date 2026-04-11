'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { hasAnyRole } from '@/lib/roles'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles'
import {
  MoreHorizontal,
  Pencil,
  UserX,
  UserCheck,
  Trash2,
  ShieldAlert,
  ChevronDown,
  Package,
} from 'lucide-react'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  roles: string[]
  department: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  productRoles?: ProductRoleAssignment[]
}

interface ProductRoleAssignment {
  productCode: string
  productName: string
  roles: string[]
}

interface UserListProps {
  onEdit: (user: UserItem) => void
  onRefresh: () => void
}

export function UserList({ onEdit, onRefresh }: UserListProps) {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [confirmAction, setConfirmAction] = useState<{
    type: 'disable' | 'enable'
    user: UserItem
  } | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      } else {
        const data = await res.json()
        toast.error(data.error || '获取用户列表失败')
      }
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const toggleExpanded = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const handleToggleActive = async () => {
    if (!confirmAction) return

    const { type, user } = confirmAction
    try {
      if (type === 'disable') {
        const res = await authFetch(`/api/users/${user.id}`, { method: 'DELETE' })
        if (res.ok) {
          toast.success(`已禁用用户 ${user.name}`)
          fetchUsers()
          onRefresh()
        } else {
          const data = await res.json()
          toast.error(data.error || '操作失败')
        }
      } else {
        const res = await authFetch(`/api/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: true }),
        })
        if (res.ok) {
          toast.success(`已启用用户 ${user.name}`)
          fetchUsers()
          onRefresh()
        } else {
          const data = await res.json()
          toast.error(data.error || '操作失败')
        }
      }
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setConfirmAction(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead className="hidden sm:table-cell">部门</TableHead>
              <TableHead className="hidden md:table-cell">创建日期</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead className="hidden sm:table-cell">部门</TableHead>
              <TableHead className="hidden md:table-cell">创建日期</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <Fragment key={user.id}>
                <TableRow className={!user.active ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.name}</span>
                      {!user.active && (
                        <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                          已禁用
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(user.roles || [user.role]).map((r) => (
                        <Badge
                          key={r}
                          variant="secondary"
                          className={`text-[10px] ${ROLE_COLORS[r] || ''}`}
                        >
                          {ROLE_LABELS[r] || r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {user.department || '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">操作</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        {user.active ? (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              setConfirmAction({ type: 'disable', user })
                            }
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            禁用
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmAction({ type: 'enable', user })
                            }
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            启用
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                {/* Product Roles Expandable Row */}
                {user.productRoles && user.productRoles.length > 0 && (
                  <TableRow key={`${user.id}-roles`} className={!user.active ? 'opacity-50' : ''}>
                    <TableCell colSpan={6} className="p-0">
                      <Collapsible
                        open={expandedUsers.has(user.id)}
                        onOpenChange={() => toggleExpanded(user.id)}
                      >
                        <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
                          <ChevronDown className={`h-3 w-3 transition-transform ${expandedUsers.has(user.id) ? 'rotate-0' : '-rotate-90'}`} />
                          <Package className="h-3 w-3" />
                          <span>产品权限 ({user.productRoles.length})</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-3 pt-1">
                            <div className="flex flex-wrap gap-2">
                              {user.productRoles.map((pr) => (
                                <div key={pr.productCode} className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1.5">
                                  <Badge variant="secondary" className="text-[10px] font-mono bg-primary/10 text-primary">
                                    {pr.productCode}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{pr.productName}</span>
                                  <span className="text-muted-foreground/40">:</span>
                                  {pr.roles.map((r) => (
                                    <Badge
                                      key={r}
                                      variant="secondary"
                                      className={`text-[10px] ${ROLE_COLORS[r] || ''}`}
                                    >
                                      {ROLE_LABELS[r] || r}
                                    </Badge>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center">
                    <ShieldAlert className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">暂无用户数据</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'disable' ? '确认禁用' : '确认启用'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'disable'
                ? `确定要禁用用户「${confirmAction?.user.name}」吗？禁用后该用户将无法登录系统。`
                : `确定要启用用户「${confirmAction?.user.name}」吗？`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={
                confirmAction?.type === 'disable'
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : ''
              }
            >
              {confirmAction?.type === 'disable' ? (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  禁用
                </>
              ) : (
                '启用'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
