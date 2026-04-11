'use client'

import { BatchListContent } from '../page'

export default function CellProductBatchesPage() {
  return (
    <BatchListContent
      defaultProductLine="CELL_PRODUCT"
      hideProductLineFilter
      viewMode="all"
    />
  )
}
