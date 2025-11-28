'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Clock,
  Users,
  Building2,
  Loader2,
  Calendar,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { api } from '@/trpc/react'
import { useState, useMemo } from 'react'

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format percentage
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

// Get margin status color
function getMarginColor(marginPercent: number): string {
  if (marginPercent >= 40) return 'text-green-600'
  if (marginPercent >= 25) return 'text-yellow-600'
  return 'text-red-600'
}

function getMarginBadgeVariant(marginPercent: number): 'default' | 'secondary' | 'destructive' {
  if (marginPercent >= 40) return 'default'
  if (marginPercent >= 25) return 'secondary'
  return 'destructive'
}

export default function FinancialsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  // Get available months
  const { data: months, isLoading: monthsLoading } = api.financials.getAvailableMonths.useQuery({
    limit: 12,
  })

  // Get overview for selected month
  const { data: overview, isLoading: overviewLoading } = api.financials.getOverview.useQuery(
    { month: selectedMonth },
    { enabled: !!selectedMonth }
  )

  // Get by project
  const { data: projectData, isLoading: projectsLoading } = api.financials.getByProject.useQuery(
    { month: selectedMonth, limit: 20 },
    { enabled: !!selectedMonth }
  )

  // Get by employee
  const { data: employeeData, isLoading: employeesLoading } = api.financials.getByEmployee.useQuery(
    { month: selectedMonth, limit: 20 },
    { enabled: !!selectedMonth }
  )

  // Get monthly trend
  const { data: trendData } = api.financials.getMonthlyTrend.useQuery({ months: 6 })

  // Set default month when months load
  useMemo(() => {
    if (months && months.length > 0 && !selectedMonth) {
      const firstWithData = months.find(m => m.hasData)
      if (firstWithData) {
        setSelectedMonth(firstWithData.value)
      }
    }
  }, [months, selectedMonth])

  // Calculate trend comparison
  const previousMonth = trendData && trendData.length >= 2 ? trendData[trendData.length - 2] : null
  const currentMonth = trendData && trendData.length >= 1 ? trendData[trendData.length - 1] : null

  const revenueChange = previousMonth && currentMonth && previousMonth.revenue > 0
    ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100
    : 0

  const marginChange = previousMonth && currentMonth
    ? currentMonth.marginPercentage - previousMonth.marginPercentage
    : 0

  const isLoading = overviewLoading || projectsLoading || employeesLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financieel Overzicht</h1>
          <p className="text-muted-foreground">
            Omzet, kosten en marges per project en medewerker
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder={monthsLoading ? 'Laden...' : 'Selecteer maand'} />
          </SelectTrigger>
          <SelectContent>
            {months?.map((month) => (
              <SelectItem
                key={month.value}
                value={month.value}
                disabled={!month.hasData}
              >
                {month.label}
                {!month.hasData && ' (geen data)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      {selectedMonth && overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Omzet</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview.totalRevenue)}</div>
              {revenueChange !== 0 && (
                <p className={`text-xs flex items-center mt-1 ${revenueChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {revenueChange > 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {formatPercent(Math.abs(revenueChange))} vs vorige maand
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kosten</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview.totalCost)}</div>
              <p className="text-xs text-muted-foreground">
                {overview.employeeCount} medewerkers
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Marge</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview.totalMargin)}</div>
              <p className={`text-xs flex items-center mt-1 ${getMarginColor(overview.marginPercentage)}`}>
                <Percent className="h-3 w-3 mr-1" />
                {formatPercent(overview.marginPercentage)} marge
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uren</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalHours.toFixed(0)}u</div>
              <p className="text-xs text-muted-foreground">
                {overview.projectCount} projecten
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Trend Mini Chart */}
      {trendData && trendData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Maandelijks Verloop</CardTitle>
            <CardDescription>Omzet en marge per maand</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {trendData.map((month, idx) => {
                const maxRevenue = Math.max(...trendData.map(m => m.revenue))
                const heightPercent = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0
                return (
                  <div key={month.month} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center gap-1">
                      <span className={`text-xs font-medium ${getMarginColor(month.marginPercentage)}`}>
                        {formatPercent(month.marginPercentage)}
                      </span>
                      <div
                        className="w-full bg-primary/80 rounded-t"
                        style={{ height: `${Math.max(heightPercent, 4)}px` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground mt-2">{month.label.split(' ')[0]}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project and Employee Tables */}
      {selectedMonth && (
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="projects" className="gap-2">
              <Building2 className="h-4 w-4" />
              Per Project
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <Users className="h-4 w-4" />
              Per Medewerker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>Projecten</CardTitle>
                <CardDescription>Financieel overzicht per project</CardDescription>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !projectData?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg">Geen data</h3>
                    <p className="text-muted-foreground">
                      Geen financiele data gevonden voor deze periode
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Uren</TableHead>
                        <TableHead className="text-right">Omzet</TableHead>
                        <TableHead className="text-right">Kosten</TableHead>
                        <TableHead className="text-right">Marge</TableHead>
                        <TableHead className="text-right">Marge %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectData.map((project) => (
                        <TableRow key={project.projectId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{project.projectName}</p>
                              {project.clientName && (
                                <p className="text-xs text-muted-foreground">{project.clientName}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{project.hours.toFixed(1)}u</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(project.revenue)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(project.cost)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(project.margin)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getMarginBadgeVariant(project.marginPercentage)}>
                              {formatPercent(project.marginPercentage)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle>Medewerkers</CardTitle>
                <CardDescription>Financieel overzicht per medewerker</CardDescription>
              </CardHeader>
              <CardContent>
                {employeesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !employeeData?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg">Geen data</h3>
                    <p className="text-muted-foreground">
                      Geen financiele data gevonden voor deze periode
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medewerker</TableHead>
                        <TableHead className="text-right">Uren</TableHead>
                        <TableHead className="text-right">Omzet</TableHead>
                        <TableHead className="text-right">Kosten</TableHead>
                        <TableHead className="text-right">Marge</TableHead>
                        <TableHead className="text-right">Gem. Tarief</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeData.map((employee) => (
                        <TableRow key={employee.userId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{employee.name}</p>
                              {employee.employeeType && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {employee.employeeType}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{employee.hours.toFixed(1)}u</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(employee.revenue)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(employee.cost)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={getMarginColor(employee.marginPercentage)}>
                              {formatCurrency(employee.margin)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(employee.effectiveRate)}/u
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!selectedMonth && !monthsLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Euro className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Selecteer een periode</h3>
            <p className="text-muted-foreground">
              Kies een maand om het financieel overzicht te bekijken
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
