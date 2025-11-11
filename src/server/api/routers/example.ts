import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name ?? 'World'}!`,
      }
    }),

  getAllPosts: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.db.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: true },
    })
    return posts
  }),

  createPost: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().optional(),
        authorId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.create({
        data: input,
      })
      return post
    }),
})
