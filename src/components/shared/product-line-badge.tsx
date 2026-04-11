'use client'

import { Badge } from '@/components/ui/badge'
import {
  PRODUCT_LINE_LABELS,
  PRODUCT_LINE_COLORS,
} from '@/lib/roles'

interface ProductLineBadgeProps {
  productLine?: string | null
  className?: string
}

/**
 * 产品线徽标组件
 * 根据产品线类型显示带颜色的中文标签
 */
export function ProductLineBadge({ productLine, className = '' }: ProductLineBadgeProps) {
  if (!productLine) return null

  const label = PRODUCT_LINE_LABELS[productLine] || productLine
  const colorClass = PRODUCT_LINE_COLORS[productLine] || ''

  return (
    <Badge
      variant="secondary"
      className={`text-[10px] px-1.5 py-0 ${colorClass} ${className}`}
    >
      {label}
    </Badge>
  )
}

/**
 * 获取产品线中文名
 */
export function getProductLineLabel(productLine?: string | null): string {
  if (!productLine) return ''
  return PRODUCT_LINE_LABELS[productLine] || productLine
}
