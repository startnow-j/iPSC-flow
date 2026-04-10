'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Snowflake, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface HarvestFormProps {
  task: {
    id: string
    batchId: string
    taskCode: string
    status: string
    formData: Record<string, any> | null
  }
  batch: {
    batchNo: string
    currentPassage: string | null
  }
  onSuccess: (shouldPromptQc: boolean) => void
}

/**
 * Parse vial_per_spec like "1×10^6" to get the cell count per vial
 */
function parseVialSpec(spec: string): number | null {
  if (!spec || !spec.trim()) return null
  // Match patterns like "1×10^6", "1x10^6", "2*10^6", etc.
  const patterns = [
    /(\d+)\s*[×xX*]\s*10\^(\d+)/,      // 1×10^6
    /(\d+)\s*[×xX*]\s*10\{(\d+)\}/,      // 1×10{6}
    /(\d+(?:\.\d+)?)\s*e\s*([+-]?\d+)/,  // 1e6 or 1.5e6
  ]
  for (const pattern of patterns) {
    const match = spec.trim().match(pattern)
    if (match) {
      return parseFloat(match[1]) * Math.pow(10, parseInt(match[2]))
    }
  }
  // Try plain number
  const plain = parseFloat(spec)
  return isNaN(plain) ? null : plain
}

// ============================================
// Harvest Form
// ============================================

export function HarvestForm({ task, batch, onSuccess }: HarvestFormProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [totalCells, setTotalCells] = useState<string>(
    task.formData?.total_cells?.toString() ?? ''
  )
  const [viability, setViability] = useState<string>(
    task.formData?.viability?.toString() ?? ''
  )
  const [vialPerSpec, setVialPerSpec] = useState<string>(
    task.formData?.vial_per_spec ?? '1×10^6'
  )
  const [cryoprotectant, setCryoprotectant] = useState<string>(
    task.formData?.cryoprotectant ?? ''
  )
  const [storageLocation, setStorageLocation] = useState<string>(
    task.formData?.storage_location ?? ''
  )
  const [notes, setNotes] = useState<string>(
    task.formData?.notes ?? task.notes ?? ''
  )

  // Auto-calculate total vials
  const totalVials = useMemo(() => {
    const cells = Number(totalCells)
    const specCells = parseVialSpec(vialPerSpec)
    if (!cells || !specCells || specCells <= 0) return null
    return Math.floor(cells / specCells)
  }, [totalCells, vialPerSpec])

  const handleSubmit = async () => {
    // 前端校验
    if (!totalCells || Number(totalCells) <= 0) {
      toast.error('请填写有效的总细胞数')
      return
    }
    if (!viability || Number(viability) < 0 || Number(viability) > 100) {
      toast.error('请填写有效的存活率（0~100）')
      return
    }
    if (!vialPerSpec.trim()) {
      toast.error('请填写每支规格')
      return
    }
    if (!storageLocation.trim()) {
      toast.error('请填写存储位置')
      return
    }

    setSaving(true)
    try {
      const formData = {
        total_cells: Number(totalCells),
        viability: Number(viability),
        vial_per_spec: vialPerSpec.trim(),
        total_vials: totalVials,
        cryoprotectant: cryoprotectant.trim(),
        storage_location: storageLocation.trim(),
        operator_name: user?.name ?? '',
        notes,
      }

      const res = await fetch(
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

      toast.success('收获冻存记录已保存')
      onSuccess(true) // shouldPromptQc = true
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
          <Snowflake className="h-4 w-4 text-primary" />
          收获冻存记录
          {isCompleted && (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-2">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              已完成
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Header Info */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">批次编号</Label>
            <p className="text-sm font-mono font-medium">{batch.batchNo}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">当前代次</Label>
            <Badge variant="secondary" className="font-mono">
              {batch.currentPassage ?? '-'}
            </Badge>
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
            <Label htmlFor="total-cells">
              总细胞数 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="total-cells"
              type="number"
              min={1}
              placeholder="如：5000000"
              value={totalCells}
              onChange={(e) => setTotalCells(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="viability">
              存活率 <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="viability"
                type="number"
                min={0}
                max={100}
                step={0.1}
                placeholder="如：95.5"
                value={viability}
                onChange={(e) => setViability(e.target.value)}
                disabled={isCompleted}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vial-per-spec">
              每支规格 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vial-per-spec"
              type="text"
              placeholder='如：1×10^6'
              value={vialPerSpec}
              onChange={(e) => setVialPerSpec(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label>计算支数（自动）</Label>
            <div className="flex items-center h-9 rounded-md border bg-muted/50 px-3">
              {totalVials !== null ? (
                <span className="text-sm font-bold text-primary">
                  {totalVials} 支
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  输入总细胞数和规格后自动计算
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cryoprotectant">冻存液批号</Label>
            <Input
              id="cryoprotectant"
              type="text"
              placeholder="填写冻存液批号（可选）"
              value={cryoprotectant}
              onChange={(e) => setCryoprotectant(e.target.value)}
              disabled={isCompleted}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storage-location">
              存储位置 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="storage-location"
              type="text"
              placeholder="如：液氮罐A区-3号架"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              disabled={isCompleted}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="harvest-notes">备注</Label>
          <Textarea
            id="harvest-notes"
            placeholder="填写备注信息（可选）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={isCompleted}
          />
        </div>

        {/* Actions */}
        {!isCompleted && (
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Snowflake className="mr-2 h-4 w-4" />
              提交完成
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
