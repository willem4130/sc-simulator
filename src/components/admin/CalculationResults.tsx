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
import { ArrowUp, ArrowDown, Minus, TrendingUp, Settings } from 'lucide-react'
import type { Calculation, Variable, Parameter } from '@prisma/client'
import type { Period } from '@/lib/utils'

interface CalculationResultsProps {
  calculations: Calculation[]
  outputVariables: Variable[]
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
  parameters,
  periods,
  isBaseline,
}: CalculationResultsProps) {
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Output Variables Results */}
      <Card>
        <CardHeader>
          <CardTitle>Calculated Results</CardTitle>
          <CardDescription>
            Output variables calculated from formulas
            {!isBaseline && ' with baseline comparison'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  {outputVariables.map((variable) => (
                    <TableHead key={variable.id} className="text-right">
                      <div>{variable.displayName}</div>
                      {variable.unit && (
                        <div className="text-xs font-normal text-muted-foreground">
                          ({variable.unit})
                        </div>
                      )}
                    </TableHead>
                  ))}
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
                      return (
                        <TableCell key={variable.id} className="text-right">
                          {result ? (
                            <div className="space-y-1">
                              <div className="text-lg font-semibold">
                                {result.value.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                              {!isBaseline &&
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
