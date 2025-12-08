export default function EffectCurvesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Effect Curves</h1>
          <p className="text-muted-foreground">
            Define non-linear transformation curves for supply chain effects
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          No effect curves defined. Create curves to model non-linear relationships.
        </p>
      </div>
    </div>
  )
}
