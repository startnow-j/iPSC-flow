'use client'

import { BatchListContent } from '../page'

export default function ServiceBatchesPage() {
  return (
    <BatchListContent
      defaultProductLine="SERVICE"
      hideProductLineFilter
      viewMode="all"
    />
  )
}
