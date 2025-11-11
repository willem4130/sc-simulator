import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  /**
   * Server-side environment variables schema
   */
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),
  },

  /**
   * Client-side environment variables schema
   * Must be prefixed with NEXT_PUBLIC_
   */
  client: {
    // NEXT_PUBLIC_APP_URL: z.string().url(),
  },

  /**
   * Runtime environment variables
   * You can't destructure `process.env` as a regular object in Next.js edge runtimes
   * so we need to destructure manually
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    // NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /**
   * Skip validation in build (for Docker builds)
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Makes it so that empty strings are treated as undefined
   */
  emptyStringAsUndefined: true,
})
