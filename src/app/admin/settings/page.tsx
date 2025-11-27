'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Bell, Lock, Palette, Globe, Database, Shield, RefreshCw, Users, AlertTriangle, Clock, FileText, Briefcase } from 'lucide-react'
import { api } from '@/trpc/react'
import { useState, useEffect } from 'react'

export default function SettingsPage() {
  // Simplicate Sync state
  const [isSyncingProjects, setIsSyncingProjects] = useState(false)
  const [isSyncingEmployees, setIsSyncingEmployees] = useState(false)
  const [isSyncingServices, setIsSyncingServices] = useState(false)
  const [isSyncingHours, setIsSyncingHours] = useState(false)
  const [isSyncingInvoices, setIsSyncingInvoices] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  // Settings form state
  const [siteName, setSiteName] = useState('')
  const [siteUrl, setSiteUrl] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [theme, setTheme] = useState('light')
  const [accentColor, setAccentColor] = useState('#000000')

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = api.settings.getSettings.useQuery()
  const { data: dbStatus } = api.settings.getDatabaseStatus.useQuery()

  // Update mutations
  const updateGeneral = api.settings.updateGeneral.useMutation({
    onSuccess: () => {
      alert('✅ General settings saved successfully!')
    },
    onError: (error) => {
      alert(`❌ Failed to save: ${error.message}`)
    },
  })

  const updateAppearance = api.settings.updateAppearance.useMutation({
    onSuccess: () => {
      alert('✅ Appearance settings saved successfully!')
    },
    onError: (error) => {
      alert(`❌ Failed to save: ${error.message}`)
    },
  })

  // Load settings into state when data arrives
  useEffect(() => {
    if (settings) {
      setSiteName(settings.siteName)
      setSiteUrl(settings.siteUrl || '')
      setTimezone(settings.timezone)
      setTheme(settings.theme)
      setAccentColor(settings.accentColor)
    }
  }, [settings])

  // Simplicate sync
  const { data: syncStatus, refetch: refetchStatus } = api.sync.getSyncStatus.useQuery()
  const syncProjects = api.sync.syncProjects.useMutation({
    onSuccess: (data) => {
      setIsSyncingProjects(false)
      setSyncMessage(
        `✅ Projects sync complete! Created: ${data.created}, Updated: ${data.updated}, Total: ${data.totalProcessed}`
      )
      refetchStatus()
      setTimeout(() => setSyncMessage(null), 10000)
    },
    onError: (error) => {
      setIsSyncingProjects(false)
      setSyncMessage(`❌ Projects sync failed: ${error.message}`)
      setTimeout(() => setSyncMessage(null), 10000)
    },
  })

  const syncEmployees = api.sync.syncEmployees.useMutation({
    onSuccess: (data) => {
      setIsSyncingEmployees(false)
      const errorInfo = data.errors.length > 0 ? ` (${data.errors.length} skipped)` : ''
      setSyncMessage(
        `✅ Employees sync complete! Created: ${data.created}, Updated: ${data.updated}, Total: ${data.totalProcessed}${errorInfo}`
      )
      refetchStatus()
      setTimeout(() => setSyncMessage(null), 10000)
    },
    onError: (error) => {
      setIsSyncingEmployees(false)
      setSyncMessage(`❌ Employees sync failed: ${error.message}`)
      setTimeout(() => setSyncMessage(null), 10000)
    },
  })

  const syncServices = api.sync.syncServices.useMutation({
    onSuccess: (data) => {
      setIsSyncingServices(false)
      setSyncMessage(
        `✅ Services sync complete! Created: ${data.created}, Updated: ${data.updated}, Skipped: ${data.skipped}`
      )
      setTimeout(() => setSyncMessage(null), 10000)
    },
    onError: (error) => {
      setIsSyncingServices(false)
      setSyncMessage(`❌ Services sync failed: ${error.message}`)
      setTimeout(() => setSyncMessage(null), 10000)
    },
  })

  const syncHours = api.sync.syncHours.useMutation({
    onSuccess: (data) => {
      setIsSyncingHours(false)
      const financialsInfo = data.financialsCalculated ? ` (${data.financialsCalculated} with financials)` : ''
      setSyncMessage(
        `✅ Hours sync complete! Created: ${data.created}, Updated: ${data.updated}${financialsInfo}`
      )
      setTimeout(() => setSyncMessage(null), 10000)
    },
    onError: (error) => {
      setIsSyncingHours(false)
      setSyncMessage(`❌ Hours sync failed: ${error.message}`)
      setTimeout(() => setSyncMessage(null), 10000)
    },
  })

  const syncInvoices = api.sync.syncInvoices.useMutation({
    onSuccess: (data) => {
      setIsSyncingInvoices(false)
      setSyncMessage(
        `✅ Invoices sync complete! Created: ${data.created}, Updated: ${data.updated}, Skipped: ${data.skipped}`
      )
      setTimeout(() => setSyncMessage(null), 10000)
    },
    onError: (error) => {
      setIsSyncingInvoices(false)
      setSyncMessage(`❌ Invoices sync failed: ${error.message}`)
      setTimeout(() => setSyncMessage(null), 10000)
    },
  })

  const handleSyncProjects = () => {
    setIsSyncingProjects(true)
    setSyncMessage(null)
    syncProjects.mutate()
  }

  const handleSyncEmployees = () => {
    setIsSyncingEmployees(true)
    setSyncMessage(null)
    syncEmployees.mutate()
  }

  const handleSyncServices = () => {
    setIsSyncingServices(true)
    setSyncMessage(null)
    syncServices.mutate()
  }

  const handleSyncHours = () => {
    setIsSyncingHours(true)
    setSyncMessage(null)
    syncHours.mutate()
  }

  const handleSyncInvoices = () => {
    setIsSyncingInvoices(true)
    setSyncMessage(null)
    syncInvoices.mutate()
  }

  const isSyncing = isSyncingProjects || isSyncingEmployees || isSyncingServices || isSyncingHours || isSyncingInvoices || isResetting

  // Reset and sync mutation
  const resetAndSync = api.sync.resetAndSync.useMutation({
    onSuccess: (data) => {
      setIsResetting(false)
      setSyncMessage(
        `✅ ${data.message}${data.errors.length > 0 ? ` (${data.errors.length} warnings)` : ''}`
      )
      refetchStatus()
      setTimeout(() => setSyncMessage(null), 15000)
    },
    onError: (error) => {
      setIsResetting(false)
      setSyncMessage(`❌ Reset failed: ${error.message}`)
      setTimeout(() => setSyncMessage(null), 10000)
    },
  })

  const handleResetAndSync = () => {
    if (!confirm('⚠️ This will DELETE all existing data (projects, users, contracts, hours, invoices) and re-sync from Simplicate.\n\nAre you sure you want to continue?')) {
      return
    }
    setIsResetting(true)
    setSyncMessage('🔄 Resetting database and syncing from Simplicate...')
    resetAndSync.mutate()
  }

  const handleSaveGeneral = () => {
    updateGeneral.mutate({
      siteName,
      siteUrl: siteUrl || null,
      timezone,
    })
  }

  const handleSaveAppearance = () => {
    updateAppearance.mutate({
      theme: theme as 'light' | 'dark' | 'system',
      accentColor,
    })
  }

  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application settings and preferences</p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>General Settings</CardTitle>
            </div>
            <CardDescription>Configure general application settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                placeholder="Enter site name"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="siteUrl">Site URL</Label>
              <Input
                id="siteUrl"
                type="url"
                placeholder="https://example.com"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone.toLowerCase()} onValueChange={(value) => setTimezone(value)}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC (Coordinated Universal Time)</SelectItem>
                  <SelectItem value="est">EST (Eastern Standard Time)</SelectItem>
                  <SelectItem value="pst">PST (Pacific Standard Time)</SelectItem>
                  <SelectItem value="cet">CET (Central European Time)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveGeneral} disabled={updateGeneral.isPending}>
                {updateGeneral.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Simplicate Sync */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              <CardTitle>Simplicate Sync</CardTitle>
            </div>
            <CardDescription>Import projects and employees from Simplicate to your database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncMessage && (
              <div className="rounded-lg border bg-muted p-3 text-sm">{syncMessage}</div>
            )}

            {/* Projects Sync */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Projects
                </Label>
                {syncStatus?.hasBeenSynced ? (
                  <p className="text-sm text-muted-foreground">
                    Last synced:{' '}
                    {syncStatus.lastSyncedAt
                      ? new Date(syncStatus.lastSyncedAt).toLocaleString()
                      : 'Never'}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No projects synced yet</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Total projects: {syncStatus?.totalProjects || 0}
                </p>
              </div>
              <Button onClick={handleSyncProjects} disabled={isSyncing} size="sm">
                {isSyncingProjects ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Projects
                  </>
                )}
              </Button>
            </div>

            {/* Employees Sync */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Employees
                </Label>
                <p className="text-sm text-muted-foreground">
                  Synced employees: {syncStatus?.syncedUsers || 0} / {syncStatus?.totalUsers || 0} users
                </p>
              </div>
              <Button onClick={handleSyncEmployees} disabled={isSyncing} size="sm">
                {isSyncingEmployees ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Sync Employees
                  </>
                )}
              </Button>
            </div>

            {/* Services Sync */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Services (Diensten)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Project services with budgets and hourly rates
                </p>
              </div>
              <Button onClick={handleSyncServices} disabled={isSyncing} size="sm">
                {isSyncingServices ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Briefcase className="mr-2 h-4 w-4" />
                    Sync Services
                  </>
                )}
              </Button>
            </div>

            {/* Hours Sync */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hours
                </Label>
                <p className="text-sm text-muted-foreground">
                  Hours entries with revenue, cost, and margin calculations
                </p>
              </div>
              <Button onClick={handleSyncHours} disabled={isSyncing} size="sm">
                {isSyncingHours ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Sync Hours
                  </>
                )}
              </Button>
            </div>

            {/* Invoices Sync */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Invoices
                </Label>
                <p className="text-sm text-muted-foreground">
                  Sales invoices from Simplicate
                </p>
              </div>
              <Button onClick={handleSyncInvoices} disabled={isSyncing} size="sm">
                {isSyncingInvoices ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Sync Invoices
                  </>
                )}
              </Button>
            </div>

            <Separator />

            {/* Reset & Sync */}
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Reset & Sync Fresh
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Delete all existing data and re-import everything from Simplicate
                  </p>
                </div>
                <Button
                  onClick={handleResetAndSync}
                  disabled={isSyncing}
                  variant="destructive"
                  size="sm"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Reset & Sync
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>What gets synced:</strong>
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li><strong>Projects:</strong> Names, descriptions, clients, status, dates, project numbers</li>
                <li><strong>Employees:</strong> Names, emails, cost rates (from timetables)</li>
                <li><strong>Services:</strong> Project services with budgets and default rates</li>
                <li><strong>Hours:</strong> Time entries with revenue, cost, and margin calculations</li>
                <li><strong>Invoices:</strong> Sales invoices with amounts and status</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Customize the look and feel of your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="theme">Theme</Label>
              <Select value={theme} onValueChange={(value) => setTheme(value)}>
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-2">
                {['#18181b', '#3b82f6', '#22c55e', '#a855f7', '#ef4444'].map((color) => (
                  <button
                    key={color}
                    className={`h-10 w-10 rounded-md border ${
                      accentColor === color ? 'ring-2 ring-offset-2 ring-black' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setAccentColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveAppearance} disabled={updateAppearance.isPending}>
                {updateAppearance.isPending ? 'Saving...' : 'Save Appearance'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Manage your security settings and authentication</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Badge variant="secondary">Disabled</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Session Management</Label>
                <p className="text-sm text-muted-foreground">
                  Manage your active sessions across devices
                </p>
              </div>
              <Button variant="outline" size="sm">
                Manage
              </Button>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Change Password</Label>
              <Input id="currentPassword" type="password" placeholder="Current password" />
              <Input id="newPassword" type="password" placeholder="New password" />
              <Input id="confirmPassword" type="password" placeholder="Confirm new password" />
              <div className="flex justify-end">
                <Button>Update Password</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Configure how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Badge>Enabled</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive push notifications</p>
              </div>
              <Badge>Enabled</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">
                  Receive marketing and promotional emails
                </p>
              </div>
              <Badge variant="secondary">Disabled</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Database</CardTitle>
            </div>
            <CardDescription>Database connection and backup settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Connection Status</Label>
                <p className="text-sm text-muted-foreground">
                  {dbStatus?.message || 'Checking connection...'}
                </p>
              </div>
              <Badge className={dbStatus?.connected ? 'bg-green-500' : 'bg-red-500'}>
                {dbStatus?.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Database Provider</Label>
                <p className="text-sm text-muted-foreground">
                  {dbStatus?.provider || 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
