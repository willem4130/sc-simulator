'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar } from 'lucide-react'
import VariableValueForm from '@/components/admin/VariableValueForm'

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

  // Query existing values for this scenario
  const { data: existingValues = [], refetch: refetchValues } = api.variable.getValues.useQuery(
    { organizationId, scenarioId },
    { enabled: !!organizationId && !!scenarioId }
  )

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
            {scenario.timePeriodType === 'YEARLY'
              ? 'Multi-year scenario (2025-2031)'
              : 'Single point in time'}
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
              <div className="mt-1 text-lg font-semibold">{inputVariables.length} inputs</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Data Points</div>
              <div className="mt-1 text-lg font-semibold">{existingValues.length} values</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variable Values Form */}
      <Card>
        <CardHeader>
          <CardTitle>Variable Values</CardTitle>
          <CardDescription>
            Enter values for each year (2025-2031). Use the year selector to navigate between
            periods.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VariableValueForm
            scenarioId={scenarioId}
            organizationId={organizationId}
            variables={inputVariables}
            existingValues={existingValues}
            onSuccess={() => {
              void refetchValues()
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
