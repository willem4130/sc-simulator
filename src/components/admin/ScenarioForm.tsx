"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

const scenarioFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  timePeriodType: z.enum(["SINGLE", "MONTHLY", "QUARTERLY", "YEARLY"]),
  isBaseline: z.boolean(),
  baselineScenarioId: z.string().optional(),
})

export type ScenarioFormValues = z.infer<typeof scenarioFormSchema>

interface ScenarioFormProps {
  defaultValues?: Partial<ScenarioFormValues>
  baselineScenarios?: Array<{ id: string; name: string }>
  onSubmit: (values: ScenarioFormValues) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function ScenarioForm({
  defaultValues,
  baselineScenarios = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ScenarioFormProps) {
  const form = useForm<ScenarioFormValues>({
    resolver: zodResolver(scenarioFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      timePeriodType: defaultValues?.timePeriodType ?? "SINGLE",
      isBaseline: defaultValues?.isBaseline ?? false,
      baselineScenarioId: defaultValues?.baselineScenarioId,
    },
  })

  const isBaseline = form.watch("isBaseline")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scenario Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Supplier Switch - 15% Cost Reduction"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A clear, descriptive name for this scenario
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the changes and assumptions in this scenario..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional: Add details about what this scenario models
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timePeriodType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time Period Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time period type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="SINGLE">Single Period</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                How time is modeled in this scenario
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isBaseline"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Set as Baseline Scenario
                </FormLabel>
                <FormDescription>
                  Baseline scenarios represent the current state and are used for comparison
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {!isBaseline && baselineScenarios.length > 0 && (
          <FormField
            control={form.control}
            name="baselineScenarioId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Compare to Baseline</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select baseline scenario" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {baselineScenarios.map((baseline) => (
                      <SelectItem key={baseline.id} value={baseline.id}>
                        {baseline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Optional: Choose a baseline to compare against
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : defaultValues ? "Update Scenario" : "Create Scenario"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
