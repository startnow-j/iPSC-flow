'use client'

import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FlaskConical,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
} from 'lucide-react'

export default function HomePage() {
  const { user } = useAuthStore()

  const roleName = {
    ADMIN: '管理员',
    SUPERVISOR: '生产主管',
    OPERATOR: '操作员',
    QA: 'QA',
  }[user?.role || 'OPERATOR'] || user?.role || '用户'

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '上午好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 p-6 text-white shadow-lg shadow-teal-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting()}，{user?.name || '用户'}
            </h1>
            <p className="mt-1 text-teal-100">
              {roleName} · {user?.department || '未设置部门'}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 backdrop-blur-sm">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">生产中</p>
                <p className="text-2xl font-bold">2</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <FlaskConical className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待质检</p>
                <p className="text-2xl font-bold">1</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
                <Clock className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已放行</p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">异常提醒</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Batches */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">近期批次动态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  batch: 'IPSC-260410-003-P5',
                  status: 'IN_PRODUCTION',
                  statusLabel: '生产中',
                  action: '扩增培养进行中',
                  time: '10 分钟前',
                  color: 'bg-amber-500',
                },
                {
                  batch: 'IPSC-260409-002-P3',
                  status: 'QC_PENDING',
                  statusLabel: '待质检',
                  action: '等待质检部门接收',
                  time: '2 小时前',
                  color: 'bg-sky-500',
                },
                {
                  batch: 'IPSC-260408-001-P2',
                  status: 'RELEASED',
                  statusLabel: '已放行',
                  action: 'CoA已批准，产品已放行',
                  time: '昨天',
                  color: 'bg-emerald-500',
                },
              ].map((item) => (
                <div
                  key={item.batch}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <div>
                      <p className="text-sm font-medium">{item.batch}</p>
                      <p className="text-xs text-muted-foreground">{item.action}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {item.statusLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & System Info */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">快捷操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: '新建批次', icon: FlaskConical, href: '/batches/new', enabled: true },
                { label: '待办事项', icon: Clock, href: '/todos', enabled: false },
                { label: '质检管理', icon: CheckCircle2, href: '#', enabled: false },
              ].map((action) => (
                <button
                  key={action.label}
                  disabled={!action.enabled}
                  className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                    action.enabled
                      ? 'hover:bg-muted/50 cursor-pointer'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{action.label}</span>
                  {!action.enabled && (
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
                      即将上线
                    </Badge>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">系统信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">系统版本</span>
                <span className="font-medium">v1.0 (MVP)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">在线用户</span>
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">4</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">产品类型</span>
                <span className="font-medium">iPSC细胞株</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">合规标准</span>
                <Badge variant="outline" className="text-xs font-medium text-emerald-600 border-emerald-200">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  GMP
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
