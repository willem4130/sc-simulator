'use client'

import { useMemo, useCallback } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileInput, Calculator, Settings2 } from 'lucide-react'

interface Variable {
  id: string
  name: string
  displayName: string
  variableType: 'INPUT' | 'OUTPUT'
  formula?: string | null
  dependencies: string[]
  unit?: string | null
}

interface Parameter {
  id: string
  name: string
  displayName: string
  value: number
  unit?: string | null
}

interface CalculationWorkflowProps {
  variables: Variable[]
  parameters: Parameter[]
}

// Custom node colors based on type
const getNodeColor = (type: 'INPUT' | 'OUTPUT' | 'PARAMETER') => {
  switch (type) {
    case 'INPUT':
      return '#10b981' // green-500
    case 'OUTPUT':
      return '#3b82f6' // blue-500
    case 'PARAMETER':
      return '#f59e0b' // amber-500
    default:
      return '#6b7280' // gray-500
  }
}

const getNodeBorderColor = (type: 'INPUT' | 'OUTPUT' | 'PARAMETER') => {
  switch (type) {
    case 'INPUT':
      return '#059669' // green-600
    case 'OUTPUT':
      return '#2563eb' // blue-600
    case 'PARAMETER':
      return '#d97706' // amber-600
    default:
      return '#4b5563' // gray-600
  }
}

