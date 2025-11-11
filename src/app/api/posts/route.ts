import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/server/db'
import { protectedRoute, apiResponse, validateRequest } from '@/lib/api-middleware'

/**
 * POST /api/posts - Create a new post
 * Protected: Requires API key and applies strict rate limiting
 */
const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().optional(),
  authorId: z.string().min(1, 'Author ID is required'),
})

export async function POST(request: NextRequest) {
  return protectedRoute(
    request,
    async (req) => {
      // Validate request body
      const { data, error } = await validateRequest(req, createPostSchema)
      if (error) return error

      // Create post in database
      const post = await db.post.create({
        data: {
          title: data.title,
          content: data.content,
          authorId: data.authorId,
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

      return apiResponse(
        {
          message: 'Post created successfully',
          post,
        },
        201
      )
    },
    { strictRateLimit: true }
  )
}

/**
 * GET /api/posts - List all posts
 * Protected: Requires API key, standard rate limiting
 * Supports pagination via query params: ?page=1&limit=10
 */
export async function GET(request: NextRequest) {
  return protectedRoute(request, async (req) => {
    // Get pagination params
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100) // Max 100 per page

    const skip = (page - 1) * limit

    // Get posts with pagination
    const [posts, total] = await Promise.all([
      db.post.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.post.count(),
    ])

    return apiResponse({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  })
}
