'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowUp, ArrowDown, Minus, TrendingUp, Settings, BarChart3, LineChart } from 'lucide-react'
import type { Calculation, Variable, Parameter } from '@prisma/client'
import type { Period } from '@/lib/utils'
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface CalculationResultsProps {
  calculations: Calculation[]
  outputVariables: Variable[]
  inputVariables: Variable[]
  inputValues: Array<{ variableId: string; periodStart: Date; value: number }>
  parameters: Parameter[]
  periods: Period[]
  isBaseline: boolean
}

interface VariableResult {
  value: number
  rawValue?: number
  delta?: number | null
  percentChange?: number | null
  baselineValue?: number | null
  effectCurveApplied?: boolean
  calculatedAt?: string
  dependencies?: string[]
}

export default function CalculationResults({
  calculations,
  outputVariables,
  inputVariables,
  inputValues,
  parameters,
  periods,
  isBaseline,
}: CalculationResultsProps) {
  // Helper function to get input value for a specific variable and period
  const getInputValue = (variableName: string, periodStart: Date) => {
    const variable = inputVariables.find((v) => v.name === variableName)
    if (!variable) return null

    const value = inputValues.find(
      (v) => v.variableId === variable.id &&
             new Date(v.periodStart).getTime() === periodStart.getTime()
    )
    return value?.value ?? null
  }

  // Organize results by period
  const resultsByPeriod = useMemo(() => {
    return periods.map((period) => {
      const calc = calculations.find(
        (c) =>
          c.periodStart &&
          new Date(c.periodStart).getTime() === period.periodStart.getTime()
      )
      return {
        period,
        calculation: calc,
        results: calc?.results as Record<string, VariableResult> | null,
      }
    })
  }, [calculations, periods])

  // Prepare chart data
  const chartData = useMemo(() => {
    return resultsByPeriod.map(({ period, results }) => {
      const dataPoint: Record<string, string | number> = {
        period: period.label,
      }

      outputVariables.forEach((variable) => {
        const result = results?.[variable.name] as VariableResult | undefined

        // For Omzet % and SKU %, show absolute values
        if (variable.name === 'OUTPUT_OMZET_PERCENTAGE' && result) {
          dataPoint['Omzet (EUR)'] = getInputValue('INPUT_OMZET', period.periodStart) ?? 0
        } else if (variable.name === 'OUTPUT_SKU_GROWTH' && result) {
          dataPoint['SKUs'] = getInputValue('INPUT_AANTAL_SKUS', period.periodStart) ?? 0
        } else if (variable.name === 'OUTPUT_VOORRAAD_PALLETS' && result) {
          dataPoint['Voorraad (Pallets)'] = Math.round(result.value)
        } else if (variable.name === 'OUTPUT_VOORRAAD_WEKEN_PERCENTAGE' && result) {
          dataPoint['Voorraad (Weken)'] = getInputValue('INPUT_VOORRAAD_IN_WEKEN', period.periodStart) ?? 0
        }
      })

      return dataPoint
    })
  }, [resultsByPeriod, outputVariables, getInputValue, periods])

  if (calculations.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">No calculations yet</p>
              <p className="mt-2 text-sm">
                Go to the Input Values tab and click &quot;Calculate Results&quot; to run calculations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {outputVariables.map((variable) => {
          const latestPeriod = resultsByPeriod[resultsByPeriod.length - 1]
          if (!latestPeriod) return null

          const result = latestPeriod.results?.[variable.name] as VariableResult | undefined

          let displayValue: number | null = null
          let displayUnit = variable.unit
          let subtext: string | null = null
          let deltaValue: number | null = null

          if (variable.name === 'OUTPUT_OMZET_PERCENTAGE' && result) {
            displayValue = getInputValue('INPUT_OMZET', latestPeriod.period.periodStart) ?? null
            displayUnit = 'EUR'
            subtext = `${result.value.toFixed(0)}%`
            deltaValue = result.delta ?? null
          } else if (variable.name === 'OUTPUT_SKU_GROWTH' && result) {
            displayValue = getInputValue('INPUT_AANTAL_SKUS', latestPeriod.period.periodStart) ?? null
            displayUnit = 'SKUs'
            subtext = `${result.value.toFixed(1)}%`
            deltaValue = result.delta ?? null
          } else if (variable.name === 'OUTPUT_VOORRAAD_PALLETS' && result) {
            displayValue = result.value
            deltaValue = result.delta ?? null
          } else if (result) {
            displayValue = result.value
            deltaValue = result.delta ?? null
          }

          return (
            <Card key={variable.id}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">
                  {variable.name === 'OUTPUT_OMZET_PERCENTAGE' ? 'Omzet' :
                   variable.name === 'OUTPUT_SKU_GROWTH' ? 'SKU Count' :
                   variable.displayName}
                </CardDescription>
                <CardTitle className="text-2xl">
                  {displayValue !== null ? (
                    <>
                      {displayValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                      {displayUnit === 'EUR' && <span className="text-sm ml-1 text-muted-foreground">EUR</span>}
                      {displayUnit === 'pallets' && <span className="text-sm ml-1 text-muted-foreground">pallets</span>}
                      {displayUnit === 'aantal' && <span className="text-sm ml-1 text-muted-foreground">SKUs</span>}
                    </>
                  ) : (
                    '-'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subtext && (
                  <p className="text-xs text-muted-foreground mb-2">{subtext}</p>
                )}
                {!isBaseline && deltaValue !== null && deltaValue !== undefined && (
                  <div className="flex items-center gap-1 text-sm">
                    {deltaValue > 0 ? (
                      <ArrowUp className="h-4 w-4 text-green-600" />
                    ) : deltaValue < 0 ? (
                      <ArrowDown className="h-4 w-4 text-red-600" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span
                      className={
                        deltaValue > 0
                          ? 'text-green-600'
                          : deltaValue < 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                      }
                    >
                      {deltaValue > 0 ? '+' : ''}
                      {deltaValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <span className="text-muted-foreground text-xs">vs baseline</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Voorraad Pallets Trend Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Voorraad (Pallets) Over Time</CardTitle>
          </div>
          <CardDescription>
            Inventory levels across all periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="Voorraad (Pallets)"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Input Drivers Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Input Drivers</CardTitle>
          </div>
          <CardDescription>
            Revenue, SKUs, and inventory weeks over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="Omzet (EUR)" fill="hsl(var(--primary))" />
              <Bar yAxisId="right" dataKey="SKUs" fill="hsl(var(--chart-2))" />
            </RechartsBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Global Parameters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Global Parameters</CardTitle>
          </div>
          <CardDescription>
            Configuration values used in calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {parameters.map((param) => (
              <div
                key={param.id}
                className="rounded-lg border bg-muted/50 p-4"
              >
                <div className="text-sm font-medium text-muted-foreground">
                  {param.displayName}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{param.value.toLocaleString()}</div>
                  {param.unit && (
                    <div className="text-sm text-muted-foreground">{param.unit}</div>
                  )}
                </div>
                {param.description && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {param.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
          <CardDescription>
            All calculated values by period
            {!isBaseline && ' with baseline comparison'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  {outputVariables.map((variable) => {
                    // Override display names for absolute value columns
                    let displayName = variable.displayName
                    let displayUnit = variable.unit

                    if (variable.name === 'OUTPUT_OMZET_PERCENTAGE') {
                      displayName = 'Omzet'
                      displayUnit = 'EUR'
                    } else if (variable.name === 'OUTPUT_SKU_GROWTH') {
                      displayName = 'SKU Count'
                      displayUnit = 'SKUs'
                    }

                    return (
                      <TableHead key={variable.id} className="text-right">
                        <div>{displayName}</div>
                        {displayUnit && (
                          <div className="text-xs font-normal text-muted-foreground">
                            ({displayUnit})
                          </div>
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultsByPeriod.map(({ period, results }, idx) => (
                  <TableRow key={period.value}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {period.label}
                        {idx === 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Benchmark
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {outputVariables.map((variable) => {
                      const result = results?.[variable.name] as VariableResult | undefined

                      // For Omzet % and SKU %, show absolute values with % as subtext
                      let displayValue: number | null = null
                      let displayUnit = variable.unit
                      let subtext: string | null = null

                      if (variable.name === 'OUTPUT_OMZET_PERCENTAGE' && result) {
                        displayValue = getInputValue('INPUT_OMZET', period.periodStart)
                        displayUnit = 'EUR'
                        subtext = `${result.value.toFixed(0)}%`
                      } else if (variable.name === 'OUTPUT_SKU_GROWTH' && result) {
                        displayValue = getInputValue('INPUT_AANTAL_SKUS', period.periodStart)
                        displayUnit = 'SKUs'
                        subtext = `${result.value.toFixed(2)}%`
                      } else if (result) {
                        displayValue = result.value
                      }

                      return (
                        <TableCell key={variable.id} className="text-right">
                          {displayValue !== null ? (
                            <div className="space-y-1">
                              <div className="text-lg font-semibold">
                                {displayValue.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                                {subtext && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    ({subtext})
                                  </div>
                                )}
                              </div>
                              {!isBaseline &&
                                result &&
                                result.delta !== null &&
                                result.delta !== undefined &&
                                idx > 0 && (
                                  <div className="flex items-center justify-end gap-1 text-xs">
                                    {result.delta > 0 ? (
                                      <ArrowUp className="h-3 w-3 text-green-600" />
                                    ) : result.delta < 0 ? (
                                      <ArrowDown className="h-3 w-3 text-red-600" />
                                    ) : (
                                      <Minus className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <span
                                      className={
                                        result.delta > 0
                                          ? 'text-green-600'
                                          : result.delta < 0
                                            ? 'text-red-600'
                                            : 'text-muted-foreground'
                                      }
                                    >
                                      {result.delta > 0 ? '+' : ''}
                                      {result.delta.toLocaleString(undefined, {
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                    {result.percentChange !== null &&
                                      result.percentChange !== undefined && (
                                        <span
                                          className={
                                            result.percentChange > 0
                                              ? 'text-green-600'
                                              : result.percentChange < 0
                                                ? 'text-red-600'
                                                : 'text-muted-foreground'
                                          }
                                        >
                                          ({result.percentChange > 0 ? '+' : ''}
                                          {result.percentChange.toFixed(1)}%)
                                        </span>
                                      )}
                                  </div>
                                )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Total Periods</div>
              <div className="mt-1 text-2xl font-bold">{calculations.length}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Output Variables</div>
              <div className="mt-1 text-2xl font-bold">{outputVariables.length}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Latest Calculation</div>
              <div className="mt-1 text-sm font-medium">
                {new Date(
                  Math.max(...calculations.map((c) => c.calculationTime.getTime()))
                ).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
