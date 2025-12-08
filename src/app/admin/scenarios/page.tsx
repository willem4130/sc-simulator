"use client"

import { useState } from "react"
import { ScenarioList, type Scenario } from "@/components/admin/ScenarioList"
import { ScenarioForm, type ScenarioFormValues } from "@/components/admin/ScenarioForm"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/trpc/react"

// Hardcoded organization ID for now (from seed data)
const ORG_ID = 'cmix6hmfc0000obbsvi3idngs'

export default function ScenariosPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null)

  // Query scenarios from database
  const { data: dbScenarios = [], refetch } = api.scenario.list.useQuery({
    organizationId: ORG_ID,
  })

  // Transform database scenarios to UI format
  const scenarios: Scenario[] = dbScenarios.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    isBaseline: s.isBaseline,
    timePeriodType: s.timePeriodType,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    totalCost: undefined, // Will be populated after calculations
    savingsVsBaseline: undefined,
    savingsPercent: undefined,
  }))

  const baselineScenarios = scenarios.filter((s) => s.isBaseline)

  // Mutations
  const createMutation = api.scenario.create.useMutation({
    onSuccess: () => {
      refetch()
      setIsCreateDialogOpen(false)
      setEditingScenario(null)
    },
  })

  const updateMutation = api.scenario.update.useMutation({
    onSuccess: () => {
      refetch()
      setIsCreateDialogOpen(false)
      setEditingScenario(null)
    },
  })

  const handleCreateNew = () => {
    setEditingScenario(null)
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (id: string) => {
    const scenario = scenarios.find((s) => s.id === id)
    if (scenario) {
      setEditingScenario(scenario)
      setIsCreateDialogOpen(true)
    }
  }

  const handleSubmit = async (values: ScenarioFormValues) => {
    if (editingScenario) {
      // Update existing scenario
      updateMutation.mutate({
        organizationId: ORG_ID,
        id: editingScenario.id,
        name: values.name,
        description: values.description,
        timePeriodType: values.timePeriodType === 'SINGLE' ? 'SINGLE_POINT' : values.timePeriodType,
        isBaseline: values.isBaseline,
      })
    } else {
      // Create new scenario
      createMutation.mutate({
        organizationId: ORG_ID,
        name: values.name,
        description: values.description,
        timePeriodType: values.timePeriodType === 'SINGLE' ? 'SINGLE_POINT' : values.timePeriodType,
        isBaseline: values.isBaseline,
      })
    }
  }

  const handleCancel = () => {
    setIsCreateDialogOpen(false)
    setEditingScenario(null)
  }

  const handleCompare = (ids: string[]) => {
    // TODO: Navigate to comparison page
    console.log("Compare scenarios:", ids)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scenarios</h1>
          <p className="text-muted-foreground">
            Manage what-if scenarios and compare outcomes
          </p>
        </div>
      </div>

      <ScenarioList
        scenarios={scenarios}
        onCreateNew={handleCreateNew}
        onEdit={handleEdit}
        onCompare={handleCompare}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingScenario ? "Edit Scenario" : "Create New Scenario"}
            </DialogTitle>
            <DialogDescription>
              {editingScenario
                ? "Update the scenario details below"
                : "Define a new what-if scenario to model supply chain changes"}
            </DialogDescription>
          </DialogHeader>
          <ScenarioForm
            defaultValues={
              editingScenario
                ? {
                    name: editingScenario.name,
                    description: editingScenario.description || undefined,
                    timePeriodType: editingScenario.timePeriodType as any,
                    isBaseline: editingScenario.isBaseline,
                  }
                : undefined
            }
            baselineScenarios={baselineScenarios.map((s) => ({
              id: s.id,
              name: s.name,
            }))}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
