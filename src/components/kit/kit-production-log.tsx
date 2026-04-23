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
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  TestTubes,
  Package,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Upload,
  X,
  FileText,
  Clock,
  User,
  Loader2,
  ClipboardEdit,
  Info,
  Image as ImageIcon,
  Eye,
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

interface KitComponentConfig {
  id: string
  name: string
  description: string | null
  sortOrder: number
}

interface ComponentLog {
  id: string           // Use kitComponent config id
  name: string
  description: string
  prepFillingDate: string  // 配制及分装日期
  operator: string
  reviewer: string     // 复核人 (optional)
  status: 'normal' | 'abnormal'
  notes: string
}

interface AssemblyLog {
  date: string
  operator: string
  reviewer: string     // 复核人 (optional)
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
  productCode: string
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

const EMPTY_ASSEMBLY: AssemblyLog = {
  date: '',
  operator: '',
  reviewer: '',
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

  // Product components config (fetched from API)
  const [componentConfigs, setComponentConfigs] = useState<KitComponentConfig[]>([])
  const [componentsLoading, setComponentsLoading] = useState(true)

  // Components production logs
  const [components, setComponents] = useState<ComponentLog[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchFill, setBatchFill] = useState({
    prepFillingDate: '',
    operator: '',
    reviewer: '',
    status: 'normal' as 'normal' | 'abnormal',
  })

  // Assembly
  const [assembly, setAssembly] = useState<AssemblyLog>(EMPTY_ASSEMBLY)

  // Attachments
  const [attachments, setAttachments] = useState<FileInfo[]>([])

  // Track if components have been initialized from saved data or config
  const [componentsInitialized, setComponentsInitialized] = useState(false)

  // Production saved state
  const [productionSaved, setProductionSaved] = useState(false)

  // ============================================
  // Computed
  // ============================================
  const kitProductionTask = tasks.find((t) => t.taskCode === 'KIT_PRODUCTION')
  const hasLegacyTasks = tasks.some((t) => ['PREPARATION', 'DISPENSING'].includes(t.taskCode))

  const isReadOnly =
    readOnly ||
    ['QC_PENDING', 'QC_IN_PROGRESS', 'QC_PASS', 'COA_SUBMITTED', 'RELEASED', 'SCRAPPED', 'TERMINATED'].includes(batch.status)

  const isProductionPhase = batch.status === 'IN_PRODUCTION'

  const defaultOperator = batch.productionOperatorName || ''

  const allStepsComplete =
    components.length > 0 &&
    components.every((c) => c.prepFillingDate && c.operator) &&
    assembly.date &&
    assembly.operator

  const someStepsAbnormal =
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

  // ============================================
  // Fetch product components config
  // ============================================
  const fetchComponentConfigs = useCallback(async () => {
    if (!batch.productCode) {
      setComponentsLoading(false)
      return
    }
    try {
      const res = await authFetch(`/api/kit-components/${batch.productCode}`)
      if (res.ok) {
        const data = await res.json()
        setComponentConfigs(data.components || [])
      }
    } catch {
      // silently fail
    } finally {
      setComponentsLoading(false)
    }
  }, [batch.productCode])

  useEffect(() => {
    fetchTasks()
    fetchComponentConfigs()
  }, [fetchTasks, fetchComponentConfigs])

  // ============================================
  // Initialize components from saved data or product config
  // ============================================
  useEffect(() => {
    if (componentsInitialized) return
    if (loading || componentsLoading) return

    // If task has saved formData with components, use that
    if (kitProductionTask?.formData && typeof kitProductionTask.formData === 'object') {
      const fd = kitProductionTask.formData as Record<string, unknown>
      if (fd.components && Array.isArray(fd.components) && (fd.components as ComponentLog[]).length > 0) {
        setComponents(fd.components as ComponentLog[])
      } else if (componentConfigs.length > 0) {
        // Initialize from product config
        setComponents(
          componentConfigs.map((config) => ({
            id: config.id,
            name: config.name,
            description: config.description || '',
            prepFillingDate: '',
            operator: defaultOperator,
            reviewer: '',
            status: 'normal' as const,
            notes: '',
          }))
        )
      }

      // Load assembly
      if (fd.assembly && typeof fd.assembly === 'object') {
        const asm = fd.assembly as Record<string, unknown>
        setAssembly({
          date: (asm.date as string) || '',
          operator: (asm.operator as string) || defaultOperator,
          reviewer: (asm.reviewer as string) || '',
          status: ((asm.status as string) || 'normal') as 'normal' | 'abnormal',
          notes: (asm.notes as string) || '',
        })
      }

      // Load attachments
      if (fd.attachments && Array.isArray(fd.attachments)) {
        setAttachments(fd.attachments as FileInfo[])
      }
    } else if (componentConfigs.length > 0) {
      // No saved data yet — initialize from product config
      setComponents(
        componentConfigs.map((config) => ({
          id: config.id,
          name: config.name,
          description: config.description || '',
          prepFillingDate: '',
          operator: defaultOperator,
          reviewer: '',
          status: 'normal' as const,
          notes: '',
        }))
      )
    }

    // Initialize assembly operator from batch default
    setAssembly((prev) => {
      if (prev.operator) return prev
      return { ...prev, operator: defaultOperator }
    })

    if (kitProductionTask?.status === 'COMPLETED') {
      setProductionSaved(true)
    }

    setComponentsInitialized(true)
  }, [
    loading,
    componentsLoading,
    componentConfigs,
    kitProductionTask,
    componentsInitialized,
    defaultOperator,
  ])

  // ============================================
  // Component management
  // ============================================
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
        ...(batchFill.prepFillingDate && { prepFillingDate: batchFill.prepFillingDate }),
        ...(batchFill.operator && { operator: batchFill.operator }),
        ...(batchFill.reviewer && { reviewer: batchFill.reviewer }),
        ...(batchFill.status && { status: batchFill.status }),
      }
    })
    setComponents(updated)
    setSelectedIds(new Set())
    setBatchFill({ prepFillingDate: '', operator: '', reviewer: '', status: 'normal' })
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
      toast.error('该产品未配置组分，无法完成生产')
      return
    }
    if (!components.every((c) => c.prepFillingDate && c.operator)) {
      toast.error('请填写所有组分的配制及分装日期和操作员')
      return
    }
    if (!assembly.date || !assembly.operator) {
      toast.error('请填写组装日期和操作员')
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
  if (loading || componentsLoading) {
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
      {/* Production Steps Section */}
      {/* ============================================ */}
      {kitProductionTask && (
        <>
          {/* Components Production Records */}
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
                {isReadOnly && kitProductionTask.status === 'COMPLETED' && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    已完成
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Batch fill toolbar */}
              {selectedIds.size > 0 && !isReadOnly && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-primary/20 flex-wrap">
                  <ClipboardEdit className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-medium text-primary">
                    已选 {selectedIds.size} 项 — 批量填写：
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[11px] text-muted-foreground whitespace-nowrap">配制及分装日期</Label>
                    <Input
                      type="date"
                      value={batchFill.prepFillingDate}
                      onChange={(e) => setBatchFill({ ...batchFill, prepFillingDate: e.target.value })}
                      className="h-7 w-32 text-xs"
                    />
                  </div>
                  <Input
                    value={batchFill.operator}
                    onChange={(e) => setBatchFill({ ...batchFill, operator: e.target.value })}
                    placeholder="操作员"
                    className="h-7 w-24 text-xs"
                  />
                  <Input
                    value={batchFill.reviewer}
                    onChange={(e) => setBatchFill({ ...batchFill, reviewer: e.target.value })}
                    placeholder="复核人"
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
                  <p>该产品尚未配置组分</p>
                  <p className="text-xs mt-1">请在产品管理中配置试剂盒组分</p>
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
                          {/* Header: name + description + status */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground">
                              {index + 1}.
                            </span>
                            <span className="text-sm font-medium">{comp.name}</span>
                            {comp.description && (
                              <span className="text-xs text-muted-foreground">— {comp.description}</span>
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
                          </div>

                          {/* Fields */}
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">
                                <Clock className="inline h-2.5 w-2.5 mr-0.5" />
                                配制及分装日期
                              </Label>
                              {isReadOnly ? (
                                <p className="text-sm">{comp.prepFillingDate || '-'}</p>
                              ) : (
                                <Input
                                  type="date"
                                  value={comp.prepFillingDate}
                                  onChange={(e) => handleUpdateComponent(comp.id, 'prepFillingDate', e.target.value)}
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
                              <Label className="text-[11px] text-muted-foreground">
                                <Eye className="inline h-2.5 w-2.5 mr-0.5" />
                                复核人
                              </Label>
                              {isReadOnly ? (
                                <p className="text-sm">{comp.reviewer || '-'}</p>
                              ) : (
                                <Input
                                  value={comp.reviewer}
                                  onChange={(e) => handleUpdateComponent(comp.id, 'reviewer', e.target.value)}
                                  placeholder="复核人（可选）"
                                  className="h-8 text-sm"
                                />
                              )}
                            </div>
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-3 flex-wrap">
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  <Label className="text-xs text-muted-foreground">
                    <Eye className="inline h-3 w-3 mr-1" />
                    复核人
                  </Label>
                  {isReadOnly ? (
                    <p className="text-sm">{assembly.reviewer || '-'}</p>
                  ) : (
                    <Input
                      value={assembly.reviewer}
                      onChange={(e) => setAssembly({ ...assembly, reviewer: e.target.value })}
                      placeholder="复核人（可选）"
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
                      key={`${file.name}-${file.uploadedAt}-${index}`}
                      className="flex items-center gap-2 p-2 rounded-md border text-sm"
                    >
                      {getFileIcon(file.type)}
                      <span className="flex-1 min-w-0 truncate text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(file.uploadedAt)}
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
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-10 border-dashed"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    上传附件
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ============================================ */}
          {/* Action Buttons */}
          {/* ============================================ */}
          {!isReadOnly && isProductionPhase && (
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleSaveProduction}
                disabled={saving || productionSaved}
                size="sm"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {productionSaved ? '已保存' : '保存记录'}
              </Button>
              <Button
                onClick={handleCompleteProduction}
                disabled={completing || !allStepsComplete}
                size="sm"
              >
                {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                完成生产
              </Button>
              {someStepsAbnormal && (
                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  部分步骤有异常
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
