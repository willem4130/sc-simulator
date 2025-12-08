# Supply Chain Scenario Simulator - Ultimate Implementation Guide

> **Complete Technical Documentation**
> A world-class, multi-tenant SaaS application for supply chain scenario modeling and analysis

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Data Model & Relationships](#data-model--relationships)
4. [Calculation Engine Deep Dive](#calculation-engine-deep-dive)
5. [API Design & Implementation](#api-design--implementation)
6. [UI/UX Architecture](#uiux-architecture)
7. [Security & Multi-Tenancy](#security--multi-tenancy)
8. [Performance & Optimization](#performance--optimization)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Guide](#deployment-guide)
12. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Executive Summary

### What Are We Building?

A **multi-tenant SaaS supply chain scenario simulator** that enables businesses to model "what-if" scenarios by adjusting supply chain variables and parameters, then visualizing the impact on key metrics like stock levels, capacity utilization, and bottlenecks.

### Key Features
- ✅ **Multi-tenant architecture** with complete client data isolation
- ✅ **Flexible calculation engine** with effect curves for non-linear relationships
- ✅ **Side-by-side scenario comparison** with delta tracking
- ✅ **Interactive BI dashboards** with charts, heatmaps, and time-series analysis
- ✅ **Excel export** for offline analysis and presentations
- ✅ **Full CRUD** for scenarios, variables, parameters, and effect curves
- ✅ **Audit trail** for compliance and change tracking
- ✅ **Role-based access control** (Admin, Editor, Viewer)

### Use Case Example

**Scenario:** A logistics company wants to optimize their warehouse stock levels.

1. **Define Variables**:
   - INPUT: `Sales Demand` (1000 pallets/month)
   - INPUT: `Lead Time` (14 days)
   - INPUT: `Order Quantity` (500 pallets)
   - OUTPUT: `Stock Level` (calculated via formula)

2. **Create Baseline Scenario**:
   - Current state with existing parameters
   - Result: 450 pallets in stock

3. **Create "What-If" Scenarios**:
   - **Optimistic**: Reduce lead time to 10 days → 320 pallets needed (-29%)
   - **Pessimistic**: Increase demand to 1200 pallets → 540 pallets needed (+20%)
   - **Optimized**: Apply logarithmic effect curve to order quantity → 380 pallets needed (-16%)

4. **Analyze Results**:
   - Side-by-side comparison table
   - Heatmap shows bottlenecks during peak periods
   - Export to Excel for stakeholder presentation

### Technical Foundation

Built on the **nextjs-fullstack-template** stack:
- **Next.js 16** (App Router) + React 19 + TypeScript 5
- **PostgreSQL** + Prisma ORM for type-safe database access
- **tRPC 11** for end-to-end type-safe APIs
- **shadcn/ui** + Tailwind CSS for modern UI
- **Recharts** for data visualization
- **NextAuth.js** for authentication

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐ │
│  │   Dashboard     │  │  Scenario         │  │  Comparison        │ │
│  │   (Overview)    │  │  Management       │  │  & Analysis        │ │
│  └────────┬────────┘  └────────┬─────────┘  └─────────┬──────────┘ │
│           │                    │                       │             │
│           └────────────────────┼───────────────────────┘             │
│                                │                                     │
│                         React 19 + Next.js 16                        │
│                         shadcn/ui Components                         │
│                         Tailwind CSS + Recharts                      │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
                          tRPC (Type-Safe)
                                 │
┌────────────────────────────────┼────────────────────────────────────┐
│                          API LAYER (tRPC)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────┐│
│  │ Organization│  │  Scenario   │  │  Calculation │  │ Comparison││
│  │   Router    │  │   Router    │  │    Router    │  │  Router   ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘│
│         │                │                │                 │       │
│  ┌──────┴──────┐  ┌─────┴──────┐  ┌──────┴───────┐  ┌────┴──────┐│
│  │  Variable   │  │ Parameter  │  │ Effect Curve │  │  Export   ││
│  │   Router    │  │   Router   │  │    Router    │  │  Router   ││
│  └──────┬──────┘  └──────┬─────┘  └──────┬───────┘  └─────┬─────┘│
│         │                │                │                 │       │
│         └────────────────┼────────────────┼─────────────────┘       │
│                          │                │                         │
│                    Zod Validation    SuperJSON                      │
│                    Error Handling    Transform                      │
└──────────────────────────┼────────────────┼─────────────────────────┘
                           │                │
                    Prisma Client    Calculation Engine
                           │                │
┌──────────────────────────┼────────────────┼─────────────────────────┐
│                   BUSINESS LOGIC LAYER                               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Calculation Engine                                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │ │
│  │  │   Formula    │  │   Formula    │  │   Dependency         │ │ │
│  │  │   Parser     │  │  Evaluator   │  │   Graph Resolver     │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │ │
│  │  ┌────────────────────────────────────────────────────────────┐│ │
│  │  │         Effect Curve Calculators                           ││ │
│  │  │  Linear | Logarithmic | Exponential | Step | Custom       ││ │
│  │  └────────────────────────────────────────────────────────────┘│ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Export Service                                     │ │
│  │  Excel Generation | PDF Reports | Data Serialization           │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                    PostgreSQL Connection
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│                     DATA LAYER                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                   PostgreSQL Database                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐│ │
│  │  │ Organization │  │   Scenario   │  │  Variable           ││ │
│  │  │    User      │  │VariableValue │  │  Parameter          ││ │
│  │  └──────────────┘  └──────────────┘  └─────────────────────┘│ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐│ │
│  │  │ EffectCurve  │  │ Calculation  │  │  AuditLog           ││ │
│  │  └──────────────┘  └──────────────┘  └─────────────────────┘│ │
│  │                                                                │ │
│  │  Indexes: organizationId, scenarioId, variableId              │ │
│  │  Constraints: CASCADE deletes, UNIQUE constraints             │ │
│  └───────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Scenario Calculation

```
User Action: "Calculate Scenario"
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 1. UI: User clicks "Calculate" button                          │
│    - ScenarioDetailPage.tsx                                    │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. tRPC Mutation: calculation.compute({ scenarioId })          │
│    - Client-side hook: api.calculation.compute.useMutation()   │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. Server: calculationRouter.compute procedure                 │
│    - Validates user has access to organization                 │
│    - Calls CalculationEngine.calculateScenario()               │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. Calculation Engine:                                         │
│    a) Load variables, parameters, input values from DB         │
│    b) Build dependency graph                                   │
│    c) Topologically sort variables                             │
│    d) Execute calculations in order:                           │
│       - Parse formula → AST                                    │
│       - Evaluate AST → raw value                               │
│       - Apply effect curve → final value                       │
│       - Calculate delta from baseline                          │
│    e) Save results to Calculation table                        │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. Database: Insert Calculation record                         │
│    - results: JSON with all calculated values                  │
│    - version: Incremented for recalculations                   │
│    - baselineScenarioId: For delta tracking                    │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. Response: Return calculation results to client              │
│    - SuperJSON serialization (handles Date, BigInt)            │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│ 7. UI Update: Display results                                  │
│    - ResultsTable component renders values                     │
│    - DeltaIndicator shows +/- changes                          │
│    - Charts update with new data                               │
└────────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Isolation Strategy

```
Request Flow with Organization Isolation:

┌─────────────────────────────────────────────────────────────┐
│  User Request: GET /api/trpc/scenario.list                  │
│  Auth: Bearer token (NextAuth session)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Middleware: protectedProcedure                              │
│  - Verify session exists                                    │
│  - Extract user.id from session                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Middleware: organizationProcedure (CUSTOM)                  │
│  - Extract organizationId from input                        │
│  - Query: User.findFirst({                                  │
│      where: {                                               │
│        id: session.user.id,                                 │
│        organizationId: input.organizationId                 │
│      }                                                       │
│    })                                                        │
│  - If not found → throw FORBIDDEN error                     │
│  - If found → attach organizationId to context              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Procedure Handler: scenario.list                           │
│  - ALL queries automatically filtered by organizationId:    │
│                                                              │
│    db.scenario.findMany({                                   │
│      where: { organizationId: ctx.organizationId },  ← SAFE │
│      ...                                                     │
│    })                                                        │
│                                                              │
│  - User CANNOT access other organizations' data             │
└─────────────────────────────────────────────────────────────┘
```

### Design Decisions & Rationale

#### Why tRPC over REST?

**Decision:** Use tRPC for all API communication

**Rationale:**
- ✅ **End-to-end type safety**: Input/output types automatically inferred
- ✅ **No code generation**: Types flow directly from server to client
- ✅ **Better DX**: Autocomplete for API calls in IDE
- ✅ **Runtime validation**: Zod schemas validate all inputs
- ✅ **Smaller bundle**: No need for Axios or fetch wrappers

**Alternative Considered:** REST API with OpenAPI/Swagger
- ❌ Would require manual type definitions
- ❌ Codegen adds build complexity
- ❌ Type drift between schema and implementation

#### Why PostgreSQL over MongoDB?

**Decision:** PostgreSQL with Prisma ORM

**Rationale:**
- ✅ **Relational data**: Scenarios → Variables → Values have clear relationships
- ✅ **ACID compliance**: Financial calculations require consistency
- ✅ **Complex queries**: Joins for scenario comparisons perform better
- ✅ **Type safety**: Prisma generates TypeScript types from schema
- ✅ **Migrations**: Database schema changes are versioned

**Alternative Considered:** MongoDB
- ❌ Would need application-level joins for comparisons
- ❌ Weaker consistency guarantees for calculations
- ❌ Schema flexibility not needed (our data model is well-defined)

#### Why Effect Curves over Simple Multipliers?

**Decision:** Dedicated EffectCurve model with multiple curve types

**Rationale:**
- ✅ **Real-world accuracy**: Supply chain relationships are often non-linear
- ✅ **Flexibility**: Different variables need different transformations
- ✅ **Reusability**: One curve can apply to multiple variables
- ✅ **Visualization**: Users can see the curve before applying it
- ✅ **Future-proof**: Easy to add new curve types (polynomial, sigmoid, etc.)

**Example Use Cases:**
- **Logarithmic**: Economies of scale (larger orders → diminishing per-unit cost reduction)
- **Exponential**: Compounding effects (delay → exponential stock-out risk)
- **Step-wise**: Capacity tiers (0-100 units: Warehouse A, 100-500: Warehouse B)

#### Why Cache Calculations in Database?

**Decision:** Store calculation results in Calculation table

**Rationale:**
- ✅ **Performance**: Avoid recalculating unchanged scenarios
- ✅ **Versioning**: Track calculation history (version field)
- ✅ **Auditing**: Know when calculations were last updated
- ✅ **Comparison**: Quickly load results for side-by-side comparison
- ✅ **Offline**: Results available even if calculation engine is down

**Invalidation Strategy:**
- Increment `version` when:
  - Variable formula changes
  - Parameter value changes
  - Input values change
  - Effect curve parameters change

---

## Tech Stack (From nextjs-fullstack-template)

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.0.7 |
| **Language** | TypeScript | 5.9.3 |
| **Database** | PostgreSQL + Prisma ORM | 6.19.0 |
| **API** | tRPC | 11.0.0 |
| **UI Components** | shadcn/ui (Radix UI) | Latest |
| **Styling** | Tailwind CSS | 3.4.18 |
| **Charts** | Recharts | 3.4.1 |
| **State** | React Query (via tRPC) | 5.90.7 |
| **Auth** | NextAuth.js | 5.0.0-beta.30 |
| **Validation** | Zod | Latest |
| **Testing** | Vitest + Playwright | Latest |

### Design Tokens
- CSS variables in `globals.css` for colors, spacing, shadows
- Tailwind config extended with custom theme
- Dark mode support built-in

---

## Data Model & Relationships

### Entity Relationship Diagram (ERD)

```
┌──────────────────┐
│  Organization    │
│  ─────────────── │      1:N
│  PK: id          ├──────────────┐
│      name        │              │
│      slug        │              │
└───────┬──────────┘              │
        │ 1:N                     │
        │                         │
        ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│  User            │      │  Scenario        │
│  ──────────────  │      │  ──────────────  │
│  PK: id          │      │  PK: id          │
│  FK: organizationId     │  FK: organizationId
│      email       │      │  FK: parentId (self)
│      name        │      │      name        │
│      role        │      │      description │
└──────────────────┘      │      isBaseline  │
                          │      timePeriodType
                          └───────┬──────────┘
                                  │ 1:N
                                  │
                                  ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Variable        │      │  VariableValue   │      │  Calculation     │
│  ──────────────  │      │  ──────────────  │      │  ──────────────  │
│  PK: id          │ 1:N  │  PK: id          │      │  PK: id          │
│  FK: organizationId ◄───┤  FK: scenarioId  │      │  FK: scenarioId  │
│  FK: effectCurveId │    │  FK: variableId  │      │      results (JSON)
│      name        │      │      value       │      │      version     │
│      displayName │      │      periodStart │      │      baselineScenarioId
│      formula     │      │      periodEnd   │      └──────────────────┘
│      variableType│      │      isManual    │              ▲
│      dependencies│      └──────────────────┘              │
└───────┬──────────┘                                        │ 1:N
        │                                                   │
        │ N:1                                               │
        ▼                                          ┌────────┴──────────┐
┌──────────────────┐                               │  Baseline         │
│  EffectCurve     │                               │  (same Scenario)  │
│  ──────────────  │                               └───────────────────┘
│  PK: id          │
│      name        │      ┌──────────────────┐
│      curveType   │      │  Parameter       │
│      parameters  │      │  ──────────────  │
│      (JSON)      │      │  PK: id          │
└──────────────────┘      │  FK: organizationId
                          │      name        │
                          │      value       │
                          │      unit        │
                          └──────────────────┘

┌──────────────────┐
│  AuditLog        │
│  ──────────────  │
│  PK: id          │
│  FK: userId      │
│  FK: organizationId
│      entityType  │
│      entityId    │
│      action      │
│      changesBefore (JSON)
│      changesAfter (JSON)
└──────────────────┘
```

### Relationship Details

#### Organization ↔ User (1:N)
- **Relationship**: One organization has many users
- **Cascade**: DELETE organization → DELETE all users
- **Business Rule**: Users belong to exactly one organization (no cross-org access)

#### Organization ↔ Scenario (1:N)
- **Relationship**: One organization has many scenarios
- **Cascade**: DELETE organization → DELETE all scenarios
- **Business Rule**: Each organization should have exactly one baseline scenario (`isBaseline = true`)

#### Scenario ↔ Scenario (Self-referential, 1:N)
- **Relationship**: A scenario can be cloned from a parent scenario
- **Cascade**: DELETE parent → SET NULL on children (preserve clones)
- **Business Rule**: Track scenario lineage for audit purposes

#### Scenario ↔ VariableValue (1:N)
- **Relationship**: One scenario has many variable values
- **Cascade**: DELETE scenario → DELETE all variable values
- **Business Rule**: Each variable should have one value per time period in a scenario

#### Variable ↔ VariableValue (1:N)
- **Relationship**: One variable definition has many values (across scenarios)
- **Cascade**: DELETE variable → DELETE all variable values
- **Business Rule**: Variable definitions are organization-wide templates

#### Variable ↔ EffectCurve (N:1)
- **Relationship**: Many variables can share one effect curve
- **Cascade**: DELETE curve → SET NULL on variables (curve is optional)
- **Business Rule**: Curves are reusable across variables

#### Scenario ↔ Calculation (1:N)
- **Relationship**: One scenario has many calculations (versioned)
- **Cascade**: DELETE scenario → DELETE all calculations
- **Business Rule**: Latest version = current calculation; older versions = history

### Data Model Patterns

#### Pattern 1: Template + Instance

```
Variable (Template)           VariableValue (Instance)
├─ name: "INPUT_SALES"   →    ├─ scenarioId: "abc123"
├─ displayName: "Sales"       ├─ variableId: "var456"
├─ unit: "pallets"            ├─ value: 1000
└─ formula: null              └─ periodStart: 2024-01-01

Pattern: Define once (Variable), use many times (VariableValue)
```

#### Pattern 2: Baseline + Delta

```
Scenario: "Current State" (isBaseline = true)
├─ Variable: OUTPUT_STOCK → Value: 450

Scenario: "Optimistic" (isBaseline = false)
├─ Variable: OUTPUT_STOCK → Value: 320
└─ Calculation:
    ├─ baselineScenarioId: "baseline-id"
    ├─ results: {
    │    "OUTPUT_STOCK": {
    │      "value": 320,
    │      "delta": -130,
    │      "percentChange": -28.9%
    │    }
    │  }

Pattern: Always compare scenarios to baseline for delta tracking
```

#### Pattern 3: Formula + Dependencies

```
Variable: "OUTPUT_STOCK"
├─ formula: "INPUT_SALES * PARAM_LEAD_TIME / INPUT_ORDER_QTY"
├─ dependencies: ["INPUT_SALES", "INPUT_ORDER_QTY"]
└─ variableType: OUTPUT

Calculation Flow:
1. Resolve dependencies: INPUT_SALES, INPUT_ORDER_QTY
2. Check all dependencies are calculated/provided
3. Execute formula
4. Apply effect curve (if assigned)

Pattern: Topological sort ensures dependencies are calculated first
```

### Sample Data Structure

#### Effect Curve Parameters (JSON)

```json
// Linear Curve
{
  "slope": 1,
  "intercept": 0
}

// Logarithmic Curve (Diminishing Returns)
{
  "base": 10,
  "multiplier": 1
}

// Exponential Curve (Compounding Effect)
{
  "base": 2,
  "exponent": 1.5
}

// Step-Wise Curve (Capacity Tiers)
{
  "thresholds": [100, 500, 1000],
  "values": [1.0, 0.85, 0.75, 0.65]
}
// Interpretation:
// - 0-100: 1.0x multiplier
// - 100-500: 0.85x multiplier
// - 500-1000: 0.75x multiplier
// - 1000+: 0.65x multiplier

// Custom Interpolated Curve
{
  "points": [
    {"x": 0, "y": 0},
    {"x": 50, "y": 1},
    {"x": 100, "y": 2.5},
    {"x": 200, "y": 3}
  ]
}
// Linear interpolation between points
```

#### Calculation Results (JSON)

```json
{
  "var_stock_level_id": {
    "value": 320,
    "delta": -130,
    "percentChange": -28.89,
    "bottlenecks": []
  },
  "var_capacity_util_id": {
    "value": 92,
    "delta": 15,
    "percentChange": 19.48,
    "bottlenecks": ["warehouse_a", "dock_3"]
  }
}
```

#### Audit Log Changes (JSON)

```json
// Before
{
  "name": "Current State",
  "isBaseline": false
}

// After
{
  "name": "Baseline 2024",
  "isBaseline": true
}
```

### Database Indexing Strategy

```sql
-- High-read, filter-heavy columns
CREATE INDEX idx_scenario_organization ON Scenario(organizationId);
CREATE INDEX idx_scenario_parent ON Scenario(parentId);

CREATE INDEX idx_variable_organization ON Variable(organizationId);

CREATE INDEX idx_variable_value_scenario ON VariableValue(scenarioId);
CREATE INDEX idx_variable_value_variable ON VariableValue(variableId);

CREATE INDEX idx_calculation_scenario ON Calculation(scenarioId);

CREATE INDEX idx_audit_log_organization ON AuditLog(organizationId);
CREATE INDEX idx_audit_log_entity ON AuditLog(entityType, entityId);

-- Composite indexes for common query patterns
CREATE INDEX idx_variable_value_lookup ON VariableValue(scenarioId, variableId, periodStart);

CREATE INDEX idx_user_org_email ON User(organizationId, email);
```

**Rationale:**
- **organizationId**: Every query filters by org (multi-tenancy)
- **scenarioId**: Frequently load all values for a scenario
- **variableId**: Look up values across scenarios for comparison
- **Composite indexes**: Optimize specific query patterns (e.g., get value for scenario + variable + period)

---

## 1. Database Schema (Prisma)

### File: `prisma/schema.prisma`

Add these models to the existing schema:

```prisma
// ============================================
// MULTI-TENANT STRUCTURE
// ============================================

model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       User[]
  scenarios   Scenario[]
  variables   Variable[]
  parameters  Parameter[]

  @@index([slug])
}

model User {
  id             String       @id @default(cuid())
  email          String       @unique
  name           String?
  role           UserRole     @default(VIEWER)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([organizationId])
  @@index([email])
}

enum UserRole {
  ADMIN    // Can manage everything
  EDITOR   // Can edit scenarios and variables
  VIEWER   // Read-only access
}

// ============================================
// SCENARIOS - What-if analyses
// ============================================

model Scenario {
  id             String         @id @default(cuid())
  name           String
  description    String?
  organizationId String
  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Scenario configuration
  isBaseline     Boolean        @default(false)  // One baseline per org
  timePeriodType TimePeriodType @default(MONTHLY)
  startDate      DateTime?
  endDate        DateTime?

  // Cloning support
  parentId       String?
  parent         Scenario?      @relation("ScenarioClones", fields: [parentId], references: [id])
  clones         Scenario[]     @relation("ScenarioClones")

  variableValues VariableValue[]
  calculations   Calculation[]

  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@index([organizationId])
  @@index([parentId])
}

enum TimePeriodType {
  SINGLE_POINT  // One-time calculation
  MONTHLY       // Monthly time series
  QUARTERLY     // Quarterly projections
  YEARLY        // Annual forecasts
}

// ============================================
// VARIABLES - Inputs and Outputs
// ============================================

model Variable {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Variable definition
  name           String       // Machine name: "INPUT_SALES"
  displayName    String       // Human name: "Sales Volume"
  description    String?
  unit           String?      // "pallets", "days", "%"

  variableType   VariableType
  dataType       DataType     @default(NUMERIC)

  // Effect curve (for non-linear transformations)
  effectCurveId  String?
  effectCurve    EffectCurve? @relation(fields: [effectCurveId], references: [id])

  // Formula (for OUTPUT variables)
  formula        String?      // "INPUT_SALES * PARAM_LEAD_TIME / INPUT_ORDER_QTY"
  dependencies   String[]     // Array of variable IDs this depends on

  // UI metadata
  category       String?      // "Demand", "Inventory", "Capacity"
  displayOrder   Int          @default(0)

  values         VariableValue[]

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([organizationId, name])
  @@index([organizationId])
}

enum VariableType {
  INPUT   // User-defined values
  OUTPUT  // Calculated from formula
}

enum DataType {
  NUMERIC     // Decimal numbers
  PERCENTAGE  // 0-100%
  BOOLEAN     // True/false
  TEXT        // String values
}

// ============================================
// EFFECT CURVES - Non-linear transformations
// ============================================

model EffectCurve {
  id          String    @id @default(cuid())
  name        String
  description String?
  curveType   CurveType

  // Curve configuration (JSON for flexibility)
  parameters  Json
  // Examples:
  // LINEAR:      { "slope": 1, "intercept": 0 }
  // LOGARITHMIC: { "base": 10, "multiplier": 1 }
  // EXPONENTIAL: { "base": 2, "exponent": 1.5 }
  // STEP_WISE:   { "thresholds": [10, 50, 100], "values": [0.5, 1, 1.5, 2] }
  // CUSTOM:      { "points": [{"x": 0, "y": 0}, {"x": 50, "y": 1}, {"x": 100, "y": 2.5}] }

  variables   Variable[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum CurveType {
  LINEAR                // y = mx + b
  LOGARITHMIC           // y = m * log_b(x)
  EXPONENTIAL           // y = b^(x*e)
  STEP_WISE             // Discrete steps at thresholds
  CUSTOM_INTERPOLATED   // User-defined points with interpolation
}

// ============================================
// PARAMETERS - Global configuration values
// ============================================

model Parameter {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name           String       // Machine name: "PARAM_LEAD_TIME"
  displayName    String       // Human name: "Lead Time"
  description    String?
  value          Float
  unit           String?
  category       String?      // Group parameters

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([organizationId, name])
  @@index([organizationId])
}

// ============================================
// VARIABLE VALUES - Actual data per scenario
// ============================================

model VariableValue {
  id          String   @id @default(cuid())
  scenarioId  String
  scenario    Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  variableId  String
  variable    Variable @relation(fields: [variableId], references: [id], onDelete: Cascade)

  // Time series support
  periodStart DateTime?
  periodEnd   DateTime?

  value       Float

  // Metadata
  isManual    Boolean  @default(true)  // false if calculated
  notes       String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([scenarioId, variableId, periodStart])
  @@index([scenarioId])
  @@index([variableId])
}

// ============================================
// CALCULATIONS - Cached results
// ============================================

model Calculation {
  id                 String   @id @default(cuid())
  scenarioId         String
  scenario           Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  // Time series
  periodStart        DateTime?
  periodEnd          DateTime?

  // Results (JSON for flexibility)
  results            Json
  // Structure:
  // {
  //   "variableId1": { "value": 100, "delta": 10, "percentChange": 11.1, "bottlenecks": [] },
  //   "variableId2": { "value": 50, "delta": -5, "percentChange": -9.1, "bottlenecks": ["capacity"] }
  // }

  // Metadata
  baselineScenarioId String?
  calculationTime    DateTime @default(now())
  version            Int      @default(1)  // Increment on recalculation

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([scenarioId, periodStart, version])
  @@index([scenarioId])
}

// ============================================
// AUDIT LOG - Track all changes
// ============================================

model AuditLog {
  id             String   @id @default(cuid())
  userId         String
  organizationId String

  entityType     String   // "Scenario", "Variable", "VariableValue"
  entityId       String
  action         String   // "CREATE", "UPDATE", "DELETE"

  changesBefore  Json?
  changesAfter   Json?

  createdAt      DateTime @default(now())

  @@index([organizationId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### Migration Commands

```bash
# After adding models to schema.prisma:
npx prisma format
npx prisma generate
npx prisma db push

# For production, use migrations:
npx prisma migrate dev --name add_supply_chain_models
```

---

## 2. tRPC API Structure

### File: `src/server/api/root.ts`

```typescript
import { createTRPCRouter } from '@/server/api/trpc'
import { organizationRouter } from '@/server/api/routers/organization'
import { scenarioRouter } from '@/server/api/routers/scenario'
import { variableRouter } from '@/server/api/routers/variable'
import { parameterRouter } from '@/server/api/routers/parameter'
import { effectCurveRouter } from '@/server/api/routers/effectCurve'
import { calculationRouter } from '@/server/api/routers/calculation'
import { comparisonRouter } from '@/server/api/routers/comparison'
import { exportRouter } from '@/server/api/routers/export'

export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  scenario: scenarioRouter,
  variable: variableRouter,
  parameter: parameterRouter,
  effectCurve: effectCurveRouter,
  calculation: calculationRouter,
  comparison: comparisonRouter,
  export: exportRouter,
})

export type AppRouter = typeof appRouter
```

### Router Procedures Overview

#### **organizationRouter** (`src/server/api/routers/organization.ts`)
```typescript
- list: List all organizations (admin only)
- getById: Get organization details
- create: Create new organization
- update: Update organization metadata
- delete: Delete organization (admin only)
- getUsers: List organization users
- inviteUser: Send user invitation email
- removeUser: Remove user from organization
```

#### **scenarioRouter** (`src/server/api/routers/scenario.ts`)
```typescript
- list: List scenarios for organization
- getById: Get scenario with all variable values
- create: Create new scenario
- clone: Clone scenario (with/without values)
- update: Update scenario metadata
- delete: Delete scenario
- setBaseline: Mark scenario as baseline
- bulkUpdateValues: Update multiple variable values at once
```

#### **variableRouter** (`src/server/api/routers/variable.ts`)
```typescript
- list: List variables (with filters: type, category)
- getById: Get variable details
- create: Create variable definition
- update: Update variable (name, formula, curve)
- delete: Delete variable
- reorder: Update display order
- validateFormula: Validate formula syntax
- getDependencyGraph: Get dependency tree
```

#### **parameterRouter** (`src/server/api/routers/parameter.ts`)
```typescript
- list: List all parameters
- getById: Get parameter
- create: Create parameter
- update: Update parameter value
- delete: Delete parameter
- bulkUpdate: Update multiple parameters
```

#### **effectCurveRouter** (`src/server/api/routers/effectCurve.ts`)
```typescript
- list: List all effect curves
- getById: Get curve with parameters
- create: Create effect curve
- update: Update curve parameters
- delete: Delete curve
- preview: Generate preview data points (for visualization)
- assignToVariable: Assign curve to variable
```

#### **calculationRouter** (`src/server/api/routers/calculation.ts`)
```typescript
- compute: Execute calculation for scenario
- recompute: Force recalculation (invalidate cache)
- getResults: Get cached calculation results
- validateDependencies: Check for circular dependencies
- getDelta: Calculate delta from baseline scenario
```

#### **comparisonRouter** (`src/server/api/routers/comparison.ts`)
```typescript
- compareScenarios: Compare 2-5 scenarios side-by-side
- getHeatmap: Generate bottleneck heatmap data
- getTimeSeries: Get time-series comparison
- getSummaryStats: Summary statistics across scenarios
```

#### **exportRouter** (`src/server/api/routers/export.ts`)
```typescript
- toExcel: Generate Excel with full comparison
- toExcelRaw: Generate Excel with raw data only
- toPdf: Generate PDF report (future)
- getExportStatus: Check export job status
```

### Example Router Implementation

**File: `src/server/api/routers/scenario.ts`**

```typescript
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'

export const scenarioRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.scenario.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { variableValues: true } }
        }
      })
    }),

  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.scenario.findUnique({
        where: { id: input.id },
        include: {
          variableValues: {
            include: { variable: true }
          }
        }
      })
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      organizationId: z.string(),
      timePeriodType: z.enum(['SINGLE_POINT', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      parentId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.scenario.create({
        data: input
      })
    }),

  clone: protectedProcedure
    .input(z.object({
      scenarioId: z.string(),
      newName: z.string().min(1),
      copyValues: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.scenario.findUnique({
        where: { id: input.scenarioId },
        include: { variableValues: true }
      })

      if (!original) {
        throw new Error('Scenario not found')
      }

      const newScenario = await ctx.db.scenario.create({
        data: {
          name: input.newName,
          description: `Cloned from: ${original.name}`,
          organizationId: original.organizationId,
          timePeriodType: original.timePeriodType,
          startDate: original.startDate,
          endDate: original.endDate,
          parentId: original.id,
        }
      })

      if (input.copyValues) {
        await ctx.db.variableValue.createMany({
          data: original.variableValues.map(v => ({
            scenarioId: newScenario.id,
            variableId: v.variableId,
            periodStart: v.periodStart,
            periodEnd: v.periodEnd,
            value: v.value,
            isManual: v.isManual,
          }))
        })
      }

      return newScenario
    }),

  bulkUpdateValues: protectedProcedure
    .input(z.object({
      scenarioId: z.string(),
      values: z.array(z.object({
        variableId: z.string(),
        value: z.number(),
        periodStart: z.date().optional(),
        periodEnd: z.date().optional(),
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      // Delete existing values and create new ones
      await ctx.db.variableValue.deleteMany({
        where: { scenarioId: input.scenarioId }
      })

      await ctx.db.variableValue.createMany({
        data: input.values.map(v => ({
          scenarioId: input.scenarioId,
          variableId: v.variableId,
          value: v.value,
          periodStart: v.periodStart,
          periodEnd: v.periodEnd,
          isManual: true,
        }))
      })

      return { success: true }
    }),
})
```

---

## Calculation Engine Deep Dive

###  Core Formula & Concepts

#### Base Delta Calculation

The fundamental formula for comparing scenarios:

```typescript
delta = (new_value - benchmark_value) / benchmark_value * input_output_value
```

**Parameters:**
- `new_value`: Value in the current scenario
- `benchmark_value`: Value in the baseline scenario
- `input_output_value`: The variable being affected

**Example:**
```typescript
Baseline Scenario:
  - INPUT_SALES = 1000 pallets
  - OUTPUT_STOCK = 450 pallets

Optimistic Scenario:
  - INPUT_SALES = 1200 pallets  (+20%)
  - OUTPUT_STOCK = ?

Calculation:
  delta = (1200 - 1000) / 1000 * 450 = 90 pallets
  OUTPUT_STOCK = 450 + 90 = 540 pallets
  percentChange = (90 / 450) * 100 = +20%
```

#### Formula Language Specification

**Supported Operators:**
```
Arithmetic: +, -, *, /
Parentheses: ( )
Functions: MAX, MIN, IF, ABS, SQRT, CEIL, FLOOR, ROUND
Comparison: >, <, >=, <=, ==, !=
```

**Variable References:**
```
INPUT_{NAME}   - Input variables (user-defined)
OUTPUT_{NAME}  - Output variables (calculated)
PARAM_{NAME}   - Parameters (global configuration)
```

**Example Formulas:**
```typescript
// Simple arithmetic
"INPUT_SALES * PARAM_LEAD_TIME"

// With parentheses
"(INPUT_SALES + INPUT_RETURNS) * PARAM_MARKUP"

// Using functions
"MAX(INPUT_MIN_STOCK, INPUT_DEMAND * PARAM_SAFETY_FACTOR)"

// Conditional logic
"IF(INPUT_CAPACITY > 1000, OUTPUT_STOCK * 1.2, OUTPUT_STOCK)"

// Complex calculation
"(INPUT_SALES * PARAM_LEAD_TIME / INPUT_ORDER_QTY) + MAX(INPUT_SAFETY_STOCK, 100)"
```

**Grammar (EBNF):**
```ebnf
Expression  ::= Term (('+' | '-') Term)*
Term        ::= Factor (('*' | '/') Factor)*
Factor      ::= Number | Variable | Function | '(' Expression ')'
Number      ::= [0-9]+ ('.' [0-9]+)?
Variable    ::= [A-Z_]+
Function    ::= FuncName '(' ExpressionList ')'
FuncName    ::= 'MAX' | 'MIN' | 'IF' | 'ABS' | 'SQRT' | 'CEIL' | 'FLOOR' | 'ROUND'
ExpressionList ::= Expression (',' Expression)*
```

### File Structure

```
src/server/calculation/
├── engine.ts              # Main calculation orchestrator
├── formula-parser.ts      # Parse formula strings into AST
├── formula-evaluator.ts   # Evaluate parsed formulas
├── curves.ts              # Effect curve implementations
├── dependency-graph.ts    # Variable dependency resolution
└── types.ts               # Shared types
```

### Dependency Resolution Algorithm

#### Problem

Variables can depend on each other:

```
OUTPUT_STOCK_LEVEL = INPUT_SALES * PARAM_LEAD_TIME / INPUT_ORDER_QTY
OUTPUT_CAPACITY_UTILIZATION = OUTPUT_STOCK_LEVEL / INPUT_WAREHOUSE_CAPACITY
OUTPUT_COST = OUTPUT_STOCK_LEVEL * PARAM_HOLDING_COST
```

We need to calculate in the correct order:
1. `OUTPUT_STOCK_LEVEL` (depends on inputs only)
2. `OUTPUT_CAPACITY_UTILIZATION` (depends on OUTPUT_STOCK_LEVEL)
3. `OUTPUT_COST` (depends on OUTPUT_STOCK_LEVEL)

#### Algorithm: Topological Sort (Kahn's Algorithm)

```typescript
class DependencyGraph {
  private adjacencyList: Map<string, string[]>
  private inDegree: Map<string, number>

  addVariable(variable: Variable) {
    this.adjacencyList.set(variable.id, variable.dependencies)

    // Calculate in-degree (number of dependencies)
    variable.dependencies.forEach(depId => {
      this.inDegree.set(depId, (this.inDegree.get(depId) || 0) + 1)
    })
  }

  getExecutionOrder(): string[] {
    const queue: string[] = []
    const result: string[] = []

    // Start with variables that have no dependencies
    for (const [varId, degree] of this.inDegree) {
      if (degree === 0) queue.push(varId)
    }

    while (queue.length > 0) {
      const varId = queue.shift()!
      result.push(varId)

      // Remove edges from this variable
      const dependents = this.adjacencyList.get(varId) || []
      for (const depId of dependents) {
        this.inDegree.set(depId, this.inDegree.get(depId)! - 1)
        if (this.inDegree.get(depId) === 0) {
          queue.push(depId)
        }
      }
    }

    // If result doesn't contain all variables, there's a cycle
    if (result.length !== this.adjacencyList.size) {
      throw new Error('Circular dependency detected')
    }

    return result
  }
}
```

**Example:**

```
Variables:
  A: depends on []           → in-degree: 0
  B: depends on [A]          → in-degree: 1
  C: depends on [A, B]       → in-degree: 2
  D: depends on [B]          → in-degree: 1

Execution Order: [A, B, D, C]
```

### Effect Curve Implementations

#### 1. Linear Curve

**Formula:** `y = mx + b`

**Use Case:** Direct proportional relationships

**Example:** Stock increases linearly with sales

```typescript
class LinearCurve {
  calculate(input: number, params: { slope: number, intercept: number }): number {
    return params.slope * input + params.intercept
  }
}

// Example: 1:1 relationship
params = { slope: 1, intercept: 0 }
input = 100 → output = 100

// Example: Scaled relationship
params = { slope: 1.5, intercept: 10 }
input = 100 → output = 160
```

#### 2. Logarithmic Curve (Diminishing Returns)

**Formula:** `y = m * log_b(x)`

**Use Case:** Economies of scale, diminishing returns

**Example:** Larger orders reduce per-unit cost, but effect diminishes

```typescript
class LogarithmicCurve {
  calculate(input: number, params: { base: number, multiplier: number }): number {
    if (input <= 0) return 0
    return params.multiplier * Math.log(input) / Math.log(params.base)
  }
}

// Example: Cost reduction with order size
params = { base: 10, multiplier: 50 }
input = 10   → output = 50
input = 100  → output = 100  (2x input → 2x output)
input = 1000 → output = 150  (10x input → 3x output) ← diminishing!
```

**Visual:**
```
Output
   │     ┌─────────────
150│    ┌┘
   │   ┌┘
100│  ┌┘
   │ ┌┘
 50│┌┘
   └────────────────── Input
   0  10  100  1000
```

#### 3. Exponential Curve (Compounding Effect)

**Formula:** `y = b^(x * e)`

**Use Case:** Compounding risks, viral growth

**Example:** Delays compound exponentially into stock-out risk

```typescript
class ExponentialCurve {
  calculate(input: number, params: { base: number, exponent: number }): number {
    return Math.pow(params.base, input * params.exponent)
  }
}

// Example: Risk of stock-out with delay
params = { base: 2, exponent: 0.1 }
input = 0  → output = 1    (no delay, normal risk)
input = 10 → output = 2    (10-day delay, 2x risk)
input = 20 → output = 4    (20-day delay, 4x risk)
input = 30 → output = 8    (30-day delay, 8x risk) ← exponential!
```

**Visual:**
```
Output
   │               ┌────
  8│              ┌┘
   │            ┌─┘
  4│          ┌─┘
   │       ┌──┘
  2│     ┌─┘
   │   ┌─┘
  1│┌──┘
   └────────────────── Input
   0   10   20   30
```

#### 4. Step-Wise Curve (Capacity Tiers)

**Formula:** Discrete steps at thresholds

**Use Case:** Capacity tiers, pricing tiers, warehouse zones

**Example:** Different warehouses for different volumes

```typescript
class StepWiseCurve {
  calculate(input: number, params: { thresholds: number[], values: number[] }): number {
    const idx = params.thresholds.findIndex(t => input < t)
    return params.values[idx === -1 ? params.values.length - 1 : idx]
  }
}

// Example: Warehouse capacity tiers
params = {
  thresholds: [100, 500, 1000],
  values: [1.0, 0.9, 0.8, 0.7]
}
input = 50   → output = 1.0  (Small warehouse, 1.0x cost)
input = 200  → output = 0.9  (Medium warehouse, 0.9x cost)
input = 700  → output = 0.8  (Large warehouse, 0.8x cost)
input = 1500 → output = 0.7  (XL warehouse, 0.7x cost)
```

**Visual:**
```
Output
   │
1.0│████
   │    ████
0.9│        ████
   │            ████
0.8│                ████
   │                    ████
0.7│                        ████
   └────────────────────────────── Input
   0   100  500   1000
```

#### 5. Custom Interpolated Curve

**Formula:** Linear interpolation between user-defined points

**Use Case:** Complex, data-driven relationships

**Example:** Historical data shows non-standard pattern

```typescript
class CustomInterpolatedCurve {
  calculate(input: number, params: { points: Array<{x: number, y: number}> }): number {
    const sorted = params.points.sort((a, b) => a.x - b.x)

    // Clamp to first/last points
    if (input <= sorted[0].x) return sorted[0].y
    if (input >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y

    // Find surrounding points and interpolate
    for (let i = 0; i < sorted.length - 1; i++) {
      if (input >= sorted[i].x && input <= sorted[i + 1].x) {
        const t = (input - sorted[i].x) / (sorted[i + 1].x - sorted[i].x)
        return sorted[i].y + t * (sorted[i + 1].y - sorted[i].y)
      }
    }
    return 0
  }
}

// Example: Custom demand pattern
params = {
  points: [
    {x: 0, y: 100},
    {x: 50, y: 150},
    {x: 75, y: 180},
    {x: 100, y: 200}
  ]
}
input = 25  → output = 125  (interpolated between 100 and 150)
input = 60  → output = 162  (interpolated between 150 and 180)
```

### Calculation Engine Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ CalculationEngine.calculateScenario(context)                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────────┐
│ 1. Load Data    │     │ 2. Build Graph      │
│ ─────────────── │     │ ─────────────────── │
│ - Variables     │     │ - DependencyGraph   │
│ - Parameters    │     │ - Detect cycles     │
│ - Input Values  │     │ - Topological sort  │
└────────┬────────┘     └──────────┬──────────┘
         │                         │
         └─────────┬───────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │ 3. Prepare Maps     │
         │ ─────────────────── │
         │ valueMap: Map<id, number>
         │ paramMap: Map<name, number>
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │ 4. Execute in Order │
         │ ─────────────────── │
         │ For each variable:  │
         │   a) Parse formula  │
         │   b) Evaluate       │
         │   c) Apply curve    │
         │   d) Store result   │
         │   e) Calculate delta│
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │ 5. Save Results     │
         │ ─────────────────── │
         │ - Create Calculation│
         │ - Store JSON results│
         │ - Version tracking  │
         └──────────┬──────────┘
                    │
                    ▼
              Return results
```

### Detailed Example: Complete Calculation

**Setup:**

```typescript
// Variables
Variable: INPUT_SALES
  - type: INPUT
  - value: 1000 (in baseline)

Variable: INPUT_ORDER_QTY
  - type: INPUT
  - value: 500 (in baseline)

Variable: OUTPUT_STOCK
  - type: OUTPUT
  - formula: "INPUT_SALES * PARAM_LEAD_TIME / INPUT_ORDER_QTY"
  - effectCurve: Logarithmic { base: 10, multiplier: 1.2 }
  - dependencies: ["INPUT_SALES", "INPUT_ORDER_QTY"]

// Parameters
Parameter: PARAM_LEAD_TIME
  - value: 14 (days)

// Baseline Scenario
Scenario: "Current State"
  - INPUT_SALES: 1000
  - INPUT_ORDER_QTY: 500
  - OUTPUT_STOCK: ? (to be calculated)

// New Scenario
Scenario: "Optimistic"
  - INPUT_SALES: 1200 (+20%)
  - INPUT_ORDER_QTY: 500 (unchanged)
  - OUTPUT_STOCK: ? (to be calculated)
```

**Execution:**

```typescript
// Step 1: Load data
variables = [INPUT_SALES, INPUT_ORDER_QTY, OUTPUT_STOCK]
parameters = [PARAM_LEAD_TIME]
inputValues = { INPUT_SALES: 1200, INPUT_ORDER_QTY: 500 }

// Step 2: Build dependency graph
graph.addVariable(INPUT_SALES, [])           // No dependencies
graph.addVariable(INPUT_ORDER_QTY, [])       // No dependencies
graph.addVariable(OUTPUT_STOCK, ["INPUT_SALES", "INPUT_ORDER_QTY"])

executionOrder = [INPUT_SALES, INPUT_ORDER_QTY, OUTPUT_STOCK]

// Step 3: Prepare maps
valueMap = { INPUT_SALES: 1200, INPUT_ORDER_QTY: 500 }
paramMap = { PARAM_LEAD_TIME: 14 }

// Step 4: Execute calculations
// INPUT_SALES: Already in valueMap (input)
// INPUT_ORDER_QTY: Already in valueMap (input)

// OUTPUT_STOCK:
formula = "INPUT_SALES * PARAM_LEAD_TIME / INPUT_ORDER_QTY"

// a) Parse formula → AST
ast = BinaryOp(
  operator: '/',
  left: BinaryOp(
    operator: '*',
    left: Variable("INPUT_SALES"),
    right: Variable("PARAM_LEAD_TIME")
  ),
  right: Variable("INPUT_ORDER_QTY")
)

// b) Evaluate AST
value = evaluate(ast)
      = evaluate(left) / evaluate(right)
      = (evaluate(INPUT_SALES) * evaluate(PARAM_LEAD_TIME)) / evaluate(INPUT_ORDER_QTY)
      = (1200 * 14) / 500
      = 16800 / 500
      = 33.6

// c) Apply effect curve (Logarithmic)
curveValue = LogarithmicCurve.calculate(33.6, { base: 10, multiplier: 1.2 })
           = 1.2 * log10(33.6)
           = 1.2 * 1.526
           = 1.831

// d) Store result
valueMap.set("OUTPUT_STOCK", 1.831)

// e) Calculate delta from baseline
baselineValue = 1.0 (from baseline calculation)
delta = 1.831 - 1.0 = 0.831
percentChange = (0.831 / 1.0) * 100 = 83.1%

results["OUTPUT_STOCK"] = {
  value: 1.831,
  delta: 0.831,
  percentChange: 83.1,
  bottlenecks: []
}

// Step 5: Save results
db.calculation.create({
  scenarioId: "optimistic-id",
  results: results,
  baselineScenarioId: "baseline-id",
  version: 1
})
```

### Error Handling

#### Circular Dependencies

```typescript
// BAD: Circular dependency
Variable A: formula = "OUTPUT_B + 10"
Variable B: formula = "OUTPUT_A + 20"

// Detection:
DependencyGraph.getExecutionOrder() → throws Error("Circular dependency detected")
```

#### Missing Variables

```typescript
// BAD: Formula references non-existent variable
Variable: formula = "INPUT_SALES * INPUT_NONEXISTENT"

// Detection:
FormulaEvaluator.evaluate() → throws Error("Variable not found: INPUT_NONEXISTENT")
```

#### Division by Zero

```typescript
// BAD: Division by zero
formula = "INPUT_SALES / INPUT_ORDER_QTY"
INPUT_ORDER_QTY = 0

// Detection:
FormulaEvaluator.evaluate() → throws Error("Division by zero")
```

#### Invalid Effect Curve

```typescript
// BAD: Logarithm of zero/negative
LogarithmicCurve.calculate(0, params) → returns 0 (graceful handling)
LogarithmicCurve.calculate(-10, params) → returns 0 (graceful handling)
```

### Implementation: Formula Parser

**File: `src/server/calculation/formula-parser.ts`**

```typescript
// Simple expression parser for formulas like:
// "INPUT_SALES * PARAM_LEAD_TIME / INPUT_ORDER_QTY"

type FormulaNode =
  | { type: 'number', value: number }
  | { type: 'variable', name: string }
  | { type: 'binary', operator: '+' | '-' | '*' | '/', left: FormulaNode, right: FormulaNode }
  | { type: 'function', name: string, args: FormulaNode[] }

export class FormulaParser {
  parse(formula: string): FormulaNode {
    // Tokenize and parse into AST
    // Support: +, -, *, /, parentheses, MAX, MIN, IF
  }
}
```

### Implementation: Formula Evaluator

**File: `src/server/calculation/formula-evaluator.ts`**

```typescript
export class FormulaEvaluator {
  constructor(
    private variables: Map<string, number>,
    private parameters: Map<string, number>
  ) {}

  evaluate(node: FormulaNode): number {
    switch (node.type) {
      case 'number':
        return node.value

      case 'variable':
        const value = this.variables.get(node.name) ?? this.parameters.get(node.name)
        if (value === undefined) {
          throw new Error(`Variable not found: ${node.name}`)
        }
        return value

      case 'binary':
        const left = this.evaluate(node.left)
        const right = this.evaluate(node.right)
        switch (node.operator) {
          case '+': return left + right
          case '-': return left - right
          case '*': return left * right
          case '/': return left / right
        }

      case 'function':
        const args = node.args.map(arg => this.evaluate(arg))
        return this.executeFunction(node.name, args)
    }
  }

  private executeFunction(name: string, args: number[]): number {
    switch (name) {
      case 'MAX': return Math.max(...args)
      case 'MIN': return Math.min(...args)
      case 'IF': return args[0] > 0 ? args[1] : args[2]
      default: throw new Error(`Unknown function: ${name}`)
    }
  }
}
```

### Implementation: Effect Curves

**File: `src/server/calculation/curves.ts`**

```typescript
export interface CurveCalculator {
  calculate(input: number, parameters: any): number
  generatePreview(parameters: any, min: number, max: number, points: number): Array<{x: number, y: number}>
}

export class LinearCurve implements CurveCalculator {
  calculate(input: number, params: { slope: number, intercept: number }): number {
    return params.slope * input + params.intercept
  }

  generatePreview(params: any, min: number, max: number, points: number) {
    const step = (max - min) / (points - 1)
    return Array.from({ length: points }, (_, i) => {
      const x = min + i * step
      return { x, y: this.calculate(x, params) }
    })
  }
}

export class LogarithmicCurve implements CurveCalculator {
  calculate(input: number, params: { base: number, multiplier: number }): number {
    if (input <= 0) return 0
    return params.multiplier * Math.log(input) / Math.log(params.base)
  }

  generatePreview(params: any, min: number, max: number, points: number) {
    const step = (max - min) / (points - 1)
    return Array.from({ length: points }, (_, i) => {
      const x = Math.max(0.1, min + i * step) // Avoid log(0)
      return { x, y: this.calculate(x, params) }
    })
  }
}

export class ExponentialCurve implements CurveCalculator {
  calculate(input: number, params: { base: number, exponent: number }): number {
    return Math.pow(params.base, input * params.exponent)
  }

  generatePreview(params: any, min: number, max: number, points: number) {
    const step = (max - min) / (points - 1)
    return Array.from({ length: points }, (_, i) => {
      const x = min + i * step
      return { x, y: this.calculate(x, params) }
    })
  }
}

export class StepWiseCurve implements CurveCalculator {
  calculate(input: number, params: { thresholds: number[], values: number[] }): number {
    const idx = params.thresholds.findIndex(t => input < t)
    return params.values[idx === -1 ? params.values.length - 1 : idx]
  }

  generatePreview(params: any, min: number, max: number, points: number) {
    const step = (max - min) / (points - 1)
    return Array.from({ length: points }, (_, i) => {
      const x = min + i * step
      return { x, y: this.calculate(x, params) }
    })
  }
}

export class CustomInterpolatedCurve implements CurveCalculator {
  calculate(input: number, params: { points: Array<{x: number, y: number}> }): number {
    // Linear interpolation between user-defined points
    const sorted = params.points.sort((a, b) => a.x - b.x)

    if (input <= sorted[0].x) return sorted[0].y
    if (input >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y

    for (let i = 0; i < sorted.length - 1; i++) {
      if (input >= sorted[i].x && input <= sorted[i + 1].x) {
        const t = (input - sorted[i].x) / (sorted[i + 1].x - sorted[i].x)
        return sorted[i].y + t * (sorted[i + 1].y - sorted[i].y)
      }
    }

    return 0
  }

  generatePreview(params: any, min: number, max: number, points: number) {
    const step = (max - min) / (points - 1)
    return Array.from({ length: points }, (_, i) => {
      const x = min + i * step
      return { x, y: this.calculate(x, params) }
    })
  }
}

// Factory
export function getCurveCalculator(type: string): CurveCalculator {
  switch (type) {
    case 'LINEAR': return new LinearCurve()
    case 'LOGARITHMIC': return new LogarithmicCurve()
    case 'EXPONENTIAL': return new ExponentialCurve()
    case 'STEP_WISE': return new StepWiseCurve()
    case 'CUSTOM_INTERPOLATED': return new CustomInterpolatedCurve()
    default: throw new Error(`Unknown curve type: ${type}`)
  }
}
```

### Implementation: Main Engine

**File: `src/server/calculation/engine.ts`**

```typescript
import { FormulaParser } from './formula-parser'
import { FormulaEvaluator } from './formula-evaluator'
import { getCurveCalculator } from './curves'
import { DependencyGraph } from './dependency-graph'

interface CalculationContext {
  organizationId: string
  scenarioId: string
  periodStart?: Date
  periodEnd?: Date
  baselineScenarioId?: string
}

export class CalculationEngine {
  constructor(private db: PrismaClient) {}

  async calculateScenario(context: CalculationContext) {
    // 1. Load all variables for organization
    const variables = await this.db.variable.findMany({
      where: { organizationId: context.organizationId },
      include: { effectCurve: true }
    })

    // 2. Load all parameters
    const parameters = await this.db.parameter.findMany({
      where: { organizationId: context.organizationId }
    })

    // 3. Load input values for this scenario
    const inputValues = await this.db.variableValue.findMany({
      where: {
        scenarioId: context.scenarioId,
        variable: { variableType: 'INPUT' }
      }
    })

    // 4. Build dependency graph and get execution order
    const graph = new DependencyGraph()
    variables.forEach(v => graph.addVariable(v))
    const executionOrder = graph.getExecutionOrder()

    // 5. Create value maps
    const valueMap = new Map<string, number>()
    const paramMap = new Map<string, number>()

    inputValues.forEach(v => valueMap.set(v.variableId, v.value))
    parameters.forEach(p => paramMap.set(p.name, p.value))

    // 6. Calculate output variables in dependency order
    const parser = new FormulaParser()
    const results: Record<string, any> = {}

    for (const varId of executionOrder) {
      const variable = variables.find(v => v.id === varId)
      if (!variable || variable.variableType === 'INPUT') continue

      // Parse and evaluate formula
      const ast = parser.parse(variable.formula!)
      const evaluator = new FormulaEvaluator(valueMap, paramMap)
      let value = evaluator.evaluate(ast)

      // Apply effect curve if assigned
      if (variable.effectCurve) {
        const calculator = getCurveCalculator(variable.effectCurve.curveType)
        value = calculator.calculate(value, variable.effectCurve.parameters)
      }

      valueMap.set(varId, value)

      // Calculate delta if baseline provided
      let delta = 0
      let percentChange = 0
      if (context.baselineScenarioId) {
        const baselineValue = await this.getBaselineValue(
          context.baselineScenarioId,
          varId,
          context.periodStart
        )
        if (baselineValue !== null) {
          delta = value - baselineValue
          percentChange = (delta / baselineValue) * 100
        }
      }

      results[varId] = { value, delta, percentChange, bottlenecks: [] }
    }

    // 7. Save calculation results
    await this.db.calculation.create({
      data: {
        scenarioId: context.scenarioId,
        periodStart: context.periodStart,
        periodEnd: context.periodEnd,
        results: results,
        baselineScenarioId: context.baselineScenarioId,
        version: 1,
      }
    })

    return results
  }

  private async getBaselineValue(
    baselineScenarioId: string,
    variableId: string,
    periodStart?: Date
  ): Promise<number | null> {
    const value = await this.db.variableValue.findFirst({
      where: {
        scenarioId: baselineScenarioId,
        variableId: variableId,
        periodStart: periodStart,
      }
    })
    return value?.value ?? null
  }
}
```

---

## 4. UI Components & Pages

### Page Structure

```
src/app/admin/
├── dashboard/page.tsx              # Overview with scenario summary
├── scenarios/
│   ├── page.tsx                    # List all scenarios
│   ├── [id]/
│   │   ├── page.tsx                # Scenario detail/edit
│   │   ├── variables/page.tsx      # Edit variable values
│   │   ├── parameters/page.tsx     # Edit parameters
│   │   └── results/page.tsx        # View calculation results
│   ├── compare/page.tsx            # Side-by-side comparison
│   └── new/page.tsx                # Create new scenario
├── variables/
│   ├── page.tsx                    # Manage variable definitions
│   ├── [id]/page.tsx               # Edit variable + assign curve
│   └── new/page.tsx                # Create variable
├── effect-curves/
│   ├── page.tsx                    # List curves with previews
│   ├── [id]/page.tsx               # Edit curve with live graph
│   └── new/page.tsx                # Create curve
└── parameters/page.tsx             # Manage global parameters
```

### Key React Components

**File: `src/components/scenarios/scenario-list.tsx`**

```typescript
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export function ScenarioList({ organizationId }: { organizationId: string }) {
  const { data: scenarios, isLoading } = api.scenario.list.useQuery({ organizationId })

  if (isLoading) return <div>Loading...</div>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scenarios?.map(scenario => (
          <TableRow key={scenario.id}>
            <TableCell>
              {scenario.name}
              {scenario.isBaseline && <Badge className="ml-2">Baseline</Badge>}
            </TableCell>
            <TableCell>{scenario.timePeriodType}</TableCell>
            <TableCell>
              {scenario.startDate?.toLocaleDateString()} - {scenario.endDate?.toLocaleDateString()}
            </TableCell>
            <TableCell>{scenario.updatedAt.toLocaleDateString()}</TableCell>
            <TableCell>
              <Button variant="ghost" size="sm">Edit</Button>
              <Button variant="ghost" size="sm">Clone</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

**File: `src/components/curves/curve-preview.tsx`**

```typescript
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface CurvePreviewProps {
  curveType: string
  parameters: any
  min?: number
  max?: number
}

export function CurvePreview({ curveType, parameters, min = 0, max = 100 }: CurvePreviewProps) {
  const { data } = api.effectCurve.preview.useQuery({
    curveType,
    parameters,
    min,
    max,
    points: 50
  })

  if (!data) return null

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="x"
          label={{ value: 'Input Value', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          label={{ value: 'Effect Multiplier', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="y"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

**File: `src/components/comparison/scenario-comparison-table.tsx`**

```typescript
import { api } from '@/trpc/react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DeltaIndicatorProps {
  delta: number
  percent: number
}

function DeltaIndicator({ delta, percent }: DeltaIndicatorProps) {
  const isPositive = delta > 0
  const color = isPositive ? 'text-green-600' : 'text-red-600'

  return (
    <span className={`text-sm ${color}`}>
      {isPositive ? '+' : ''}{delta.toFixed(1)} ({isPositive ? '+' : ''}{percent.toFixed(1)}%)
    </span>
  )
}

export function ScenarioComparisonTable({ scenarioIds }: { scenarioIds: string[] }) {
  const { data } = api.comparison.compareScenarios.useQuery({ scenarioIds })

  if (!data) return <div>Loading...</div>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Variable</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Baseline</TableHead>
          {data.scenarios.map(s => (
            <TableHead key={s.id}>{s.name}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.map(row => (
          <TableRow key={row.variableId}>
            <TableCell className="font-medium">{row.variableName}</TableCell>
            <TableCell>{row.unit}</TableCell>
            <TableCell>{row.baseline.toFixed(1)}</TableCell>
            {row.scenarios.map(s => (
              <TableCell key={s.scenarioId}>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{s.value.toFixed(1)}</span>
                  <DeltaIndicator delta={s.delta} percent={s.percentChange} />
                </div>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

**File: `src/components/comparison/bottleneck-heatmap.tsx`**

```typescript
interface HeatmapCell {
  resource: string
  period: string
  utilization: number
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
}

const severityColors = {
  none: 'bg-green-100 text-green-900',
  low: 'bg-yellow-100 text-yellow-900',
  medium: 'bg-orange-100 text-orange-900',
  high: 'bg-red-100 text-red-900',
  critical: 'bg-red-500 text-white',
}

export function BottleneckHeatmap({ scenarioId }: { scenarioId: string }) {
  const { data } = api.comparison.getHeatmap.useQuery({ scenarioId })

  if (!data) return null

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid gap-1" style={{ gridTemplateColumns: `200px repeat(${data.periods.length}, 100px)` }}>
          {/* Header */}
          <div className="font-semibold p-2">Resource</div>
          {data.periods.map(period => (
            <div key={period} className="font-semibold p-2 text-center text-sm">{period}</div>
          ))}

          {/* Rows */}
          {data.resources.map(resource => (
            <>
              <div key={resource} className="p-2 font-medium">{resource}</div>
              {data.periods.map(period => {
                const cell = data.cells.find(c => c.resource === resource && c.period === period)
                if (!cell) return <div key={`${resource}-${period}`} className="p-2" />

                return (
                  <div
                    key={`${resource}-${period}`}
                    className={`p-2 text-center text-sm font-medium ${severityColors[cell.severity]}`}
                  >
                    {cell.utilization.toFixed(0)}%
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### shadcn/ui Components Needed

```bash
# Install additional components
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add tabs
npx shadcn@latest add tooltip
npx shadcn@latest add slider
npx shadcn@latest add switch
npx shadcn@latest add textarea
npx shadcn@latest add alert
```

---

## 5. Excel Export

### Install Library

```bash
npm install exceljs
npm install @types/exceljs --save-dev
```

### Implementation

**File: `src/server/export/excel-generator.ts`**

```typescript
import ExcelJS from 'exceljs'

export class ExcelExportService {
  async generateFullComparison(
    scenarios: Scenario[],
    variables: Variable[],
    calculations: Calculation[]
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('Summary')
    summarySheet.addRow(['Supply Chain Scenario Comparison'])
    summarySheet.addRow(['Generated:', new Date().toLocaleDateString()])
    summarySheet.addRow([])
    summarySheet.addRow(['Scenario', 'Description', 'Period Type', 'Last Updated'])

    scenarios.forEach(s => {
      summarySheet.addRow([s.name, s.description, s.timePeriodType, s.updatedAt])
    })

    // Sheet 2: Detailed Comparison
    const comparisonSheet = workbook.addWorksheet('Comparison')
    const headers = ['Variable', 'Unit', 'Baseline', ...scenarios.map(s => s.name)]
    comparisonSheet.addRow(headers)

    variables.forEach(variable => {
      const row = [variable.displayName, variable.unit]
      // Add values for each scenario
      scenarios.forEach(scenario => {
        const calc = calculations.find(c => c.scenarioId === scenario.id)
        const value = calc?.results[variable.id]?.value ?? 0
        row.push(value)
      })
      comparisonSheet.addRow(row)
    })

    // Add conditional formatting for deltas
    // ...

    // Sheet 3: Heatmap (with conditional formatting)
    const heatmapSheet = workbook.addWorksheet('Bottlenecks')
    // ...

    return workbook.xlsx.writeBuffer() as Promise<Buffer>
  }
}
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2) ✅ MVP

**Goal:** Basic CRUD for organizations, scenarios, and variables

**Tasks:**
1. ✅ Add Prisma models (Organization, User, Scenario, Variable, Parameter)
2. ✅ Create organization, scenario, variable routers
3. ✅ Build admin pages:
   - Scenario list and create/edit
   - Variable list and create/edit
4. ✅ Implement simple variable value editor
5. ✅ Add navigation to admin sidebar

**Deliverable:** Can create scenarios and define variables, manually enter values

**Estimated Time:** 10-15 hours

---

### Phase 2: Calculation Engine (Week 3-4)

**Goal:** Formula evaluation and basic calculations

**Tasks:**
1. ✅ Build formula parser and evaluator
2. ✅ Implement dependency resolution
3. ✅ Create calculation router
4. ✅ Add calculation trigger UI
5. ✅ Display calculation results in table
6. ✅ Implement baseline comparison (delta calculation)

**Deliverable:** Can define formulas and see calculated outputs with deltas

**Estimated Time:** 15-20 hours

---

### Phase 3: Effect Curves (Week 5)

**Goal:** Non-linear transformations

**Tasks:**
1. ✅ Add EffectCurve model and router
2. ✅ Implement curve calculators (linear, log, exp, step, custom)
3. ✅ Build curve editor UI with live preview (Recharts)
4. ✅ Add curve assignment to variables
5. ✅ Integrate curves into calculation engine

**Deliverable:** Can create and assign effect curves, see non-linear effects

**Estimated Time:** 12-15 hours

---

### Phase 4: Time Periods & Parameters (Week 6)

**Goal:** Time-series support and global parameters

**Tasks:**
1. ✅ Extend models for time periods
2. ✅ Add parameter management
3. ✅ Update calculation engine for time-series
4. ✅ Build time period selector UI
5. ✅ Add parameter editor page

**Deliverable:** Can run scenarios across multiple time periods with parameters

**Estimated Time:** 10-12 hours

---

### Phase 5: BI & Comparison (Week 7-8)

**Goal:** Rich comparison views and visualizations

**Tasks:**
1. ✅ Build scenario comparison table
2. ✅ Add Recharts visualizations (bar, line charts)
3. ✅ Implement bottleneck heatmap
4. ✅ Create comparison router with aggregations
5. ✅ Build dashboard overview with key metrics

**Deliverable:** Can compare multiple scenarios with charts and heatmaps

**Estimated Time:** 15-20 hours

---

### Phase 6: Excel Export (Week 9)

**Goal:** Professional reporting

**Tasks:**
1. ✅ Install and configure exceljs
2. ✅ Build export service (full and raw)
3. ✅ Add export router
4. ✅ Create export UI with format options
5. ✅ Add async job handling for large exports

**Deliverable:** Can export scenario comparisons to Excel

**Estimated Time:** 8-10 hours

---

### Phase 7: Polish & Production (Week 10+)

**Goal:** Production-ready refinements

**Tasks:**
1. ✅ Add audit logging
2. ✅ Implement role-based permissions
3. ✅ Add scenario cloning
4. ✅ Build dependency graph visualization
5. ✅ Add real-time calculation progress
6. ✅ Performance optimization (caching, indexing)
7. ✅ Data validation and error handling
8. ✅ Write comprehensive tests
9. ✅ Add onboarding/help tooltips

**Deliverable:** Production-ready application with full feature set

**Estimated Time:** 20-25 hours

---

## 7. Critical Files Reference

### Template Files to Study

1. **`prisma/schema.prisma`** - Study existing models for patterns
2. **`src/server/api/root.ts`** - Add new routers here
3. **`src/server/api/trpc.ts`** - Add multi-tenant middleware
4. **`src/app/admin/layout.tsx`** - Add navigation items
5. **`src/app/admin/dashboard/page.tsx`** - Pattern for dashboard cards
6. **`src/components/ui/*`** - shadcn/ui component library

### New Files to Create

**Routers:**
- `src/server/api/routers/organization.ts`
- `src/server/api/routers/scenario.ts`
- `src/server/api/routers/variable.ts`
- `src/server/api/routers/parameter.ts`
- `src/server/api/routers/effectCurve.ts`
- `src/server/api/routers/calculation.ts`
- `src/server/api/routers/comparison.ts`
- `src/server/api/routers/export.ts`

**Calculation Engine:**
- `src/server/calculation/engine.ts`
- `src/server/calculation/formula-parser.ts`
- `src/server/calculation/formula-evaluator.ts`
- `src/server/calculation/curves.ts`
- `src/server/calculation/dependency-graph.ts`

**Pages:**
- `src/app/admin/scenarios/page.tsx`
- `src/app/admin/scenarios/[id]/page.tsx`
- `src/app/admin/scenarios/compare/page.tsx`
- `src/app/admin/variables/page.tsx`
- `src/app/admin/effect-curves/page.tsx`
- `src/app/admin/parameters/page.tsx`

**Components:**
- `src/components/scenarios/scenario-list.tsx`
- `src/components/scenarios/scenario-form.tsx`
- `src/components/scenarios/variable-value-editor.tsx`
- `src/components/variables/variable-list.tsx`
- `src/components/variables/formula-editor.tsx`
- `src/components/curves/curve-preview.tsx`
- `src/components/comparison/scenario-comparison-table.tsx`
- `src/components/comparison/bottleneck-heatmap.tsx`

---

## 8. Development Best Practices

### Code Style

Follow the existing template patterns:

```typescript
// ✅ Good: Type-safe with Zod validation
export const scenarioRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      organizationId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.scenario.create({ data: input })
    })
})

// ❌ Bad: No validation
export const scenarioRouter = createTRPCRouter({
  create: protectedProcedure
    .mutation(async ({ ctx, input }: any) => {
      return ctx.db.scenario.create({ data: input })
    })
})
```

### Multi-Tenant Security

```typescript
// Add middleware to verify organization access
export const organizationProcedure = protectedProcedure.use(async ({ ctx, next, input }) => {
  const orgId = (input as any).organizationId

  // Verify user belongs to organization
  const hasAccess = await ctx.db.user.findFirst({
    where: {
      id: ctx.session.user.id,
      organizationId: orgId
    }
  })

  if (!hasAccess) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }

  return next({ ctx: { ...ctx, organizationId: orgId } })
})
```

### Styling

Use Tailwind utilities + CSS variables:

```typescript
// ✅ Good: Utility classes + design tokens
<div className="bg-card text-card-foreground border rounded-lg p-4">
  <h2 className="text-2xl font-semibold text-primary">Scenarios</h2>
</div>

// ❌ Bad: Inline styles
<div style={{ backgroundColor: '#fff', padding: '16px' }}>
  <h2 style={{ fontSize: '24px', color: '#000' }}>Scenarios</h2>
</div>
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## 9. Deployment Checklist

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://yourdomain.com"

# Email (optional)
RESEND_API_KEY="re_..."

# Redis (optional, for rate limiting)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

### Pre-Deployment

1. ✅ Run all tests: `npm run test && npm run test:e2e`
2. ✅ Type check: `npm run typecheck`
3. ✅ Lint: `npm run lint`
4. ✅ Build: `npm run build`
5. ✅ Database migration: `npx prisma migrate deploy`
6. ✅ Seed baseline data (if needed)

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

---

## 10. Next Steps After MVP

### Advanced Features (Post-Launch)

1. **Real-time Collaboration** - Multiple users editing scenarios simultaneously
2. **Version History** - Track scenario changes over time with rollback
3. **AI Suggestions** - ML-powered parameter recommendations
4. **Custom Reports** - User-configurable PDF reports
5. **API Access** - REST API for external integrations
6. **Webhooks** - Notify external systems of calculation completion
7. **Mobile App** - React Native app for on-the-go access
8. **Advanced Visualizations** - 3D charts, Sankey diagrams, network graphs

### Performance Optimizations

1. **Worker Threads** - Offload calculations to background workers
2. **Redis Caching** - Cache calculation results
3. **Database Read Replicas** - Scale read operations
4. **CDN** - Cache static assets globally
5. **Incremental Calculations** - Only recalculate changed variables

---

## Summary

This plan provides a **complete roadmap** for building a world-class supply chain scenario simulator on the nextjs-fullstack-template stack. The architecture is:

- ✅ **Type-safe** - End-to-end TypeScript with tRPC
- ✅ **Multi-tenant** - Full client isolation
- ✅ **Flexible** - Support for any calculation type via effect curves
- ✅ **Scalable** - PostgreSQL + Prisma for complex queries
- ✅ **User-friendly** - shadcn/ui components + Recharts visualizations
- ✅ **Production-ready** - Testing, validation, and security built-in

**Total Estimated Time:** 90-115 hours (10-14 weeks part-time)

**Start with Phase 1 (Foundation)** and iterate from there. Each phase builds on the previous one, delivering incremental value.