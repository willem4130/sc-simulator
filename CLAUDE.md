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
- **Formula language**: Variables (INPUT_*, OUTPUT_*, PARAM_*), operators (+, -, *, /), functions (MAX, MIN, IF, ABS, SQRT, ROUND, CEILING, FLOOR, POW, SKU_LOOKUP)
- **Dependency resolution**: Topological sort (Kahn's algorithm) with circular dependency detection
- **SKU complexity effects**: SKU_LOOKUP function uses SkuEffectCurve table for diminishing returns (per 50 SKUs)
- **Effect curves**: LINEAR, LOGARITHMIC, EXPONENTIAL, STEP_WISE, CUSTOM_INTERPOLATED (implementation pending)
- **Cached results**: Store in Calculation table with versioning and baseline comparison

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

### ✅ Phase 1.5: UI Foundation (COMPLETE)
**Status**: Scenario management UI built with mock data, ready for browser testing
- ✅ Installed react-hook-form + @hookform/resolvers
- ✅ Created Form component (shadcn/ui)
- ✅ Built ScenarioList component with Table (empty state, cost comparison, green/red savings indicators)
- ✅ Built ScenarioForm with Zod validation (create/edit modal)
- ✅ Full CRUD UI with mock data (no database required)
- ✅ Dev server starts successfully on port 3001
- ✅ All TypeScript checks passing

**Next**: Build Variable + Parameter UIs, add dark mode, then ready for production deployment

### ✅ Phase 1.6: Deployment (COMPLETE)
**Status**: Deployed to production at https://sc-sim.vercel.app
- ✅ Vercel project created and linked to GitHub
- ✅ Environment variables configured (NEXTAUTH_SECRET, NEXTAUTH_URL)
- ✅ Automatic deployments enabled on push to main branch
- ✅ All TypeScript checks passing in production build

**Next**: Add Vercel Postgres database and connect UI to tRPC routers

### ✅ Phase 2: Calculation Engine (COMPLETE)
**Status**: Full calculation engine implemented and tested
- ✅ Formula parser with tokenizer and AST builder (src/lib/calculation/formula-parser.ts)
- ✅ Formula evaluator with 9 math functions: MAX, MIN, IF, ABS, SQRT, ROUND, CEILING, FLOOR, POW (src/lib/calculation/formula-evaluator.ts)
- ✅ Dependency resolution with topological sort (Kahn's algorithm) (src/lib/calculation/dependency-graph.ts)
- ✅ Circular dependency detection with detailed error messages
- ✅ Baseline comparison logic with delta and percentChange
- ✅ Calculation engine orchestrator (src/lib/calculation/engine.ts)
- ✅ Updated calculation router with real implementation (src/server/api/routers/calculation.ts)
- ✅ Complete technical specification (docs/CALCULATION_ENGINE_SPEC.md)

**Next**: Create seed data with example variables and test calculations end-to-end

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

## Current Implementation Status (December 2025)

### ✅ Completed Features
- **Database & Data Model**:
  - ✅ Prisma schema with 10 models (added SkuEffectCurve for diminishing returns)
  - ✅ Organization → Project → Scenario hierarchy
  - ✅ Seed data with RetailCo org, 1 project, 3 scenarios, 7 years of data
  - ✅ 28 SKU effect ranges (6500-7550+ SKUs with multipliers 1.0-1.48)
  - ✅ Connected to Neon PostgreSQL (shared dev/prod)

- **Calculation Engine**:
  - ✅ Formula parser with tokenizer and AST builder
  - ✅ Formula evaluator with 10 functions (MAX, MIN, IF, ABS, SQRT, ROUND, CEILING, FLOOR, POW, SKU_LOOKUP)
  - ✅ SKU_LOOKUP function for diminishing returns based on SKU count
  - ✅ Dependency resolution with topological sort (Kahn's algorithm)
  - ✅ Circular dependency detection
  - ✅ Baseline comparison with delta and percentChange
  - ✅ 8 variables: 3 INPUT (Omzet, Weken, SKUs) + 5 OUTPUT (%, SKU complexity, Voorraad pallets)

- **UI & Visualization**:
  - ✅ Redesigned CalculationResults component with:
    - Key metrics overview cards (latest values with deltas)
    - Line chart showing Voorraad (Pallets) trend over time
    - Bar chart showing input drivers (Omzet EUR, SKUs)
    - Detailed results table with period-by-period breakdown
  - ✅ INPUT/OUTPUT variable separation (Input Values tab shows only INPUT vars)
  - ✅ Scenario management UI with list, create, edit, detail views
  - ✅ Variable value input form with period selector

- **Backend & Infrastructure**:
  - ✅ 8 tRPC routers fully functional (organization, project, scenario, variable, parameter, effectCurve, calculation, comparison, export)
  - ✅ Multi-tenant security with organizationProcedure middleware
  - ✅ NextAuth v5 configured (no UI yet)
  - ✅ Production deployment at https://sc-sim.vercel.app
  - ✅ All TypeScript checks passing

### 🚧 In Progress / Partially Complete
- **SKU Diminishing Effects** (80% complete):
  - ✅ SkuEffectCurve model in schema
  - ✅ SKU_LOOKUP function implemented
  - ✅ Seed data with 28 effect ranges
  - ✅ OUTPUT_SKU_COMPLEXITY_FACTOR variable added
  - ❌ Calculation engine not yet loading SKU curves from DB (needs wiring)

### 📋 Planned Features (See `/Users/willemvandenberg/.claude/plans/stateless-sleeping-stroustrup.md`)

**High Priority**:
1. **Organisation Management UI** - CRUD pages for managing organisations
2. **Calculation Workflow Visualization** - Dynamic flowchart showing variable dependencies (React Flow)
3. **Complete SKU Effects** - Wire calculation engine to load SKU curves
4. **Clickable Scenario Rows** - Navigate to detail on row click (not just gear icon)
5. **Duplicate Scenario** - Clone functionality with rename dialog
6. **Filters & Search** - Quick navigation by scenario name, project, organisation

**Medium Priority**:
7. **Projects UI** - List and detail pages for project management
8. **Benchmark Year Concept** - Improve UI to clearly show benchmark year (2025) vs modifiable years
9. **Effect Curves Implementation** - Full curve logic with preview component

**Low Priority**:
10. **Authentication UI** - Login/signup pages (backend already configured)
11. **Variable Management UI** - Enhanced CRUD for variables
12. **Parameter Management UI** - Enhanced CRUD for parameters
13. **Excel Export** - Full comparison export functionality
14. **Audit Logging** - Track all changes for compliance

### Known Issues & Decisions
- **Prisma Unique Constraint Types**: Variable router uses `findFirst` + conditional `update`/`create` instead of `upsert` due to Prisma type issues with nullable fields in compound unique constraints
- **Auth Type Cast**: `PrismaAdapter` has `as any` cast in `src/server/auth.ts` due to `@auth/core` version mismatch (functional but not ideal)
- **Next.js Lint Issue**: `npm run lint` fails with path error (likely due to space in directory name) - doesn't affect build
- **Placeholder Routers**: comparison and export routers return "not yet implemented" messages (calculation router is fully implemented)
- **Mock Data**: Scenarios page currently uses mock data until database is connected

### Git Branch Structure
- **main**: Original Simplicate Automations baseline (pre-migration snapshot)
- **phase1-foundation**: Current working branch with Supply Chain foundation (10+ commits, all pushed)
  - Includes: Complete backend, Scenario UI, Calculation engine, Vercel deployment

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
