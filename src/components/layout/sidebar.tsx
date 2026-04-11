'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FlaskConical,
  List,
  Clock,
  Plus,
  ChevronRight,
  LogOut,
  Settings,
  User,
  Users,
  FileText,
  Package,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getRoleDisplay, hasAnyRole } from '@/lib/roles'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BatchStatusOverview } from '@/components/batches/batch-status-overview'

// Navigation items
const mainNavItems = [
  {
    title: '工作台',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: '我的批次',
    href: '/batches',
    icon: FlaskConical,
  },
  {
    title: '所有批次',
    href: '/batches/all',
    icon: List,
  },
]

// Admin-only navigation items
const adminNavItems = [
  {
    title: '产品管理',
    href: '/products',
    icon: Package,
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    title: '用户管理',
    href: '/users',
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    title: '审计日志',
    href: '/audit',
    icon: FileText,
    roles: ['ADMIN', 'SUPERVISOR'],
  },
]

const secondaryNavItems = [
  {
    title: '待办事项',
    href: '/todos',
    icon: Clock,
    disabled: true,
    badge: '5',
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
    router.push('/login')
  }

  const userInitial = user?.name?.charAt(0) || '用'
  const roleName = user?.roles ? getRoleDisplay(user.roles) : '用户'

  // Filter admin nav items based on user roles (any match)
  const userRoles = user?.roles || [user?.role || 'OPERATOR']
  const filteredAdminNavItems = adminNavItems.filter(
    (item) => item.roles.some((r) => userRoles.includes(r)),
  )

  // Helper to check if a nav item is active
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Logo / App Title */}
      <SidebarHeader className="px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            iP
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              iPSC-Flow
            </span>
            <span className="text-[10px] text-muted-foreground leading-none">
              生产管理系统
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航菜单</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Batch Status Overview */}
        <SidebarGroup>
          <SidebarGroupLabel>批次状态概览</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
              <BatchStatusOverview maxItems={6} />
            </div>
            <Button
              size="sm"
              className="mx-2 mt-1 group-data-[collapsible=icon]:hidden"
              asChild
            >
              <Link href="/batches">
                <Plus className="size-4" />
                新建批次
              </Link>
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin-only Navigation */}
        {filteredAdminNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>系统管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAdminNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Secondary Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>更多功能</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.disabled ? `${item.title} (即将上线)` : item.title}
                    disabled={item.disabled}
                  >
                    <Link href={item.disabled ? '#' : item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        {/* User Info */}
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-full justify-start gap-2 px-2 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-medium leading-none">{user?.name || '用户'}</span>
                  <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    {user?.email || ''} · {roleName}
                  </span>
                </div>
                <ChevronRight className="ml-auto size-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={4}
              className="w-48"
            >
              <DropdownMenuItem>
                <User className="mr-2 size-4" />
                个人资料
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 size-4" />
                系统设置
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
                <LogOut className="mr-2 size-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
