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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, ChevronLeft, ChevronRight, Save, CheckCircle } from 'lucide-react'
import type { Variable, VariableValue } from '@prisma/client'

interface VariableValueFormProps {
  scenarioId: string
  organizationId: string
  variables: Variable[]
  existingValues: (VariableValue & { variable: Variable })[]
  onSuccess?: () => void
}

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030, 2031]

export default function VariableValueForm({
  scenarioId,
  organizationId,
  variables,
  existingValues,
  onSuccess,
}: VariableValueFormProps) {
  const [selectedYear, setSelectedYear] = useState(2025)

  // Create form schema dynamically based on variables
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
      toast.success(`Successfully saved values for ${selectedYear}`)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(`Error saving values: ${error.message}`)
    },
  })

  // Load values for selected year
  useEffect(() => {
    const valuesForYear: Record<string, number> = {}

    variables.forEach((variable) => {
      const existingValue = existingValues.find(
        (v) =>
          v.variableId === variable.id &&
          v.periodStart &&
          new Date(v.periodStart).getFullYear() === selectedYear
      )
      const value = existingValue?.value
      valuesForYear[variable.id] = typeof value === 'number' ? value : 0
    })

    form.reset({ values: valuesForYear })
  }, [selectedYear, variables, existingValues, form])

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const periodStart = new Date(`${selectedYear}-01-01`)

    // Save all values for this year
    const promises = Object.entries(data.values).map(([variableId, value]) => {
      return setValueMutation.mutateAsync({
        organizationId,
        scenarioId,
        variableId,
        value,
        periodStart,
      })
    })

    await Promise.all(promises)
  }

  const goToPreviousYear = () => {
    const currentIndex = YEARS.indexOf(selectedYear)
    if (currentIndex > 0) {
      setSelectedYear(YEARS[currentIndex - 1]!)
    }
  }

  const goToNextYear = () => {
    const currentIndex = YEARS.indexOf(selectedYear)
    if (currentIndex < YEARS.length - 1) {
      setSelectedYear(YEARS[currentIndex + 1]!)
    }
  }

  // Calculate completion status
  const completedYears = YEARS.filter((year) => {
    const yearStart = new Date(`${year}-01-01`)
    return variables.every((variable) =>
      existingValues.some(
        (v) =>
          v.variableId === variable.id &&
          v.periodStart &&
          new Date(v.periodStart).getFullYear() === year
      )
    )
  })

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Selected Year</div>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="mt-1 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year} {year === 2025 && '(Benchmark)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToPreviousYear}
              disabled={selectedYear === YEARS[0]}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToNextYear}
              disabled={selectedYear === YEARS[YEARS.length - 1]}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-muted-foreground">Progress</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="text-lg font-semibold">
              {completedYears.length}/{YEARS.length} years
            </div>
            {completedYears.length === YEARS.length && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
          </div>
        </div>
      </div>

      {/* Variable Input Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {variables
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((variable) => (
                <FormField
                  key={variable.id}
                  control={form.control}
                  name={`values.${variable.id}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {variable.displayName}
                        {variable.unit && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({variable.unit})
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={variable.unit === '%' ? '1' : 'any'}
                          placeholder={`Enter ${variable.displayName.toLowerCase()}`}
                          value={field.value || 0}
                          onChange={(e) => {
                            const val = e.target.valueAsNumber
                            field.onChange(isNaN(val) ? 0 : val)
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          disabled={field.disabled}
                        />
                      </FormControl>
                      {variable.description && (
                        <FormDescription>{variable.description}</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
          </div>

          <div className="flex items-center justify-between border-t pt-6">
            <div className="text-sm text-muted-foreground">
              {selectedYear === 2025 ? (
                <span className="font-medium text-blue-600">
                  Benchmark year - used as baseline for comparisons
                </span>
              ) : (
                <span>
                  Year {selectedYear} - {selectedYear - 2025} years from benchmark
                </span>
              )}
            </div>

            <Button type="submit" disabled={setValueMutation.isPending}>
              {setValueMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save {selectedYear} Values
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
