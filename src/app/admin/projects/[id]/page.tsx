'use client'

import { use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/trpc/react'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  DollarSign,
  FileText,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Send,
  Loader2,
  ExternalLink,
  Activity,
  Workflow,
} from 'lucide-react'

type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'
type ContractStatus = 'PENDING' | 'SENT' | 'SIGNED' | 'REJECTED' | 'EXPIRED'
type HoursStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'INVOICED'
type InvoiceStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'PAID' | 'CANCELLED'
type AutomationStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'RETRYING'

const projectStatusConfig: Record<ProjectStatus, { icon: React.ElementType; color: string; bgColor: string }> = {
  ACTIVE: { icon: PlayCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  COMPLETED: { icon: CheckCircle2, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  ON_HOLD: { icon: PauseCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  CANCELLED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
}

const contractStatusConfig: Record<ContractStatus, { color: string; bgColor: string }> = {
  PENDING: { color: 'text-gray-600', bgColor: 'bg-gray-100' },
  SENT: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  SIGNED: { color: 'text-green-600', bgColor: 'bg-green-100' },
  REJECTED: { color: 'text-red-600', bgColor: 'bg-red-100' },
  EXPIRED: { color: 'text-orange-600', bgColor: 'bg-orange-100' },
}

const hoursStatusConfig: Record<HoursStatus, { color: string; bgColor: string }> = {
  PENDING: { color: 'text-gray-600', bgColor: 'bg-gray-100' },
  SUBMITTED: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  APPROVED: { color: 'text-green-600', bgColor: 'bg-green-100' },
  REJECTED: { color: 'text-red-600', bgColor: 'bg-red-100' },
  INVOICED: { color: 'text-purple-600', bgColor: 'bg-purple-100' },
}

const invoiceStatusConfig: Record<InvoiceStatus, { color: string; bgColor: string }> = {
  DRAFT: { color: 'text-gray-600', bgColor: 'bg-gray-100' },
  PENDING_APPROVAL: { color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  APPROVED: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  SENT: { color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  PAID: { color: 'text-green-600', bgColor: 'bg-green-100' },
  CANCELLED: { color: 'text-red-600', bgColor: 'bg-red-100' },
}

const automationStatusConfig: Record<AutomationStatus, { icon: React.ElementType; color: string }> = {
  PENDING: { icon: Clock, color: 'text-gray-500' },
  RUNNING: { icon: Loader2, color: 'text-blue-500' },
  SUCCESS: { icon: CheckCircle2, color: 'text-green-500' },
  FAILED: { icon: XCircle, color: 'text-red-500' },
  RETRYING: { icon: AlertCircle, color: 'text-yellow-500' },
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: project, isLoading, error } = api.projects.getById.useQuery({ id })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Project not found</h1>
            <p className="text-muted-foreground">
              The project you're looking for doesn't exist.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const StatusIcon = projectStatusConfig[project.status].icon
  const totalHours = project.hoursEntries.reduce((sum, entry) => sum + entry.hours, 0)
  const approvedHours = project.hoursEntries
    .filter((e) => e.status === 'APPROVED' || e.status === 'INVOICED')
    .reduce((sum, e) => sum + e.hours, 0)
  const totalInvoiced = project.invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const paidInvoices = project.invoices.filter((inv) => inv.status === 'PAID')
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0)
  const signedContracts = project.contracts.filter((c) => c.status === 'SIGNED').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/admin/projects">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge
                variant="outline"
                className={`${projectStatusConfig[project.status].bgColor} ${projectStatusConfig[project.status].color} border-0`}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {project.status.toLowerCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {project.projectNumber && (
                <span className="font-mono">#{project.projectNumber}</span>
              )}
              {project.clientName && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {project.clientName}
                </span>
              )}
              {project.startDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(project.startDate).toLocaleDateString()}
                  {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString()}`}
                </span>
              )}
            </div>
          </div>
        </div>

        <Link href={`/admin/workflows?project=${project.id}`}>
          <Button variant="outline" className="gap-2">
            <Workflow className="h-4 w-4" />
            Configure Workflows
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Logged</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Approved</span>
                <span>{approvedHours.toFixed(1)}h</span>
              </div>
              <Progress
                value={totalHours > 0 ? (approvedHours / totalHours) * 100 : 0}
                className="h-1.5"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {signedContracts}/{project.contracts.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {project.contracts.length > 0
                ? `${((signedContracts / project.contracts.length) * 100).toFixed(0)}% signed`
                : 'No contracts'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalInvoiced.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${totalPaid.toLocaleString()} paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation Runs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.automationLogs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {project.automationLogs.filter((l) => l.status === 'SUCCESS').length} successful
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {project.description && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {project.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed content */}
      <Tabs defaultValue="hours" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="h-4 w-4" />
            Hours ({project.hoursEntries.length})
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2">
            <FileText className="h-4 w-4" />
            Contracts ({project.contracts.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Invoices ({project.invoices.length})
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Activity className="h-4 w-4" />
            Automation ({project.automationLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* Hours Tab */}
        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>Hours Entries</CardTitle>
              <CardDescription>
                All time tracking entries for this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.hoursEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hours logged yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.hoursEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {entry.user.name || entry.user.email}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {entry.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.hours.toFixed(1)}h
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {entry.salesRate ? `€${entry.salesRate}/h` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${hoursStatusConfig[entry.status].bgColor} ${hoursStatusConfig[entry.status].color} border-0`}
                            >
                              {entry.status.toLowerCase().replace('_', ' ')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle>Contracts</CardTitle>
              <CardDescription>
                Contract distribution and signing status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.contracts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No contracts created yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Signed</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.contracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">
                            {contract.templateName}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {contract.user.name || contract.user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${contractStatusConfig[contract.status].bgColor} ${contractStatusConfig[contract.status].color} border-0`}
                            >
                              {contract.status.toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {contract.sentAt
                              ? new Date(contract.sentAt).toLocaleDateString()
                              : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {contract.signedAt
                              ? new Date(contract.signedAt).toLocaleDateString()
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {contract.signedDocumentUrl && (
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={contract.signedDocumentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Invoice history and payment status</CardDescription>
            </CardHeader>
            <CardContent>
              {project.invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices created yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono">
                            {invoice.invoiceNumber || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(invoice.periodStart).toLocaleDateString()} -{' '}
                            {new Date(invoice.periodEnd).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {invoice.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${invoice.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${invoiceStatusConfig[invoice.status].bgColor} ${invoiceStatusConfig[invoice.status].color} border-0`}
                            >
                              {invoice.status.toLowerCase().replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {invoice.dueDate
                              ? new Date(invoice.dueDate).toLocaleDateString()
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle>Automation History</CardTitle>
              <CardDescription>
                Recent workflow executions for this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.automationLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No automation runs yet</p>
                  <p className="text-sm mt-2">
                    Configure workflows to start automating this project
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.automationLogs.map((log) => {
                    const StatusIcon = automationStatusConfig[log.status].icon
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        <StatusIcon
                          className={`h-5 w-5 mt-0.5 ${automationStatusConfig[log.status].color} ${log.status === 'RUNNING' ? 'animate-spin' : ''}`}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">
                              {log.workflowType.replace('_', ' ')}
                            </p>
                            <span className="text-sm text-muted-foreground">
                              {new Date(log.startedAt).toLocaleString()}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : log.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'} border-0`}
                          >
                            {log.status.toLowerCase()}
                          </Badge>
                          {log.error && (
                            <p className="text-sm text-red-600 mt-2">{log.error}</p>
                          )}
                          {log.completedAt && (
                            <p className="text-xs text-muted-foreground">
                              Duration:{' '}
                              {Math.round(
                                (new Date(log.completedAt).getTime() -
                                  new Date(log.startedAt).getTime()) /
                                  1000
                              )}
                              s
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
