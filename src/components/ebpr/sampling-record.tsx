'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { TestTubes, Plus, Loader2, Clock, User } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface SamplingRecordProps {
  batchId: string
  batchNo: string
  taskId?: string
  onSuccess?: () => void
}

interface QcRecord {
  id: string
  batchId: string
  batchNo: string
  qcType: string
  testResults: any[]
  overallJudgment: string
  operatorName: string | null
  operatedAt: string | null
  createdAt: string
}

// ============================================
// Constants
// ============================================

const TEST_TYPE_OPTIONS = [
  { value: 'MYCOPLASMA', label: '支原体检测' },
  { value: 'KARYOTYPE', label: '核型分析' },
  { value: 'RETENTION', label: '留样' },
  { value: 'OTHER', label: '其他' },
]

const TEST_TYPE_LABELS: Record<string, string> = {
  MYCOPLASMA: '支原体检测',
  KARYOTYPE: '核型分析',
  RETENTION: '留样',
  OTHER: '其他',
}

const JUDGMENT_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PASS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  FAIL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// ============================================
// Helpers
// ============================================

function generateSampleNo(batchNo: string): string {
  const now = new Date()
  const seq = String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0')
  return `QC-${batchNo}-${seq}`
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getDefaultSampleTime(): string {
  const now = new Date()
  // Format: YYYY-MM-DDTHH:MM (for datetime-local input)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// ============================================
// Sampling Record Row
// ============================================

function SamplingRecordRow({ record }: { record: QcRecord }) {
  // Extract sample info from testResults metadata or audit
  const testResults = Array.isArray(record.testResults) ? record.testResults : []
  const firstResult = testResults[0]

  // The testType is stored in the itemCode of the first test result
  // For IN_PROCESS records, we store sample info in the testResults
  const sampleInfo = firstResult?.sampleInfo || {}

  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <TestTubes className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5">
        <div>
          <span className="text-xs text-muted-foreground">检测项</span>
          <p className="font-medium">
            {firstResult?.itemName || sampleInfo.testType
              ? TEST_TYPE_LABELS[firstResult?.itemName || sampleInfo.testType] || sampleInfo.testType || firstResult?.itemName
              : '-'}
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">样本编号</span>
          <p className="font-mono text-xs">{sampleInfo.sampleNo || firstResult?.sampleNo || '-'}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">取样时间</span>
          <p className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            {sampleInfo.sampleTime
              ? formatDateTime(sampleInfo.sampleTime)
              : formatDateTime(record.operatedAt)}
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">取样人</span>
          <p className="flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            {sampleInfo.sampler || record.operatorName || '-'}
          </p>
        </div>
      </div>
      <Badge
        variant="secondary"
        className={`shrink-0 text-[10px] px-2 ${JUDGMENT_STYLES[record.overallJudgment] || ''}`}
      >
        {record.overallJudgment === 'PENDING' ? '等待检测' : record.overallJudgment}
      </Badge>
    </div>
  )
}

// ============================================
// Sampling Form Dialog
// ============================================

function SamplingFormDialog({
  batchId,
  batchNo,
  taskId,
  open,
  onOpenChange,
  onSuccess,
}: {
  batchId: string
  batchNo: string
  taskId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [testType, setTestType] = useState<string>('')
  const [sampleNo, setSampleNo] = useState<string>(generateSampleNo(batchNo))
  const [sampleTime, setSampleTime] = useState<string>(getDefaultSampleTime())
  const [notes, setNotes] = useState<string>('')

  const handleSubmit = async () => {
    if (!testType) {
      toast.error('请选择检测项')
      return
    }
    if (!sampleNo.trim()) {
      toast.error('请填写样本编号')
      return
    }
    if (!sampleTime) {
      toast.error('请选择取样时间')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        qcType: 'IN_PROCESS',
        taskId: taskId || null,
        testResults: [],
        sampleInfo: {
          testType,
          sampleNo: sampleNo.trim(),
          sampleTime: new Date(sampleTime).toISOString(),
          sampler: user?.name || '',
        },
      }

      const res = await authFetch(`/api/batches/${batchId}/qc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '创建采样记录失败')
        return
      }

      toast.success('采样记录已创建')
      onOpenChange(false)

      // Reset form
      setTestType('')
      setSampleNo(generateSampleNo(batchNo))
      setSampleTime(getDefaultSampleTime())
      setNotes('')

      onSuccess()
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTubes className="h-5 w-5 text-primary" />
            新增采样记录
          </DialogTitle>
          <DialogDescription>
            为批次 {batchNo} 添加过程采样记录，实际检测结果由质检人员后续填写。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="test-type">
              检测项 <span className="text-destructive">*</span>
            </Label>
            <Select value={testType} onValueChange={setTestType}>
              <SelectTrigger id="test-type">
                <SelectValue placeholder="选择检测项" />
              </SelectTrigger>
              <SelectContent>
                {TEST_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sample-no">
              样本编号 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sample-no"
              type="text"
              value={sampleNo}
              onChange={(e) => setSampleNo(e.target.value)}
              placeholder="如：QC-IPSC-260410-001-001"
            />
            <p className="text-xs text-muted-foreground">
              自动生成，可根据需要修改
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sample-time">
              取样时间 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sample-time"
              type="datetime-local"
              value={sampleTime}
              onChange={(e) => setSampleTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">取样人</Label>
            <Input
              value={user?.name || ''}
              disabled
              className="bg-muted w-fit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sample-notes">备注</Label>
            <Textarea
              id="sample-notes"
              placeholder="填写备注信息（可选）"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Plus className="mr-2 h-4 w-4" />
            添加采样记录
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Main Sampling Record Component
// ============================================

export function SamplingRecord({
  batchId,
  batchNo,
  taskId,
  onSuccess,
}: SamplingRecordProps) {
  const [records, setRecords] = useState<QcRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchRecords = useCallback(async () => {
    try {
      const res = await authFetch(
        `/api/batches/${batchId}/qc?qcType=IN_PROCESS`
      )
      if (res.ok) {
        const data = await res.json()
        setRecords(data.qcRecords || [])
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [batchId])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleSuccess = () => {
    fetchRecords()
    onSuccess?.()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TestTubes className="h-4 w-4 text-primary" />
              采样记录
              {records.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {records.length} 条记录
                </Badge>
              )}
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  添加采样
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Loading */}
          {loading && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
              <TestTubes className="h-8 w-8 mb-2 text-muted-foreground/50" />
              <p>暂无采样记录</p>
              <p className="text-xs mt-1">点击上方按钮添加过程采样</p>
            </div>
          )}

          {/* Records List */}
          {!loading && records.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {records.map((record) => (
                <SamplingRecordRow key={record.id} record={record} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <SamplingFormDialog
        batchId={batchId}
        batchNo={batchNo}
        taskId={taskId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
