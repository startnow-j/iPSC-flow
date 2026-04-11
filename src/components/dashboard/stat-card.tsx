'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number
  icon: LucideIcon
  color: string
  iconBg: string
  borderColor: string
  href?: string
  loading?: boolean
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  iconBg,
  borderColor,
  href,
  loading,
}: StatCardProps) {
  const router = useRouter()

  const handleClick = () => {
    if (href) router.push(href)
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all hover:shadow-md cursor-pointer',
        href && 'hover:border-primary/30',
      )}
      onClick={handleClick}
    >
      {/* Left color border */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', borderColor)} />
      <CardContent className="p-4 pl-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl',
              iconBg,
            )}
          >
            <Icon className={cn('h-5 w-5', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
