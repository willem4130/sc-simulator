'use client'

import { use, useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Clock, Car, Receipt, User, AlertCircle, Calendar, FileUp } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatHours(hours: number) {
  return hours.toFixed(1).replace('.', ',')
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
}

function getStatusBadge(status: string) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    PENDING: { variant: 'secondary', label: 'In behandeling' },
    SUBMITTED: { variant: 'secondary', label: 'Ingediend' },
    APPROVED: { variant: 'default', label: 'Goedgekeurd' },
    REJECTED: { variant: 'destructive', label: 'Afgekeurd' },
    INVOICED: { variant: 'outline', label: 'Gefactureerd' },
  }
  const config = variants[status] || { variant: 'secondary' as const, label: status }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export default function EmployeePortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  // Validate token and get employee info
  const { data: tokenData, isLoading: isValidating } = api.employeePortal.validateToken.useQuery(
    { token },
    { retry: false }
  )

  // Get available months
  const { data: months } = api.employeePortal.getAvailableMonths.useQuery(
    { token },
    { enabled: tokenData?.valid === true }
  )

  // Get hours for selected month (or all)
  const { data: hoursData, isLoading: hoursLoading } = api.employeePortal.getMyHours.useQuery(
    { token, month: selectedMonth === 'all' ? undefined : selectedMonth },
    { enabled: tokenData?.valid === true }
  )

  // Get expenses for selected month
  const { data: expensesData, isLoading: expensesLoading } = api.employeePortal.getMyExpenses.useQuery(
    { token, month: selectedMonth === 'all' ? undefined : selectedMonth },
    { enabled: tokenData?.valid === true }
  )

  // Get document requests
  const { data: documentRequests } = api.employeePortal.getMyDocumentRequests.useQuery(
    { token },
    { enabled: tokenData?.valid === true }
  )

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  // Invalid token
  if (!tokenData?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Ongeldige Link</CardTitle>
            </div>
            <CardDescription>
              {tokenData?.error === 'Token expired'
                ? 'Deze link is verlopen. Vraag een nieuwe link aan bij je werkgever.'
                : 'Deze link is niet geldig. Controleer of je de volledige URL hebt gekopieerd.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const employee = tokenData.employee

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{employee?.name || 'Medewerker'}</h1>
              <p className="text-sm text-muted-foreground">{employee?.email}</p>
            </div>
          </div>
          <Badge variant="outline">{employee?.employeeType || 'Medewerker'}</Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl p-4 md:p-8">
        {/* Month Filter */}
        <div className="mb-6 flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Alle periodes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle periodes</SelectItem>
              {months?.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Uren</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {hoursLoading ? <Skeleton className="h-8 w-16" /> : formatHours(hoursData?.summary.totalHours || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {hoursData?.summary.totalEntries || 0} registraties
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kilometers</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expensesLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  expensesData?.kilometers.totalKm.toLocaleString('nl-NL')
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(expensesData?.kilometers.totalAmount || 0)} vergoeding
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Onkosten</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expensesLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  formatCurrency(expensesData?.expenses.totalAmount || 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {expensesData?.expenses.entries.length || 0} declaraties
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Documenten</CardTitle>
              <FileUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documentRequests?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {documentRequests?.filter((d) => d.status === 'PENDING').length || 0} wachtend
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="hours" className="space-y-4">
          <TabsList>
            <TabsTrigger value="hours">Uren</TabsTrigger>
            <TabsTrigger value="kilometers">Kilometers</TabsTrigger>
            <TabsTrigger value="expenses">Onkosten</TabsTrigger>
            <TabsTrigger value="documents">Documenten</TabsTrigger>
          </TabsList>

          {/* Hours Tab */}
          <TabsContent value="hours" className="space-y-4">
            {/* Summary by project */}
            {hoursData?.summary.byProject && hoursData.summary.byProject.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Uren per project</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {hoursData.summary.byProject.map((project) => (
                      <div key={project.projectId} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{project.projectName}</span>
                          {project.clientName && (
                            <span className="ml-2 text-sm text-muted-foreground">({project.clientName})</span>
                          )}
                        </div>
                        <span className="font-mono">{formatHours(project.totalHours)} uur</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hours list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recente urenregistraties</CardTitle>
              </CardHeader>
              <CardContent>
                {hoursLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : hoursData?.entries.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">Geen uren gevonden</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Omschrijving</TableHead>
                        <TableHead className="text-right">Uren</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hoursData?.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(entry.date)}</TableCell>
                          <TableCell>
                            <div className="font-medium">{entry.projectName}</div>
                            {entry.serviceName && (
                              <div className="text-xs text-muted-foreground">{entry.serviceName}</div>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{entry.description || '-'}</TableCell>
                          <TableCell className="text-right font-mono">{formatHours(entry.hours)}</TableCell>
                          <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Kilometers Tab */}
          <TabsContent value="kilometers">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kilometerregistraties</CardTitle>
                <CardDescription>
                  Vergoeding: {formatCurrency(expensesData?.kilometers.kmRate || 0.23)} per km
                </CardDescription>
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : expensesData?.kilometers.entries.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">Geen kilometers gevonden</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Omschrijving</TableHead>
                        <TableHead className="text-right">Km</TableHead>
                        <TableHead className="text-right">Bedrag</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expensesData?.kilometers.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(entry.date)}</TableCell>
                          <TableCell>{entry.projectName}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{entry.description || '-'}</TableCell>
                          <TableCell className="text-right font-mono">{entry.km}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(entry.km * (expensesData?.kilometers.kmRate || 0.23))}
                          </TableCell>
                          <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Onkostendeclaraties</CardTitle>
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : expensesData?.expenses.entries.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">Geen onkosten gevonden</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Categorie</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Omschrijving</TableHead>
                        <TableHead className="text-right">Bedrag</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expensesData?.expenses.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(entry.date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{entry.category}</Badge>
                          </TableCell>
                          <TableCell>{entry.projectName}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{entry.description || '-'}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(entry.amount)}</TableCell>
                          <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document verzoeken</CardTitle>
                <CardDescription>Openstaande verzoeken om documenten te uploaden</CardDescription>
              </CardHeader>
              <CardContent>
                {documentRequests?.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">Geen documentverzoeken</p>
                ) : (
                  <div className="space-y-4">
                    {documentRequests?.map((request) => (
                      <div
                        key={request.id}
                        className={cn(
                          'rounded-lg border p-4',
                          request.status === 'PENDING' && 'border-yellow-200 bg-yellow-50'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{request.type}</span>
                              <Badge
                                variant={
                                  request.status === 'PENDING'
                                    ? 'secondary'
                                    : request.status === 'UPLOADED'
                                      ? 'default'
                                      : request.status === 'VERIFIED'
                                        ? 'outline'
                                        : 'destructive'
                                }
                              >
                                {request.status === 'PENDING'
                                  ? 'Wachtend'
                                  : request.status === 'UPLOADED'
                                    ? 'Geupload'
                                    : request.status === 'VERIFIED'
                                      ? 'Goedgekeurd'
                                      : 'Afgekeurd'}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{request.projectName}</p>
                            {request.description && (
                              <p className="mt-2 text-sm">{request.description}</p>
                            )}
                          </div>
                          {request.status === 'PENDING' && (
                            <a
                              href={`/upload/${request.uploadToken}`}
                              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            >
                              Upload
                            </a>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Aangevraagd op {formatDate(request.requestedAt)}
                          {request.uploadedAt && ` - Geupload op ${formatDate(request.uploadedAt)}`}
                          {request.documentName && ` - ${request.documentName}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">
        <p>
          Link geldig tot{' '}
          {new Date(tokenData.expiresAt!).toLocaleDateString('nl-NL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </footer>
    </div>
  )
}
