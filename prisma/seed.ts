import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create default app settings if not exists
  const existingSettings = await prisma.appSettings.findFirst()
  if (!existingSettings) {
    await prisma.appSettings.create({
      data: {
        siteName: 'Simplicate Automations',
        timezone: 'Europe/Amsterdam',
        theme: 'light',
        accentColor: '#000000',
        emailNotifications: true,
        pushNotifications: true,
        marketingEmails: false,
        twoFactorEnabled: false,
        sessionTimeout: 86400,
      },
    })
    console.log('✅ Created default app settings')
  }

  // Note: Users are now synced from Simplicate via the admin dashboard
  // Use the "Sync Employees" button in Settings to import users from Simplicate
  console.log('ℹ️  Users should be synced from Simplicate via the admin dashboard')
  console.log('   Go to Settings → Simplicate Sync → Sync Employees')

  // Note: Projects are also synced from Simplicate
  // Use the "Sync Now" button in Settings to import projects from Simplicate
  console.log('ℹ️  Projects should be synced from Simplicate via the admin dashboard')
  console.log('   Go to Settings → Simplicate Sync → Sync Projects')

  console.log('🎉 Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
