---
Task ID: 1-2 + 1-5
Agent: Auth System & Seed Data Developer
Task: 认证系统（登录/注册/会话管理）+ 种子数据
Status: COMPLETED

## Work Summary

### Files Created
- `src/lib/auth.ts` — JWT (jose) + bcryptjs 认证工具库
- `src/stores/auth-store.ts` — Zustand 认证状态管理
- `src/components/auth-guard.tsx` — 客户端认证保护组件
- `src/app/login/page.tsx` — 登录页面（独立布局，无侧边栏）
- `src/app/api/auth/login/route.ts` — POST 登录 API
- `src/app/api/auth/logout/route.ts` — POST 登出 API
- `src/app/api/auth/me/route.ts` — GET 当前用户 API
- `src/app/api/auth/register/route.ts` — POST 注册 API（仅 ADMIN）
- `prisma/seed.ts` — 种子数据脚本（4 用户 + 1 产品）

### Files Modified
- `package.json` — 添加 `"seed"` 脚本
- `src/app/layout.tsx` — AuthGuard 包裹 LayoutWrapper
- `src/components/layout/sidebar.tsx` — 接入 auth store，动态用户信息+退出登录
- `src/components/layout/header.tsx` — 接入 auth store，动态用户信息+退出登录
- `src/app/page.tsx` — Dashboard 工作台（欢迎横幅+统计卡片+批次动态+快捷操作）
- `worklog.md` — 追加工作记录

### Key Decisions
- **JWT 库**: jose（Edge Runtime 兼容，非jsonwebtoken）
- **密码加密**: bcryptjs（纯 JS 实现，无需 native 依赖）
- **Cookie**: HttpOnly + SameSite=Lax，7天有效期
- **状态管理**: Zustand store 存储最小用户信息
- **AuthGuard**: 客户端组件，useEffect 调用 /api/auth/me，PUBLIC_ROUTES 跳过

### Seed Data
- 4 Users: admin@ipsc.com, supervisor@ipsc.com, operator@ipsc.com, qa@ipsc.com (密码: 123456)
- 1 Product: IPSC-WT-001 iPSC细胞株(野生型)

### Lint Status
- 新增代码零 ESLint error
- 预存 2 个 error 在 generate-plan.js（非本任务）
