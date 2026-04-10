'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, Microscope, Dna } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('请输入邮箱和密码')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '登录失败，请检查邮箱和密码')
        return
      }

      // Store user info AND token in Zustand (persists to localStorage)
      setUser(data.user, data.token)

      toast.success('登录成功', {
        description: `欢迎回来，${data.user.name}`,
      })

      // Use replace to avoid back-button returning to login
      router.replace('/')
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-teal-950 p-4 relative overflow-hidden">
      {/* Animated background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-200/30 dark:bg-teal-800/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-200/30 dark:bg-emerald-800/20 blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-teal-100/20 dark:bg-teal-900/10 blur-3xl animate-pulse [animation-delay:2s]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/25 mb-4">
            <Microscope className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              iPSC-Flow
            </h1>
            <Dna className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Induced Pluripotent Stem Cell Production Management
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">用户登录</CardTitle>
            <CardDescription className="text-center">
              请使用您的账号登录系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/50 dark:border-red-800/50 p-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">邮箱地址</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-11"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-11"
                  autoComplete="current-password"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium shadow-md shadow-teal-500/20 dark:shadow-teal-900/40"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                登录
              </Button>
            </form>

            {/* Demo accounts hint */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-2">演示账号</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '管理员', email: 'admin@ipsc.com' },
                  { label: '生产主管', email: 'supervisor@ipsc.com' },
                  { label: '操作员', email: 'operator@ipsc.com' },
                  { label: 'QA', email: 'qa@ipsc.com' },
                ].map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => {
                      setEmail(account.email)
                      setPassword('123456')
                    }}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors px-2 py-1.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-900/20 text-left truncate"
                    title={`${account.email} / 123456`}
                  >
                    {account.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                默认密码：123456
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          © 2026 iPSC-Flow · GMP Compliant Production Management
        </p>
      </div>
    </div>
  )
}
