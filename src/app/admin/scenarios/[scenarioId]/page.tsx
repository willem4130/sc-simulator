'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Calendar, FileInput, BarChart3, Calculator, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import VariableValueForm from '@/components/admin/VariableValueForm'
import CalculationResults from '@/components/admin/CalculationResults'
import { generatePeriods, getTimePeriodLabel } from '@/lib/utils'

export default function ScenarioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const scenarioId = params.scenarioId as string

  // Query organization (needed for all queries)
  const { data: org } = api.organization.getFirst.useQuery()
  const organizationId = org?.id ?? ''

  // Query scenario details
  const { data: scenario, isLoading: scenarioLoading } = api.scenario.getById.useQuery(
    { organizationId, id: scenarioId },
    { enabled: !!organizationId && !!scenarioId }
  )

  // Query INPUT variables only
  const { data: variables = [], isLoading: variablesLoading } = api.variable.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  )

  const inputVariables = variables.filter((v) => v.variableType === 'INPUT')
  const outputVariables = variables.filter((v) => v.variableType === 'OUTPUT')

  // Query existing values for this scenario
  const { data: existingValues = [], refetch: refetchValues } = api.variable.getValues.useQuery(
    { organizationId, scenarioId },
    { enabled: !!organizationId && !!scenarioId }
  )

  // Query all calculations for this scenario
  const { data: allCalculations = [], refetch: refetchCalculation } = api.calculation.getAll.useQuery(
    { organizationId, scenarioId },
    { enabled: !!organizationId && !!scenarioId }
  )

  // Query parameters
  const { data: parameters = [] } = api.parameter.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  )

  // Generate periods dynamically based on scenario configuration
  const periods = useMemo(() => {
    if (!scenario) return []
    return generatePeriods(
      scenario.timePeriodType,
      scenario.startDate,
      scenario.endDate
    )
  }, [scenario])

  // State for active tab
  const [activeTab, setActiveTab] = useState('input')

  // Mutation to run calculation
  const calculateMutation = api.calculation.calculate.useMutation({
    onSuccess: () => {
      toast.success('Calculations completed successfully!')
      void refetchCalculation()
      void refetchValues()
      // Switch to Results tab to show results
      setActiveTab('results')
    },
    onError: (error) => {
      toast.error(`Calculation failed: ${error.message}`)
    },
  })

  const handleCalculate = async () => {
    if (!organizationId || !scenarioId) return

    // Calculate for all periods
    const promises = periods.map((period) =>
      calculateMutation.mutateAsync({
        organizationId,
        scenarioId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        forceRecalculate: true,
      })
    )

    try {
      await Promise.all(promises)
    } catch (error) {
      // Error already handled by mutation onError
      console.error('Calculation error:', error)
    }
  }

  if (scenarioLoading || variablesLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg text-muted-foreground">Loading scenario...</div>
        </div>
      </div>
    )
  }

  if (!scenario) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg text-muted-foreground">Scenario not found</div>
          <Button onClick={() => router.push('/admin/scenarios')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Scenarios
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/scenarios" className="hover:text-foreground">
          Scenarios
        </Link>
        <span>/</span>
        <span className="text-foreground">{scenario.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/scenarios">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{scenario.name}</h1>
              {scenario.description && (
                <p className="mt-1 text-muted-foreground">{scenario.description}</p>
              )}
            </div>
          </div>
        </div>
        {scenario.isBaseline && (
          <div className="rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Baseline
          </div>
        )}
      </div>

      {/* Scenario Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Scenario Configuration</CardTitle>
          </div>
          <CardDescription>
            {getTimePeriodLabel(scenario.timePeriodType)}
            {periods.length > 0 && ` (${periods.length} periods)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Time Period Type</div>
              <div className="mt-1 text-lg font-semibold">{scenario.timePeriodType}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Variables Defined</div>
              <div className="mt-1 text-lg font-semibold">
                {inputVariables.length} inputs, {outputVariables.length} outputs
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Data Points</div>
              <div className="mt-1 text-lg font-semibold">{existingValues.length} values</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Input Values and Results */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="input" className="gap-2">
              <FileInput className="h-4 w-4" />
              Input Values
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          {/* Calculate Button */}
          {activeTab === 'input' && (
            <Button
              onClick={handleCalculate}
              disabled={calculateMutation.isPending || inputVariables.length === 0}
              size="lg"
              className="gap-2"
            >
              {calculateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" />
                  Calculate Results
                </>
              )}
            </Button>
          )}
        </div>

        {/* Input Values Tab */}
        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Variable Values</CardTitle>
              <CardDescription>
                Enter values for each period. Use the period selector to navigate between time periods.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {periods.length > 0 ? (
                <VariableValueForm
                  scenarioId={scenarioId}
                  organizationId={organizationId}
                  variables={inputVariables}
                  existingValues={existingValues}
                  periods={periods}
                  onSuccess={() => {
                    void refetchValues()
                  }}
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  No periods configured for this scenario
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <CalculationResults
            calculations={allCalculations}
            outputVariables={outputVariables}
            inputVariables={inputVariables}
            inputValues={existingValues.map((v) => ({
              variableId: v.variableId,
              periodStart: v.periodStart ?? new Date(),
              value: v.value,
            }))}
            parameters={parameters}
            periods={periods}
            isBaseline={scenario.isBaseline}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
