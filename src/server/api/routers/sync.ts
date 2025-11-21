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

  // Get sync status
  getSyncStatus: publicProcedure.query(async ({ ctx }) => {
    const lastSyncedProject = await ctx.db.project.findFirst({
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    })

    const totalProjects = await ctx.db.project.count()

    return {
      lastSyncedAt: lastSyncedProject?.lastSyncedAt || null,
      totalProjects,
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
