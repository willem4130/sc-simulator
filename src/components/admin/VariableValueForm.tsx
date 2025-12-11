'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Variable, VariableValue } from '@prisma/client'
import type { Period } from '@/lib/utils'

interface VariableValueFormProps {
  scenarioId: string
  organizationId: string
  variables: Variable[]
  existingValues: (VariableValue & { variable: Variable })[]
  periods: Period[]
  onSuccess?: () => void
}

export default function VariableValueForm({
  scenarioId,
  organizationId,
  variables,
  existingValues,
  periods,
  onSuccess,
}: VariableValueFormProps) {
  // Create form schema dynamically: { variableId_periodValue: number }
  const formSchema = z.object({
    values: z.record(z.string(), z.number()),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      values: {},
    },
  })

  // Mutation to save values
  const setValueMutation = api.variable.setValue.useMutation({
    onSuccess: () => {
      toast.success('Successfully saved all values')
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(`Error saving values: ${error.message}`)
    },
  })

  // Load all values for all periods
  useEffect(() => {
    const valuesMap: Record<string, number> = {}

    variables.forEach((variable) => {
      periods.forEach((period) => {
        const key = `${variable.id}_${period.value}`
        const existingValue = existingValues.find(
          (v) =>
            v.variableId === variable.id &&
            v.periodStart &&
            new Date(v.periodStart).getTime() === period.periodStart.getTime()
        )
        const value = existingValue?.value
        valuesMap[key] = typeof value === 'number' ? value : 0
      })
    })

    form.reset({ values: valuesMap })
  }, [variables, periods, existingValues, form])

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    // Parse the keys back into variableId + periodValue pairs
    const promises: Promise<unknown>[] = []

    Object.entries(data.values).forEach(([key, value]) => {
      const [variableId, periodValue] = key.split('_')
      const period = periods.find((p) => p.value === periodValue)

      if (period && variableId) {
        promises.push(
          setValueMutation.mutateAsync({
            organizationId,
            scenarioId,
            variableId,
            value,
            periodStart: period.periodStart,
          })
        )
      }
    })

    try {
      await Promise.all(promises)
    } catch (error) {
      // Error already handled by mutation onError
      console.error('Save error:', error)
    }
  }

  if (variables.length === 0) {
    return (
      <div className="text-center text-muted-foreground">No INPUT variables configured</div>
    )
  }

  if (periods.length === 0) {
    return <div className="text-center text-muted-foreground">No periods configured</div>
  }

  // Separate baseline and regular variables
  const baselineVariables = variables.filter((v) => v.name.startsWith('INPUT_BASELINE_'))
  const regularVariables = variables.filter((v) => !v.name.startsWith('INPUT_BASELINE_'))

  // Filter out 2025 from regular periods (shown in baseline section only)
  const regularPeriods = periods.filter((p) => p.label !== '2025')
  const has2025 = periods.some((p) => p.label === '2025')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Benchmark Baseline Section - Only for 2025 */}
        {baselineVariables.length > 0 && has2025 && (
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5">
            <div className="border-b border-primary/20 bg-primary/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs font-semibold">
                  BENCHMARK
                </Badge>
                <h3 className="text-sm font-semibold">2025 Baseline Values</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Reference values for baseline scenario calculations
              </p>
            </div>
            <div className="p-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {baselineVariables
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((variable) => {
                    const period2025 = periods.find((p) => p.label === '2025')
                    if (!period2025) return null
                    const fieldName = `values.${variable.id}_${period2025.value}` as const
                    return (
                      <div key={variable.id} className="space-y-2">
                        <label className="text-sm font-medium">
                          {variable.displayName}
                          {variable.unit && (
                            <span className="ml-1 text-xs text-muted-foreground">({variable.unit})</span>
                          )}
                        </label>
                        <FormField
                          control={form.control}
                          name={fieldName as 'values'}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  className="text-center font-semibold"
                                  value={(field.value as unknown as number) ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.valueAsNumber
                                    field.onChange(isNaN(val) ? '' : val)
                                  }}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                  disabled={field.disabled}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Regular Input/Output Variables Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Variable</TableHead>
                {regularPeriods.map((period) => (
                  <TableHead key={period.value} className="text-center">
                    <div className="font-semibold">{period.label}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {regularVariables
                .sort((a, b) => {
                  // Sort: INPUT variables first, then OUTPUT variables
                  if (a.variableType !== b.variableType) {
                    return a.variableType === 'INPUT' ? -1 : 1
                  }
                  return a.displayOrder - b.displayOrder
                })
                .map((variable) => (
                  <TableRow key={variable.id} className={variable.variableType === 'OUTPUT' ? 'bg-muted/30' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div>
                          <div>{variable.displayName}</div>
                          {variable.unit && (
                            <div className="text-xs text-muted-foreground">({variable.unit})</div>
                          )}
                        </div>
                        <Badge variant={variable.variableType === 'INPUT' ? 'default' : 'secondary'} className="text-xs">
                          {variable.variableType}
                        </Badge>
                      </div>
                    </TableCell>
                    {regularPeriods.map((period) => {
                      const fieldName = `values.${variable.id}_${period.value}` as const
                      return (
                        <TableCell key={period.value} className="p-2">
                          <FormField
                            control={form.control}
                            name={fieldName as 'values'}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step={variable.unit === '%' ? '1' : 'any'}
                                    className="text-center"
                                    value={(field.value as unknown as number) ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.valueAsNumber
                                      field.onChange(isNaN(val) ? '' : val)
                                    }}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                    disabled={field.disabled || variable.variableType === 'OUTPUT'}
                                    readOnly={variable.variableType === 'OUTPUT'}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between border-t pt-6">
          <div className="text-sm text-muted-foreground">
            {regularPeriods.length} periods × {regularVariables.length} variables {has2025 && `+ ${baselineVariables.length} baseline values`} = {regularPeriods.length * regularVariables.length + (has2025 ? baselineVariables.length : 0)} values
          </div>

          <Button type="submit" size="lg" disabled={setValueMutation.isPending}>
            {setValueMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving all values...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All Values
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
