'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Building2,
  FolderOpen,
  Users,
  Calendar,
  ArrowUpDown,
  TrendingUp,
  Save,
  Star,
  MoreHorizontal,
  Trash2,
  Pencil,
  X,
  Library,
  Check,
  RefreshCw,
} from 'lucide-react'
import { api } from '@/trpc/react'
import { useState, useEffect, useCallback } from 'react'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'

// Generate month options for the last 12 months
function getMonthOptions(): MultiSelectOption[] {
  const options: MultiSelectOption[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('nl-NL', { year: 'numeric', month: 'long' })
    options.push({ value, label })
  }
  return options
}

const monthOptions = getMonthOptions()

function getBudgetStatus(percentage: number | null) {
  if (percentage === null) return { label: 'No budget', variant: 'secondary' as const, color: 'text-muted-foreground' }
  if (percentage >= 100) return { label: 'Over budget', variant: 'destructive' as const, color: 'text-red-600' }
  if (percentage >= 90) return { label: 'At risk', variant: 'default' as const, color: 'text-orange-600' }
  if (percentage >= 75) return { label: 'High usage', variant: 'outline' as const, color: 'text-yellow-600' }
  return { label: 'On track', variant: 'outline' as const, color: 'text-green-600' }
}

// Types for filter state
interface FilterState {
  months: string[]
  projects: string[]
  employees: string[]
  sortBy: 'client' | 'project' | 'hours' | 'budget'
  sortOrder: 'asc' | 'desc'
}

const defaultFilters: FilterState = {
  months: [monthOptions[0]?.value || ''],
  projects: [],
  employees: [],
  sortBy: 'client',
  sortOrder: 'asc',
}

// LocalStorage key
const PRESETS_STORAGE_KEY = 'hours-filter-presets'

