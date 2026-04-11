'use client'

// /batches/all — 所有批次（复用批次列表组件，viewMode='all'）
// 必须创建独立页面，否则 [id] 动态路由会将 "all" 视为批次 ID

import BatchListPage from '@/app/batches/page'

export default function AllBatchesPage() {
  return <BatchListPage />
}