export default function CalculationWorkflow({ variables, parameters }: CalculationWorkflowProps) {
  // Build graph from variables and parameters
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []
    const nodeMap = new Map<string, { level: number; type: 'INPUT' | 'OUTPUT' | 'PARAMETER' }>()

    // Extract parameter names from formulas
    const getParametersFromFormula = (formula: string): string[] => {
      const paramMatches = formula.match(/PARAM_[A-Z_]+/g) || []
      return [...new Set(paramMatches)]
    }

    // Add INPUT variables (level 0)
    const inputVars = variables.filter((v) => v.variableType === 'INPUT')
    inputVars.forEach((v, idx) => {
      nodeMap.set(v.name, { level: 0, type: 'INPUT' })
    })

    // Add PARAMETER nodes (level 0, alongside inputs)
    const usedParamNames = new Set<string>()
    variables.forEach((v) => {
      if (v.formula) {
        const paramNames = getParametersFromFormula(v.formula)
        paramNames.forEach((p) => usedParamNames.add(p))
      }
    })

    usedParamNames.forEach((paramName) => {
      nodeMap.set(paramName, { level: 0, type: 'PARAMETER' })
    })

    // Calculate levels for OUTPUT variables using topological sort
    const outputVars = variables.filter((v) => v.variableType === 'OUTPUT')
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const calculateLevel = (varName: string, variable: Variable): number => {
      if (visited.has(varName)) {
        return nodeMap.get(varName)?.level ?? 0
      }
      if (visiting.has(varName)) {
        // Circular dependency - place at next level
        return 1
      }

      visiting.add(varName)

      let maxDepLevel = 0

      // Check dependencies (variable names)
      variable.dependencies.forEach((depName) => {
        const depVar = variables.find((v) => v.name === depName)
        if (depVar) {
          const depLevel = calculateLevel(depName, depVar)
          maxDepLevel = Math.max(maxDepLevel, depLevel)
        }
      })

      // Check parameters in formula
      if (variable.formula) {
        const paramNames = getParametersFromFormula(variable.formula)
        paramNames.forEach((paramName) => {
          // Parameters are at level 0
          maxDepLevel = Math.max(maxDepLevel, 0)
        })
      }

      const level = maxDepLevel + 1
      nodeMap.set(varName, { level, type: 'OUTPUT' })
      visiting.delete(varName)
      visited.add(varName)

      return level
    }

    outputVars.forEach((v) => {
      calculateLevel(v.name, v)
    })

    // Calculate layout positions
    const levelGroups = new Map<number, string[]>()
    nodeMap.forEach((data, name) => {
      const group = levelGroups.get(data.level) || []
      group.push(name)
      levelGroups.set(data.level, group)
    })

    const xSpacing = 300
    const ySpacing = 120
    const maxLevel = Math.max(...Array.from(nodeMap.values()).map((v) => v.level))

    nodeMap.forEach((data, name) => {
      const levelGroup = levelGroups.get(data.level) || []
      const indexInLevel = levelGroup.indexOf(name)
      const levelSize = levelGroup.length

      const variable = variables.find((v) => v.name === name)
      const parameter = parameters.find((p) => p.name === name)

      let label = name
      let subtitle = ''
      let icon = <Calculator className="h-4 w-4" />

      if (variable) {
        label = variable.displayName
        subtitle = variable.unit ? `(${variable.unit})` : ''
        icon =
          variable.variableType === 'INPUT' ? (
            <FileInput className="h-4 w-4" />
          ) : (
            <Calculator className="h-4 w-4" />
          )
      } else if (parameter) {
        label = parameter.displayName
        subtitle = parameter.unit ? `${parameter.value} ${parameter.unit}` : `${parameter.value}`
        icon = <Settings2 className="h-4 w-4" />
      }

      nodes.push({
        id: name,
        type: 'default',
        position: {
          x: data.level * xSpacing,
          y: indexInLevel * ySpacing - (levelSize * ySpacing) / 2 + 200,
        },
        data: {
          label: (
            <div className="flex flex-col items-center gap-1 px-3 py-2">
              <div className="flex items-center gap-2">
                {icon}
                <span className="font-semibold">{label}</span>
              </div>
              {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
            </div>
          ),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          background: getNodeColor(data.type),
          color: 'white',
          border: `2px solid ${getNodeBorderColor(data.type)}`,
          borderRadius: '8px',
          fontSize: '12px',
          minWidth: '180px',
        },
      })
    })

    // Add edges based on dependencies and formulas
    variables.forEach((v) => {
      // Add edges from dependencies
      v.dependencies.forEach((depName) => {
        edges.push({
          id: `${depName}-${v.name}`,
          source: depName,
          target: v.name,
          animated: true,
          style: { stroke: '#94a3b8' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#94a3b8',
          },
        })
      })

      // Add edges from parameters in formula
      if (v.formula) {
        const paramNames = getParametersFromFormula(v.formula)
        paramNames.forEach((paramName) => {
          edges.push({
            id: `${paramName}-${v.name}`,
            source: paramName,
            target: v.name,
            animated: false,
            style: { stroke: '#f59e0b', strokeDasharray: '5,5' },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#f59e0b',
            },
          })
        })
      }
    })

    return { nodes, edges }
  }, [variables, parameters])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const variable = variables.find((v) => v.name === node.id)
      if (variable?.formula) {
        alert(`Formula: ${variable.formula}`)
      }
    },
    [variables]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculation Workflow</CardTitle>
        <CardDescription>
          Interactive visualization of variable dependencies and calculation flow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded border-2"
              style={{ background: getNodeColor('INPUT'), borderColor: getNodeBorderColor('INPUT') }}
            />
            <span>Input Variables</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded border-2"
              style={{
                background: getNodeColor('PARAMETER'),
                borderColor: getNodeBorderColor('PARAMETER'),
              }}
            />
            <span>Parameters</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded border-2"
              style={{
                background: getNodeColor('OUTPUT'),
                borderColor: getNodeBorderColor('OUTPUT'),
              }}
            />
            <span>Output Variables</span>
          </div>
        </div>

        <div className="h-[600px] rounded-lg border bg-background">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const nodeData = nodeMap.get(node.id)
                return getNodeColor(nodeData?.type ?? 'INPUT')
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Click on output nodes to view their formulas. Drag to pan, scroll to zoom.
        </p>
      </CardContent>
    </Card>
  )
}

// Helper to access nodeMap in MiniMap
const nodeMap = new Map<string, { level: number; type: 'INPUT' | 'OUTPUT' | 'PARAMETER' }>()
