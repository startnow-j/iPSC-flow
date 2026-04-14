'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Paperclip, ThermometerSun } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface CellRevivalFormProps {
  task: {
    id: string
    batchId: string
    taskCode: string
    status: string
    formData: Record<string, any> | null
    notes?: string | null
  }
  batch: {
    batchNo: string
  }
  onSuccess: () => void
}

// ============================================
// Cell Revival Form
// ============================================

export function CellRevivalForm({
  task,
  batch,
  onSuccess,
}: CellRevivalFormProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [freezeId, setFreezeId] = useState<string>(
    task.formData?.freeze_id ?? ''
  )
  const [storageLocation, setStorageLocation] = useState<string>(
    task.formData?.storage_location ?? ''
  )
  const [recoveryTime, setRecoveryTime] = useState<string>(
    task.formData?.recovery_time?.toString() ?? ''
  )
  const [recoveryMethod, setRecoveryMethod] = useState<string>(
    task.formData?.recovery_method ?? ''
  )
  const [recoveryStatus, setRecoveryStatus] = useState<string>(
    task.formData?.recovery_status ?? ''
  )
  const [cultureMedium, setCultureMedium] = useState<string>(
    task.formData?.culture_medium ?? ''
  )
  const [cultureVessel, setCultureVessel] = useState<string>(
    task.formData?.culture_vessel ?? ''
  )
  const [notes, setNotes] = useState<string>(
    task.formData?.notes ?? task.notes ?? ''
  )

  const handleSubmit = async () => {
    // 前端校验
    if (!recoveryTime || Number(recoveryTime) < 0) {
      toast.error('请填写有效的复苏耗时')
      return
    }
    if (!recoveryMethod) {
      toast.error('请选择复苏方式')
      return
    }
    if (!recoveryStatus) {
      toast.error('请选择复苏状态')
      return
    }

    setSaving(true)
    try {
      const formData = {
        freeze_id: freezeId.trim(),
        storage_location: storageLocation.trim(),
        recovery_time: Number(recoveryTime),
        recovery_method: recoveryMethod,
        recovery_status: recoveryStatus,
        culture_medium: cultureMedium.trim(),
        culture_vessel: cultureVessel,
        operator_name: user?.name ?? '',
        notes,
      }

      const res = await authFetch(
        `/api/batches/${task.batchId}/tasks/${task.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData,
            status: 'COMPLETED',
            notes,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        if (data.validation) {
          const firstError = data.validation.errors[0]
          toast.error(firstError?.message ?? '表单校验失败')
        } else {
          toast.error(data.error || '保存失败')
        }
        return
      }

      toast.success('解冻复苏记录已保存')
      onSuccess()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSaving(false)
    }
  }

  const isCompleted = task.status === 'COMPLETED'

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ThermometerSun className="h-4 w-4 text-primary" />
          解冻复苏记录
          {isCompleted && (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-2">
              已完成
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Header Info */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">批次编号</Label>
            <p className="text-sm font-mono font-medium">{batch.batchNo}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">操作员</Label>
            <p className="text-sm font-medium">{user?.name ?? '-'}</p>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Form Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="freeze-id">冻存编号</Label>
            <Input
              id="freeze-id"
              type="text"
              placeholder="输入冻存编号（可选）"
              value={freezeId}
              onChange={(e) => setFreezeId(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storage-location">冻存位置</Label>
            <Input
              id="storage-location"
              type="text"
              placeholder="输入冻存位置（可选）"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recovery-time">
              复苏耗时 <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="recovery-time"
                type="number"
                min={0}
                placeholder="输入复苏耗时"
                value={recoveryTime}
                onChange={(e) => setRecoveryTime(e.target.value)}
                disabled={isCompleted}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                分钟
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recovery-method">
              复苏方式 <span className="text-destructive">*</span>
            </Label>
            <Select value={recoveryMethod} onValueChange={setRecoveryMethod} disabled={isCompleted}>
              <SelectTrigger id="recovery-method">
                <SelectValue placeholder="选择复苏方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="快速复苏">快速复苏</SelectItem>
                <SelectItem value="慢速复苏">慢速复苏</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recovery-status">
              复苏状态 <span className="text-destructive">*</span>
            </Label>
            <Select value={recoveryStatus} onValueChange={setRecoveryStatus} disabled={isCompleted}>
              <SelectTrigger id="recovery-status">
                <SelectValue placeholder="选择复苏状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="正常">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    正常
                  </span>
                </SelectItem>
                <SelectItem value="异常">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    异常
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="culture-medium">培养基</Label>
            <Input
              id="culture-medium"
              type="text"
              placeholder="输入培养基（可选）"
              value={cultureMedium}
              onChange={(e) => setCultureMedium(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="culture-vessel">培养皿规格</Label>
            <Select value={cultureVessel} onValueChange={setCultureVessel} disabled={isCompleted}>
              <SelectTrigger id="culture-vessel">
                <SelectValue placeholder="选择培养皿规格" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6孔板">6孔板</SelectItem>
                <SelectItem value="T25">T25</SelectItem>
                <SelectItem value="T75">T75</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="revival-notes">备注</Label>
          <Textarea
            id="revival-notes"
            placeholder="填写备注信息（可选）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            disabled={isCompleted}
          />
        </div>

        {/* Photo Upload Placeholder */}
        <div className="flex items-center gap-2">
          <Button variant="outline" type="button" disabled className="opacity-60">
            <Paperclip className="mr-2 h-4 w-4" />
            📎 上传照片
          </Button>
          <span className="text-xs text-muted-foreground">
            照片上传功能即将上线
          </span>
        </div>

        {/* Actions */}
        {!isCompleted && (
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              提交完成
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
