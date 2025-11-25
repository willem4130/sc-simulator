import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { getSimplicateClient } from '@/lib/simplicate/client'

export const syncRouter = createTRPCRouter({
  // Sync projects from Simplicate to local database
  syncProjects: publicProcedure.mutation(async ({ ctx }) => {
    const client = getSimplicateClient()

    try {
      // Fetch all projects from Simplicate
      const simplicateProjects = await client.getProjects({ limit: 100 })

      const results = {
        created: 0,
        updated: 0,
        errors: [] as string[],
      }

      // Import each project
      for (const project of simplicateProjects) {
        try {
          const projectData = {
            simplicateId: project.id,
            name: project.name,
            projectNumber: project.project_number || null,
            description: project.description || null,
            status: mapProjectStatus(project.status),
            startDate: project.start_date ? new Date(project.start_date) : null,
            endDate: project.end_date ? new Date(project.end_date) : null,
            clientName: project.organization?.name || null,
            lastSyncedAt: new Date(),
          }

          // Upsert (create or update) project
          const existingProject = await ctx.db.project.findUnique({
            where: { simplicateId: project.id },
          })

          if (existingProject) {
            await ctx.db.project.update({
              where: { id: existingProject.id },
              data: projectData,
            })
            results.updated++
          } else {
            await ctx.db.project.create({
              data: projectData,
            })
            results.created++
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Failed to sync project ${project.name}: ${errorMessage}`)
        }
      }

      return {
        success: true,
        totalProcessed: simplicateProjects.length,
        ...results,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to sync projects from Simplicate: ${errorMessage}`)
    }
  }),

  // Sync employees from Simplicate to local database as users
  syncEmployees: publicProcedure.mutation(async ({ ctx }) => {
    const client = getSimplicateClient()

    try {
      // Fetch all employees from Simplicate
      const simplicateEmployees = await client.getEmployees({ limit: 100 })

      const results = {
        created: 0,
        updated: 0,
        errors: [] as string[],
      }

      // Import each employee as a user
      for (const employee of simplicateEmployees) {
        try {
          // Get email from work_email, or fallback to person.email
          const employeeEmail = employee.work_email || employee.person?.email || employee.email
          const employeeName = employee.name || employee.person?.full_name || 'Unknown'

          // Skip employees without email
          if (!employeeEmail) {
            results.errors.push(`Skipped employee ${employeeName}: No email address`)
            continue
          }

          const userData = {
            email: employeeEmail,
            name: employeeName,
            simplicateEmployeeId: employee.id,
            role: 'TEAM_MEMBER' as const,
          }

          // Check if user exists by simplicateEmployeeId or email
          const existingBySimplicateId = await ctx.db.user.findUnique({
            where: { simplicateEmployeeId: employee.id },
          })

          const existingByEmail = await ctx.db.user.findUnique({
            where: { email: employeeEmail },
          })

          if (existingBySimplicateId) {
            // Update existing user by Simplicate ID
            await ctx.db.user.update({
              where: { id: existingBySimplicateId.id },
              data: {
                email: userData.email,
                name: userData.name,
              },
            })
            results.updated++
          } else if (existingByEmail) {
            // Link existing user by email to Simplicate
            await ctx.db.user.update({
              where: { id: existingByEmail.id },
              data: {
                name: userData.name,
                simplicateEmployeeId: userData.simplicateEmployeeId,
              },
            })
            results.updated++
          } else {
            // Create new user
            await ctx.db.user.create({
              data: userData,
            })
            results.created++
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Failed to sync employee ${employee.name}: ${errorMessage}`)
        }
      }

      return {
        success: true,
        totalProcessed: simplicateEmployees.length,
        ...results,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to sync employees from Simplicate: ${errorMessage}`)
    }
  }),

  // Reset all data and sync fresh from Simplicate
  resetAndSync: publicProcedure.mutation(async ({ ctx }) => {
    const client = getSimplicateClient()

    try {
      // Step 1: Delete all existing data (in correct order due to foreign keys)
      await ctx.db.notification.deleteMany({})
      await ctx.db.notificationPreference.deleteMany({})
      await ctx.db.automationLog.deleteMany({})
      await ctx.db.hoursEntry.deleteMany({})
      await ctx.db.invoice.deleteMany({})
      await ctx.db.contract.deleteMany({})
      await ctx.db.workflowConfig.deleteMany({})
      await ctx.db.project.deleteMany({})
      // Delete users that are not linked to accounts (mock users)
      // Keep users with accounts (real logged-in users)
      await ctx.db.user.deleteMany({
        where: {
          accounts: { none: {} },
        },
      })

      const results = {
        projectsCreated: 0,
        usersCreated: 0,
        errors: [] as string[],
      }

      // Step 2: Sync projects from Simplicate
      const simplicateProjects = await client.getProjects({ limit: 100 })
      for (const project of simplicateProjects) {
        try {
          await ctx.db.project.create({
            data: {
              simplicateId: project.id,
              name: project.name,
              projectNumber: project.project_number || null,
              description: project.description || null,
              status: mapProjectStatus(project.status),
              startDate: project.start_date ? new Date(project.start_date) : null,
              endDate: project.end_date ? new Date(project.end_date) : null,
              clientName: project.organization?.name || null,
              lastSyncedAt: new Date(),
            },
          })
          results.projectsCreated++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Project ${project.name}: ${errorMessage}`)
        }
      }

      // Step 3: Sync employees from Simplicate
      const simplicateEmployees = await client.getEmployees({ limit: 100 })
      for (const employee of simplicateEmployees) {
        // Get name outside try block for error handling
        const employeeName = employee.name || employee.person?.full_name || 'Unknown'
        try {
          // Get email from work_email, or fallback to person.email
          const employeeEmail = employee.work_email || employee.person?.email || employee.email

          if (!employeeEmail) {
            results.errors.push(`Skipped employee ${employeeName}: No email`)
            continue
          }

          // Check if user already exists (e.g., logged-in user)
          const existingUser = await ctx.db.user.findUnique({
            where: { email: employeeEmail },
          })

          if (existingUser) {
            // Update existing user with Simplicate ID
            await ctx.db.user.update({
              where: { id: existingUser.id },
              data: {
                name: employeeName,
                simplicateEmployeeId: employee.id,
              },
            })
          } else {
            // Create new user
            await ctx.db.user.create({
              data: {
                email: employeeEmail,
                name: employeeName,
                simplicateEmployeeId: employee.id,
                role: 'TEAM_MEMBER',
              },
            })
          }
          results.usersCreated++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Employee ${employeeName}: ${errorMessage}`)
        }
      }

      return {
        success: true,
        message: `Reset complete! Created ${results.projectsCreated} projects and ${results.usersCreated} users.`,
        ...results,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to reset and sync: ${errorMessage}`)
    }
  }),

  // Get sync status
  getSyncStatus: publicProcedure.query(async ({ ctx }) => {
    const lastSyncedProject = await ctx.db.project.findFirst({
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    })

    const totalProjects = await ctx.db.project.count()
    const totalUsers = await ctx.db.user.count()
    const syncedUsers = await ctx.db.user.count({
      where: { simplicateEmployeeId: { not: null } },
    })

    return {
      lastSyncedAt: lastSyncedProject?.lastSyncedAt || null,
      totalProjects,
      totalUsers,
      syncedUsers,
      hasBeenSynced: totalProjects > 0,
    }
  }),
})

// Helper function to map Simplicate project status to our enum
function mapProjectStatus(status?: string): 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED' {
  if (!status) return 'ACTIVE'

  const statusLower = status.toLowerCase()

  if (statusLower.includes('active') || statusLower.includes('pactive')) return 'ACTIVE'
  if (statusLower.includes('complete') || statusLower.includes('done')) return 'COMPLETED'
  if (statusLower.includes('hold') || statusLower.includes('pause')) return 'ON_HOLD'
  if (statusLower.includes('cancel')) return 'CANCELLED'

  return 'ACTIVE' // Default
}
