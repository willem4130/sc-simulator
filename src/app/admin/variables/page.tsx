export default function VariablesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Variables</h1>
          <p className="text-muted-foreground">
            Define input and output variables for your supply chain model
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          No variables defined. Create your first variable to start modeling.
        </p>
      </div>
    </div>
  )
}
