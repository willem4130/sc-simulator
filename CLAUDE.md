# Supply Chain Scenario Simulator

Multi-tenant SaaS application for supply chain "what-if" scenario modeling with non-linear effect curves, side-by-side comparison, and financial impact analysis.

**Stack**: Next.js 16 + tRPC 11 + Prisma 6 + PostgreSQL + TypeScript 5

## Project Structure

```
src/
├── app/                              # Next.js pages
│   ├── admin/                        # Admin dashboard
│   │   ├── dashboard/                # Overview & scenario summary
│   │   ├── scenarios/                # Scenario management (list, [id], compare, new)
│   │   ├── variables/                # Variable definitions
│   │   ├── effect-curves/            # Effect curve editor with live preview
│   │   └── parameters/               # Global parameter management
│   └── api/                          # API routes (trpc, webhooks, health)
├── server/                           # Backend logic
│   ├── api/routers/                  # 8 tRPC routers (organization, scenario, variable, parameter, effectCurve, calculation, comparison, export)
│   └── calculation/                  # Calculation engine (engine, formula-parser, formula-evaluator, curves, dependency-graph)
├── lib/                              # Business logic & utilities
│   ├── calculation/                  # Calculation engine components
│   ├── export/                       # Excel export service
│   └── utils.ts                      # Shared utilities
├── components/                       # React components
│   ├── ui/                           # shadcn/ui components
│   └── admin/                        # Custom admin components (ScenarioList, CurvePreview, ComparisonTable, BottleneckHeatmap)
└── prisma/schema.prisma              # 9 models (Organization, User, Scenario, Variable, VariableValue, Parameter, EffectCurve, Calculation, AuditLog)
```

## Code Quality - Zero Tolerance

After editing ANY file, run these commands and fix ALL errors:

```bash
# 1. Type check (CRITICAL - run after every edit)
npm run typecheck

# 2. Lint
npm run lint

# 3. Format check
npm run format:check

# If build required (API/schema changes)
npm run build
```

## Key Commands

```bash
npm run dev                        # Start dev server (Turbopack)
npm run typecheck                  # Type check (REQUIRED after edits)
npm run db:push                    # Push schema changes
npm run db:generate                # Regenerate Prisma client
npm run build                      # Production build
npx vercel --prod                  # Deploy to production
```

## Organization Rules

- **API routers** → `src/server/api/routers/` (one router per domain: organization.ts, scenario.ts, variable.ts, etc.)
- **Calculation engine** → `src/lib/calculation/` or `src/server/calculation/` (engine, parser, evaluator, curves, dependency-graph)
- **Business logic** → `src/lib/` (export service, utilities)
- **UI components** → `src/components/` (ui/ for shadcn, admin/ for custom)
- **Pages** → `src/app/admin/` (one folder per feature)
- **One responsibility per file** - keep files focused and modular

## Architecture Principles

### Multi-Tenant Security
- **All queries filtered by organizationId** - Use custom `organizationProcedure` middleware
- **Organization-level data isolation** - User ↔ Organization 1:1 relationship
- **Role-based access** - ADMIN/EDITOR/VIEWER roles enforced

### Calculation Engine
- **Formula language**: Variables (INPUT_*, OUTPUT_*, PARAM_*), operators (+, -, *, /), functions (MAX, MIN, IF, ABS, SQRT)
- **Dependency resolution**: Topological sort (Kahn's algorithm) with circular dependency detection
- **Effect curves**: LINEAR, LOGARITHMIC, EXPONENTIAL, STEP_WISE, CUSTOM_INTERPOLATED
- **Cached results**: Store in Calculation table with versioning

### Data Patterns
- **Template + Instance**: Variable (template) → VariableValue (instances per scenario)
- **Baseline + Delta**: Track changes relative to baseline scenario (delta, percentChange)
- **Formula + Dependencies**: Variables calculated in topological order

## Implementation Phases

Based on `Planning/SUPPLY_CHAIN_SIMULATOR_PLAN.md`:
1. **Foundation** - Prisma models, basic CRUD routers, admin pages
2. **Calculation Engine** - Formula parser/evaluator, dependency resolution, baseline comparison
3. **Effect Curves** - Curve model, 5 curve types, live preview, integration
4. **Time Periods & Parameters** - Time-series support, parameter management
5. **BI & Comparison** - Scenario comparison table, Recharts visualizations, bottleneck heatmap
6. **Excel Export** - ExcelJS integration, full comparison export
7. **Polish & Production** - Audit logging, permissions, cloning, error handling, testing

## Database Schema (Prisma)

**9 Core Models:**
- `Organization` - Multi-tenant container
- `User` - Team members with roles (ADMIN/EDITOR/VIEWER)
- `Scenario` - What-if models (with baseline support, time periods, cloning)
- `Variable` - Calculation templates (INPUT/OUTPUT types with formulas)
- `VariableValue` - Scenario-specific input values (time-series support)
- `Parameter` - Global configuration values
- `EffectCurve` - Non-linear transformation curves (5 types)
- `Calculation` - Cached results with versioning and delta tracking
- `AuditLog` - Change tracking for compliance

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16 (App Router) + React 19 |
| **Database** | PostgreSQL + Prisma ORM 6.19 |
| **API** | tRPC 11 (8 routers) |
| **UI** | shadcn/ui + Tailwind CSS 3.4 |
| **Charts** | Recharts 3.4 |
| **Auth** | NextAuth.js 5.0 |
| **Validation** | Zod |
| **Export** | ExcelJS |

## Environment Variables

`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY` (optional)
