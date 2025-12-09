import { z } from 'zod'
import { createTRPCRouter, organizationProcedure, publicProcedure } from '@/server/api/trpc'

export const projectRouter = createTRPCRouter({
  // Get all projects for an organization
  list: publicProcedure // TODO: Change to organizationProcedure after dev
    .input(
      z.object({
        organizationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findMany({
        where: {
          organizationId: input.organizationId,
          status: 'ACTIVE',
        },
        include: {
          scenarios: {
            select: {
              id: true,
              name: true,
              isBaseline: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    }),

  // Get single project by ID
  getById: publicProcedure // TODO: Change to organizationProcedure after dev
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
        include: {
          scenarios: {
            orderBy: [{ isBaseline: 'desc' }, { createdAt: 'asc' }],
          },
        },
      })
    }),

  // Create new project
  create: publicProcedure // TODO: Change to organizationProcedure after dev
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1, 'Name is required'),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          tags: input.tags ?? [],
          status: 'ACTIVE',
        },
      })
    }),

  // Update project
  update: publicProcedure // TODO: Change to organizationProcedure after dev
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        name: z.string().min(1, 'Name is required').optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ...data } = input

      return ctx.db.project.update({
        where: {
          id,
          organizationId,
        },
        data,
      })
    }),

  // Delete project (soft delete by setting status to DELETED)
  delete: publicProcedure // TODO: Change to organizationProcedure after dev
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.update({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
        data: {
          status: 'DELETED',
        },
      })
    }),

  // Archive project
  archive: publicProcedure // TODO: Change to organizationProcedure after dev
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.update({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
        data: {
          status: 'ARCHIVED',
        },
      })
    }),
})
