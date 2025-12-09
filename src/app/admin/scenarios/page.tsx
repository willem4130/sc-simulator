"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ScenarioList, type Scenario } from "@/components/admin/ScenarioList"
import { ScenarioForm, type ScenarioFormValues } from "@/components/admin/ScenarioForm"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { api } from "@/trpc/react"
import { toast } from "sonner"

export default function ScenariosPage() {
  const router = useRouter()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null)
  const [deletingScenarioId, setDeletingScenarioId] = useState<string | null>(null)

  // Get organization ID dynamically
  const { data: org } = api.organization.getFirst.useQuery()
  const organizationId = org?.id ?? ''

  // Get first project (temporary - will be replaced with proper project selection)
  const { data: projects = [] } = api.project.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  )
  const projectId = projects[0]?.id ?? ''

  // Query scenarios from database
  const { data: dbScenarios = [], refetch } = api.scenario.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  )

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
      toast.success("Scenario created successfully")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = api.scenario.update.useMutation({
    onSuccess: () => {
      refetch()
      setIsCreateDialogOpen(false)
      setEditingScenario(null)
      toast.success("Scenario updated successfully")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = api.scenario.delete.useMutation({
    onSuccess: () => {
      refetch()
      setDeletingScenarioId(null)
      toast.success("Scenario deleted successfully")
    },
    onError: (error) => {
      toast.error(error.message)
      setDeletingScenarioId(null)
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

  const handleEditValues = (id: string) => {
    router.push(`/admin/scenarios/${id}`)
  }

  const handleDelete = (id: string) => {
    setDeletingScenarioId(id)
  }

  const confirmDelete = () => {
    if (deletingScenarioId && organizationId) {
      deleteMutation.mutate({
        organizationId,
        id: deletingScenarioId,
      })
    }
  }

  const handleSubmit = async (values: ScenarioFormValues) => {
    if (!organizationId) {
      toast.error("Organization not found")
      return
    }
    if (editingScenario) {
      // Update existing scenario
      updateMutation.mutate({
        organizationId,
        id: editingScenario.id,
        name: values.name,
        description: values.description,
        timePeriodType: values.timePeriodType === 'SINGLE' ? 'SINGLE_POINT' : values.timePeriodType,
        isBaseline: values.isBaseline,
      })
    } else {
      // Create new scenario
      createMutation.mutate({
        organizationId,
        projectId,
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
        onEditValues={handleEditValues}
        onDelete={handleDelete}
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

      <AlertDialog
        open={deletingScenarioId !== null}
        onOpenChange={(open) => !open && setDeletingScenarioId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scenario? This action cannot be undone.
              All associated variable values and calculations will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
