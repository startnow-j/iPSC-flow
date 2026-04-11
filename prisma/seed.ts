import { PrismaClient, ProductLine } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

// ============================================
// 种子数据定义
// ============================================

// 默认用户
const USERS = [
  {
    name: 'Admin管理员',
    email: 'admin@ipsc.com',
    role: 'ADMIN' as const,
    roles: '["ADMIN"]',
    department: '信息部',
  },
  {
    name: '李主管',
    email: 'supervisor@ipsc.com',
    role: 'SUPERVISOR' as const,
    roles: '["SUPERVISOR","OPERATOR"]',  // 主管兼操作员
    department: '生产部',
  },
  {
    name: '张三',
    email: 'operator@ipsc.com',
    role: 'OPERATOR' as const,
    roles: '["OPERATOR","QA"]',  // 操作员兼QA
    department: '生产部',
  },
  {
    name: '王QA',
    email: 'qa@ipsc.com',
    role: 'QA' as const,
    roles: '["QA"]',
    department: '质量部',
  },
]

// 产品定义（3条产品线 × 各2个产品 = 6个产品）
const PRODUCTS = [
  // ===== 细胞产品线 =====
  {
    productCode: 'IPSC-WT-001',
    productName: 'iPSC细胞株(野生型)',
    productLine: 'CELL_PRODUCT' as ProductLine,
    category: 'IPSC',
    cellType: 'IPSC',
    specification: '1×10^6 cells/支',
    storageCondition: '液氮(-196°C)',
    shelfLife: '5年',
    unit: '支',
    description: '野生型iPSC细胞，GMP级生产',
  },
  {
    productCode: 'NPC-001',
    productName: '神经前体细胞(NPC)',
    productLine: 'CELL_PRODUCT' as ProductLine,
    category: 'NPC',
    cellType: 'NPC',
    specification: '5×10^5 cells/支',
    storageCondition: '液氮(-196°C)',
    shelfLife: '2年',
    unit: '支',
    description: 'iPSC定向分化神经前体细胞',
  },
  // ===== 服务项目线 =====
  {
    productCode: 'SRV-REPG-001',
    productName: '重编程建系服务',
    productLine: 'SERVICE' as ProductLine,
    category: 'REPROGRAM',
    cellType: 'IPSC',
    specification: '按订单交付',
    storageCondition: null,
    shelfLife: null,
    unit: '株',
    description: '体细胞重编程为iPSC并完成建系鉴定',
  },
  {
    productCode: 'SRV-EDIT-001',
    productName: '基因编辑服务',
    productLine: 'SERVICE' as ProductLine,
    category: 'EDIT',
    cellType: 'IPSC',
    specification: '按订单交付',
    storageCondition: null,
    shelfLife: null,
    unit: '株',
    description: 'CRISPR/Cas9基因编辑服务，含阳性克隆鉴定',
  },
  // ===== 试剂盒产品线 =====
  {
    productCode: 'KIT-NDF-001',
    productName: '神经分化试剂盒',
    productLine: 'KIT' as ProductLine,
    category: 'DIFF_KIT',
    cellType: null,
    specification: '10次/盒',
    storageCondition: '-20°C避光',
    shelfLife: '1年',
    unit: '盒',
    description: 'iPSC→NPC神经分化培养基套装',
  },
  {
    productCode: 'KIT-CDM-001',
    productName: '心肌分化试剂盒',
    productLine: 'KIT' as ProductLine,
    category: 'DIFF_KIT',
    cellType: null,
    specification: '10次/盒',
    storageCondition: '-20°C避光',
    shelfLife: '1年',
    unit: '盒',
    description: 'iPSC→心肌细胞分化培养基套装',
  },
]

