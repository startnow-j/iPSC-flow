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
import { Loader2, Paperclip, Dna } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface ReprogramFormProps {
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
// Reprogram Form
// ============================================

export function ReprogramForm({ task, batch, onSuccess }: ReprogramFormProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [reprogramMethod, setReprogramMethod] = useState<string>(
    task.formData?.reprogram_method ?? ''
  )
  const [vectorName, setVectorName] = useState<string>(
    task.formData?.vector_name ?? ''
  )
  const [vectorBatch, setVectorBatch] = useState<string>(
    task.formData?.vector_batch ?? ''
  )
  const [transductionDate, setTransductionDate] = useState<string>(
    task.formData?.transduction_date ?? ''
  )
  const [cultureMedium, setCultureMedium] = useState<string>(
    task.formData?.culture_medium ?? ''
  )
  const [cultureVessel, setCultureVessel] = useState<string>(
    task.formData?.culture_vessel ?? ''
  )
  const [operationDays, setOperationDays] = useState<string>(
    task.formData?.operation_days?.toString() ?? ''
  )
  const [operationResult, setOperationResult] = useState<string>(
    task.formData?.operation_result ?? ''
  )
  const [colonyCount, setColonyCount] = useState<string>(
    task.formData?.colony_count?.toString() ?? ''
  )
  const [notes, setNotes] = useState<string>(
    task.formData?.notes ?? task.notes ?? ''
  )

  const showColonyCount = operationResult === '成功'

  const handleSubmit = async () => {
    // 前端校验
    if (!reprogramMethod) {
      toast.error('请选择重编程方法')
      return
    }
    if (!transductionDate) {
      toast.error('请选择转导日期')
      return
    }
    if (!cultureVessel) {
      toast.error('请选择培养皿规格')
      return
    }
    if (!operationResult) {
      toast.error('请选择操作结果')
      return
    }

    setSaving(true)
    try {
      const formData: Record<string, any> = {
        reprogram_method: reprogramMethod,
        vector_name: vectorName.trim(),
        vector_batch: vectorBatch.trim(),
        transduction_date: transductionDate,
        culture_medium: cultureMedium.trim(),
        culture_vessel: cultureVessel,
        operation_days: operationDays ? Number(operationDays) : null,
        operation_result: operationResult,
        operator_name: user?.name ?? '',
        notes,
      }

      if (showColonyCount && colonyCount) {
        formData.colony_count = Number(colonyCount)
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

      toast.success('重编程操作记录已保存')
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
          <Dna className="h-4 w-4 text-primary" />
          重编程操作记录
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
            <Label htmlFor="reprogram-method">
              重编程方法 <span className="text-destructive">*</span>
            </Label>
            <Select value={reprogramMethod} onValueChange={setReprogramMethod} disabled={isCompleted}>
              <SelectTrigger id="reprogram-method">
                <SelectValue placeholder="选择重编程方法" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="仙台病毒">仙台病毒</SelectItem>
                <SelectItem value="慢病毒">慢病毒</SelectItem>
                <SelectItem value="质粒">质粒</SelectItem>
                <SelectItem value="mRNA">mRNA</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="culture-vessel">
              培养皿规格 <span className="text-destructive">*</span>
            </Label>
            <Select value={cultureVessel} onValueChange={setCultureVessel} disabled={isCompleted}>
              <SelectTrigger id="culture-vessel">
                <SelectValue placeholder="选择培养皿规格" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6孔板">6孔板</SelectItem>
                <SelectItem value="12孔板">12孔板</SelectItem>
                <SelectItem value="T25">T25</SelectItem>
                <SelectItem value="T75">T75</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vector-name">载体名称</Label>
            <Input
              id="vector-name"
              type="text"
              placeholder="输入载体名称（可选）"
              value={vectorName}
              onChange={(e) => setVectorName(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vector-batch">载体批号</Label>
            <Input
              id="vector-batch"
              type="text"
              placeholder="输入载体批号（可选）"
              value={vectorBatch}
              onChange={(e) => setVectorBatch(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transduction-date">
              转导日期 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="transduction-date"
              type="date"
              value={transductionDate}
              onChange={(e) => setTransductionDate(e.target.value)}
              disabled={isCompleted}
            />
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
            <Label htmlFor="operation-days">操作天数</Label>
            <div className="relative">
              <Input
                id="operation-days"
                type="number"
                min={0}
                placeholder="如：21"
                value={operationDays}
                onChange={(e) => setOperationDays(e.target.value)}
                disabled={isCompleted}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                天
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operation-result">
              操作结果 <span className="text-destructive">*</span>
            </Label>
            <Select value={operationResult} onValueChange={setOperationResult} disabled={isCompleted}>
              <SelectTrigger id="operation-result">
                <SelectValue placeholder="选择操作结果" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="成功">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    成功
                  </span>
                </SelectItem>
                <SelectItem value="待观察">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    待观察
                  </span>
                </SelectItem>
                <SelectItem value="失败">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    失败
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showColonyCount && (
            <div className="space-y-2">
              <Label htmlFor="colony-count">克隆数</Label>
              <div className="relative">
                <Input
                  id="colony-count"
                  type="number"
                  min={0}
                  placeholder="输入克隆数量"
                  value={colonyCount}
                  onChange={(e) => setColonyCount(e.target.value)}
                  disabled={isCompleted}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  个
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reprogram-notes">备注</Label>
          <Textarea
            id="reprogram-notes"
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
