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

// Mock data for development (will be replaced with tRPC calls)
const mockScenarios: Scenario[] = [
  {
    id: "baseline-1",
    name: "Baseline - Current State",
    description: "Current supply chain configuration with no changes",
    isBaseline: true,
    timePeriodType: "SINGLE",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    totalCost: 50000,
  },
  {
    id: "scenario-1",
    name: "Supplier Switch - 15% Cost Reduction",
    description: "What-if analysis: Switch to new supplier with lower unit costs",
    isBaseline: false,
    timePeriodType: "SINGLE",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-22"),
    totalCost: 42500,
    savingsVsBaseline: 7500,
    savingsPercent: -15.0,
  },
  {
    id: "scenario-2",
    name: "Volume Increase + Efficiency Gains",
    description: "Scenario modeling 20% volume increase with 10% efficiency improvement",
    isBaseline: false,
    timePeriodType: "SINGLE",
    createdAt: new Date("2024-01-25"),
    updatedAt: new Date("2024-01-26"),
    totalCost: 54000,
    savingsVsBaseline: -4000,
    savingsPercent: 8.0,
  },
]

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>(mockScenarios)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null)

  const baselineScenarios = scenarios.filter((s) => s.isBaseline)

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
    // TODO: Replace with tRPC mutation
    console.log("Form submitted:", values)

    if (editingScenario) {
      // Update existing scenario
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === editingScenario.id
            ? {
                ...s,
                name: values.name,
                description: values.description || null,
                timePeriodType: values.timePeriodType,
                isBaseline: values.isBaseline,
                updatedAt: new Date(),
              }
            : s
        )
      )
    } else {
      // Create new scenario
      const newScenario: Scenario = {
        id: `scenario-${Date.now()}`,
        name: values.name,
        description: values.description || null,
        timePeriodType: values.timePeriodType,
        isBaseline: values.isBaseline,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setScenarios((prev) => [...prev, newScenario])
    }

    setIsCreateDialogOpen(false)
    setEditingScenario(null)
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
