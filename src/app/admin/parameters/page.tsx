export default function ParametersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parameters</h1>
          <p className="text-muted-foreground">
            Manage global parameters used across scenarios
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          No parameters defined. Add global parameters for use in formulas.
        </p>
      </div>
    </div>
  )
}
