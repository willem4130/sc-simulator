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
import { Separator } from '@/components/ui/separator'
import {
  ClipboardList,
  Users,
  Calendar,
  Clock,
  Car,
  Receipt,
  Euro,
  Loader2,
  FileText,
  Building2,
  ChevronRight,
} from 'lucide-react'
import { api } from '@/trpc/react'
import { useState, useMemo } from 'react'

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

// Format hours
function formatHours(hours: number): string {
  return `${hours.toFixed(1)}u`
}

export default function HoursReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')

  // Get available months
  const { data: months, isLoading: monthsLoading } = api.hoursReport.getAvailableMonths.useQuery({
    limit: 12,
  })

  // Get employees with hours in selected month
  const { data: employees, isLoading: employeesLoading } = api.hoursReport.getEmployeesWithHours.useQuery(
    { month: selectedMonth },
    { enabled: !!selectedMonth }
  )

  // Get report stats for cards
  const { data: stats } = api.hoursReport.getReportStats.useQuery(
    { month: selectedMonth },
    { enabled: !!selectedMonth }
  )

  // Generate report when employee and month are selected
  const { data: report, isLoading: reportLoading } = api.hoursReport.generateReport.useQuery(
    { employeeId: selectedEmployee, month: selectedMonth },
    { enabled: !!selectedEmployee && !!selectedMonth }
  )

  // Set default month when months load
  useMemo(() => {
    if (months && months.length > 0 && !selectedMonth) {
      const firstWithData = months.find(m => m.hasData)
      if (firstWithData) {
        setSelectedMonth(firstWithData.value)
      }
    }
  }, [months, selectedMonth])

  // Reset employee when month changes
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    setSelectedEmployee('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Uren Rapporten</h1>
        <p className="text-muted-foreground">
          Genereer gedetailleerde uren rapporten voor freelancers
        </p>
      </div>

      {/* Selection Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Month Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Periode</CardTitle>
            </div>
            <CardDescription>Selecteer de maand voor het rapport</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger>
                <SelectValue placeholder={monthsLoading ? 'Laden...' : 'Selecteer maand'} />
              </SelectTrigger>
              <SelectContent>
                {months?.map((month) => (
                  <SelectItem
                    key={month.value}
                    value={month.value}
                    disabled={!month.hasData}
                  >
                    <span className="flex items-center gap-2">
                      {month.label}
                      {month.hasData && (
                        <Badge variant="secondary" className="text-xs">
                          data
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Employee Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Medewerker</CardTitle>
            </div>
            <CardDescription>
              {selectedMonth
                ? `${employees?.length || 0} medewerkers met uren`
                : 'Selecteer eerst een periode'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
              disabled={!selectedMonth || employeesLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    employeesLoading
                      ? 'Laden...'
                      : !selectedMonth
                        ? 'Selecteer eerst een periode'
                        : 'Selecteer medewerker'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    <span className="flex items-center gap-2">
                      {employee.name || employee.email}
                      <Badge variant="outline" className="text-xs">
                        {formatHours(employee.totalHours)}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      {selectedMonth && stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medewerkers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.employeesWithHours}</div>
              <p className="text-xs text-muted-foreground">met geregistreerde uren</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal Uren</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatHours(stats.totalHours)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kilometers</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalKilometers.toFixed(0)} km</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Onkosten</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Preview */}
      {reportLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : report ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Uren Rapport - {report.employee.name || report.employee.email}
                </CardTitle>
                <CardDescription>{report.period.label}</CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {report.employee.employeeType || 'Medewerker'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Hours by Project */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Uren per Project
              </h3>
              {report.hours.byProject.length === 0 ? (
                <p className="text-muted-foreground text-sm">Geen uren geregistreerd</p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Dienst</TableHead>
                        <TableHead className="text-right">Uren</TableHead>
                        <TableHead className="text-right">Tarief</TableHead>
                        <TableHead className="text-right">Bedrag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.hours.byProject.map((project) => (
                        <TableRow key={project.projectId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{project.projectName}</p>
                                {project.clientName && (
                                  <p className="text-xs text-muted-foreground">
                                    {project.clientName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {project.serviceName || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatHours(project.totalHours)}
                          </TableCell>
                          <TableCell className="text-right">
                            {project.hourlyRate
                              ? formatCurrency(project.hourlyRate) + '/u'
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {project.totalAmount
                              ? formatCurrency(project.totalAmount)
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={2} className="font-semibold">
                          Totaal Uren
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatHours(report.hours.totalHours)}
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right font-bold">
                          {report.hours.totalAmount
                            ? formatCurrency(report.hours.totalAmount)
                            : '-'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <Separator />

            {/* Kilometers */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Car className="h-4 w-4" />
                Kilometers
              </h3>
              {report.kilometers.entries.length === 0 ? (
                <p className="text-muted-foreground text-sm">Geen kilometers geregistreerd</p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Beschrijving</TableHead>
                        <TableHead className="text-right">Km</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.kilometers.entries.map((entry, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString('nl-NL')}
                          </TableCell>
                          <TableCell>{entry.projectName || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {entry.description || '-'}
                          </TableCell>
                          <TableCell className="text-right">{entry.km}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={3} className="font-semibold">
                          Totaal ({formatCurrency(report.kilometers.kmRate)}/km)
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {report.kilometers.totalKm} km = {formatCurrency(report.kilometers.totalAmount)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <Separator />

            {/* Expenses */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Onkosten
              </h3>
              {report.expenses.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">Geen onkosten geregistreerd</p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Categorie</TableHead>
                        <TableHead>Beschrijving</TableHead>
                        <TableHead className="text-right">Bedrag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.expenses.items.map((expense, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground">
                            {new Date(expense.date).toLocaleDateString('nl-NL')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {expense.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={3} className="font-semibold">
                          Totaal Onkosten
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(report.expenses.totalAmount)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <Separator />

            {/* Grand Total */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Totaaloverzicht
              </h3>
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span>Uren</span>
                  <span className="font-medium">
                    {report.totals.hoursAmount
                      ? formatCurrency(report.totals.hoursAmount)
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Kilometers</span>
                  <span className="font-medium">
                    {formatCurrency(report.totals.kmAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Onkosten</span>
                  <span className="font-medium">
                    {formatCurrency(report.totals.expensesAmount)}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Totaal</span>
                  <span className="font-bold">
                    {report.totals.grandTotal
                      ? formatCurrency(report.totals.grandTotal)
                      : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" disabled>
                Download PDF
              </Button>
              <Button disabled>
                Verstuur naar {report.employee.name || report.employee.email}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : selectedMonth && selectedEmployee ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Geen data gevonden</h3>
            <p className="text-muted-foreground">
              Er zijn geen uren gevonden voor deze medewerker in deze periode
            </p>
          </CardContent>
        </Card>
      ) : !selectedMonth ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Selecteer een periode</h3>
            <p className="text-muted-foreground">
              Kies een maand om te beginnen met het genereren van rapporten
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Selecteer een medewerker</h3>
            <p className="text-muted-foreground">
              Kies een medewerker om een rapport te genereren
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
