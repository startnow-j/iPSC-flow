'use client'

import { usePathname } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { useAuthStore } from '@/stores/auth-store'

// Routes that should NOT show the AppShell layout
const authRoutes = ['/login', '/register']

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuthStore()

  // Show full layout only if authenticated AND not on auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  if (isAuthRoute || !isAuthenticated) {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}
