'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { authFetch } from '@/lib/auth-fetch'
import { Skeleton } from '@/components/ui/skeleton'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login']

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, user, setUser, setLoading } = useAuthStore()
  const hasCheckedRef = useRef(false)

  const isPublicRoute = useMemo(
    () => PUBLIC_ROUTES.includes(pathname),
    [pathname]
  )

  // Check auth status on mount (only for protected routes)
  useEffect(() => {
    if (isPublicRoute) return
    if (hasCheckedRef.current) return // Don't re-check on every render
    hasCheckedRef.current = true

    // If we already have user data from login, skip the API call
    // (prevents the flash-back issue when cookie hasn't propagated yet)
    if (isAuthenticated && user) {
      setLoading(false)
      return
    }

    const checkAuth = async () => {
      try {
        const res = await authFetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        } else {
          // Not authenticated, redirect to login
          setUser(null)
          router.push('/login')
        }
      } catch {
        // Network error — don't redirect, just show error state
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, setUser, setLoading, isPublicRoute, isAuthenticated, user])

  // Skip auth check for public routes
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Loading state (only show on initial load when no user data yet)
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="space-y-4 w-full max-w-sm">
          <div className="flex items-center justify-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full mt-4" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  // Not authenticated (and not loading)
  if (!isAuthenticated) {
    return null
  }

  // Authenticated — render children
  return <>{children}</>
}
