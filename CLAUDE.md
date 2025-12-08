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

### ✅ Phase 1: Foundation (COMPLETE)
**Status**: All TypeScript checks passing, committed to `phase1-foundation` branch
- ✅ Replaced Prisma schema: 24 Simplicate models → 9 Supply Chain models
- ✅ Added `organizationProcedure` middleware for multi-tenant security
- ✅ Created NextAuth v5 config with PrismaAdapter
- ✅ Built 8 tRPC routers: organization, scenario, variable, parameter, effectCurve, calculation, comparison, export
- ✅ Created 6 admin pages: dashboard, scenarios, variables, effect-curves, parameters, settings
- ✅ Deleted all old Simplicate code (21,991 lines removed)
- ✅ Fixed Prisma nullable unique constraint type issue in variable router

**Next Steps**: Build UI components (database-independent), then deploy to production with Vercel Postgres

### 🚧 Phase 1.5: UI Foundation (IN PROGRESS)
- Build shadcn/ui components (Button, Table, Form, Dialog, Card)
- Create Scenario List page with mock data
- Create Scenario Create/Edit forms with Zod validation
- Build Variable management UI
- Build Parameter management UI
- Style with Tailwind + dark mode support

### 📋 Phase 2: Calculation Engine
- Formula parser/evaluator (supports variables, operators, functions)
- Dependency resolution with topological sort (Kahn's algorithm)
- Circular dependency detection
- Baseline comparison logic
- Integration with scenario calculation workflow

### 📋 Phase 3: Effect Curves
- Implement 5 curve types: LINEAR, LOGARITHMIC, EXPONENTIAL, STEP_WISE, CUSTOM_INTERPOLATED
- Live preview component with Recharts
- Curve editor UI
- Integration with calculation engine

### 📋 Phase 4: Time Periods & Parameters
- Time-series support for MONTHLY/QUARTERLY/YEARLY scenarios
- Parameter management UI
- Period navigation and comparison

### 📋 Phase 5: BI & Comparison
- Side-by-side scenario comparison table
- Recharts visualizations (line, bar, area charts)
- Bottleneck heatmap component
- Delta and percent change calculations

### 📋 Phase 6: Excel Export
- ExcelJS integration
- Full comparison export with formatting
- Multi-sheet workbooks

### 📋 Phase 7: Polish & Production
- Audit logging implementation
- Role-based permissions enforcement
- Scenario cloning functionality
- Error handling and validation
- Testing (unit + e2e)

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

## Current Implementation Status

### What's Working
- ✅ **Prisma Schema**: 9 models fully defined with relationships, indexes, and constraints
- ✅ **Multi-tenant Security**: `organizationProcedure` middleware in tRPC enforces org-level data isolation
- ✅ **Authentication**: NextAuth v5 configured with PrismaAdapter (using type cast for version compatibility)
- ✅ **8 tRPC Routers**: All routers created with proper TypeScript types
  - `organization`: CRUD for org management
  - `scenario`: Scenario creation, cloning, baseline management
  - `variable`: Variable definitions and value management (using findFirst pattern for nullable unique constraints)
  - `parameter`: Global parameter management
  - `effectCurve`: Curve definitions (5 types supported in schema)
  - `calculation`: Placeholder (Phase 2)
  - `comparison`: Placeholder (Phase 5)
  - `export`: Placeholder (Phase 6)
- ✅ **Admin Pages**: 6 placeholder pages created (dashboard, scenarios, variables, effect-curves, parameters, settings)
- ✅ **Type Safety**: All TypeScript checks passing (`npm run typecheck`)

### What's Not Yet Built
- ❌ **Database**: No `.env` file, no migrations run (DATABASE_URL not configured)
- ❌ **UI Components**: Admin pages are placeholders only (no forms, tables, or interactions)
- ❌ **Calculation Engine**: Formula parser, evaluator, dependency graph not implemented
- ❌ **Effect Curves**: Curve logic and preview component not implemented
- ❌ **Authentication Flow**: Login/signup pages not created
- ❌ **Testing**: No tests written yet

### Known Issues & Decisions
- **Prisma Unique Constraint Types**: Variable router uses `findFirst` + conditional `update`/`create` instead of `upsert` due to Prisma type issues with nullable fields in compound unique constraints
- **Auth Type Cast**: `PrismaAdapter` has `as any` cast in `src/server/auth.ts` due to `@auth/core` version mismatch (functional but not ideal)
- **Next.js Lint Issue**: `npm run lint` fails with path error (likely due to space in directory name) - doesn't affect build
- **Placeholder Routers**: calculation, comparison, export routers return "not yet implemented" messages

### Git Branch Structure
- **main**: Original Simplicate Automations baseline (pre-migration snapshot)
- **phase1-foundation**: Current working branch with Supply Chain foundation (4 commits)

### Production-Ready Deployment Setup

**Infrastructure**: Vercel (hosting) + Vercel Postgres (database) + Vercel Blob (file storage)

**Deployment Steps**:
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link to Vercel project
vercel link

# 3. Add production database (Vercel Postgres)
vercel postgres create

# 4. Set environment variables
vercel env add DATABASE_URL  # From Vercel Postgres connection string
vercel env add NEXTAUTH_SECRET  # Generate: openssl rand -base64 32
vercel env add NEXTAUTH_URL  # Your production domain

# 5. Run migrations
npx prisma migrate deploy

# 6. Deploy to production
vercel --prod
```

**Local Development** (optional):
- Use Vercel Postgres connection string with `?sslmode=require`
- Pull env vars: `vercel env pull .env.local`
- Start dev server: `npm run dev`
