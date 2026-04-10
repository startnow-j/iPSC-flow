'use client'

import { useState, useMemo } from 'react'
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
import { Loader2, Plus, ArrowUpDown, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface ExpansionFormProps {
  batch: {
    id: string
    batchNo: string
    currentPassage: string | null
    seedPassage: string | null
  }
  existingExpansions: Array<{
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
// Helper: parse passage number from "P3" → 3
// ============================================

function parsePassageNumber(passage: string | null): number | null {
  if (!passage) return null
  const match = passage.match(/P(\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

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
// Passage History Card
// ============================================

function PassageHistory({
  expansions,
}: {
  expansions: ExpansionFormProps['existingExpansions']
}) {
  if (expansions.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-primary" />
          传代历史
          <Badge variant="secondary" className="ml-auto text-xs">
            {expansions.length} 条记录
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {expansions.map((exp, idx) => {
            const data = exp.formData ?? {}
            return (
              <div
                key={exp.id}
                className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5">
                  <div>
                    <span className="text-xs text-muted-foreground">代次</span>
                    <p className="font-mono font-medium">{exp.stepGroup ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">日期</span>
                    <p>{data.passage_date ? formatDateStr(data.passage_date) : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">传代比例</span>
                    <p>{data.passage_ratio ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">操作员</span>
                    <p>{exp.assigneeName ?? '-'}</p>
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
// Expansion Form
// ============================================

export function ExpansionForm({
  batch,
  existingExpansions,
  onSuccess,
}: ExpansionFormProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [passageDate, setPassageDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [passageRatio, setPassageRatio] = useState<string>('')
  const [cellDensity, setCellDensity] = useState<string>('')
  const [mediaBatchNo, setMediaBatchNo] = useState<string>('')
  const [morphology, setMorphology] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Auto-calculate passage_from and passage_to
  const { passageFrom, passageTo } = useMemo(() => {
    // Start from seedPassage if no expansions yet, otherwise use latest expansion's passage_to
    let from: number | null = null
    if (existingExpansions.length > 0) {
      // Get the latest expansion's passage_to
      const latestExp = existingExpansions[existingExpansions.length - 1]
      const latestData = latestExp.formData ?? {}
      if (latestData.passage_to !== undefined) {
        from = Number(latestData.passage_to)
      } else {
        // Try to parse from stepGroup like "P4→P5"
        const match = latestExp.stepGroup?.match(/→P(\d+)/)
        if (match) {
          from = parseInt(match[1], 10)
        }
      }
    }
    if (from === null) {
      from = parsePassageNumber(batch.currentPassage) ?? parsePassageNumber(batch.seedPassage) ?? 0
    }
    return {
      passageFrom: from,
      passageTo: from + 1,
    }
  }, [batch.currentPassage, batch.seedPassage, existingExpansions])

  const handleSubmit = async () => {
    // 前端校验
    if (!passageDate) {
      toast.error('请选择传代日期')
      return
    }
    if (!passageRatio) {
      toast.error('请选择传代比例')
      return
    }
    if (!cellDensity || Number(cellDensity) < 10000 || Number(cellDensity) > 1000000) {
      toast.error('请填写有效的细胞密度（10,000 ~ 1,000,000）')
      return
    }
    if (!morphology.trim()) {
      toast.error('请填写细胞形态描述')
      return
    }

    setSaving(true)
    try {
      const formData = {
        passage_from: passageFrom,
        passage_to: passageTo,
        passage_date: passageDate,
        passage_ratio: passageRatio,
        cell_density: Number(cellDensity),
        media_batch_no: mediaBatchNo,
        morphology: morphology.trim(),
        operator_name: user?.name ?? '',
        notes,
      }

      const res = await fetch(`/api/batches/${batch.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

      toast.success(`传代记录已保存（${passageFrom}→${passageTo}）`)
      // Reset form for next passage
      setPassageRatio('')
      setCellDensity('')
      setMediaBatchNo('')
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
      {/* Passage History */}
      {existingExpansions.length > 0 && (
        <PassageHistory expansions={existingExpansions} />
      )}

      {/* New Passage Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            新增传代记录
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Passage Info (auto-calculated) */}
          <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground">起始代次</span>
                <p className="font-mono text-lg font-bold text-primary">P{passageFrom}</p>
              </div>
              <FlaskConical className="h-5 w-5 text-primary/50" />
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground">目标代次</span>
                <p className="font-mono text-lg font-bold text-primary">P{passageTo}</p>
              </div>
              <Badge variant="outline" className="font-mono ml-auto">
                P{passageFrom}→P{passageTo}
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
            <div className="space-y-2">
              <Label htmlFor="passage-date">
                传代日期 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="passage-date"
                type="date"
                value={passageDate}
                onChange={(e) => setPassageDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passage-ratio">
                传代比例 <span className="text-destructive">*</span>
              </Label>
              <Select value={passageRatio} onValueChange={setPassageRatio}>
                <SelectTrigger id="passage-ratio">
                  <SelectValue placeholder="选择传代比例" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:3">1:3</SelectItem>
                  <SelectItem value="1:4">1:4</SelectItem>
                  <SelectItem value="1:6">1:6</SelectItem>
                  <SelectItem value="1:8">1:8</SelectItem>
                  <SelectItem value="1:10">1:10</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cell-density">
                细胞密度 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="cell-density"
                  type="number"
                  min={10000}
                  max={1000000}
                  step={1000}
                  placeholder="如：150000"
                  value={cellDensity}
                  onChange={(e) => setCellDensity(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  cells/cm²
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="media-batch-no">培养基批号</Label>
              <Input
                id="media-batch-no"
                type="text"
                placeholder="填写培养基批号（可选）"
                value={mediaBatchNo}
                onChange={(e) => setMediaBatchNo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="morphology">
              细胞形态 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="morphology"
              placeholder="描述细胞形态（如：克隆状生长，边缘清晰，未见分化）"
              value={morphology}
              onChange={(e) => setMorphology(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expansion-notes">备注</Label>
            <Textarea
              id="expansion-notes"
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
              添加传代记录
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
