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
import { Loader2, Paperclip, PackageSearch } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface MaterialPrepFormProps {
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
// Material Prep Form
// ============================================

export function MaterialPrepForm({
  task,
  batch,
  onSuccess,
}: MaterialPrepFormProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [materialList, setMaterialList] = useState<string>(
    task.formData?.material_list ?? ''
  )
  const [batchNumbers, setBatchNumbers] = useState<string>(
    task.formData?.batch_numbers ?? ''
  )
  const [environmentCheck, setEnvironmentCheck] = useState<string>(
    task.formData?.environment_check ?? ''
  )
  const [temperatureRecord, setTemperatureRecord] = useState<string>(
    task.formData?.temperature_record ?? ''
  )
  const [preparedBy, setPreparedBy] = useState<string>(
    task.formData?.prepared_by ?? user?.name ?? ''
  )
  const [notes, setNotes] = useState<string>(
    task.formData?.notes ?? task.notes ?? ''
  )

  const handleSubmit = async () => {
    // 前端校验
    if (!materialList.trim()) {
      toast.error('请填写物料清单')
      return
    }
    if (!batchNumbers.trim()) {
      toast.error('请填写批号登记')
      return
    }
    if (!environmentCheck) {
      toast.error('请选择环境检查结果')
      return
    }

    setSaving(true)
    try {
      const formData = {
        material_list: materialList.trim(),
        batch_numbers: batchNumbers.trim(),
        environment_check: environmentCheck,
        temperature_record: temperatureRecord.trim(),
        prepared_by: preparedBy.trim(),
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

      toast.success('物料准备记录已保存')
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
          <PackageSearch className="h-4 w-4 text-primary" />
          物料准备记录
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
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="material-list">
              物料清单 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="material-list"
              placeholder="每行一个物料"
              value={materialList}
              onChange={(e) => setMaterialList(e.target.value)}
              rows={4}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="batch-numbers">
              批号登记 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="batch-numbers"
              placeholder="物料名称: 批号"
              value={batchNumbers}
              onChange={(e) => setBatchNumbers(e.target.value)}
              rows={4}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment-check">
              环境检查 <span className="text-destructive">*</span>
            </Label>
            <Select value={environmentCheck} onValueChange={setEnvironmentCheck} disabled={isCompleted}>
              <SelectTrigger id="environment-check">
                <SelectValue placeholder="选择环境检查结果" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="合格">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    合格
                  </span>
                </SelectItem>
                <SelectItem value="不合格">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    不合格
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature-record">温度记录</Label>
            <Input
              id="temperature-record"
              type="text"
              placeholder="如：22°C"
              value={temperatureRecord}
              onChange={(e) => setTemperatureRecord(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prepared-by">准备人</Label>
            <Input
              id="prepared-by"
              type="text"
              placeholder="准备人姓名"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              disabled={isCompleted}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="material-notes">备注</Label>
          <Textarea
            id="material-notes"
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
