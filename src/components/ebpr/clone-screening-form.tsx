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
import { Loader2, Paperclip, Search, Plus, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface CloneScreeningFormProps {
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
  existingScreenings: Array<{
    id: string
    stepGroup: string | null
    formData: Record<string, any> | null
    status: string
    createdAt: string
    assigneeName: string | null
  }>
  onSuccess: () => void
}

// ============================================
// Helper
// ============================================

function formatDateStr(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// ============================================
// Screening History Card
// ============================================

function ScreeningHistory({
  screenings,
}: {
  screenings: CloneScreeningFormProps['existingScreenings']
}) {
  if (screenings.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-primary" />
          筛选历史
          <Badge variant="secondary" className="ml-auto text-xs">
            {screenings.length} 条记录
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {screenings.map((record, idx) => {
            const data = record.formData ?? {}
            return (
              <div
                key={record.id}
                className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-0.5">
                  <div>
                    <span className="text-xs text-muted-foreground">批次组</span>
                    <p className="font-mono font-medium">{record.stepGroup ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">筛选日期</span>
                    <p>{data.screen_date ? formatDateStr(data.screen_date) : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">筛选方法</span>
                    <p>{data.screen_method ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">阳性/总数</span>
                    <p>
                      {data.positive_count ?? '0'} / {data.clone_count ?? '0'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">结果</span>
                    <p>{data.screen_result ?? '-'}</p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="shrink-0 bg-emerald-100 text-emerald-700 text-[10px]"
                >
                  已完成
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Clone Screening Form
// ============================================

export function CloneScreeningForm({
  task,
  batch,
  existingScreenings,
  onSuccess,
}: CloneScreeningFormProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [screenDate, setScreenDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [screenMethod, setScreenMethod] = useState<string>('')
  const [cloneCount, setCloneCount] = useState<string>('')
  const [positiveCount, setPositiveCount] = useState<string>('')
  const [screenResult, setScreenResult] = useState<string>('')
  const [cultureMedium, setCultureMedium] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const handleSubmit = async () => {
    // 前端校验
    if (!screenDate) {
      toast.error('请选择筛选日期')
      return
    }
    if (!screenMethod) {
      toast.error('请选择筛选方法')
      return
    }
    if (!cloneCount || Number(cloneCount) <= 0) {
      toast.error('请填写有效的筛选克隆数')
      return
    }
    if (!positiveCount || Number(positiveCount) < 0) {
      toast.error('请填写有效的阳性克隆数')
      return
    }
    if (Number(positiveCount) > Number(cloneCount)) {
      toast.error('阳性克隆数不能超过筛选克隆数')
      return
    }
    if (!screenResult) {
      toast.error('请选择检测结果')
      return
    }

    setSaving(true)
    try {
      const formData = {
        screen_date: screenDate,
        screen_method: screenMethod,
        clone_count: Number(cloneCount),
        positive_count: Number(positiveCount),
        screen_result: screenResult,
        culture_medium: cultureMedium.trim(),
        operator_name: user?.name ?? '',
        notes,
      }

      const res = await authFetch(`/api/batches/${task.batchId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskCode: 'CLONE_SCREENING',
          formData,
          notes,
        }),
      })

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

      toast.success('单克隆筛选记录已保存')
      // Reset form for next screening
      setCloneCount('')
      setPositiveCount('')
      setScreenMethod('')
      setScreenResult('')
      setCultureMedium('')
      setNotes('')
      onSuccess()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Screening History */}
      {existingScreenings.length > 0 && (
        <ScreeningHistory screenings={existingScreenings} />
      )}

      {/* New Screening Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            新增单克隆筛选记录
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
              <Label htmlFor="screen-date">
                筛选日期 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="screen-date"
                type="date"
                value={screenDate}
                onChange={(e) => setScreenDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="screen-method">
                筛选方法 <span className="text-destructive">*</span>
              </Label>
              <Select value={screenMethod} onValueChange={setScreenMethod}>
                <SelectTrigger id="screen-method">
                  <SelectValue placeholder="选择筛选方法" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PCR">PCR</SelectItem>
                  <SelectItem value="Sanger测序">Sanger测序</SelectItem>
                  <SelectItem value="流式细胞术">流式细胞术</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clone-count">
                筛选克隆数 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="clone-count"
                  type="number"
                  min={1}
                  placeholder="输入筛选克隆数"
                  value={cloneCount}
                  onChange={(e) => setCloneCount(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  个
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="positive-count">
                阳性克隆数 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="positive-count"
                  type="number"
                  min={0}
                  placeholder="输入阳性克隆数"
                  value={positiveCount}
                  onChange={(e) => setPositiveCount(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  个
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="screen-result">
                检测结果 <span className="text-destructive">*</span>
              </Label>
              <Select value={screenResult} onValueChange={setScreenResult}>
                <SelectTrigger id="screen-result">
                  <SelectValue placeholder="选择检测结果" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="阳性">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      阳性
                    </span>
                  </SelectItem>
                  <SelectItem value="阴性">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      阴性
                    </span>
                  </SelectItem>
                  <SelectItem value="待确认">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      待确认
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
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="screening-notes">备注</Label>
            <Textarea
              id="screening-notes"
              placeholder="填写备注信息（可选）"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
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
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Search className="mr-2 h-4 w-4" />
              添加筛选记录
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
