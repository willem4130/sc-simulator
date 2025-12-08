/**
 * This is the primary configuration file for your tRPC server.
 * It's where you initialize the tRPC context, define middleware, and create reusable procedures.
 */
import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { db } from '@/server/db'
import { auth } from '@/server/auth'

/**
 * Creates the context for incoming requests
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth()

  return {
    db,
    session,
    ...opts,
  }
}

/**
 * Initialize tRPC with transformer and error formatter
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

/**
 * Reusable router and procedure helpers
 */
export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory

/**
 * Public procedure - can be accessed by anyone
 */
export const publicProcedure = t.procedure

/**
 * Protected procedure - requires authenticated user
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})

/**
 * Organization procedure - requires auth + organization membership
 * Verifies user belongs to the organization specified in input
 */
export const organizationProcedure = protectedProcedure.use(async ({ ctx, input, next }) => {
  // Extract organizationId from input
  const organizationId = (input as any).organizationId

  if (!organizationId || typeof organizationId !== 'string') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'organizationId is required',
    })
  }

  // Verify user belongs to this organization
  const user = await ctx.db.user.findFirst({
    where: {
      id: ctx.session.user.id,
      organizationId,
    },
    include: {
      organization: true,
    },
  })

  if (!user) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this organization',
    })
  }

  // Attach organizationId and user to context
  return next({
    ctx: {
      ...ctx,
      organizationId,
      user,
    },
  })
})
