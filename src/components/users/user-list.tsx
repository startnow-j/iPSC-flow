'use client'

import { useState, useEffect, useCallback } from 'react'
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
  MoreHorizontal,
  Pencil,
  UserX,
  UserCheck,
  Trash2,
  ShieldAlert,
} from 'lucide-react'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

interface UserListProps {
  onEdit: (user: UserItem) => void
  onRefresh: () => void
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理员',
  SUPERVISOR: '生产主管',
  OPERATOR: '操作员',
  QA: 'QA',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  SUPERVISOR: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  OPERATOR: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  QA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
}

export function UserList({ onEdit, onRefresh }: UserListProps) {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'disable' | 'enable'
    user: UserItem
  } | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
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

  const handleToggleActive = async () => {
    if (!confirmAction) return

    const { type, user } = confirmAction
    try {
      if (type === 'disable') {
        const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
        if (res.ok) {
          toast.success(`已禁用用户 ${user.name}`)
          fetchUsers()
          onRefresh()
        } else {
          const data = await res.json()
          toast.error(data.error || '操作失败')
        }
      } else {
        const res = await fetch(`/api/users/${user.id}`, {
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
              <TableRow key={user.id} className={!user.active ? 'opacity-50' : ''}>
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
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${ROLE_COLORS[user.role] || ''}`}
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
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
