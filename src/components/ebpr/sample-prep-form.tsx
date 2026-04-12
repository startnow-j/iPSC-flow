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
import { Loader2, Paperclip, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface SamplePrepFormProps {
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
// Sample Prep Form
// ============================================

export function SamplePrepForm({ task, batch, onSuccess }: SamplePrepFormProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [sampleId, setSampleId] = useState<string>(
    task.formData?.sample_id ?? ''
  )
  const [sampleType, setSampleType] = useState<string>(
    task.formData?.sample_type ?? ''
  )
  const [receiveDate, setReceiveDate] = useState<string>(
    task.formData?.receive_date ?? ''
  )
  const [sampleStatus, setSampleStatus] = useState<string>(
    task.formData?.sample_status ?? ''
  )
  const [sampleQuantity, setSampleQuantity] = useState<string>(
    task.formData?.sample_quantity ?? ''
  )
  const [notes, setNotes] = useState<string>(
    task.formData?.notes ?? task.notes ?? ''
  )

  const handleSubmit = async () => {
    // 前端校验
    if (!sampleId.trim()) {
      toast.error('请填写样本编号')
      return
    }
    if (!sampleType) {
      toast.error('请选择样本类型')
      return
    }
    if (!receiveDate) {
      toast.error('请选择样本接收日期')
      return
    }
    if (!sampleStatus) {
      toast.error('请选择样本状态')
      return
    }

    setSaving(true)
    try {
      const formData = {
        sample_id: sampleId.trim(),
        sample_type: sampleType,
        receive_date: receiveDate,
        sample_status: sampleStatus,
        sample_quantity: sampleQuantity.trim(),
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

      toast.success('样本处理记录已保存')
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
          <FlaskConical className="h-4 w-4 text-primary" />
          样本处理记录
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
            <Label htmlFor="sample-id">
              样本编号 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sample-id"
              type="text"
              placeholder="输入样本编号"
              value={sampleId}
              onChange={(e) => setSampleId(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sample-type">
              样本类型 <span className="text-destructive">*</span>
            </Label>
            <Select value={sampleType} onValueChange={setSampleType} disabled={isCompleted}>
              <SelectTrigger id="sample-type">
                <SelectValue placeholder="选择样本类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="外周血">外周血</SelectItem>
                <SelectItem value="皮肤">皮肤</SelectItem>
                <SelectItem value="脐带血">脐带血</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receive-date">
              样本接收日期 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="receive-date"
              type="date"
              value={receiveDate}
              onChange={(e) => setReceiveDate(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sample-status">
              样本状态 <span className="text-destructive">*</span>
            </Label>
            <Select value={sampleStatus} onValueChange={setSampleStatus} disabled={isCompleted}>
              <SelectTrigger id="sample-status">
                <SelectValue placeholder="选择样本状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="良好">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    良好
                  </span>
                </SelectItem>
                <SelectItem value="一般">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    一般
                  </span>
                </SelectItem>
                <SelectItem value="异常">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    异常
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sample-quantity">样本数量/体积</Label>
            <Input
              id="sample-quantity"
              type="text"
              placeholder="如：5mL 或 2管"
              value={sampleQuantity}
              onChange={(e) => setSampleQuantity(e.target.value)}
              disabled={isCompleted}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sample-notes">备注</Label>
          <Textarea
            id="sample-notes"
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
