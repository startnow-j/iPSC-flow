'use client'

import { usePathname } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'

// Routes that should NOT show the AppShell layout
const authRoutes = ['/login', '/register']

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  if (isAuthRoute) {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}
