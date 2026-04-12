'use client'

import { useState, useMemo } from 'react'
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
import { Loader2, Paperclip, Printer } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface DispensingFormProps {
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
// Dispensing Form
// ============================================

export function DispensingForm({
  task,
  batch,
  onSuccess,
}: DispensingFormProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [dispenseDate, setDispenseDate] = useState<string>(
    task.formData?.dispense_date ?? ''
  )
  const [dispenseQuantity, setDispenseQuantity] = useState<string>(
    task.formData?.dispense_quantity?.toString() ?? ''
  )
  const [dispenseSpec, setDispenseSpec] = useState<string>(
    task.formData?.dispense_spec ?? ''
  )
  const [totalVials, setTotalVials] = useState<string>(
    task.formData?.total_vials?.toString() ?? ''
  )
  const [labelContent, setLabelContent] = useState<string>(
    task.formData?.label_content ?? ''
  )
  const [appearanceCheck, setAppearanceCheck] = useState<string>(
    task.formData?.appearance_check ?? ''
  )
  const [sealingMethod, setSealingMethod] = useState<string>(
    task.formData?.sealing_method ?? ''
  )
  const [notes, setNotes] = useState<string>(
    task.formData?.notes ?? task.notes ?? ''
  )

  // Parse spec like "1mL/支" to get volume per vial
  const parseVialSpec = (spec: string): number | null => {
    if (!spec || !spec.trim()) return null
    // Match patterns like "1mL/支", "0.5ml/管", "2mL"
    const patterns = [
      /([\d.]+)\s*[mM][lL]\s*[\/\u4E00-\u9FFF].*/,  // 1mL/支
      /([\d.]+)\s*[mM][lL]/,                          // 1mL
      /([\d.]+)/,                                      // plain number
    ]
    for (const pattern of patterns) {
      const match = spec.trim().match(pattern)
      if (match) {
        return parseFloat(match[1])
      }
    }
    return null
  }

  // Auto-calculate total vials based on quantity and spec
  const calculatedTotalVials = useMemo(() => {
    const qty = Number(dispenseQuantity)
    const specVal = parseVialSpec(dispenseSpec)
    if (!qty || qty <= 0 || !specVal || specVal <= 0) return null
    return Math.ceil(qty / specVal)
  }, [dispenseQuantity, dispenseSpec])

  // Auto-fill total vials when calculated
  const displayTotalVials = totalVials || (calculatedTotalVials !== null ? calculatedTotalVials.toString() : '')

  const handleSubmit = async () => {
    // 前端校验
    if (!dispenseDate) {
      toast.error('请选择分装日期')
      return
    }
    if (!dispenseQuantity || Number(dispenseQuantity) <= 0) {
      toast.error('请填写有效的分装数量')
      return
    }
    if (!dispenseSpec.trim()) {
      toast.error('请填写分装规格')
      return
    }
    if (!appearanceCheck) {
      toast.error('请选择外观检查结果')
      return
    }

    setSaving(true)
    try {
      const formData = {
        dispense_date: dispenseDate,
        dispense_quantity: Number(dispenseQuantity),
        dispense_spec: dispenseSpec.trim(),
        total_vials: Number(displayTotalVials) || null,
        label_content: labelContent.trim(),
        appearance_check: appearanceCheck,
        sealing_method: sealingMethod,
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

      toast.success('分装贴标记录已保存')
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
          <Printer className="h-4 w-4 text-primary" />
          分装贴标记录
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
            <Label htmlFor="dispense-date">
              分装日期 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dispense-date"
              type="date"
              value={dispenseDate}
              onChange={(e) => setDispenseDate(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dispense-quantity">
              分装数量 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dispense-quantity"
              type="number"
              min={1}
              placeholder="输入分装数量"
              value={dispenseQuantity}
              onChange={(e) => setDispenseQuantity(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dispense-spec">
              分装规格 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dispense-spec"
              type="text"
              placeholder="如：1mL/支"
              value={dispenseSpec}
              onChange={(e) => setDispenseSpec(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total-vials">总支数</Label>
            <div className="flex items-center h-9 rounded-md border bg-muted/50 px-3">
              {displayTotalVials ? (
                <span className="text-sm font-bold text-primary">
                  {displayTotalVials} 支
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  根据数量和规格自动计算
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appearance-check">
              外观检查 <span className="text-destructive">*</span>
            </Label>
            <Select value={appearanceCheck} onValueChange={setAppearanceCheck} disabled={isCompleted}>
              <SelectTrigger id="appearance-check">
                <SelectValue placeholder="选择外观检查结果" />
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
            <Label htmlFor="sealing-method">封装方式</Label>
            <Select value={sealingMethod} onValueChange={setSealingMethod} disabled={isCompleted}>
              <SelectTrigger id="sealing-method">
                <SelectValue placeholder="选择封装方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="热封">热封</SelectItem>
                <SelectItem value="压盖">压盖</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label-content">标签内容</Label>
          <Textarea
            id="label-content"
            placeholder="输入标签内容（可选）"
            value={labelContent}
            onChange={(e) => setLabelContent(e.target.value)}
            rows={3}
            disabled={isCompleted}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dispensing-notes">备注</Label>
          <Textarea
            id="dispensing-notes"
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
