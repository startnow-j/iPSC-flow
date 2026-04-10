import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Hash the default password
  const hashedPassword = await bcrypt.hash('123456', 10)

  // 1. Create default users (with multi-role support)
  console.log('  Creating default users...')

  const usersData = [
    {
      name: 'Admin管理员',
      email: 'admin@ipsc.com',
      password: hashedPassword,
      role: 'ADMIN' as const,
      roles: '["ADMIN"]',
      department: '信息部',
    },
    {
      name: '李主管',
      email: 'supervisor@ipsc.com',
      password: hashedPassword,
      role: 'SUPERVISOR' as const,
      roles: '["SUPERVISOR","OPERATOR"]',  // 主管兼操作员
      department: '生产部',
    },
    {
      name: '张三',
      email: 'operator@ipsc.com',
      password: hashedPassword,
      role: 'OPERATOR' as const,
      roles: '["OPERATOR","QA"]',  // 操作员兼QA
      department: '生产部',
    },
    {
      name: '王QA',
      email: 'qa@ipsc.com',
      password: hashedPassword,
      role: 'QA' as const,
      roles: '["QA"]',
      department: '质量部',
    },
  ]

  for (const userData of usersData) {
    await db.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        role: userData.role,
        roles: userData.roles,
        department: userData.department,
      },
      create: userData,
    })
    console.log(`    ✓ ${userData.name} (${userData.email}) → roles: ${userData.roles}`)
  }

  // 2. Create default product
  console.log('  Creating default products...')

  await db.product.upsert({
    where: { productCode: 'IPSC-WT-001' },
    update: {},
    create: {
      productCode: 'IPSC-WT-001',
      productName: 'iPSC细胞株(野生型)',
      category: 'CELL_PRODUCT',
      cellType: 'IPSC',
      specification: '1×10^6 cells/支',
      storageCondition: '液氮(-196°C)',
      shelfLife: '5年',
      unit: '支',
      description: '野生型iPSC细胞，GMP级生产',
      active: true,
    },
  })
  console.log('    ✓ iPSC细胞株(野生型) (IPSC-WT-001)')

  console.log('\n✅ Seed completed successfully!')
  console.log('\n📊 Summary:')
  console.log('  Users: 4')
  console.log('    - admin@ipsc.com     → 管理员')
  console.log('    - supervisor@ipsc.com → 主管 + 操作员（多角色示例）')
  console.log('    - operator@ipsc.com   → 操作员 + QA（多角色示例）')
  console.log('    - qa@ipsc.com        → QA')
  console.log('  Products: 1 (IPSC-WT-001)')
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
