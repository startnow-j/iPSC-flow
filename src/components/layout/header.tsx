'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Bell, Search, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

// Page title mapping
const pageTitles: Record<string, string> = {
  '/': '工作台',
  '/batches': '我的批次',
  '/batches/all': '所有批次',
  '/batches/new': '新建批次',
  '/todos': '待办事项',
}

// Breadcrumb items mapping
function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; href: string }[] = []

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    const title = pageTitles[currentPath]
    if (title) {
      crumbs.push({ label: title, href: currentPath })
    }
  }

  // Fallback for pages not in the mapping
  if (crumbs.length === 0 && pathname === '/') {
    crumbs.push({ label: '工作台', href: '/' })
  }

  return crumbs
}

export function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const pageTitle = pageTitles[pathname] || '工作台'
  const breadcrumbs = getBreadcrumbs(pathname)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
    router.push('/login')
  }

  const userInitial = user?.name?.charAt(0) || '用'
  const roleName = {
    ADMIN: '管理员',
    SUPERVISOR: '生产主管',
    OPERATOR: '操作员',
    QA: 'QA',
  }[user?.role || 'OPERATOR'] || user?.role || '用户'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      {/* Mobile Menu Toggle */}
      <SidebarTrigger className="-ml-1 md:ml-0" />

      <Separator orientation="vertical" className="h-5" />

      {/* Breadcrumb / Page Title */}
      <nav className="flex items-center gap-1.5 text-sm overflow-hidden">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {index > 0 && (
              <span className="text-muted-foreground/50">/</span>
            )}
            <span
              className={
                index === breadcrumbs.length - 1
                  ? 'font-medium text-foreground truncate'
                  : 'text-muted-foreground hover:text-foreground truncate cursor-pointer transition-colors'
              }
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Search - hidden on mobile */}
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-2.5 size-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索批次..."
            className="h-8 w-48 lg:w-64 pl-8 text-sm bg-muted/50 border-transparent focus:border-border focus:bg-background transition-colors"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative size-9">
              <Bell className="size-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                3
              </span>
              <span className="sr-only">通知</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>通知</span>
              <Badge variant="secondary" className="text-[10px] px-1.5">
                3 条未读
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2.5 cursor-pointer">
              <span className="text-sm font-medium">批次 IPSC-2026-003 待质检</span>
              <span className="text-xs text-muted-foreground">10 分钟前</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2.5 cursor-pointer">
              <span className="text-sm font-medium">CoA 审核待处理 (3份)</span>
              <span className="text-xs text-muted-foreground">1 小时前</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2.5 cursor-pointer">
              <span className="text-sm font-medium">批次 IPSC-2026-001 已放行</span>
              <span className="text-xs text-muted-foreground">昨天</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm text-primary cursor-pointer">
              查看全部通知
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar - hidden on mobile (shown in sidebar footer) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hidden md:flex">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>{user?.name || '用户'} · {roleName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>个人资料</DropdownMenuItem>
            <DropdownMenuItem>系统设置</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
