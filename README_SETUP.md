# Supply Chain Scenario Simulator - Setup Guide

Complete setup guide for the Supply Chain Scenario Simulator.

## Quick Setup (Automated)

### Prerequisites
- Node.js 20+ installed
- Vercel CLI installed: `npm install -g vercel`
- Vercel account with sc-sim project deployed

### Option 1: Quickstart (Recommended)

```bash
# Run the automated setup script
./scripts/quickstart.sh
```

This script will:
1. Check Vercel authentication
2. Guide you through creating Postgres database (if needed)
3. Pull environment variables
4. Push Prisma schema
5. Seed test data automatically

### Option 2: Manual Step-by-Step

#### Step 1: Create Vercel Postgres Database

1. Go to https://vercel.com/dashboard
2. Select project: **sc-sim**
3. Click **Storage** tab
4. Click **Create Database**
5. Select **Postgres**
6. Name it: `sc-sim-db`
7. Select region: `Washington D.C. (iad1)`
8. Click **Create**

Wait ~30 seconds for database provisioning.

#### Step 2: Pull Environment Variables

```bash
vercel env pull .env.local
```

This creates `.env.local` with `DATABASE_URL` from Vercel.

#### Step 3: Push Schema to Database

```bash
npx prisma db push --accept-data-loss
```

Creates all 9 tables:
- Organization
- User
- Scenario
- Variable
- VariableValue
- Parameter
- EffectCurve
- Calculation
- AuditLog

#### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

#### Step 5: Seed Test Data

```bash
npm run db:seed
```

Creates:
- ✅ 1 Organization: ACME Supply Chain
- ✅ 1 Admin User: admin@acme-supply.com
- ✅ 3 Parameters (global constants like fixed overhead, rush fees)
- ✅ 5 INPUT Variables (user-entered values)
- ✅ 8 OUTPUT Variables (calculated with formulas)
- ✅ 3 Scenarios:
  1. **Baseline: Supplier A** - Moderate cost ($12/unit), 14 days, 3% defects
  2. **Alternative: Supplier B** - Cheaper ($9/unit), 21 days, 7% defects
  3. **Alternative: Supplier C** - Premium ($15/unit), 7 days, 1% defects

## Test Data Overview

### Variables Created

**INPUT Variables** (User-Entered):
1. `INPUT_SUPPLIER_LEAD_TIME` - Supplier lead time in days
2. `INPUT_ORDER_QUANTITY` - Number of units to order
3. `INPUT_UNIT_COST` - Cost per unit from supplier
4. `INPUT_DEFECT_RATE` - Percentage of defective units
5. `INPUT_SUPPLIER_RELIABILITY` - Reliability score (0-100)

**OUTPUT Variables** (Calculated):
1. `OUTPUT_BASE_COST` = `INPUT_UNIT_COST * INPUT_ORDER_QUANTITY + PARAM_FIXED_OVERHEAD`
2. `OUTPUT_RUSH_PENALTY` = `IF(INPUT_ORDER_QUANTITY > 1000, INPUT_ORDER_QUANTITY * PARAM_RUSH_FEE_PER_UNIT, 0)`
3. `OUTPUT_ADJUSTED_LEAD_TIME` = `IF(INPUT_ORDER_QUANTITY > 1000, INPUT_SUPPLIER_LEAD_TIME + 5, INPUT_SUPPLIER_LEAD_TIME)`
4. `OUTPUT_STORAGE_COST` = `OUTPUT_ADJUSTED_LEAD_TIME * PARAM_STORAGE_COST_PER_DAY`
5. `OUTPUT_TOTAL_COST` = `OUTPUT_BASE_COST + OUTPUT_RUSH_PENALTY + OUTPUT_STORAGE_COST`
6. `OUTPUT_DEFECT_COST` = `(INPUT_DEFECT_RATE / 100) * INPUT_ORDER_QUANTITY * INPUT_UNIT_COST`
7. `OUTPUT_TOTAL_COST_WITH_DEFECTS` = `OUTPUT_TOTAL_COST + OUTPUT_DEFECT_COST`
8. `OUTPUT_COST_PER_GOOD_UNIT` = `OUTPUT_TOTAL_COST_WITH_DEFECTS / (INPUT_ORDER_QUANTITY * (1 - INPUT_DEFECT_RATE / 100))`

### Parameters (Global Constants)

1. `PARAM_FIXED_OVERHEAD` = $500 (per order)
2. `PARAM_RUSH_FEE_PER_UNIT` = $2 (for orders >1000)
3. `PARAM_STORAGE_COST_PER_DAY` = $50 (daily warehouse cost)

