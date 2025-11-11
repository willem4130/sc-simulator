'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">Something went wrong!</CardTitle>
          <CardDescription>
            We've been notified and are looking into it. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <p className="text-sm font-mono text-muted-foreground">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => reset()} className="flex-1">
              Try again
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = '/')} className="flex-1">
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
