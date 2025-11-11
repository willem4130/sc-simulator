'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import * as Sentry from '@sentry/nextjs'

export default function SentryTestPage() {
  const testClientError = () => {
    throw new Error('This is a test client-side error for Sentry')
  }

  const testCaptureException = () => {
    try {
      throw new Error('This is a manually captured error')
    } catch (error) {
      Sentry.captureException(error)
      alert('Error captured and sent to Sentry!')
    }
  }

  const testCaptureMessage = () => {
    Sentry.captureMessage('Test message from Sentry', 'info')
    alert('Message sent to Sentry!')
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sentry Error Tracking Test</CardTitle>
          <CardDescription>
            Use these buttons to test Sentry error tracking. Make sure NEXT_PUBLIC_SENTRY_DSN is
            configured in your environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Test Client-Side Error</h3>
            <p className="text-sm text-muted-foreground">
              This will throw an error that should be caught by the error boundary and sent to
              Sentry.
            </p>
            <Button onClick={testClientError} variant="destructive">
              Throw Client Error
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Test Manual Error Capture</h3>
            <p className="text-sm text-muted-foreground">
              This will manually capture an error and send it to Sentry without crashing the page.
            </p>
            <Button onClick={testCaptureException} variant="outline">
              Capture Exception
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Test Message Capture</h3>
            <p className="text-sm text-muted-foreground">
              This will send an informational message to Sentry.
            </p>
            <Button onClick={testCaptureMessage} variant="outline">
              Send Message
            </Button>
          </div>

          <div className="mt-6 rounded-md bg-muted p-4">
            <p className="text-sm">
              <strong>Note:</strong> After testing, check your Sentry dashboard at{' '}
              <a
                href="https://sentry.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                sentry.io
              </a>{' '}
              to see the captured errors.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
