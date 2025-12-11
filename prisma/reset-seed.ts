/**
 * Reset and reseed the database
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning database...')

  // Delete all data in reverse dependency order
  await prisma.calculation.deleteMany({})
  await prisma.variableValue.deleteMany({})
  await prisma.variable.deleteMany({})
  await prisma.parameter.deleteMany({})
  await prisma.skuEffectCurve.deleteMany({})
  await prisma.scenario.deleteMany({})
  await prisma.project.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.organisatie.deleteMany({})

  console.log('✅ Database cleaned')
  console.log('🌱 Now run: npx tsx prisma/seed.ts')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Reset failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
