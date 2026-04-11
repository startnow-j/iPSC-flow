'use client'

import { BatchListContent } from '../page'

export default function KitBatchesPage() {
  return (
    <BatchListContent
      defaultProductLine="KIT"
      hideProductLineFilter
      viewMode="all"
    />
  )
}
