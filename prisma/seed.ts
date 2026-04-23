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
    roles: '["SUPERVISOR"]',
    department: '生产部',
  },
  {
    name: '王QA',
    email: 'qa@ipsc.com',
    role: 'QA' as const,
    roles: '["QA"]',
    department: '质量部',
  },
  {
    name: '张三',
    email: 'operator@ipsc.com',
    role: 'OPERATOR' as const,
    roles: '["OPERATOR","QC"]',
    department: '生产部',
  },
  {
    name: '李质检',
    email: 'qc@ipsc.com',
    role: 'QC' as const,
    roles: '["QC"]',
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
  {
    productCode: 'SRV-DIFF-001',
    productName: '细胞分化服务',
    productLine: 'SERVICE' as ProductLine,
    category: 'DIFF_SERVICE',
    cellType: 'NPC',
    specification: '按订单交付',
    storageCondition: null,
    shelfLife: null,
    unit: '批次',
    description: 'iPSC定向分化服务（NPC/CM等），含鉴定报告',
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

// 用户-产品角色分配（只存操作类角色: OPERATOR / QC）
const USER_PRODUCT_ROLES: { email: string; productCode: string; roles: string[] }[] = [
  // Admin 不需要产品级分配（天然全通）

  // 李主管(SUPERVISOR): 管理类不需要产品级角色，通过 UserProductLine 控制范围

  // 张三: 细胞产品的操作员，NPC 同时有生产和质检权限
  { email: 'operator@ipsc.com', productCode: 'IPSC-WT-001', roles: ['OPERATOR'] },
  { email: 'operator@ipsc.com', productCode: 'NPC-001', roles: ['OPERATOR', 'QC'] },
  { email: 'operator@ipsc.com', productCode: 'SRV-REPG-001', roles: ['OPERATOR'] },
  { email: 'operator@ipsc.com', productCode: 'SRV-EDIT-001', roles: ['OPERATOR'] },
  { email: 'operator@ipsc.com', productCode: 'SRV-DIFF-001', roles: ['OPERATOR'] },
  { email: 'operator@ipsc.com', productCode: 'KIT-NDF-001', roles: ['OPERATOR'] },
  { email: 'operator@ipsc.com', productCode: 'KIT-CDM-001', roles: ['OPERATOR'] },

  // 李质检(QC): 细胞产品和服务项目的质检员
  { email: 'qc@ipsc.com', productCode: 'IPSC-WT-001', roles: ['QC'] },
  { email: 'qc@ipsc.com', productCode: 'NPC-001', roles: ['QC'] },
  { email: 'qc@ipsc.com', productCode: 'SRV-REPG-001', roles: ['QC'] },
  { email: 'qc@ipsc.com', productCode: 'SRV-EDIT-001', roles: ['QC'] },
  { email: 'qc@ipsc.com', productCode: 'SRV-DIFF-001', roles: ['QC'] },
  { email: 'qc@ipsc.com', productCode: 'KIT-NDF-001', roles: ['QC'] },
  { email: 'qc@ipsc.com', productCode: 'KIT-CDM-001', roles: ['QC'] },
]

// 用户-产品线归属（ADMIN 配置，控制用户的活动范围）
const USER_PRODUCT_LINES: { email: string; productLine: string }[] = [
  // 李主管: 管理所有三条产品线
  { email: 'supervisor@ipsc.com', productLine: 'CELL_PRODUCT' },
  { email: 'supervisor@ipsc.com', productLine: 'SERVICE' },
  { email: 'supervisor@ipsc.com', productLine: 'KIT' },
  // 王QA: 质量保证，归属细胞产品线
  { email: 'qa@ipsc.com', productLine: 'CELL_PRODUCT' },
  // 张三: 归属细胞产品、服务项目和试剂盒线
  { email: 'operator@ipsc.com', productLine: 'CELL_PRODUCT' },
  { email: 'operator@ipsc.com', productLine: 'SERVICE' },
  { email: 'operator@ipsc.com', productLine: 'KIT' },
  // 李质检: 归属所有三条线
  { email: 'qc@ipsc.com', productLine: 'CELL_PRODUCT' },
  { email: 'qc@ipsc.com', productLine: 'SERVICE' },
  { email: 'qc@ipsc.com', productLine: 'KIT' },
]

async function main() {
  console.log('🌱 Seeding database (v3.0 — Phase 3B 产品线差异化)...')

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

  // 2.5. 创建用户-产品线归属
  console.log('\n  ── 用户-产品线归属 ──')
  const PRODUCT_LINE_LABELS: Record<string, string> = { SERVICE: '服务项目', CELL_PRODUCT: '细胞产品', KIT: '试剂盒' }
  for (const upl of USER_PRODUCT_LINES) {
    const user = await db.user.findUnique({ where: { email: upl.email } })
    if (!user) {
      console.log(`    ⚠ 跳过 ${upl.email} × ${upl.productLine}（用户不存在）`)
      continue
    }

    await db.userProductLine.upsert({
      where: {
        userId_productLine: { userId: user.id, productLine: upl.productLine },
      },
      update: {},
      create: {
        userId: user.id,
        productLine: upl.productLine,
      },
    })

    const lineLabel = PRODUCT_LINE_LABELS[upl.productLine] || upl.productLine
    console.log(`    ✓ ${upl.email.split('@')[0]} → ${lineLabel}`)
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
  console.log(`  Products: ${PRODUCTS.length} (细胞产品×2 + 服务项目×3 + 试剂盒×2)`)
  console.log(`  User-Product Lines: ${USER_PRODUCT_LINES.length} 条归属`)
  console.log(`  User-Product Roles: ${USER_PRODUCT_ROLES.length} 条关联`)
  console.log('  Default password: 123456')

  // ============================================
  // 3A.2: Create a test batch with pre-assignment
  // ============================================
  console.log('\n  ── 测试批次（预指派） ──')
  const adminUser = await db.user.findUnique({ where: { email: 'admin@ipsc.com' } })
  const operatorUser = await db.user.findUnique({ where: { email: 'operator@ipsc.com' } })
  const qcUser = await db.user.findUnique({ where: { email: 'qc@ipsc.com' } })
  const ipscProduct = await db.product.findUnique({ where: { productCode: 'IPSC-WT-001' } })

  if (adminUser && operatorUser && qcUser && ipscProduct) {
    const now = new Date()
    const dateStr =
      String(now.getFullYear()).slice(-2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0')

    const testBatchNo = `IPSC-${dateStr}-001`

    try {
      await db.batch.create({
        data: {
          batchNo: testBatchNo,
          productCode: ipscProduct.productCode,
          productName: ipscProduct.productName,
          productId: ipscProduct.id,
          productLine: 'CELL_PRODUCT',
          specification: ipscProduct.specification,
          unit: ipscProduct.unit,
          status: 'NEW',
          plannedQuantity: 10,
          seedBatchNo: 'IPSC-WSB-2601-001',
          seedPassage: 'P3',
          currentPassage: 'P3',
          createdBy: adminUser.id,
          createdByName: adminUser.name,
          // v3.0 预指派
          productionOperatorId: operatorUser.id,
          productionOperatorName: operatorUser.name,
          qcOperatorId: qcUser.id,
          qcOperatorName: qcUser.name,
        },
      })
      console.log(`    ✓ 测试批次 ${testBatchNo}（生产员: ${operatorUser.name}, 质检员: ${qcUser.name}）`)
    } catch {
      // Batch may already exist (idempotent)
      console.log(`    ⚭ 测试批次 ${testBatchNo} 已存在，跳过`)
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
