'use client'

import { useState } from 'react'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface UserItem {
  id?: string
  name: string
  email: string
  role: string
  department: string | null
}

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editUser?: UserItem | null
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
  editUser,
}: CreateUserDialogProps) {
  const isEdit = !!editUser

  const [name, setName] = useState(editUser?.name || '')
  const [email, setEmail] = useState(editUser?.email || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(editUser?.role || 'OPERATOR')
  const [department, setDepartment] = useState(editUser?.department || '')
  const [loading, setLoading] = useState(false)

  // Reset form when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(editUser?.name || '')
      setEmail(editUser?.email || '')
      setPassword('')
      setRole(editUser?.role || 'OPERATOR')
      setDepartment(editUser?.department || '')
    }
    onOpenChange(open)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEdit && editUser?.id) {
        // Update user
        const body: Record<string, string> = { name, role, department }
        if (email !== editUser.email) body.email = email
        if (password) body.password = password

        const res = await fetch(`/api/users/${editUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error || '更新失败')
          return
        }

        toast.success(`用户 ${name} 已更新`)
      } else {
        // Create user
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role, department }),
        })

        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error || '创建失败')
          return
        }

        toast.success(`用户 ${name} 已创建`)
      }

      handleOpenChange(false)
      onSuccess()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isValid =
    name.trim() &&
    email.trim() &&
    emailRegex.test(email) &&
    (isEdit || password.length >= 6)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑用户' : '新建用户'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? '修改用户信息。密码留空则不修改。'
              : '创建新的系统用户。密码至少6位。'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="user-name">姓名 *</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="user-email">邮箱 *</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              disabled={loading}
            />
            {email && !emailRegex.test(email) && (
              <p className="text-xs text-destructive">邮箱格式不正确</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="user-password">
              密码 {isEdit ? '' : '*'}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? '留空则不修改' : '请输入密码（至少6位）'}
              disabled={loading}
            />
            {password && password.length < 6 && (
              <p className="text-xs text-destructive">密码至少6位</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>角色 *</Label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">管理员</SelectItem>
                <SelectItem value="SUPERVISOR">生产主管</SelectItem>
                <SelectItem value="OPERATOR">操作员</SelectItem>
                <SelectItem value="QA">QA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="user-dept">部门</Label>
            <Input
              id="user-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="请输入部门（可选）"
              disabled={loading}
            />
          </div>

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
              {isEdit ? '保存修改' : '创建用户'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