## Expected Calculation Results

When you run calculations on the 3 scenarios:

| Scenario | Supplier | Lead Time | Unit Cost | Defects | Est. Total Cost |
|----------|----------|-----------|-----------|---------|-----------------|
| Baseline | A (Current) | 14 days | $12 | 3% | ~$10,200 |
| Alternative | B (Budget) | 21 days | $9 | 7% | ~$8,700 |
| Alternative | C (Premium) | 7 days | $15 | 1% | ~$12,600 |

## Development Workflow

```bash
# Start dev server
npm run dev

# View database in browser
npm run db:studio

# Type check (run after every edit)
npm run typecheck

# Lint code
npm run lint

# Format code
npm run format
```

## Testing Calculations

### Option 1: Via tRPC Router (Recommended)

The seed data is ready for calculation. To run calculations:

1. Start dev server: `npm run dev`
2. Navigate to `/admin/scenarios` in browser
3. Click "Calculate" button on any scenario
4. View calculated OUTPUT variables with baseline comparison

### Option 2: Direct Calculation Engine Test

Create a test script in `scripts/test-calculations.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { CalculationEngine } from '../src/lib/calculation/engine'

const prisma = new PrismaClient()
const engine = new CalculationEngine(prisma)

async function main() {
  // Get first organization
  const org = await prisma.organization.findFirst()
  if (!org) throw new Error('No organization found')

  // Run calculations for all scenarios
  const scenarios = await prisma.scenario.findMany({
    where: { organizationId: org.id }
  })

  for (const scenario of scenarios) {
    console.log(`\nCalculating: ${scenario.name}`)
    const results = await engine.calculateScenario(org.id, scenario.id)
    console.log(`  Calculated ${results.length} variables`)

    // Show key results
    const totalCost = results.find(r => r.variableName === 'OUTPUT_TOTAL_COST_WITH_DEFECTS')
    if (totalCost) {
      console.log(`  Total Cost: $${totalCost.calculatedValue.toFixed(2)}`)
      if (totalCost.delta !== null) {
        console.log(`  vs Baseline: $${totalCost.delta.toFixed(2)} (${totalCost.percentChange.toFixed(1)}%)`)
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Run:
```bash
tsx scripts/test-calculations.ts
```

## Understanding the Calculation Flow

1. **User enters INPUT values** via UI (or seed script)
2. **System identifies dependencies** using formula parser
3. **Topological sort** determines calculation order
4. **Formula evaluator** executes formulas in order:
   - Resolves variable references (INPUT_*, OUTPUT_*, PARAM_*)
   - Executes operators (+, -, *, /)
   - Calls functions (MAX, MIN, IF, ABS, SQRT, ROUND, etc.)
5. **Results cached** in Calculation table
6. **Baseline comparison** calculates delta and percentChange
7. **UI displays** results with green/red indicators

## Production Deployment

The app is already deployed at: **https://sc-sim.vercel.app**

To deploy updates:

```bash
git add .
git commit -m "Update"
git push origin phase1-foundation
```

Vercel automatically deploys on push to main/phase1-foundation branches.

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution**: Ensure DATABASE_URL is set:
```bash
vercel env pull .env.local
source .env.local
```

### Issue: "Prisma Client not generated"

**Solution**: Regenerate client:
```bash
npx prisma generate
```

### Issue: "No data in database"

**Solution**: Re-run seed:
```bash
npm run db:seed
```

### Issue: "Circular dependency error"

This means formulas reference each other in a loop. Check variable formulas:
```bash
npm run db:studio
# Navigate to Variable table
# Check 'formula' and 'dependencies' columns
```

## Next Steps

After setup is complete:

1. ✅ Test calculations in browser
2. ✅ Build Variable management UI (VariableList + VariableForm)
3. ✅ Build Parameter management UI
4. ✅ Add scenario comparison view
5. ✅ Implement Effect Curves (Phase 3)
6. ✅ Add time-series support (Phase 4)
7. ✅ Build comparison & visualization features (Phase 5)
8. ✅ Add Excel export (Phase 6)

## Links

- **Production**: https://sc-sim.vercel.app
- **Vercel Dashboard**: https://vercel.com/willem4130s-projects/sc-sim
- **GitHub**: (configure in package.json)
- **Documentation**: See CLAUDE.md and docs/ folder

## Support

For issues or questions:
1. Check CLAUDE.md for project guidelines
2. Check docs/CALCULATION_ENGINE_SPEC.md for calculation details
3. Run `npm run typecheck` to verify code
4. Check Prisma Studio (`npm run db:studio`) to inspect data
