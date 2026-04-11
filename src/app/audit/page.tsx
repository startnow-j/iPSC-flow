'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { useAuthStore } from '@/stores/auth-store'
import { hasAnyRole } from '@/lib/roles'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileText,
} from 'lucide-react'

interface AuditLogItem {
  id: string
  eventType: string
  eventLabel: string
  targetType: string
  targetId: string
  targetBatchNo: string | null
  operatorId: string | null
  operatorName: string | null
  inputMode: string
  createdAt: string
}

const EVENT_TYPE_OPTIONS = [
  { value: '', label: '全部事件' },
  { value: 'BATCH_CREATED', label: '创建批次' },
  { value: 'BATCH_UPDATED', label: '更新批次信息' },
  { value: 'BATCH_STATUS_CHANGED', label: '批次状态变更' },
  { value: 'BATCH_SCRAPPED', label: '批次报废' },
  { value: 'BATCH_RELEASED', label: '批次放行' },
  { value: 'TASK_CREATED', label: '创建生产任务' },
  { value: 'TASK_STARTED', label: '开始执行任务' },
  { value: 'TASK_COMPLETED', label: '完成任务' },
  { value: 'TASK_UPDATED', label: '更新任务数据' },
  { value: 'QC_RECORD_CREATED', label: '创建质检记录' },
  { value: 'QC_RECORD_UPDATED', label: '更新质检记录' },
  { value: 'QC_STARTED', label: '开始质检' },
  { value: 'QC_COMPLETED', label: '完成质检' },
  { value: 'COA_GENERATED', label: '生成CoA' },
  { value: 'COA_SUBMITTED', label: '提交CoA审核' },
  { value: 'COA_APPROVED', label: 'CoA审核通过' },
  { value: 'COA_REJECTED', label: 'CoA审核退回' },
  { value: 'COA_RESUBMITTED', label: '重新提交CoA' },
]

const TARGET_TYPE_LABELS: Record<string, string> = {
  BATCH: '批次',
  TASK: '任务',
  QC: '质检',
  COA: 'CoA',
  USER: '用户',
}

const TARGET_TYPE_COLORS: Record<string, string> = {
  BATCH: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  TASK: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  QC: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  COA: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  USER: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

const INPUT_MODE_LABELS: Record<string, string> = {
  FORM_SUBMIT: '表单',
  AI_CONVERSATION: 'AI对话',
}

const INPUT_MODE_COLORS: Record<string, string> = {
  FORM_SUBMIT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  AI_CONVERSATION: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
}

export default function AuditPage() {
  const { user } = useAuthStore()
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [batchNoFilter, setBatchNoFilter] = useState('')
  const [batchNoInput, setBatchNoInput] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      if (eventTypeFilter) params.set('eventType', eventTypeFilter)
      if (batchNoFilter) params.set('batchNo', batchNoFilter)

      const res = await authFetch(`/api/audit?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotal(data.total || 0)
      } else {
        const data = await res.json()
        toast.error(data.error || '获取审计日志失败')
      }
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, eventTypeFilter, batchNoFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [eventTypeFilter, batchNoFilter])

  const handleSearch = () => {
    setBatchNoFilter(batchNoInput)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Access control: only ADMIN and SUPERVISOR
  const userRoles = user?.roles || [user?.role || 'OPERATOR']
  if (!user || !hasAnyRole(userRoles, ['ADMIN', 'SUPERVISOR'])) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">无权限</h2>
        <p className="text-sm text-muted-foreground">
          仅管理员和生产主管可访问审计日志页面
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">审计日志</h1>
        <p className="text-sm text-muted-foreground">
          查看系统操作记录和变更历史
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          {/* Event Type Filter */}
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="事件类型" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Batch No Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索批次号..."
                value={batchNoInput}
                onChange={(e) => setBatchNoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="default" onClick={handleSearch}>
              搜索
            </Button>
          </div>
        </div>

        <span className="text-sm text-muted-foreground shrink-0">
          共 {total} 条记录
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">时间</TableHead>
              <TableHead>事件</TableHead>
              <TableHead className="hidden sm:table-cell">操作员</TableHead>
              <TableHead>类型</TableHead>
              <TableHead className="hidden md:table-cell">批次号</TableHead>
              <TableHead className="w-[70px]">模式</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center">
                    <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">暂无审计记录</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log, index) => (
                <TableRow key={log.id} className={index % 2 === 0 ? '' : 'bg-muted/30'}>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{log.eventLabel}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {log.operatorName || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${TARGET_TYPE_COLORS[log.targetType] || ''}`}
                    >
                      {TARGET_TYPE_LABELS[log.targetType] || log.targetType}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm font-mono text-muted-foreground">
                    {log.targetBatchNo || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${INPUT_MODE_COLORS[log.inputMode] || ''}`}
                    >
                      {INPUT_MODE_LABELS[log.inputMode] || log.inputMode}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            上一页
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            下一页
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
