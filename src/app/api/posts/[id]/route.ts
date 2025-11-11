import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/server/db'
import { protectedRoute, apiResponse, apiError, validateRequest } from '@/lib/api-middleware'

/**
 * GET /api/posts/[id] - Get a single post by ID
 * Protected: Requires API key
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return protectedRoute(request, async () => {
    const { id } = await params

    const post = await db.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!post) {
      return apiError('Post not found', 404)
    }

    return apiResponse({ post })
  })
}

/**
 * PUT /api/posts/[id] - Update a post
 * Protected: Requires API key and applies strict rate limiting
 */
const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  published: z.boolean().optional(),
})

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return protectedRoute(
    request,
    async (req) => {
      const { id } = await params

      // Validate request body
      const { data, error } = await validateRequest(req, updatePostSchema)
      if (error) return error

      // Check if post exists
      const existingPost = await db.post.findUnique({ where: { id } })
      if (!existingPost) {
        return apiError('Post not found', 404)
      }

      // Update post
      const post = await db.post.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.content !== undefined && { content: data.content }),
          ...(data.published !== undefined && { published: data.published }),
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      return apiResponse({
        message: 'Post updated successfully',
        post,
      })
    },
    { strictRateLimit: true }
  )
}

/**
 * DELETE /api/posts/[id] - Delete a post
 * Protected: Requires API key and applies strict rate limiting
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return protectedRoute(
    request,
    async () => {
      const { id } = await params

      // Check if post exists
      const existingPost = await db.post.findUnique({ where: { id } })
      if (!existingPost) {
        return apiError('Post not found', 404)
      }

      // Delete post
      await db.post.delete({ where: { id } })

      return apiResponse({
        message: 'Post deleted successfully',
      })
    },
    { strictRateLimit: true }
  )
}
