/**
 * Calculation router - Calculation engine interface
 */
import { z } from 'zod'
import { createTRPCRouter, organizationProcedure, publicProcedure } from '@/server/api/trpc'
import { runCalculation } from '@/lib/calculation/engine'
import { validateFormula } from '@/lib/calculation/formula-parser'
import type {
  CalculationEngineContext,
  VariableDefinition,
  ParameterDefinition,
  VariableValueInput,
} from '@/lib/calculation/types'

export const calculationRouter = createTRPCRouter({
  /**
   * Get latest calculation for a scenario
   * TODO: Change back to organizationProcedure once authentication is implemented
   */
  getLatest: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        scenarioId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.calculation.findFirst({
        where: { scenarioId: input.scenarioId },
        orderBy: { version: 'desc' },
      })
    }),

  /**
   * Get all calculations for a scenario
   * TODO: Change back to organizationProcedure once authentication is implemented
   */
  getAll: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        scenarioId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.calculation.findMany({
        where: { scenarioId: input.scenarioId },
        orderBy: { periodStart: 'asc' },
      })
    }),

  /**
   * Get calculation by version
   */
  getByVersion: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        scenarioId: z.string(),
        version: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.calculation.findFirst({
        where: {
          scenarioId: input.scenarioId,
          version: input.version,
        },
      })
    }),

  /**
   * Calculate or recalculate a scenario
   * TODO: Change back to organizationProcedure once authentication is implemented
   */
  calculate: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        scenarioId: z.string(),
        periodStart: z.date().optional(),
        periodEnd: z.date().optional(),
        forceRecalculate: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if calculation already exists (unless force recalculate)
      if (!input.forceRecalculate) {
        const existingCalc = await ctx.db.calculation.findFirst({
          where: {
            scenarioId: input.scenarioId,
            periodStart: input.periodStart ?? null,
          },
          orderBy: { version: 'desc' },
        })

        if (existingCalc) {
          return existingCalc
        }
      }

      // Load scenario
      const scenario = await ctx.db.scenario.findFirst({
        where: {
          id: input.scenarioId,
          organizationId: input.organizationId,
        },
      })

      if (!scenario) {
        throw new Error('Scenario not found')
      }

      // Load variables
      const dbVariables = await ctx.db.variable.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: 'asc' },
      })

      const variables: VariableDefinition[] = dbVariables.map((v) => ({
        id: v.id,
        name: v.name,
        displayName: v.displayName,
        variableType: v.variableType,
        formula: v.formula,
        dependencies: v.dependencies,
        effectCurveId: v.effectCurveId,
        unit: v.unit,
      }))

      // Load parameters
      const dbParameters = await ctx.db.parameter.findMany({
        where: { organizationId: input.organizationId },
      })

      const parameters: ParameterDefinition[] = dbParameters.map((p) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        value: p.value,
        unit: p.unit,
      }))

      // Load input values for this scenario
      const dbInputValues = await ctx.db.variableValue.findMany({
        where: {
          scenarioId: input.scenarioId,
          periodStart: input.periodStart ?? null,
        },
        include: {
          variable: true,
        },
      })

      const inputValues: VariableValueInput[] = dbInputValues.map((v) => ({
        variableId: v.variableId,
        variableName: v.variable.name,
        value: v.value,
      }))

      // Load baseline results if this is not the baseline scenario
      let baselineResults = null
      if (!scenario.isBaseline) {
        const baselineScenario = await ctx.db.scenario.findFirst({
          where: {
            organizationId: input.organizationId,
            isBaseline: true,
          },
        })

        if (baselineScenario) {
          const baselineCalc = await ctx.db.calculation.findFirst({
            where: {
              scenarioId: baselineScenario.id,
              periodStart: input.periodStart ?? null,
            },
            orderBy: { version: 'desc' },
          })

          if (baselineCalc) {
            baselineResults = baselineCalc.results as Record<string, unknown>
          }
        }
      }

      // Load SKU effect curves
      const dbSkuCurves = await ctx.db.skuEffectCurve.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { skuRangeStart: 'asc' },
      })

      const skuEffectCurves = dbSkuCurves.map((curve) => ({
        skuRangeStart: curve.skuRangeStart,
        effectMultiplier: curve.effectMultiplier,
      }))

      // Build calculation context
      const context: CalculationEngineContext = {
        variables,
        parameters,
        inputValues,
        baselineResults: baselineResults as never,
        effectCurves: new Map(), // TODO: Load effect curves in Phase 3
        skuEffectCurves,
      }

      // Run calculation
      const result = await runCalculation(context, {
        scenarioId: input.scenarioId,
        organizationId: input.organizationId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        forceRecalculate: input.forceRecalculate,
      })

      // Get next version number
      const latestCalc = await ctx.db.calculation.findFirst({
        where: {
          scenarioId: input.scenarioId,
          periodStart: input.periodStart ?? null,
        },
        orderBy: { version: 'desc' },
      })

      const nextVersion = (latestCalc?.version ?? 0) + 1

      // Store calculation result
      const calculation = await ctx.db.calculation.create({
        data: {
          scenarioId: input.scenarioId,
          periodStart: input.periodStart ?? null,
          periodEnd: input.periodEnd ?? null,
          results: result.results as never,
          baselineScenarioId: scenario.isBaseline ? null : undefined,
          calculationTime: result.calculationTime,
          executionTimeMs: result.executionTimeMs,
          version: nextVersion,
          hasErrors: result.hasErrors,
          errorLog: result.errorLog as never,
        },
      })

      // Store calculated OUTPUT variable values
      for (const [variableName, varResult] of Object.entries(result.results)) {
        const variable = variables.find((v) => v.name === variableName)
        if (variable?.variableType === 'OUTPUT') {
          // Check if value already exists
          const existing = await ctx.db.variableValue.findFirst({
            where: {
              scenarioId: input.scenarioId,
              variableId: variable.id,
              periodStart: input.periodStart ?? null,
            },
          })

          if (existing) {
            await ctx.db.variableValue.update({
              where: { id: existing.id },
              data: {
                value: varResult.value,
                isManual: false,
                modifiedAt: new Date(),
              },
            })
          } else {
            await ctx.db.variableValue.create({
              data: {
                scenarioId: input.scenarioId,
                variableId: variable.id,
                value: varResult.value,
                periodStart: input.periodStart ?? null,
                periodEnd: input.periodEnd ?? null,
                isManual: false,
              },
            })
          }
        }
      }

      return calculation
    }),

  /**
   * Validate a formula
   */
  validateFormula: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        formula: z.string(),
      })
    )
    .query(({ input }) => {
      return validateFormula(input.formula)
    }),
})
