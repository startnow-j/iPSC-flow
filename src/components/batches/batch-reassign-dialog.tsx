'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/simple-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { User, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface AvailableUser {
  id: string
  name: string
  email: string
  roles: string[]
}

interface BatchReassignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchId: string
  batchNo: string
  productId: string
  /** Current assignments for pre-fill */
  currentProductionOperatorId?: string | null
  currentProductionOperatorName?: string | null
  currentQcOperatorId?: string | null
  currentQcOperatorName?: string | null
  onSuccess: () => void
}

export function BatchReassignDialog({
  open,
  onOpenChange,
  batchId,
  batchNo,
  productId,
  currentProductionOperatorId,
  currentProductionOperatorName,
  currentQcOperatorId,
  currentQcOperatorName,
  onSuccess,
}: BatchReassignDialogProps) {
  const [operators, setOperators] = useState<AvailableUser[]>([])
  const [qcUsers, setQcUsers] = useState<AvailableUser[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedOperatorId, setSelectedOperatorId] = useState('')
  const [selectedQcId, setSelectedQcId] = useState('')

  // Reset and fetch users when dialog opens
  useEffect(() => {
    if (!open) return

    // Pre-fill current assignments
    setSelectedOperatorId(currentProductionOperatorId || '')
    setSelectedQcId(currentQcOperatorId || '')

    const fetchUsers = async () => {
      setLoading(true)
      try {
        const [opRes, qcRes] = await Promise.all([
          authFetch(`/api/product-roles/available-users?productId=${productId}&role=operator`),
          authFetch(`/api/product-roles/available-users?productId=${productId}&role=qc`),
        ])
        if (opRes.ok) {
          const opData = await opRes.json()
          setOperators(opData.users || [])
        }
        if (qcRes.ok) {
          const qcData = await qcRes.json()
          setQcUsers(qcData.users || [])
        }
      } catch {
        toast.error('获取可用用户失败')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [open, productId, currentProductionOperatorId, currentQcOperatorId])

  const hasFourEyeViolation = selectedOperatorId && selectedQcId && selectedOperatorId === selectedQcId

  const handleSubmit = async () => {
    // Build body with only changed fields (or all if explicitly selected)
    const body: Record<string, unknown> = {}

    if (selectedOperatorId) {
      const op = operators.find(u => u.id === selectedOperatorId)
      body.productionOperatorId = selectedOperatorId
      body.productionOperatorName = op?.name || null
    } else {
      body.productionOperatorId = null
      body.productionOperatorName = null
    }

    if (selectedQcId) {
      const qc = qcUsers.find(u => u.id === selectedQcId)
      body.qcOperatorId = selectedQcId
      body.qcOperatorName = qc?.name || null
    } else {
      body.qcOperatorId = null
      body.qcOperatorName = null
    }

    setSubmitting(true)
    try {
      const res = await authFetch(`/api/batches/${batchId}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '指派失败')
        return
      }

      toast.success('指派信息已更新')
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          重新指派 — {batchNo}
        </DialogTitle>
        <DialogDescription>
          修改批次的预指派人员。未完成任务将自动更新为新的生产操作员。
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Four-eye warning */}
        {hasFourEyeViolation && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            四眼原则：生产操作员和质检员不能是同一人
          </div>
        )}

        {/* Current assignments info */}
        {(currentProductionOperatorName || currentQcOperatorName) && (
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium mb-1">当前指派：</p>
            {currentProductionOperatorName && (
              <p>生产操作员：{currentProductionOperatorName}</p>
            )}
            {currentQcOperatorName && (
              <p>质检员：{currentQcOperatorName}</p>
            )}
          </div>
        )}

        {/* Production Operator */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-primary" />
            生产操作员
            <span className="text-xs text-muted-foreground font-normal">（留空则清除）</span>
          </Label>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择操作员" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— 不指定 —</SelectItem>
                {operators.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* QC Operator */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            质检员
            <span className="text-xs text-muted-foreground font-normal">（留空则清除）</span>
          </Label>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select value={selectedQcId} onValueChange={setSelectedQcId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择质检员" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— 不指定 —</SelectItem>
                {qcUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || hasFourEyeViolation || loading}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          确认指派
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
