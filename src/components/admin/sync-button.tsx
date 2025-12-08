'use client'

import { RefreshCw, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { api } from '@/trpc/react'
import { useState } from 'react'

export function SyncButton() {
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const utils = api.useUtils()
  const { data: syncStatus } = api.sync.getSyncStatus.useQuery()

  const syncMutation = api.sync.syncAll.useMutation({
    onSuccess: (data) => {
      setLastSyncResult({
        success: true,
        message: data.message,
      })
      // Invalidate all queries to refresh data
      utils.invalidate()
      // Clear success message after 5 seconds
      setTimeout(() => setLastSyncResult(null), 5000)
    },
    onError: (error) => {
      setLastSyncResult({
        success: false,
        message: error.message,
      })
      // Clear error message after 10 seconds
      setTimeout(() => setLastSyncResult(null), 10000)
    },
  })

  const formatLastSync = () => {
    if (!syncStatus?.lastSyncedAt) return 'Never synced'
    const date = new Date(syncStatus.lastSyncedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={lastSyncResult?.success === false ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-2"
          >
            {syncMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : lastSyncResult?.success === true ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : lastSyncResult?.success === false ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {syncMutation.isPending ? 'Syncing...' : 'Sync'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {lastSyncResult ? (
            <p className={lastSyncResult.success ? 'text-green-600' : 'text-red-600'}>
              {lastSyncResult.message}
            </p>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">Sync All from Simplicate</p>
              <p className="text-xs text-muted-foreground">
                Last sync: {formatLastSync()}
              </p>
              {syncStatus && (
                <p className="text-xs text-muted-foreground">
                  {syncStatus.totalProjects} projects, {syncStatus.syncedUsers} users
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Non-destructive: updates existing data
              </p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
