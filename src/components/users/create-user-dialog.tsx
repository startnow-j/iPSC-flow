'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/simple-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, ShieldCheck, FlaskConical, Microscope, TestTubes } from 'lucide-react'
import { ROLE_LABELS, ROLE_COLORS, VALID_ROLES, isAdmin } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

interface UserItem {
  id?: string
  name: string
  email: string
  role: string
  roles: string[]
  department: string | null
  productLines?: string[]
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
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    editUser?.roles?.length ? editUser.roles : [editUser?.role || 'OPERATOR']
  )
  const [department, setDepartment] = useState(editUser?.department || '')
  const [productLines, setProductLines] = useState<string[]>(
    editUser?.productLines || []
  )
  const [loading, setLoading] = useState(false)

  const { user: currentUser } = useAuthStore()
  const isCurrentUserAdmin = currentUser ? isAdmin(currentUser.roles) : true

  // Reset form when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(editUser?.name || '')
      setEmail(editUser?.email || '')
      setPassword('')
      setSelectedRoles(
        editUser?.roles?.length ? editUser.roles : [editUser?.role || 'OPERATOR']
      )
      setDepartment(editUser?.department || '')
      setProductLines(editUser?.productLines || [])
    }
    onOpenChange(open)
  }

  const toggleProductLine = (key: string) => {
    setProductLines((prev) => {
      if (prev.includes(key)) return prev.filter((p) => p !== key)
      return [...prev, key]
    })
  }

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        // Don't allow removing all roles
        if (prev.length <= 1) return prev
        return prev.filter((r) => r !== role)
      }
      return [...prev, role]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEdit && editUser?.id) {
        // Update user
        const body: Record<string, unknown> = { name, roles: selectedRoles, department, productLines }
        if (email !== editUser.email) body.email = email
        if (password) body.password = password

        const res = await authFetch(`/api/users/${editUser.id}`, {
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
        const res = await authFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, roles: selectedRoles, department, productLines }),
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
    selectedRoles.length > 0 &&
    (isEdit || password.length >= 6)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{isEdit ? '编辑用户' : '新建用户'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? '修改用户信息。密码留空则不修改。可分配多个角色。'
            : '创建新的系统用户。密码至少6位。可分配多个角色。'}
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

        {/* Roles - Multi-select with Checkboxes */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            角色 * <span className="text-xs text-muted-foreground font-normal">（可多选）</span>
          </Label>
          <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 bg-muted/30">
            {VALID_ROLES.map((roleValue) => {
              const isChecked = selectedRoles.includes(roleValue)
              return (
                <label
                  key={roleValue}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleRole(roleValue)}
                    disabled={loading}
                  />
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${isChecked ? ROLE_COLORS[roleValue] : 'bg-muted text-muted-foreground'}`}
                  >
                    {ROLE_LABELS[roleValue] || roleValue}
                  </Badge>
                </label>
              )
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            主角色自动取最高权限（管理员 → 主管 → QA → 操作员），该用户将同时拥有所有选中角色的权限。
          </p>
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

        {/* 产品线归属 — only visible to ADMIN */}
        {isCurrentUserAdmin && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">产品线归属</Label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { key: 'CELL_PRODUCT', label: '细胞产品', icon: FlaskConical, color: 'emerald' },
                { key: 'SERVICE', label: '服务项目', icon: Microscope, color: 'violet' },
                { key: 'KIT', label: '试剂盒', icon: TestTubes, color: 'amber' },
              ].map((pl) => (
                <div
                  key={pl.key}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    productLines.includes(pl.key)
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                  onClick={() => toggleProductLine(pl.key)}
                >
                  <pl.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1">{pl.label}</span>
                  <Checkbox checked={productLines.includes(pl.key)} />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              指定用户所属的产品线，决定其管理范围
            </p>
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
            {isEdit ? '保存修改' : '创建用户'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
