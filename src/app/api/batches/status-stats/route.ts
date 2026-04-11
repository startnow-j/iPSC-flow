import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

// ============================================
// GET /api/batches/status-stats — 首页仪表盘统计
// 返回：
//   global          — 所有产品线合计
//   mine            — 与当前用户相关
//   byProductLine   — 按产品线分组
// 时间范围：最近 90 天
// ============================================
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
    }

    // 90 天前
    const since = new Date()
    since.setDate(since.getDate() - 90)

    const timeFilter = { createdAt: { gte: since } }

    // 并行查询：全局 + 我的 + 按产品线
    const [globalCounts, myCounts, byProductLineCounts] = await Promise.all([
      // 全局：最近 90 天所有批次
      db.batch.groupBy({
        by: ['status'],
        where: timeFilter,
        _count: { status: true },
      }),
      // 我的：我创建的 + 我被指派的
      db.$queryRaw<
        { status: string; count: bigint }[]
      >`
        SELECT b.status, COUNT(DISTINCT b.id) as count
        FROM batch b
        LEFT JOIN production_task t ON t.batchId = b.id AND t.assigneeId = ${payload.userId}
        WHERE b.createdAt >= ${since}
          AND (b.createdBy = ${payload.userId} OR t.assigneeId = ${payload.userId})
        GROUP BY b.status
      `,
      // 按产品线分组统计
      db.$queryRaw<
        { productLine: string; status: string; count: bigint }[]
      >`
        SELECT productLine, status, COUNT(*) as count
        FROM batch
        WHERE createdAt >= ${since}
        GROUP BY productLine, status
      `,
    ])

    const formatCounts = (items: { status: string; _count?: { status: number }; count?: bigint }[]) => {
      const map: Record<string, number> = {}
      for (const item of items) {
        map[item.status] = Number(item._count?.status ?? item.count ?? 0)
      }
      return map
    }

    // 按产品线组织数据
    const byProductLine: Record<string, Record<string, number>> = {}
    for (const row of byProductLineCounts) {
      const pl = row.productLine || 'UNKNOWN'
      if (!byProductLine[pl]) {
        byProductLine[pl] = {}
      }
      byProductLine[pl][row.status] = Number(row.count)
    }

    return NextResponse.json({
      global: formatCounts(globalCounts),
      mine: formatCounts(myCounts),
      byProductLine,
      since: since.toISOString(),
    })
  } catch (error) {
    console.error('GET /api/batches/status-stats error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
