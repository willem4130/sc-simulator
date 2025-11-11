import { NextRequest } from 'next/server'
import { apiResponse } from '@/lib/api-middleware'
import { db } from '@/server/db'

/**
 * GET /api/health - Health check endpoint
 * Public: No authentication required
 * Tests database connection and returns system status
 */
export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await db.$queryRaw`SELECT 1`

    return apiResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
    })
  } catch (error) {
    return apiResponse(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      503
    )
  }
}
