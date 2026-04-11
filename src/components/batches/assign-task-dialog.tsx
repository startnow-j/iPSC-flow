'use client'

import { useState, useEffect, useMemo } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/simple-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, User, ShieldCheck, Loader2 } from 'lucide-react'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles'

// ============================================
// Types
// ============================================

interface AvailableUser {
  id: string
  name: string
  email: string
  roles: string[]
  department?: string
  active: boolean
  productLines: string[]
}

interface AssignTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchId: string
  taskId: string
  taskName: string
  productId: string
  onSuccess: () => void
}

// ============================================
// Component
// ============================================

export function AssignTaskDialog({
  open,
  onOpenChange,
  batchId,
  taskId,
  taskName,
  productId,
  onSuccess,
}: AssignTaskDialogProps) {
  // --- Data ---
  const [users, setUsers] = useState<AvailableUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  // --- Form state ---
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null)
  const [selectedReviewerId, setSelectedReviewerId] = useState<string | null>(null)
  const [operatorSearch, setOperatorSearch] = useState('')
  const [reviewerSearch, setReviewerSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // --- Fetch available users ---
  useEffect(() => {
    if (!open) return

    const fetchUsers = async () => {
      setUsersLoading(true)
      try {
        const res = await authFetch(
          `/api/product-roles/available-users?productId=${productId}`
        )
        if (res.ok) {
          const data = await res.json()
          setUsers(data.users || [])
        } else {
          setError('获取可用用户失败')
        }
      } catch {
        setError('网络错误，请重试')
      } finally {
        setUsersLoading(false)
      }
    }

    fetchUsers()
  }, [open, productId])

  // --- Reset form on close ---
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedOperatorId(null)
      setSelectedReviewerId(null)
      setOperatorSearch('')
      setReviewerSearch('')
      setError('')
    }
    onOpenChange(nextOpen)
  }

  // --- Filtered lists ---
  const filteredOperators = useMemo(() => {
    const q = operatorSearch.trim().toLowerCase()
    return users
      .filter((u) => {
        if (!q) return true
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.roles.some((r) => r.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => {
        // Recommend OPERATOR role users first
        const aRec = a.roles.includes('OPERATOR') ? 0 : 1
        const bRec = b.roles.includes('OPERATOR') ? 0 : 1
        return aRec - bRec
      })
  }, [users, operatorSearch])

  const filteredReviewers = useMemo(() => {
    const q = reviewerSearch.trim().toLowerCase()
    return users
      .filter((u) => {
        if (!q) return true
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.roles.some((r) => r.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => {
        // Recommend QC role users first
        const aRec = a.roles.includes('QC') ? 0 : 1
        const bRec = b.roles.includes('QC') ? 0 : 1
        return aRec - bRec
      })
  }, [users, reviewerSearch])

  // --- Submit ---
  const handleSubmit = async () => {
    if (!selectedOperatorId) {
      setError('请选择主操作人')
      return
    }

    const operator = users.find((u) => u.id === selectedOperatorId)
    if (!operator) {
      setError('所选操作人无效')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const body: Record<string, unknown> = {
        assigneeId: selectedOperatorId,
        assigneeName: operator.name,
      }

      if (selectedReviewerId) {
        const reviewer = users.find((u) => u.id === selectedReviewerId)
        if (reviewer) {
          body.reviewerId = selectedReviewerId
          body.reviewerName = reviewer.name
        }
      }

      const res = await authFetch(`/api/batches/${batchId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '指派失败')
        return
      }

      handleOpenChange(false)
      onSuccess()
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Helpers ---
  const getInitials = (name: string) => {
    return name.slice(0, 1)
  }

  const selectedOperator = users.find((u) => u.id === selectedOperatorId)
  const selectedReviewer = users.find((u) => u.id === selectedReviewerId)

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          指派任务 — {taskName}
        </DialogTitle>
        <DialogDescription>
          为主操作人指派任务执行者，可选择复核人进行操作复核
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* ====================== */}
        {/* 主操作人 (Required)     */}
        {/* ====================== */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <User className="h-4 w-4 text-primary" />
            主操作人
            <span className="text-destructive">*</span>
          </label>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索姓名、邮箱或角色..."
              value={operatorSearch}
              onChange={(e) => setOperatorSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Selected operator summary */}
          {selectedOperator && (
            <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
              <Avatar className="size-6">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(selectedOperator.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{selectedOperator.name}</span>
              <span className="text-xs text-muted-foreground">{selectedOperator.email}</span>
              <button
                type="button"
                onClick={() => setSelectedOperatorId(null)}
                className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                取消选择
              </button>
            </div>
          )}

          {/* User list */}
          <div className="max-h-44 overflow-y-auto rounded-md border">
            {usersLoading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredOperators.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {operatorSearch ? '未找到匹配的用户' : '暂无可用操作员'}
              </p>
            ) : (
              filteredOperators.map((user) => {
                const isRecommended = user.roles.includes('OPERATOR')
                const isSelected = selectedOperatorId === user.id

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedOperatorId(user.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b last:border-b-0
                      ${isSelected
                        ? 'bg-primary/5 border-l-2 border-l-primary'
                        : 'hover:bg-muted/50'
                      }
                    `}
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback
                        className={
                          isSelected
                            ? 'bg-primary text-primary-foreground text-xs'
                            : 'bg-muted text-muted-foreground text-xs'
                        }
                      >
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm truncate ${
                            isSelected ? 'font-semibold' : 'font-medium'
                          }`}
                        >
                          {user.name}
                        </span>
                        {isRecommended && (
                          <Badge
                            variant="secondary"
                            className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[10px] px-1.5 py-0"
                          >
                            推荐
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[role] || ''}`}
                        >
                          {ROLE_LABELS[role] || role}
                        </Badge>
                      ))}
                    </div>
                    {/* Radio indicator */}
                    <div className="shrink-0 ml-1">
                      <div
                        className={`size-4 rounded-full border-2 flex items-center justify-center transition-colors
                          ${isSelected ? 'border-primary' : 'border-muted-foreground/30'}
                        `}
                      >
                        {isSelected && (
                          <div className="size-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ====================== */}
        {/* 复核人 (Optional)       */}
        {/* ====================== */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            复核人
            <span className="text-xs text-muted-foreground font-normal">
              （可选）
            </span>
          </label>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索姓名、邮箱或角色..."
              value={reviewerSearch}
              onChange={(e) => setReviewerSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Selected reviewer summary */}
          {selectedReviewer && (
            <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
              <Avatar className="size-6">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(selectedReviewer.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{selectedReviewer.name}</span>
              <span className="text-xs text-muted-foreground">
                {selectedReviewer.email}
              </span>
              <button
                type="button"
                onClick={() => setSelectedReviewerId(null)}
                className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                取消选择
              </button>
            </div>
          )}

          {/* User list */}
          <div className="max-h-44 overflow-y-auto rounded-md border">
            {usersLoading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredReviewers.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {reviewerSearch ? '未找到匹配的用户' : '暂无可用复核人'}
              </p>
            ) : (
              filteredReviewers.map((user) => {
                const isRecommended = user.roles.includes('QC')
                const isSelected = selectedReviewerId === user.id

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedReviewerId(isSelected ? null : user.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b last:border-b-0
                      ${isSelected
                        ? 'bg-primary/5 border-l-2 border-l-primary'
                        : 'hover:bg-muted/50'
                      }
                    `}
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback
                        className={
                          isSelected
                            ? 'bg-primary text-primary-foreground text-xs'
                            : 'bg-muted text-muted-foreground text-xs'
                        }
                      >
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm truncate ${
                            isSelected ? 'font-semibold' : 'font-medium'
                          }`}
                        >
                          {user.name}
                        </span>
                        {isRecommended && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] px-1.5 py-0"
                          >
                            推荐
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[role] || ''}`}
                        >
                          {ROLE_LABELS[role] || role}
                        </Badge>
                      ))}
                    </div>
                    {/* Checkbox indicator */}
                    <div className="shrink-0 ml-1">
                      <div
                        className={`size-4 rounded border-2 flex items-center justify-center transition-colors
                          ${isSelected
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/30'
                          }
                        `}
                      >
                        {isSelected && (
                          <svg
                            className="size-3 text-primary-foreground"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2.5 6L5 8.5L9.5 3.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Error */}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => handleOpenChange(false)}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !selectedOperatorId}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          确认指派
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
