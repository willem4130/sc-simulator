/**
 * Organization router - Multi-tenant organization management
 */
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'

export const organizationRouter = createTRPCRouter({
  /**
   * Get first organization (for development)
   */
  getFirst: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.organisatie.findFirst()
  }),

  /**
   * Get current user's organization
   */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        organisatie: {
          include: {
            _count: {
              select: {
                users: true,
                scenarios: true,
                variables: true,
                parameters: true,
              },
            },
          },
        },
      },
    })

    return user?.organisatie
  }),

  /**
   * Update organization settings
   */
  update: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is ADMIN
      const user = await ctx.db.user.findFirst({
        where: {
          id: ctx.session.user.id,
          organizationId: input.organizationId,
          role: 'ADMIN',
        },
      })

      if (!user) {
        throw new Error('Only admins can update organization settings')
      }

      return ctx.db.organisatie.update({
        where: { id: input.organizationId },
        data: {
          name: input.name,
          description: input.description,
          timezone: input.timezone,
        },
      })
    }),

  /**
   * List users in organization
   */
  listUsers: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user belongs to this org
      const user = await ctx.db.user.findFirst({
        where: {
          id: ctx.session.user.id,
          organizationId: input.organizationId,
        },
      })

      if (!user) {
        throw new Error('Access denied')
      }

      return ctx.db.user.findMany({
        where: { organizationId: input.organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    }),
})
