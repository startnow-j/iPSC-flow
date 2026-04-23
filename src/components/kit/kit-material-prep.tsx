'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PackageOpen,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Loader2,
  Bell,
  Info,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface MaterialPrepData {
  date: string
  status: 'normal' | 'abnormal'
  notes: string
}

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
  notes: string | null
  actualStart: string | null
  actualEnd: string | null
}

interface KitMaterialPrepProps {
  batchId: string
  batch: {
    batchNo: string
    productName: string
    specification: string | null
    plannedQuantity: number | null
    unit: string | null
    status: string
    productionOperatorName: string | null
    qcOperatorName: string | null
    productCode: string
    notes: string | null
  }
  onBatchUpdated?: () => void
}

// ============================================
// Constants
// ============================================

const EMPTY_MATERIAL_PREP: MaterialPrepData = {
  date: '',
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

export function KitMaterialPrep({
  batchId,
  batch,
  onBatchUpdated,
}: KitMaterialPrepProps) {
  const { user } = useAuthStore()

  // ============================================
  // State
  // ============================================
  const [tasks, setTasks] = useState<ProductionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notifying, setNotifying] = useState(false)

  // Material prep form data
  const [materialPrep, setMaterialPrep] = useState<MaterialPrepData>(EMPTY_MATERIAL_PREP)

  // ============================================
  // Computed
  // ============================================
  const materialPrepTask = tasks.find((t) => t.taskCode === 'MATERIAL_PREP')

  const isMaterialPrepPhase = batch.status === 'MATERIAL_PREP'
  const isPostMaterialPrep = !isMaterialPrepPhase && batch.status !== 'NEW'
  const isNewBatch = batch.status === 'NEW'

  // Material prep is considered completed when the task status is COMPLETED
  // OR the batch has moved past the MATERIAL_PREP phase
  const materialPrepCompleted =
    materialPrepTask?.status === 'COMPLETED' || isPostMaterialPrep

  // Read-only: true when the batch is NOT in MATERIAL_PREP phase
  const isReadOnly = !isMaterialPrepPhase

  // Check if current user is the assigned operator
  const isAssignedOperator =
    user?.id && materialPrepTask?.assigneeId === user.id

  // Can show action buttons: MATERIAL_PREP phase and user is the assigned operator
  const canAct = isMaterialPrepPhase && !isReadOnly && isAssignedOperator

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

  // Load task formData into state
  useEffect(() => {
    if (tasks.length === 0) return

    if (materialPrepTask?.formData && typeof materialPrepTask.formData === 'object') {
      const fd = materialPrepTask.formData as Record<string, unknown>
      setMaterialPrep({
        date: (fd.date as string) || '',
        status: ((fd.status as string) || 'normal') as 'normal' | 'abnormal',
        notes: (fd.notes as string) || '',
      })
    }
  }, [tasks, materialPrepTask])

  // ============================================
  // Notify Supervisor
  // ============================================
  const handleNotifySupervisor = async () => {
    setNotifying(true)
    try {
      const res = await authFetch(`/api/batches/${batchId}/material-prep/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || '通知发送失败')
        return
      }
      const data = await res.json()
      toast.success(data.message || '已通知主管，请等待审核')
    } catch {
      toast.error('网络错误')
    } finally {
      setNotifying(false)
    }
  }

  // ============================================
  // Complete Material Prep (save + transition)
  // ============================================
  const handleCompleteMaterialPrep = async () => {
    if (!materialPrepTask) {
      toast.error('未找到物料准备任务')
      return
    }
    if (!materialPrep.date) {
      toast.error('请填写领料日期')
      return
    }

    setSaving(true)
    try {
      // 1. Save material prep data and mark task as COMPLETED
      const saveRes = await authFetch(
        `/api/batches/${batchId}/tasks/${materialPrepTask.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData: materialPrep,
            status: 'COMPLETED',
          }),
        }
      )

      if (!saveRes.ok) {
        const data = await saveRes.json()
        toast.error(data.error || '保存物料准备数据失败')
        return
      }

      // 2. Trigger start_production transition (MATERIAL_PREP → IN_PRODUCTION)
      const transRes = await authFetch(`/api/batches/${batchId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_production' }),
      })

      if (!transRes.ok) {
        const data = await transRes.json()
        toast.error(data.error || '启动生产失败')
        return
      }

      toast.success('物料准备已完成，生产已启动')
      onBatchUpdated?.()
    } catch {
      toast.error('网络错误')
    } finally {
      setSaving(false)
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
      </div>
    )
  }

  // ============================================
  // NEW batch — not yet in material prep phase
  // ============================================
  if (isNewBatch) {
    return (
      <div className="space-y-5">
        {/* Production Order Header */}
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
            </div>
          </CardContent>
        </Card>

        {/* Waiting state */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Info className="h-8 w-8 text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">等待开始物料准备</h3>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              该批次尚未进入物料准备阶段，请先由主管启动物料准备流程。
            </p>
          </CardContent>
        </Card>
      </div>
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
            {batch.productCode && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">产品编码</p>
                <p className="font-mono font-medium text-xs">{batch.productCode}</p>
              </div>
            )}
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
      {/* Material Prep Task Card */}
      {/* ============================================ */}
      {materialPrepTask ? (
        <Card className={materialPrepCompleted ? 'border-emerald/20 bg-emerald/5' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                物料准备
                {materialPrepCompleted && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    已完成
                  </Badge>
                )}
                {!materialPrepCompleted && isMaterialPrepPhase && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs"
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    进行中
                  </Badge>
                )}
              </CardTitle>

              {/* Notify supervisor button — shown during MATERIAL_PREP phase */}
              {isMaterialPrepPhase && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNotifySupervisor}
                  disabled={notifying}
                  className="h-8 text-xs gap-1.5"
                >
                  {notifying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" />
                  )}
                  通知主管
                </Button>
              )}
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
                {isReadOnly ? (
                  <p className="text-sm">
                    {materialPrep.date || '-'}
                  </p>
                ) : (
                  <Input
                    type="date"
                    value={materialPrep.date}
                    onChange={(e) =>
                      setMaterialPrep({ ...materialPrep, date: e.target.value })
                    }
                    disabled={materialPrepCompleted}
                    className="h-9"
                  />
                )}
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">领料状态</Label>
                {isReadOnly ? (
                  <p className="text-sm">
                    {materialPrep.status === 'abnormal' ? (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs"
                      >
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        有异常
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        正常
                      </Badge>
                    )}
                  </p>
                ) : (
                  <StatusToggle
                    value={materialPrep.status}
                    onChange={(v) =>
                      setMaterialPrep({ ...materialPrep, status: v })
                    }
                    disabled={materialPrepCompleted}
                  />
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5 sm:col-span-3 sm:col-span-1">
                <Label className="text-xs text-muted-foreground">备注</Label>
                {isReadOnly ? (
                  <p className="text-sm text-muted-foreground">
                    {materialPrep.notes || '-'}
                  </p>
                ) : (
                  <Input
                    value={materialPrep.notes}
                    onChange={(e) =>
                      setMaterialPrep({ ...materialPrep, notes: e.target.value })
                    }
                    placeholder="物料情况说明（可选）"
                    disabled={materialPrepCompleted}
                    className="h-9"
                  />
                )}
              </div>
            </div>

            {/* Abnormal notes — expanded textarea when abnormal */}
            {materialPrep.status === 'abnormal' && !isReadOnly && !materialPrepCompleted && (
              <div className="space-y-1.5">
                <Label className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                  异常说明
                </Label>
                <Textarea
                  value={materialPrep.notes}
                  onChange={(e) =>
                    setMaterialPrep({ ...materialPrep, notes: e.target.value })
                  }
                  placeholder="请描述物料异常情况（如缺料、规格不符等）..."
                  rows={3}
                  className="text-sm"
                />
              </div>
            )}

            {/* Read-only: show abnormal notes if present */}
            {isReadOnly && materialPrep.status === 'abnormal' && materialPrep.notes && (
              <div className="space-y-1.5">
                <Label className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                  异常说明
                </Label>
                <p className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/20 rounded-md px-3 py-2">
                  {materialPrep.notes}
                </p>
              </div>
            )}

            <Separator />

            {/* Action buttons */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Left: status summary */}
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                {materialPrepCompleted ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    物料准备已完成
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5" />
                    待填写领料信息并完成备料
                  </>
                )}
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-2">
                {/* Complete button: only show during MATERIAL_PREP for assigned operator */}
                {canAct && !materialPrepCompleted && (
                  <Button
                    onClick={handleCompleteMaterialPrep}
                    disabled={saving || !materialPrep.date}
                    size="sm"
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Package className="mr-1.5 h-4 w-4" />
                    完成备料
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* No material prep task found */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Info className="h-8 w-8 text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">
              {isPostMaterialPrep ? '物料准备已跳过' : '物料准备任务未创建'}
            </h3>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              {isPostMaterialPrep
                ? '该批次可能已通过其他方式进入生产阶段。'
                : '请先由主管启动物料准备流程以创建相应任务。'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