// 用户-产品角色分配
// 粒度: userId(通过email查找) + productCode + roles
const USER_PRODUCT_ROLES: { email: string; productCode: string; roles: string[] }[] = [
  // Admin: 所有产品都是 ADMIN
  ...['IPSC-WT-001', 'NPC-001', 'SRV-REPG-001', 'SRV-EDIT-001', 'KIT-NDF-001', 'KIT-CDM-001'].flatMap(code => ({
    email: 'admin@ipsc.com',
    productCode: code,
    roles: ['ADMIN'],
  })),

  // 李主管: 所有产品都是 SUPERVISOR
  ...['IPSC-WT-001', 'NPC-001', 'SRV-REPG-001', 'SRV-EDIT-001', 'KIT-NDF-001', 'KIT-CDM-001'].flatMap(code => ({
    email: 'supervisor@ipsc.com',
    productCode: code,
    roles: ['SUPERVISOR'],
  })),

  // 张三: 细胞产品的操作员 + 服务项目的操作员
  { email: 'operator@ipsc.com', productCode: 'IPSC-WT-001', roles: ['OPERATOR'] },
  { email: 'operator@ipsc.com', productCode: 'NPC-001', roles: ['OPERATOR'] },
  { email: 'operator@ipsc.com', productCode: 'SRV-REPG-001', roles: ['OPERATOR'] },
  { email: 'operator@ipsc.com', productCode: 'SRV-EDIT-001', roles: ['OPERATOR'] },

  // 王QA: 细胞产品和服务项目的质检
  { email: 'qa@ipsc.com', productCode: 'IPSC-WT-001', roles: ['QA'] },
  { email: 'qa@ipsc.com', productCode: 'NPC-001', roles: ['QA'] },
  { email: 'qa@ipsc.com', productCode: 'SRV-REPG-001', roles: ['QA'] },
  { email: 'qa@ipsc.com', productCode: 'SRV-EDIT-001', roles: ['QA'] },
  { email: 'qa@ipsc.com', productCode: 'KIT-NDF-001', roles: ['QA'] },  // 试剂盒效力验证
  { email: 'qa@ipsc.com', productCode: 'KIT-CDM-001', roles: ['QA'] },  // 试剂盒效力验证
]

async function main() {
  console.log('🌱 Seeding database (v2.0 — 多产品线)...')

  const hashedPassword = await bcrypt.hash('123456', 10)

  // 1. 创建用户
  console.log('\n  ── 用户 ──')
  for (const userData of USERS) {
    await db.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        role: userData.role,
        roles: userData.roles,
        department: userData.department,
      },
      create: { ...userData, password: hashedPassword },
    })
    console.log(`    ✓ ${userData.name} (${userData.email}) → ${userData.roles}`)
  }

  // 2. 创建产品
  console.log('\n  ── 产品 ──')
  const createdProducts: Record<string, string> = {}
  for (const prod of PRODUCTS) {
    const result = await db.product.upsert({
      where: { productCode: prod.productCode },
      update: {
        productName: prod.productName,
        productLine: prod.productLine,
        category: prod.category,
        cellType: prod.cellType,
        specification: prod.specification,
        storageCondition: prod.storageCondition,
        shelfLife: prod.shelfLife,
        unit: prod.unit,
        description: prod.description,
      },
      create: { ...prod, active: true },
    })
    createdProducts[prod.productCode] = result.id
    const lineLabel = { SERVICE: '服务项目', CELL_PRODUCT: '细胞产品', KIT: '试剂盒' }[prod.productLine]
    console.log(`    ✓ [${lineLabel}] ${prod.productName} (${prod.productCode})`)
  }

  // 3. 创建用户-产品角色关联
  console.log('\n  ── 用户-产品角色 ──')
  for (const upr of USER_PRODUCT_ROLES) {
    const user = await db.user.findUnique({ where: { email: upr.email } })
    const productId = createdProducts[upr.productCode]
    if (!user || !productId) {
      console.log(`    ⚠ 跳过 ${upr.email} × ${upr.productCode}（用户或产品不存在）`)
      continue
    }

    await db.userProductRole.upsert({
      where: {
        userId_productId: { userId: user.id, productId },
      },
      update: {
        roles: JSON.stringify(upr.roles),
      },
      create: {
        userId: user.id,
        productId,
        roles: JSON.stringify(upr.roles),
      },
    })

    const userName = upr.email.split('@')[0]
    console.log(`    ✓ ${userName} × ${upr.productCode} → ${JSON.stringify(upr.roles)}`)
  }

  console.log('\n✅ Seed completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`  Users: ${USERS.length}`)
  console.log(`  Products: ${PRODUCTS.length} (细胞产品×2 + 服务项目×2 + 试剂盒×2)`)
  console.log(`  User-Product Roles: ${USER_PRODUCT_ROLES.length} 条关联`)
  console.log('  Default password: 123456')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
