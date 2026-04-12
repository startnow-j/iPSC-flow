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
import { Separator } from '@/components/ui/separator'
import { Loader2, Plus, ArrowRight, Microscope } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface DifferentiationFormProps {
  batch: {
    id: string
    batchNo: string
    currentPassage: string | null
    seedPassage: string | null
  }
  existingDifferentiations: Array<{
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

const MORPHOLOGY_OPTIONS = [
  { value: '正常', label: '正常', color: 'bg-emerald-100 text-emerald-700' },
  { value: '异常', label: '异常', color: 'bg-red-100 text-red-700' },
  { value: '待观察', label: '待观察', color: 'bg-amber-100 text-amber-700' },
]

// ============================================
// Differentiation History Card
// ============================================

function DifferentiationHistory({
  differentiations,
}: {
  differentiations: DifferentiationFormProps['existingDifferentiations']
}) {
  if (differentiations.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Microscope className="h-4 w-4 text-primary" />
          分化历史
          <Badge variant="secondary" className="ml-auto text-xs">
            {differentiations.length} 条记录
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {differentiations.map((diff, idx) => {
            const data = diff.formData ?? {}
            const morphologyOpt = MORPHOLOGY_OPTIONS.find(
              (o) => o.value === data.morphology
            )
            return (
              <div
                key={diff.id}
                className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-0.5">
                  <div>
                    <span className="text-xs text-muted-foreground">轮次</span>
                    <p className="font-medium">{diff.stepGroup ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">分化阶段</span>
                    <p className="font-medium line-clamp-1">{data.diff_stage ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">日期</span>
                    <p>{data.diff_date ? formatDateStr(data.diff_date) : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">培养天数</span>
                    <p>{data.culture_days ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">操作员</span>
                    <p>{diff.assigneeName ?? '-'}</p>
                  </div>
                </div>
                {morphologyOpt && (
                  <Badge
                    variant="secondary"
                    className={`shrink-0 text-[10px] ${morphologyOpt.color}`}
                  >
                    {morphologyOpt.value}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Differentiation Form
// ============================================

export function DifferentiationForm({
  batch,
  existingDifferentiations,
  onSuccess,
}: DifferentiationFormProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [diffStage, setDiffStage] = useState<string>('')
  const [diffDate, setDiffDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [inductionFactors, setInductionFactors] = useState<string>('')
  const [medium, setMedium] = useState<string>('')
  const [cultureDays, setCultureDays] = useState<string>('')
  const [morphology, setMorphology] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Calculate current round
  const currentRound = useMemo(() => {
    return existingDifferentiations.length + 1
  }, [existingDifferentiations.length])

  const handleSubmit = async () => {
    // 前端校验
    if (!diffStage.trim()) {
      toast.error('请填写分化阶段')
      return
    }
    if (!diffDate) {
      toast.error('请选择操作日期')
      return
    }
    if (!cultureDays || Number(cultureDays) <= 0) {
      toast.error('请填写有效的培养天数')
      return
    }
    if (!morphology.trim()) {
      toast.error('请选择细胞形态')
      return
    }

    setSaving(true)
    try {
      const formData = {
        diff_stage: diffStage.trim(),
        diff_date: diffDate,
        induction_factors: inductionFactors.trim(),
        medium: medium.trim(),
        culture_days: Number(cultureDays),
        morphology: morphology.trim(),
        operator_name: user?.name ?? '',
        notes,
      }

      const res = await authFetch(`/api/batches/${batch.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskCode: 'DIFFERENTIATION',
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

      toast.success(`分化记录已保存（第${currentRound}轮）`)
      // Reset form for next round
      setDiffStage('')
      setInductionFactors('')
      setMedium('')
      setCultureDays('')
      setMorphology('')
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
      {/* Differentiation History */}
      {existingDifferentiations.length > 0 && (
        <DifferentiationHistory differentiations={existingDifferentiations} />
      )}

      {/* New Differentiation Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            新增分化记录
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Round Indicator */}
          <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground">批次编号</span>
                <p className="font-mono text-sm font-medium">{batch.batchNo}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary/50" />
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground">分化诱导</span>
                <p className="font-mono text-lg font-bold text-primary">
                  第{currentRound}轮
                </p>
              </div>
              <Badge variant="outline" className="font-mono ml-auto">
                R{currentRound}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">操作员</Label>
            <Input value={user?.name ?? ''} disabled className="bg-muted w-fit" />
          </div>

          <div className="h-px bg-border" />

          {/* Form Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="diff-stage">
                分化阶段 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="diff-stage"
                type="text"
                placeholder="如：第一阶段-神经诱导"
                value={diffStage}
                onChange={(e) => setDiffStage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diff-date">
                操作日期 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="diff-date"
                type="date"
                value={diffDate}
                onChange={(e) => setDiffDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="culture-days">
                培养天数 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="culture-days"
                  type="number"
                  min={1}
                  max={365}
                  placeholder="如：7"
                  value={cultureDays}
                  onChange={(e) => setCultureDays(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  天
                </span>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="induction-factors">诱导因子</Label>
              <Textarea
                id="induction-factors"
                placeholder="如：SB431542, LDN193189"
                value={inductionFactors}
                onChange={(e) => setInductionFactors(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medium">培养基</Label>
              <Input
                id="medium"
                type="text"
                placeholder="如：N2B27"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="morphology">
                细胞形态 <span className="text-destructive">*</span>
              </Label>
              <Select value={morphology} onValueChange={setMorphology}>
                <SelectTrigger id="morphology">
                  <SelectValue placeholder="选择细胞形态" />
                </SelectTrigger>
                <SelectContent>
                  {MORPHOLOGY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diff-notes">备注</Label>
            <Textarea
              id="diff-notes"
              placeholder="填写备注信息（可选）"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              添加分化记录
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