export default function HoursPage() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [editingPreset, setEditingPreset] = useState<{ id: string; name: string } | null>(null)

  // Fetch data
  const { data: projectsSummary, isLoading } = api.hours.getProjectsSummary.useQuery({
    months: filters.months,
    projectIds: filters.projects.length > 0 ? filters.projects : undefined,
    employeeIds: filters.employees.length > 0 ? filters.employees : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  })

  const { data: projects } = api.hours.getProjectsForFilter.useQuery()
  const { data: employees } = api.hours.getEmployeesForFilter.useQuery()
  const { data: monthlyTotals } = api.hours.getMonthlyTotals.useQuery({ months: 6 })
  const { data: presets, refetch: refetchPresets } = api.filterPresets.getAll.useQuery({ page: 'hours' })
  const { data: defaultPreset } = api.filterPresets.getDefault.useQuery({ page: 'hours' })

  const createPreset = api.filterPresets.create.useMutation()
  const updatePreset = api.filterPresets.update.useMutation()
  const deletePreset = api.filterPresets.delete.useMutation()
  const setDefaultPreset = api.filterPresets.setDefault.useMutation()
  const utils = api.useUtils()

  // Load default preset on mount
  useEffect(() => {
    if (defaultPreset?.filters) {
      const savedFilters = defaultPreset.filters as unknown as FilterState
      setFilters({
        months: savedFilters.months || defaultFilters.months,
        projects: savedFilters.projects || [],
        employees: savedFilters.employees || [],
        sortBy: savedFilters.sortBy || 'client',
        sortOrder: savedFilters.sortOrder || 'asc',
      })
    }
  }, [defaultPreset])

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  // Convert projects and employees to MultiSelect options
  const projectOptions: MultiSelectOption[] = (projects || []).map(p => ({
    value: p.id,
    label: p.clientName ? `${p.clientName} - ${p.name}` : p.name,
    group: p.clientName || 'No client',
  }))

  const employeeOptions: MultiSelectOption[] = (employees || []).map(e => ({
    value: e.id,
    label: e.name || e.email,
  }))

  // Get display label for months
  const getMonthsLabel = useCallback(() => {
    if (filters.months.length === 0) return 'All time'
    if (filters.months.length === 1) {
      return monthOptions.find(m => m.value === filters.months[0])?.label || filters.months[0]
    }
    return `${filters.months.length} months selected`
  }, [filters.months])

  // Get a short description of active filters
  const getFilterDescription = useCallback(() => {
    const parts: string[] = []
    if (filters.months.length === 0) {
      parts.push('all time')
    } else if (filters.months.length === 1) {
      const monthValue = filters.months[0]
      const label = monthValue ? monthOptions.find(m => m.value === monthValue)?.label : undefined
      parts.push(label || monthValue || 'unknown')
    } else {
      parts.push(`${filters.months.length} months`)
    }
    if (filters.projects.length > 0) {
      parts.push(`${filters.projects.length} project${filters.projects.length > 1 ? 's' : ''}`)
    }
    if (filters.employees.length > 0) {
      parts.push(`${filters.employees.length} employee${filters.employees.length > 1 ? 's' : ''}`)
    }
    return parts.join(', ')
  }, [filters])

  // Save preset
  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return

    try {
      await createPreset.mutateAsync({
        name: newPresetName.trim(),
        page: 'hours',
        filters,
      })
      await refetchPresets()
      setSaveDialogOpen(false)
      setNewPresetName('')
    } catch (error) {
      console.error('Failed to save preset:', error)
    }
  }

  // Load preset
  const loadPreset = (preset: { filters: unknown }) => {
    const savedFilters = preset.filters as FilterState
    setFilters({
      months: savedFilters.months || defaultFilters.months,
      projects: savedFilters.projects || [],
      employees: savedFilters.employees || [],
      sortBy: savedFilters.sortBy || 'client',
      sortOrder: savedFilters.sortOrder || 'asc',
    })
  }

  // Update preset
  const handleUpdatePreset = async (id: string) => {
    try {
      await updatePreset.mutateAsync({ id, filters })
      await refetchPresets()
    } catch (error) {
      console.error('Failed to update preset:', error)
    }
  }

  // Delete preset
  const handleDeletePreset = async (id: string) => {
    try {
      await deletePreset.mutateAsync({ id })
      await refetchPresets()
    } catch (error) {
      console.error('Failed to delete preset:', error)
    }
  }

  // Set as default
  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPreset.mutateAsync({ id, page: 'hours' })
      await refetchPresets()
      utils.filterPresets.getDefault.invalidate({ page: 'hours' })
    } catch (error) {
      console.error('Failed to set default:', error)
    }
  }

  // Rename preset
  const handleRenamePreset = async () => {
    if (!editingPreset || !editingPreset.name.trim()) return

    try {
      await updatePreset.mutateAsync({ id: editingPreset.id, name: editingPreset.name.trim() })
      await refetchPresets()
      setEditingPreset(null)
    } catch (error) {
      console.error('Failed to rename preset:', error)
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters(defaultFilters)
  }

  const hasActiveFilters = filters.months.length > 1 ||
    filters.projects.length > 0 ||
    filters.employees.length > 0 ||
    filters.sortBy !== 'client' ||
    filters.sortOrder !== 'asc'

  // Format filter summary for preset display
  const formatFilterSummary = (presetFilters: unknown): string => {
    const f = presetFilters as FilterState
    const parts: string[] = []
    if (f.months?.length) {
      parts.push(`${f.months.length} month${f.months.length > 1 ? 's' : ''}`)
    }
    if (f.projects?.length) {
      parts.push(`${f.projects.length} project${f.projects.length > 1 ? 's' : ''}`)
    }
    if (f.employees?.length) {
      parts.push(`${f.employees.length} employee${f.employees.length > 1 ? 's' : ''}`)
    }
    if (f.sortBy && f.sortBy !== 'client') {
      parts.push(`sort: ${f.sortBy}`)
    }
    return parts.length > 0 ? parts.join(', ') : 'Default filters'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hours Overview</h1>
        <p className="text-muted-foreground">Hours by project, dienst and employee</p>
      </div>

      {/* Preset Bar */}
      {presets && presets.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Quick filters:</span>
          {presets.map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              className="h-7 gap-1"
              onClick={() => loadPreset(preset)}
            >
              {preset.isDefault && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
              {preset.name}
            </Button>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {/* Month selector (multi) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Months</label>
              <MultiSelect
                options={monthOptions}
                selected={filters.months}
                onChange={(months) => setFilters(f => ({ ...f, months }))}
                placeholder="Select months"
                searchPlaceholder="Search months..."
                className="w-[220px]"
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>

            {/* Project filter (multi) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Projects</label>
              <MultiSelect
                options={projectOptions}
                selected={filters.projects}
                onChange={(projects) => setFilters(f => ({ ...f, projects }))}
                placeholder="All projects"
                searchPlaceholder="Search projects..."
                className="w-[240px]"
                icon={<FolderOpen className="h-4 w-4" />}
              />
            </div>

            {/* Employee filter (multi) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Employees</label>
              <MultiSelect
                options={employeeOptions}
                selected={filters.employees}
                onChange={(employees) => setFilters(f => ({ ...f, employees }))}
                placeholder="All employees"
                searchPlaceholder="Search employees..."
                className="w-[200px]"
                icon={<Users className="h-4 w-4" />}
              />
            </div>

            {/* Sort by */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Sort by</label>
              <Select
                value={filters.sortBy}
                onValueChange={(v) => setFilters(f => ({ ...f, sortBy: v as FilterState['sortBy'] }))}
              >
                <SelectTrigger className="w-[150px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="budget">Budget %</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort order */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Order</label>
              <Select
                value={filters.sortOrder}
                onValueChange={(v) => setFilters(f => ({ ...f, sortOrder: v as FilterState['sortOrder'] }))}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">&nbsp;</label>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Clear
                  </Button>
                )}

                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Save className="mr-1 h-4 w-4" />
                      Save
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Filter Preset</DialogTitle>
                      <DialogDescription>
                        Save current filters as a preset for quick access later.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="preset-name">Preset name</Label>
                        <Input
                          id="preset-name"
                          placeholder="e.g., Last Quarter, My Projects"
                          value={newPresetName}
                          onChange={(e) => setNewPresetName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSavePreset} disabled={!newPresetName.trim()}>
                        Save Preset
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Preset Library Button */}
          {presets && presets.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setLibraryDialogOpen(true)}>
                <Library className="mr-2 h-4 w-4" />
                Manage Presets ({presets.length})
              </Button>
            </div>
          )}

          {/* Preset Library Dialog */}
          <Dialog open={libraryDialogOpen} onOpenChange={setLibraryDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Library className="h-5 w-5" />
                  Filter Presets Library
                </DialogTitle>
                <DialogDescription>
                  Manage your saved filter presets. Click a preset to load it, or use the actions to edit.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[400px] overflow-y-auto">
                {presets && presets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Name</TableHead>
                        <TableHead>Filters</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {presets.map((preset) => (
                        <TableRow key={preset.id} className="group">
                          <TableCell>
                            {editingPreset?.id === preset.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  className="h-8 w-full"
                                  value={editingPreset.name}
                                  onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenamePreset()
                                    if (e.key === 'Escape') setEditingPreset(null)
                                  }}
                                  autoFocus
                                />
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleRenamePreset}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingPreset(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {preset.isDefault && (
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
                                )}
                                <span className="font-medium">{preset.name}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatFilterSummary(preset.filters)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {editingPreset?.id !== preset.id && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    loadPreset(preset)
                                    setLibraryDialogOpen(false)
                                  }}
                                  title="Load preset"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleUpdatePreset(preset.id)}>
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      Update with current filters
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setEditingPreset({ id: preset.id, name: preset.name })}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Rename
                                    </DropdownMenuItem>
                                    {!preset.isDefault && (
                                      <DropdownMenuItem onClick={() => handleSetDefault(preset.id)}>
                                        <Star className="mr-2 h-4 w-4" />
                                        Set as default
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDeletePreset(preset.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Library className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No presets saved yet.</p>
                    <p className="text-sm">Save your current filters to create a preset.</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLibraryDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setLibraryDialogOpen(false)
                  setSaveDialogOpen(true)
                }}>
                  <Save className="mr-2 h-4 w-4" />
                  Create New Preset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsSummary?.totals.hoursThisMonth.toFixed(1) || '0'}</div>
            <p className="text-xs text-muted-foreground">{getFilterDescription()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Entries</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsSummary?.totals.entriesThisMonth || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsSummary?.totals.projectsWithHours || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 6 Months</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyTotals?.reduce((sum, m) => sum + m.hours, 0).toFixed(0) || '0'}h
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyTotals?.reduce((sum, m) => sum + m.entries, 0) || 0} entries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle>Projects - {getMonthsLabel()}</CardTitle>
          <CardDescription>
            Hours breakdown per project, dienst, and employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !projectsSummary?.projects.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No hours found</h3>
              <p className="text-muted-foreground">
                No hours logged for selected period
                {filters.projects.length > 0 && ' in selected projects'}
                {filters.employees.length > 0 && ' by selected employees'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {projectsSummary.projects.map((project) => (
                <Collapsible
                  key={project.id}
                  open={expandedProjects.has(project.id)}
                  onOpenChange={() => toggleProject(project.id)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          {expandedProjects.has(project.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{project.clientName || 'No client'}</span>
                              <span className="text-muted-foreground">-</span>
                              <span>{project.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {project.services.length} dienst{project.services.length !== 1 ? 'en' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold">{project.totalHoursThisMonth.toFixed(1)}h</p>
                            <p className="text-xs text-muted-foreground">selected period</p>
                          </div>
                          {(() => {
                            const maxBudget = Math.max(...project.services.map(s => s.budgetPercentage || 0))
                            const status = getBudgetStatus(maxBudget > 0 ? maxBudget : null)
                            return maxBudget > 0 ? (
                              <Badge variant={status.variant} className="min-w-[90px] justify-center">
                                {maxBudget}%
                              </Badge>
                            ) : null
                          })()}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t bg-muted/30">
                        {project.services.map((service) => {
                          const status = getBudgetStatus(service.budgetPercentage)
                          return (
                            <div key={service.id} className="border-b last:border-b-0 p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{service.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm">
                                    <span className="font-medium">{service.hoursThisMonth.toFixed(1)}h</span>
                                    <span className="text-muted-foreground"> selected</span>
                                  </span>
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                </div>
                              </div>

                              {service.budgetHours && service.budgetHours > 0 && (
                                <div className="mb-4 space-y-1.5">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      Budget: {service.usedHours.toFixed(1)} / {service.budgetHours}h used
                                    </span>
                                    <span className={status.color}>{service.budgetPercentage}%</span>
                                  </div>
                                  <Progress
                                    value={Math.min(service.budgetPercentage || 0, 100)}
                                    className="h-2"
                                  />
                                  {service.monthPercentageOfBudget !== null && (
                                    <p className="text-xs text-muted-foreground">
                                      Selection: {service.monthPercentageOfBudget}% of total budget
                                    </p>
                                  )}
                                </div>
                              )}

                              {service.employees.length > 0 && (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Employee</TableHead>
                                      <TableHead className="text-right">Hours</TableHead>
                                      <TableHead className="text-right">Entries</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {service.employees.map((emp) => (
                                      <TableRow key={emp.employee.id}>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span>{emp.employee.name || emp.employee.email}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {emp.hoursThisMonth.toFixed(1)}h
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                          {emp.entries}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
