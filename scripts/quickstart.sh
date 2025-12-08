#!/bin/bash

# Quickstart script for Supply Chain Scenario Simulator
# Checks for database, guides setup if needed, then seeds data

set -e

echo "🚀 Supply Chain Simulator - Quickstart"
echo "======================================="
echo ""

# Check Vercel login
if ! vercel whoami &>/dev/null; then
  echo "❌ Not logged in to Vercel"
  echo "Run: vercel login"
  exit 1
fi

echo "✅ Logged in as: $(vercel whoami)"
echo ""

# Check if project is linked
if [ ! -f ".vercel/project.json" ]; then
  echo "✅ Project automatically linked to Vercel"
fi

# Try to pull env vars
echo "📥 Attempting to pull environment variables..."
vercel env pull .env.local --yes 2>/dev/null || {
  echo ""
  echo "⚠️  No environment variables found"
  echo ""
  echo "📋 Create Vercel Postgres Database:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "1. Open: https://vercel.com/willem4130s-projects/sc-sim"
  echo "2. Click 'Storage' tab"
  echo "3. Click 'Create Database'"
  echo "4. Select 'Postgres'"
  echo "5. Name it: sc-sim-db"
  echo "6. Click 'Create'"
  echo "7. Wait ~30 seconds for database to be ready"
  echo "8. Come back here and press ENTER"
  echo ""
  read -p "Press ENTER once database is created..."
  echo ""

  # Try again
  vercel env pull .env.local --yes
}

# Check if .env.local exists and has DATABASE_URL
if [ -f ".env.local" ] && grep -q "DATABASE_URL" .env.local; then
  echo "✅ Environment variables loaded"
else
  echo "❌ DATABASE_URL not found in .env.local"
  echo "Please ensure the database was created successfully"
  exit 1
fi

echo ""

# Load environment variables
echo "🔧 Loading DATABASE_URL..."
export $(grep "^DATABASE_URL=" .env.local | xargs)

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is empty"
  exit 1
fi

echo "✅ DATABASE_URL loaded"
echo ""

# Push schema
echo "📦 Pushing Prisma schema to database..."
npx prisma db push --accept-data-loss --skip-generate
echo "✅ Schema pushed"
echo ""

# Generate client
echo "🔧 Generating Prisma client..."
npx prisma generate
echo "✅ Client generated"
echo ""

# Seed data
echo "🌱 Seeding database with test data..."
npm run db:seed
echo "✅ Database seeded"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Created Test Data:"
echo "  • 1 Organization: ACME Supply Chain"
echo "  • 1 Admin User: admin@acme-supply.com"
echo "  • 3 Parameters (global constants)"
echo "  • 13 Variables:"
echo "    - 5 INPUT variables (user-entered)"
echo "    - 8 OUTPUT variables (calculated with formulas)"
echo "  • 3 Scenarios with different supplier options:"
echo "    1. Baseline: Supplier A (moderate, 14 days, \$12/unit, 3% defects)"
echo "    2. Budget: Supplier B (cheaper, 21 days, \$9/unit, 7% defects)"
echo "    3. Premium: Supplier C (expensive, 7 days, \$15/unit, 1% defects)"
echo ""
echo "🧮 Ready for calculations!"
echo ""
echo "🔗 Next Steps:"
echo "  1. npm run dev           # Start dev server"
echo "  2. Open http://localhost:3000/admin/scenarios"
echo "  3. npm run db:studio     # View data in Prisma Studio"
echo ""
echo "Production: https://sc-sim.vercel.app"
