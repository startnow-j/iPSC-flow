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
import { Loader2, Paperclip, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface GeneEditingFormProps {
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
// Gene Editing Form
// ============================================

export function GeneEditingForm({
  task,
  batch,
  onSuccess,
}: GeneEditingFormProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [editingTool, setEditingTool] = useState<string>(
    task.formData?.editing_tool ?? ''
  )
  const [targetGene, setTargetGene] = useState<string>(
    task.formData?.target_gene ?? ''
  )
  const [grnaSequence, setGrnaSequence] = useState<string>(
    task.formData?.grna_sequence ?? ''
  )
  const [editType, setEditType] = useState<string>(
    task.formData?.edit_type ?? ''
  )
  const [transfectionMethod, setTransfectionMethod] = useState<string>(
    task.formData?.transfection_method ?? ''
  )
  const [transfectionDate, setTransfectionDate] = useState<string>(
    task.formData?.transfection_date ?? ''
  )
  const [cultureMedium, setCultureMedium] = useState<string>(
    task.formData?.culture_medium ?? ''
  )
  const [selectionDrug, setSelectionDrug] = useState<string>(
    task.formData?.selection_drug ?? ''
  )
  const [operationResult, setOperationResult] = useState<string>(
    task.formData?.operation_result ?? ''
  )
  const [notes, setNotes] = useState<string>(
    task.formData?.notes ?? task.notes ?? ''
  )

  const handleSubmit = async () => {
    // 前端校验
    if (!editingTool) {
      toast.error('请选择编辑工具')
      return
    }
    if (!targetGene.trim()) {
      toast.error('请填写靶基因')
      return
    }
    if (!editType) {
      toast.error('请选择编辑类型')
      return
    }
    if (!transfectionMethod) {
      toast.error('请选择转染方式')
      return
    }
    if (!transfectionDate) {
      toast.error('请选择转染日期')
      return
    }
    if (!operationResult) {
      toast.error('请选择操作结果')
      return
    }

    setSaving(true)
    try {
      const formData = {
        editing_tool: editingTool,
        target_gene: targetGene.trim(),
        grna_sequence: grnaSequence.trim(),
        edit_type: editType,
        transfection_method: transfectionMethod,
        transfection_date: transfectionDate,
        culture_medium: cultureMedium.trim(),
        selection_drug: selectionDrug.trim(),
        operation_result: operationResult,
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

      toast.success('基因编辑记录已保存')
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
          <Wand2 className="h-4 w-4 text-primary" />
          基因编辑记录
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
            <Label htmlFor="editing-tool">
              编辑工具 <span className="text-destructive">*</span>
            </Label>
            <Select value={editingTool} onValueChange={setEditingTool} disabled={isCompleted}>
              <SelectTrigger id="editing-tool">
                <SelectValue placeholder="选择编辑工具" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CRISPR-Cas9">CRISPR-Cas9</SelectItem>
                <SelectItem value="TALEN">TALEN</SelectItem>
                <SelectItem value="ZFN">ZFN</SelectItem>
                <SelectItem value="碱基编辑">碱基编辑</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-gene">
              靶基因 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="target-gene"
              type="text"
              placeholder="输入靶基因名称"
              value={targetGene}
              onChange={(e) => setTargetGene(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-type">
              编辑类型 <span className="text-destructive">*</span>
            </Label>
            <Select value={editType} onValueChange={setEditType} disabled={isCompleted}>
              <SelectTrigger id="edit-type">
                <SelectValue placeholder="选择编辑类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="基因敲除">基因敲除</SelectItem>
                <SelectItem value="基因敲入">基因敲入</SelectItem>
                <SelectItem value="点突变">点突变</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfection-method">
              转染方式 <span className="text-destructive">*</span>
            </Label>
            <Select value={transfectionMethod} onValueChange={setTransfectionMethod} disabled={isCompleted}>
              <SelectTrigger id="transfection-method">
                <SelectValue placeholder="选择转染方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="电转">电转</SelectItem>
                <SelectItem value="脂质体">脂质体</SelectItem>
                <SelectItem value="核转">核转</SelectItem>
                <SelectItem value="病毒转导">病毒转导</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfection-date">
              转染日期 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="transfection-date"
              type="date"
              value={transfectionDate}
              onChange={(e) => setTransfectionDate(e.target.value)}
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
            <Label htmlFor="selection-drug">筛选药物</Label>
            <Input
              id="selection-drug"
              type="text"
              placeholder="输入筛选药物（可选）"
              value={selectionDrug}
              onChange={(e) => setSelectionDrug(e.target.value)}
              disabled={isCompleted}
            />
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="grna-sequence">gRNA序列</Label>
          <Textarea
            id="grna-sequence"
            placeholder="输入gRNA序列（可选）"
            value={grnaSequence}
            onChange={(e) => setGrnaSequence(e.target.value)}
            rows={2}
            disabled={isCompleted}
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="editing-notes">备注</Label>
          <Textarea
            id="editing-notes"
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
