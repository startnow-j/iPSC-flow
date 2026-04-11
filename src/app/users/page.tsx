'use client'

import { useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { isAdmin } from '@/lib/roles'
import { UserList } from '@/components/users/user-list'
import { CreateUserDialog } from '@/components/users/create-user-dialog'
import { Button } from '@/components/ui/button'
import { Plus, ShieldAlert } from 'lucide-react'

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

export default function UsersPage() {
  const { user } = useAuthStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const handleEdit = (user: UserItem) => {
    setEditUser(user)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
  }

  // Access control: only ADMIN
  const userRoles = user?.roles || [user?.role || 'OPERATOR']
  if (!user || !isAdmin(userRoles)) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">无权限</h2>
        <p className="text-sm text-muted-foreground">
          仅管理员可访问用户管理页面
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">用户管理</h1>
          <p className="text-sm text-muted-foreground">
            管理系统用户账号、角色和权限
          </p>
        </div>
        <Button
          onClick={() => {
            setEditUser(null)
            setDialogOpen(true)
          }}
          className="shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          新建用户
        </Button>
      </div>

      {/* User Table */}
      <UserList
        key={refreshKey}
        onEdit={handleEdit}
        onRefresh={handleRefresh}
      />

      {/* Create/Edit Dialog — conditionally rendered to avoid Radix usePresence infinite loop */}
      {dialogOpen && (
        <CreateUserDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          onSuccess={handleRefresh}
          editUser={editUser}
        />
      )}
    </div>
  )
}
