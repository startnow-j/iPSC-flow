'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  PackageOpen,
  TestTubes,
  Package,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Upload,
  X,
  FileText,
  Clock,
  User,
  Loader2,
  ClipboardEdit,
  Info,
  Image as ImageIcon,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface ProductionTask {
  id: string
  batchId: string
  batchNo: string
  taskCode: string
  taskName: string
  sequenceNo: number
  status: string
  assigneeId: string | null
  assigneeName: string | null
  formData: Record<string, unknown> | null
  attachments: unknown[] | null
  notes: string | null
  actualStart: string | null
  actualEnd: string | null
  createdAt: string
  updatedAt: string
}

interface ComponentLog {
  id: string
  name: string
  date: string
  operator: string
  status: 'normal' | 'abnormal'
  notes: string
}

interface AssemblyLog {
  date: string
  operator: string
  status: 'normal' | 'abnormal'
  notes: string
}

interface MaterialPrepLog {
  date: string
  status: 'normal' | 'abnormal'
  notes: string
}

interface FileInfo {
  name: string
  size: number
  type: string
  uploadedAt: string
}

interface BatchInfo {
  id: string
  batchNo: string
  productName: string
  specification: string | null
  plannedQuantity: number | null
  unit: string | null
  status: string
  productionOperatorName: string | null
  qcOperatorName: string | null
  notes: string | null
}

interface KitProductionLogProps {
  batchId: string
  batch: BatchInfo
  onBatchUpdated?: () => void
  readOnly?: boolean
}

// ============================================
// Helpers
// ============================================

function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />
  if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />
  return <FileText className="h-4 w-4 text-muted-foreground" />
}

const EMPTY_MATERIAL_PREP: MaterialPrepLog = {
  date: '',
  status: 'normal',
  notes: '',
}

const EMPTY_ASSEMBLY: AssemblyLog = {
  date: '',
  operator: '',
  status: 'normal',
  notes: '',
}

// ============================================
// Status Toggle Component
// ============================================

function StatusToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: 'normal' | 'abnormal'
  onChange: (v: 'normal' | 'abnormal') => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('normal')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          value === 'normal'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        正常
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('abnormal')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          value === 'abnormal'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        有异常
      </button>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function KitProductionLog({
  batchId,
  batch,
  onBatchUpdated,
  readOnly = false,
}: KitProductionLogProps) {
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ============================================
  // State
  // ============================================
  const [tasks, setTasks] = useState<ProductionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Material prep
  const [materialPrep, setMaterialPrep] = useState<MaterialPrepLog>(EMPTY_MATERIAL_PREP)
  const [materialPrepCompleted, setMaterialPrepCompleted] = useState(false)

  // Components
  const [components, setComponents] = useState<ComponentLog[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchFill, setBatchFill] = useState({ date: '', operator: '', status: 'normal' as 'normal' | 'abnormal' })

  // Assembly
  const [assembly, setAssembly] = useState<AssemblyLog>(EMPTY_ASSEMBLY)

  // Attachments
  const [attachments, setAttachments] = useState<FileInfo[]>([])

  // New component input
  const [newComponentName, setNewComponentName] = useState('')
  const [showAddInput, setShowAddInput] = useState(false)

  // Production saved state
  const [productionSaved, setProductionSaved] = useState(false)

  // ============================================
  // Computed
  // ============================================
  const materialPrepTask = tasks.find((t) => t.taskCode === 'MATERIAL_PREP')
  const kitProductionTask = tasks.find((t) => t.taskCode === 'KIT_PRODUCTION')
  const hasLegacyTasks = tasks.some((t) => ['PREPARATION', 'DISPENSING'].includes(t.taskCode))

  const isReadOnly =
    readOnly ||
    ['QC_PENDING', 'QC_IN_PROGRESS', 'QC_PASS', 'COA_SUBMITTED', 'RELEASED', 'SCRAPPED', 'TERMINATED'].includes(batch.status)

  const isMaterialPrepPhase = batch.status === 'MATERIAL_PREP'
  const isProductionPhase = batch.status === 'IN_PRODUCTION'

  const allStepsComplete =
    materialPrepCompleted &&
    components.length > 0 &&
    components.every((c) => c.date && c.operator) &&
    assembly.date &&
    assembly.operator

  const someStepsAbnormal =
    materialPrep.status === 'abnormal' ||
    components.some((c) => c.status === 'abnormal') ||
    assembly.status === 'abnormal'

  // ============================================
  // Fetch tasks
  // ============================================
  const fetchTasks = useCallback(async () => {
    try {
      const res = await authFetch(`/api/batches/${batchId}/tasks`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [batchId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Load task data into state
  useEffect(() => {
    if (tasks.length === 0) return

    // Material prep
    if (materialPrepTask?.formData && typeof materialPrepTask.formData === 'object') {
      const fd = materialPrepTask.formData as Record<string, unknown>
      setMaterialPrep({
        date: (fd.date as string) || '',
        status: ((fd.status as string) || 'normal') as 'normal' | 'abnormal',
        notes: (fd.notes as string) || '',
      })
      setMaterialPrepCompleted(materialPrepTask.status === 'COMPLETED')
    }

    // Production
    if (kitProductionTask?.formData && typeof kitProductionTask.formData === 'object') {
      const fd = kitProductionTask.formData as Record<string, unknown>
      if (fd.components && Array.isArray(fd.components)) {
        setComponents(fd.components as ComponentLog[])
      }
      if (fd.assembly && typeof fd.assembly === 'object') {
        const asm = fd.assembly as Record<string, unknown>
        setAssembly({
          date: (asm.date as string) || '',
          operator: (asm.operator as string) || '',
          status: ((asm.status as string) || 'normal') as 'normal' | 'abnormal',
          notes: (asm.notes as string) || '',
        })
      }
      if (fd.attachments && Array.isArray(fd.attachments)) {
        setAttachments(fd.attachments as FileInfo[])
      }
    }

    if (kitProductionTask?.status === 'COMPLETED') {
      setProductionSaved(true)
    }
  }, [tasks, materialPrepTask, kitProductionTask])

  // ============================================
  // Save Material Prep
  // ============================================
  const handleSaveMaterialPrep = async () => {
    if (!materialPrepTask) return
    setSaving(true)
    try {
      const res = await authFetch(`/api/batches/${batchId}/tasks/${materialPrepTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: materialPrep,
          status: 'COMPLETED',
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || '保存失败')
        return
      }
      setMaterialPrepCompleted(true)
      toast.success('物料准备已完成')
      onBatchUpdated?.()
    } catch {
      toast.error('网络错误')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // Component management
  // ============================================
  const handleAddComponent = () => {
    const name = newComponentName.trim()
    if (!name) {
      toast.error('请输入组分名称')
      return
    }
    const newComp: ComponentLog = {
      id: generateId(),
      name,
      date: '',
      operator: '',
      status: 'normal',
      notes: '',
    }
    setComponents((prev) => [...prev, newComp])
    setNewComponentName('')
    setShowAddInput(false)
  }

  const handleRemoveComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleUpdateComponent = (id: string, field: keyof ComponentLog, value: string) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    )
    setProductionSaved(false)
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === components.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(components.map((c) => c.id)))
    }
  }

  const handleBatchFill = () => {
    if (selectedIds.size === 0) return
    const updated = components.map((c) => {
      if (!selectedIds.has(c.id)) return c
      return {
        ...c,
        ...(batchFill.date && { date: batchFill.date }),
        ...(batchFill.operator && { operator: batchFill.operator }),
        ...(batchFill.status && { status: batchFill.status }),
      }
    })
    setComponents(updated)
    setSelectedIds(new Set())
    setBatchFill({ date: '', operator: '', status: 'normal' })
    setProductionSaved(false)
    toast.success(`已更新 ${selectedIds.size} 个组分`)
  }

  // ============================================
  // Attachments
  // ============================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles: FileInfo[] = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      uploadedAt: new Date().toISOString(),
    }))

    setAttachments((prev) => [...prev, ...newFiles])
    setProductionSaved(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
    setProductionSaved(false)
  }

  // ============================================
  // Save Production Data
  // ============================================
  const handleSaveProduction = async () => {
    if (!kitProductionTask) return
    setSaving(true)
    try {
      const res = await authFetch(`/api/batches/${batchId}/tasks/${kitProductionTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: {
            components,
            assembly,
            attachments,
          },
          status: kitProductionTask.status === 'PENDING' ? 'IN_PROGRESS' : kitProductionTask.status,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || '保存失败')
        return
      }
      setProductionSaved(true)
      toast.success('生产记录已保存')
      fetchTasks()
    } catch {
      toast.error('网络错误')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // Complete Production (save + transition)
  // ============================================
  const handleCompleteProduction = async () => {
    // Validate
    if (components.length === 0) {
      toast.error('请至少添加一个组分')
      return
    }
    if (!components.every((c) => c.date && c.operator)) {
      toast.error('请填写所有组分的日期和操作员')
      return
    }
    if (!assembly.date || !assembly.operator) {
      toast.error('请填写组装信息')
      return
    }

    if (!kitProductionTask) return
    setCompleting(true)
    try {
      // 1. Save final data + mark task COMPLETED
      const saveRes = await authFetch(`/api/batches/${batchId}/tasks/${kitProductionTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: { components, assembly, attachments },
          status: 'COMPLETED',
        }),
      })
      if (!saveRes.ok) {
        const data = await saveRes.json()
        toast.error(data.error || '保存失败')
        return
      }

      // 2. Call complete_production transition
      const transRes = await authFetch(`/api/batches/${batchId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_production' }),
      })
      if (!transRes.ok) {
        const data = await transRes.json()
        toast.error(data.error || '提交质检失败')
        return
      }

      toast.success('生产已完成，已提交质检')
      onBatchUpdated?.()
    } catch {
      toast.error('网络错误')
    } finally {
      setCompleting(false)
    }
  }

  // ============================================
  // Loading state
  // ============================================
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  // ============================================
  // Legacy tasks fallback
  // ============================================
  if (hasLegacyTasks && !kitProductionTask) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Info className="h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="text-sm font-medium mb-1">旧版生产任务</h3>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            该批次使用旧版任务格式，请在通用任务列表中查看。
          </p>
        </CardContent>
      </Card>
    )
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="space-y-5">
      {/* ============================================ */}
      {/* Production Order Header */}
      {/* ============================================ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PackageOpen className="h-4 w-4 text-primary" />
            生产指令单
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">批次号</p>
              <p className="font-mono font-medium">{batch.batchNo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">产品名称</p>
              <p className="font-medium">{batch.productName}</p>
            </div>
            {batch.specification && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">规格</p>
                <p className="font-medium">{batch.specification}</p>
              </div>
            )}
            {batch.plannedQuantity != null && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">计划数量</p>
                <p className="font-medium">
                  {batch.plannedQuantity} {batch.unit || '盒'}
                </p>
              </div>
            )}
            {batch.productionOperatorName && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">操作员</p>
                <p className="font-medium">{batch.productionOperatorName}</p>
              </div>
            )}
            {batch.qcOperatorName && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">质检员</p>
                <p className="font-medium">{batch.qcOperatorName}</p>
              </div>
            )}
          </div>
          {batch.notes && (
            <p className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
              备注: {batch.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Material Prep Section */}
      {/* ============================================ */}
      {materialPrepTask && (
        <Card className={materialPrepCompleted ? 'border-emerald/20 bg-emerald/5' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                物料准备
                {materialPrepCompleted && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    已完成
                  </Badge>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  <Clock className="inline h-3 w-3 mr-1" />
                  领料日期
                </Label>
                <Input
                  type="date"
                  value={materialPrep.date}
                  onChange={(e) => setMaterialPrep({ ...materialPrep, date: e.target.value })}
                  disabled={isReadOnly || materialPrepCompleted}
                  className="h-9"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">领料状态</Label>
                <StatusToggle
                  value={materialPrep.status}
                  onChange={(v) => setMaterialPrep({ ...materialPrep, status: v })}
                  disabled={isReadOnly || materialPrepCompleted}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5 sm:col-span-3 sm:col-span-1">
                <Label className="text-xs text-muted-foreground">备注</Label>
                <Input
                  value={materialPrep.notes}
                  onChange={(e) => setMaterialPrep({ ...materialPrep, notes: e.target.value })}
                  placeholder="物料情况说明（可选）"
                  disabled={isReadOnly || materialPrepCompleted}
                  className="h-9"
                />
              </div>
            </div>

            {/* Abnormal notes */}
            {materialPrep.status === 'abnormal' && !materialPrepCompleted && (
              <div className="space-y-1.5">
                <Label className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                  异常说明
                </Label>
                <Textarea
                  value={materialPrep.notes}
                  onChange={(e) => setMaterialPrep({ ...materialPrep, notes: e.target.value })}
                  placeholder="请描述物料异常情况（如缺料、规格不符等）..."
                  disabled={isReadOnly || materialPrepCompleted}
                  rows={2}
                  className="text-sm"
                />
              </div>
            )}

            {/* Read-only completed display */}
            {materialPrepCompleted && materialPrep.notes && (
              <p className="text-xs text-muted-foreground">
                备注: {materialPrep.notes}
              </p>
            )}

            {/* Complete button */}
            {!materialPrepCompleted && isMaterialPrepPhase && !isReadOnly && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveMaterialPrep}
                  disabled={saving || !materialPrep.date}
                  size="sm"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  完成备料
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* Production Steps Section (IN_PRODUCTION) */}
      {/* ============================================ */}
      {(isProductionPhase || isReadOnly) && kitProductionTask && (
        <>
          {/* Components */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TestTubes className="h-4 w-4 text-primary" />
                  组分生产记录
                  {components.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {components.length} 个组分
                    </Badge>
                  )}
                </CardTitle>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddInput(true)}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    添加组分
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add component input */}
              {showAddInput && !isReadOnly && (
                <div className="flex gap-2 items-end p-3 rounded-md border border-dashed bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">组分名称</Label>
                    <Input
                      value={newComponentName}
                      onChange={(e) => setNewComponentName(e.target.value)}
                      placeholder="如: 基础培养基、生长因子..."
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComponent()
                        if (e.key === 'Escape') { setShowAddInput(false); setNewComponentName('') }
                      }}
                      autoFocus
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddComponent}
                    disabled={!newComponentName.trim()}
                    className="h-8"
                  >
                    添加
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowAddInput(false); setNewComponentName('') }}
                    className="h-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Batch fill toolbar */}
              {selectedIds.size > 0 && !isReadOnly && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-primary/20 flex-wrap">
                  <ClipboardEdit className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-medium text-primary">
                    已选 {selectedIds.size} 项 — 批量填写：
                  </span>
                  <Input
                    type="date"
                    value={batchFill.date}
                    onChange={(e) => setBatchFill({ ...batchFill, date: e.target.value })}
                    className="h-7 w-36 text-xs"
                  />
                  <Input
                    value={batchFill.operator}
                    onChange={(e) => setBatchFill({ ...batchFill, operator: e.target.value })}
                    placeholder="操作员"
                    className="h-7 w-24 text-xs"
                  />
                  <StatusToggle
                    value={batchFill.status}
                    onChange={(v) => setBatchFill({ ...batchFill, status: v })}
                  />
                  <Button
                    size="sm"
                    onClick={handleBatchFill}
                    className="h-7 text-xs"
                  >
                    应用
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                    className="h-7 text-xs"
                  >
                    取消
                  </Button>
                </div>
              )}

              {/* Component list */}
              {components.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <TestTubes className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>尚未添加组分</p>
                  <p className="text-xs mt-1">点击上方"添加组分"开始记录</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Select all */}
                  {!isReadOnly && components.length > 1 && (
                    <div className="flex items-center gap-2 px-1">
                      <Checkbox
                        checked={selectedIds.size === components.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-xs text-muted-foreground">全选</span>
                    </div>
                  )}

                  {components.map((comp, index) => (
                    <div
                      key={comp.id}
                      className={`rounded-md border p-3 transition-colors ${
                        comp.status === 'abnormal'
                          ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
                          : 'border-border'
                      } ${selectedIds.has(comp.id) ? 'ring-1 ring-primary/30' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        {!isReadOnly && (
                          <Checkbox
                            checked={selectedIds.has(comp.id)}
                            onCheckedChange={() => handleToggleSelect(comp.id)}
                            className="mt-1"
                          />
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Header: name + status + delete */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground">
                              {index + 1}.
                            </span>
                            {isReadOnly ? (
                              <span className="text-sm font-medium">{comp.name}</span>
                            ) : (
                              <Input
                                value={comp.name}
                                onChange={(e) => handleUpdateComponent(comp.id, 'name', e.target.value)}
                                className="h-7 w-40 text-sm font-medium"
                              />
                            )}
                            {isReadOnly && (
                              comp.status === 'abnormal' ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs">
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  有异常
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  正常
                                </Badge>
                              )
                            )}
                            {!isReadOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveComponent(comp.id)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive ml-auto shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>

                          {/* Fields */}
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">
                                <Clock className="inline h-2.5 w-2.5 mr-0.5" />
                                配制日期
                              </Label>
                              {isReadOnly ? (
                                <p className="text-sm">{comp.date || '-'}</p>
                              ) : (
                                <Input
                                  type="date"
                                  value={comp.date}
                                  onChange={(e) => handleUpdateComponent(comp.id, 'date', e.target.value)}
                                  className="h-8 text-sm"
                                />
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">
                                <User className="inline h-2.5 w-2.5 mr-0.5" />
                                操作员
                              </Label>
                              {isReadOnly ? (
                                <p className="text-sm">{comp.operator || '-'}</p>
                              ) : (
                                <Input
                                  value={comp.operator}
                                  onChange={(e) => handleUpdateComponent(comp.id, 'operator', e.target.value)}
                                  placeholder="操作员姓名"
                                  className="h-8 text-sm"
                                />
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">状态</Label>
                              {isReadOnly ? (
                                <p className="text-sm">
                                  {comp.status === 'abnormal' ? '⚠️ 有异常' : '✅ 正常'}
                                </p>
                              ) : (
                                <StatusToggle
                                  value={comp.status}
                                  onChange={(v) => handleUpdateComponent(comp.id, 'status', v)}
                                />
                              )}
                            </div>
                          </div>

                          {/* Notes */}
                          {(isReadOnly && comp.notes) || (!isReadOnly && comp.status === 'abnormal') ? (
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">备注</Label>
                              {isReadOnly ? (
                                <p className="text-xs text-muted-foreground">{comp.notes}</p>
                              ) : (
                                <Textarea
                                  value={comp.notes}
                                  onChange={(e) => handleUpdateComponent(comp.id, 'notes', e.target.value)}
                                  placeholder="异常说明或备注..."
                                  rows={2}
                                  className="text-sm"
                                />
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assembly */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                组装
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    <Clock className="inline h-3 w-3 mr-1" />
                    组装日期
                  </Label>
                  {isReadOnly ? (
                    <p className="text-sm">{assembly.date || '-'}</p>
                  ) : (
                    <Input
                      type="date"
                      value={assembly.date}
                      onChange={(e) => setAssembly({ ...assembly, date: e.target.value })}
                      className="h-9"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    <User className="inline h-3 w-3 mr-1" />
                    操作员
                  </Label>
                  {isReadOnly ? (
                    <p className="text-sm">{assembly.operator || '-'}</p>
                  ) : (
                    <Input
                      value={assembly.operator}
                      onChange={(e) => setAssembly({ ...assembly, operator: e.target.value })}
                      placeholder="操作员姓名"
                      className="h-9"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">组装状态</Label>
                  {isReadOnly ? (
                    <p className="text-sm">
                      {assembly.status === 'abnormal' ? '⚠️ 有异常' : '✅ 正常'}
                    </p>
                  ) : (
                    <StatusToggle
                      value={assembly.status}
                      onChange={(v) => setAssembly({ ...assembly, status: v })}
                    />
                  )}
                </div>
              </div>

              {/* Abnormal notes */}
              {(assembly.status === 'abnormal' || (isReadOnly && assembly.notes)) && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {assembly.status === 'abnormal' && !isReadOnly && (
                      <AlertTriangle className="inline h-3 w-3 mr-1 text-amber-500" />
                    )}
                    备注
                  </Label>
                  {isReadOnly ? (
                    <p className="text-xs text-muted-foreground">{assembly.notes || '-'}</p>
                  ) : (
                    <Textarea
                      value={assembly.notes}
                      onChange={(e) => setAssembly({ ...assembly, notes: e.target.value })}
                      placeholder="组装异常说明或备注..."
                      rows={2}
                      className="text-sm"
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                生产记录附件
                {attachments.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {attachments.length} 份
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Existing files */}
              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 text-sm"
                    >
                      {getFileIcon(file.type)}
                      <span className="flex-1 truncate text-xs">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(index)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload area */}
              {!isReadOnly && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-10 border-dashed gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    上传附件（支持多选）
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    支持 PDF、Word、Excel、图片等格式，记录纸质生产记录原件
                  </p>
                </>
              )}

              {isReadOnly && attachments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">无附件</p>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          {!isReadOnly && isProductionPhase && (
            <div className="flex items-center gap-3 justify-end">
              {!productionSaved && components.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleSaveProduction}
                  disabled={saving}
                  size="sm"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  保存草稿
                </Button>
              )}
              <Button
                onClick={handleCompleteProduction}
                disabled={completing || !allStepsComplete}
                size="sm"
                className={someStepsAbnormal ? '' : ''}
              >
                {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                完成生产并提交质检
              </Button>
              {!allStepsComplete && components.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  请完成所有步骤后提交
                </p>
              )}
            </div>
          )}

          {/* Read-only summary for post-production */}
          {isReadOnly && (batch.status === 'QC_PENDING' || batch.status === 'QC_IN_PROGRESS' || batch.status === 'QC_PASS') && (
            <div className="rounded-md border border-emerald/20 bg-emerald/5 p-4 text-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                生产已完成
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                共 {components.length} 个组分，{attachments.length} 份附件
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty state: before material prep */}
      {!materialPrepTask && !kitProductionTask && !isReadOnly && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PackageOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">等待开始备料</h3>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              请点击页面顶部的"开始备料"按钮开始生产流程
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
