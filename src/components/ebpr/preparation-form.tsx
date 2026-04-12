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
import { Loader2, Paperclip, TestTubes } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface PreparationFormProps {
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
// Preparation Form
// ============================================

export function PreparationForm({
  task,
  batch,
  onSuccess,
}: PreparationFormProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [prepDate, setPrepDate] = useState<string>(
    task.formData?.prep_date ?? ''
  )
  const [prepBatchNo, setPrepBatchNo] = useState<string>(
    task.formData?.prep_batch_no ?? ''
  )
  const [kitSpec, setKitSpec] = useState<string>(
    task.formData?.kit_spec ?? ''
  )
  const [prepQuantity, setPrepQuantity] = useState<string>(
    task.formData?.prep_quantity?.toString() ?? ''
  )
  const [mediumBatch, setMediumBatch] = useState<string>(
    task.formData?.medium_batch ?? ''
  )
  const [reagentBatch, setReagentBatch] = useState<string>(
    task.formData?.reagent_batch ?? ''
  )
  const [prepResult, setPrepResult] = useState<string>(
    task.formData?.prep_result ?? ''
  )
  const [notes, setNotes] = useState<string>(
    task.formData?.notes ?? task.notes ?? ''
  )

  const handleSubmit = async () => {
    // 前端校验
    if (!prepDate) {
      toast.error('请选择配制日期')
      return
    }
    if (!prepBatchNo.trim()) {
      toast.error('请填写配制批次号')
      return
    }
    if (!kitSpec.trim()) {
      toast.error('请填写试剂盒规格')
      return
    }
    if (!prepQuantity || Number(prepQuantity) <= 0) {
      toast.error('请填写有效的配制数量')
      return
    }
    if (!prepResult) {
      toast.error('请选择操作结果')
      return
    }

    setSaving(true)
    try {
      const formData = {
        prep_date: prepDate,
        prep_batch_no: prepBatchNo.trim(),
        kit_spec: kitSpec.trim(),
        prep_quantity: Number(prepQuantity),
        medium_batch: mediumBatch.trim(),
        reagent_batch: reagentBatch.trim(),
        prep_result: prepResult,
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

      toast.success('配制生产记录已保存')
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
          <TestTubes className="h-4 w-4 text-primary" />
          配制生产记录
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
            <Label htmlFor="prep-date">
              配制日期 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prep-date"
              type="date"
              value={prepDate}
              onChange={(e) => setPrepDate(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prep-batch-no">
              配制批次号 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prep-batch-no"
              type="text"
              placeholder="输入配制批次号"
              value={prepBatchNo}
              onChange={(e) => setPrepBatchNo(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kit-spec">
              试剂盒规格 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="kit-spec"
              type="text"
              placeholder="如：50测试/盒"
              value={kitSpec}
              onChange={(e) => setKitSpec(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prep-quantity">
              配制数量 <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="prep-quantity"
                type="number"
                min={1}
                placeholder="输入配制数量"
                value={prepQuantity}
                onChange={(e) => setPrepQuantity(e.target.value)}
                disabled={isCompleted}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                盒
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medium-batch">培养基批号</Label>
            <Input
              id="medium-batch"
              type="text"
              placeholder="输入培养基批号（可选）"
              value={mediumBatch}
              onChange={(e) => setMediumBatch(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reagent-batch">试剂批号</Label>
            <Input
              id="reagent-batch"
              type="text"
              placeholder="输入试剂批号（可选）"
              value={reagentBatch}
              onChange={(e) => setReagentBatch(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prep-result">
              操作结果 <span className="text-destructive">*</span>
            </Label>
            <Select value={prepResult} onValueChange={setPrepResult} disabled={isCompleted}>
              <SelectTrigger id="prep-result">
                <SelectValue placeholder="选择操作结果" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="合格">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    合格
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="prep-notes">备注</Label>
          <Textarea
            id="prep-notes"
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
