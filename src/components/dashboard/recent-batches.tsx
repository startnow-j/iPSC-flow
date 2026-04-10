'use client'

import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getStatusLabel, getStatusColor } from '@/lib/services'
import { Clock, ArrowRight } from 'lucide-react'

interface RecentBatch {
  id: string
  batchNo: string
  productName: string
  status: string
  createdAt: string
  createdByName: string
}

export function RecentBatches() {
  const router = useRouter()
  const [batches, setBatches] = useState<RecentBatch[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecentBatches = useCallback(async () => {
    try {
      const res = await authFetch('/api/batches?pageSize=5')
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecentBatches()
  }, [fetchRecentBatches])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">近期批次动态</CardTitle>
        <button
          onClick={() => router.push('/batches/all')}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          查看全部
          <ArrowRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">暂无批次记录</p>
            <p className="text-xs text-muted-foreground mt-1">
              点击右上方「新建批次」开始第一个批次
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => router.push(`/batches/${batch.id}`)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(batch.createdAt)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium font-mono truncate group-hover:text-primary transition-colors">
                      {batch.batchNo}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {batch.productName} · {batch.createdByName}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={`shrink-0 text-[10px] ${getStatusColor(batch.status)}`}
                >
                  {getStatusLabel(batch.status)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
