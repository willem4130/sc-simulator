/**
 * This is the primary configuration file for your tRPC server.
 * It's where you initialize the tRPC context, define middleware, and create reusable procedures.
 */
import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { db } from '@/server/db'

/**
 * Creates the context for incoming requests
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db,
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
 * Protected procedure - add your auth logic here
 * Example:
 * export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
 *   if (!ctx.session || !ctx.session.user) {
 *     throw new TRPCError({ code: 'UNAUTHORIZED' })
 *   }
 *   return next({
 *     ctx: {
 *       session: { ...ctx.session, user: ctx.session.user },
 *     },
 *   })
 * })
 */
