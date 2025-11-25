'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MoreHorizontal,
  Clock,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  Timer,
  AlertTriangle,
  Briefcase,
} from 'lucide-react'
import { api } from '@/trpc/react'
import { useState } from 'react'

const statusConfig = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
  SUBMITTED: { label: 'Submitted', variant: 'default' as const, icon: Send },
  APPROVED: { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
  REJECTED: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
  INVOICED: { label: 'Invoiced', variant: 'outline' as const, icon: FileText },
}

export default function HoursPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: hoursData, isLoading } = api.hours.getAll.useQuery({
    page,
    limit: 20,
    status: statusFilter !== 'all' ? (statusFilter as 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'INVOICED') : undefined,
  })
  const { data: stats } = api.hours.getStats.useQuery()
  const { data: services, isLoading: servicesLoading } = api.hours.getServices.useQuery()
  const { data: servicesStats } = api.hours.getServicesStats.useQuery()

  const syncHours = api.sync.syncHours.useMutation()
  const syncServices = api.sync.syncServices.useMutation()
  const utils = api.useUtils()

  const entries = hoursData?.entries ?? []
  const pagination = hoursData?.pagination

  const handleSyncAll = async () => {
    try {
      await syncServices.mutateAsync()
      await syncHours.mutateAsync()
      utils.hours.invalidate()
    } catch (error) {
      console.error('Failed to sync:', error)
    }
  }

  const getBudgetColor = (percentage: number | null) => {
    if (percentage === null) return 'bg-gray-200'
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 90) return 'bg-orange-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getBudgetStatus = (percentage: number | null) => {
    if (percentage === null) return { label: 'No budget', variant: 'secondary' as const }
    if (percentage >= 100) return { label: 'Over budget', variant: 'destructive' as const }
    if (percentage >= 90) return { label: 'At risk', variant: 'default' as const }
    return { label: 'On track', variant: 'outline' as const }
  }

  const isSyncing = syncHours.isPending || syncServices.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hours & Diensten</h1>
          <p className="text-muted-foreground">Track time entries and budget per dienst</p>
        </div>
        <Button onClick={handleSyncAll} disabled={isSyncing}>
          {isSyncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync All
        </Button>
      </div>

      {/* Services Alert if at risk */}
      {servicesStats && servicesStats.servicesAtRisk > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium">{servicesStats.servicesAtRisk} dienst(en) at risk</p>
                <p className="text-sm text-muted-foreground">
                  Budget usage above 90% - review and take action
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="diensten" className="space-y-6">
        <TabsList>
          <TabsTrigger value="diensten">
            <Briefcase className="mr-2 h-4 w-4" />
            Diensten
            {servicesStats && (
              <Badge variant="secondary" className="ml-2">{servicesStats.totalServices}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="entries">
            <Clock className="mr-2 h-4 w-4" />
            Time Entries
          </TabsTrigger>
        </TabsList>

        {/* Diensten Tab */}
        <TabsContent value="diensten" className="space-y-6">
          {/* Budget Overview */}
          {servicesStats && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Diensten</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{servicesStats.totalServices}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Budget Hours</CardTitle>
                  <Timer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{servicesStats.totalBudgetHours.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Used Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{servicesStats.totalUsedHours.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">{servicesStats.overallPercentage}% of budget</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{servicesStats.servicesAtRisk}</div>
                  <p className="text-xs text-muted-foreground">90%+ budget used</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Diensten List */}
          <Card>
            <CardHeader>
              <CardTitle>Diensten Overview</CardTitle>
              <CardDescription>All services with budget tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !services || services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">No diensten found</h3>
                  <p className="text-muted-foreground">Sync from Simplicate to see diensten</p>
                  <Button variant="outline" className="mt-4" onClick={handleSyncAll} disabled={isSyncing}>
                    {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Sync Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => {
                    const budgetStatus = getBudgetStatus(service.budgetPercentage)
                    return (
                      <div key={service.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{service.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {service.project.name} • {service.project.clientName || 'No client'}
                            </p>
                          </div>
                          <Badge variant={budgetStatus.variant}>{budgetStatus.label}</Badge>
                        </div>

                        {service.budgetHours && service.budgetHours > 0 ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{service.usedHours.toFixed(1)} / {service.budgetHours} hours</span>
                              <span className="font-medium">{service.budgetPercentage}%</span>
                            </div>
                            <Progress
                              value={Math.min(service.budgetPercentage || 0, 100)}
                              className={`h-2 ${service.budgetPercentage && service.budgetPercentage >= 90 ? '[&>div]:bg-orange-500' : service.budgetPercentage && service.budgetPercentage >= 100 ? '[&>div]:bg-red-500' : ''}`}
                            />
                            <p className="text-xs text-muted-foreground">
                              {service.remainingHours && service.remainingHours > 0
                                ? `${service.remainingHours.toFixed(1)} hours remaining`
                                : service.remainingHours && service.remainingHours < 0
                                ? `${Math.abs(service.remainingHours).toFixed(1)} hours over budget`
                                : 'Budget exhausted'}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No budget set • {service.usedHours.toFixed(1)} hours logged</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Entries Tab */}
        <TabsContent value="entries" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEntries ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.totalHours ?? 0).toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.hoursThisWeek ?? 0).toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approved ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Hours Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Time Entries</CardTitle>
              <CardDescription>All hours logged by team members</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="INVOICED">Invoiced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No hours found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all'
                  ? 'No entries match the selected filter'
                  : 'Sync hours from Simplicate to see time entries'}
              </p>
              <Button variant="outline" className="mt-4" onClick={handleSyncAll} disabled={syncHours.isPending}>
                {syncHours.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync Now
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const status = statusConfig[entry.status]
                    const StatusIcon = status.icon
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.user.name ?? 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{entry.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.project.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {entry.project.clientName ?? '—'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {entry.description || '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.hours.toFixed(1)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>View details</DropdownMenuItem>
                              <DropdownMenuItem>Approve</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
