import { db } from '../src/lib/db'
const tasks = await db.productionTask.findMany({
  where: { batchNo: 'KIT-260423-001' },
  select: { id: true, taskCode: true, taskName: true, status: true, assigneeName: true }
})
console.log(JSON.stringify(tasks, null, 2))
