"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Plus, TrendingDown, TrendingUp, Pencil, Trash2, Settings } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface Scenario {
  id: string
  name: string
  description: string | null
  isBaseline: boolean
  timePeriodType: string
  createdAt: Date
  updatedAt: Date
  // Mock calculated fields
  totalCost?: number
  savingsVsBaseline?: number
  savingsPercent?: number
}

interface ScenarioListProps {
  scenarios: Scenario[]
  onCreateNew: () => void
  onEdit: (id: string) => void
  onEditValues: (id: string) => void
  onDelete: (id: string) => void
  onCompare: (ids: string[]) => void
}

export function ScenarioList({ scenarios, onCreateNew, onEdit, onEditValues, onDelete, onCompare }: ScenarioListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scenarios</CardTitle>
            <CardDescription>
              Manage and compare supply chain what-if scenarios
            </CardDescription>
          </div>
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Scenario
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No scenarios yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Create your first scenario to start modeling supply chain changes and comparing outcomes
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Scenario
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">vs Baseline</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((scenario) => (
                <TableRow key={scenario.id}>
                  <TableCell className="font-medium">{scenario.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {scenario.description || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {scenario.timePeriodType === 'SINGLE' ? 'Single Period' : scenario.timePeriodType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {scenario.isBaseline ? (
                      <Badge>Baseline</Badge>
                    ) : (
                      <Badge variant="secondary">Scenario</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {scenario.totalCost ? formatCurrency(scenario.totalCost) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {!scenario.isBaseline && scenario.savingsVsBaseline !== undefined ? (
                      <div className="flex items-center justify-end gap-1">
                        {scenario.savingsVsBaseline > 0 ? (
                          <TrendingDown className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-red-600" />
                        )}
                        <span
                          className={
                            scenario.savingsVsBaseline > 0
                              ? 'text-green-600 font-medium'
                              : 'text-red-600 font-medium'
                          }
                        >
                          {formatCurrency(Math.abs(scenario.savingsVsBaseline))}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({formatPercent(scenario.savingsPercent || 0)})
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(scenario.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditValues(scenario.id)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit variable values</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(scenario.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit scenario details</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(scenario.id)}
                                disabled={scenario.isBaseline}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {scenario.isBaseline && (
                            <TooltipContent>
                              <p>Cannot delete baseline scenario</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
