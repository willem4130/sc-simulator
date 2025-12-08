#!/bin/bash

# Setup database for Supply Chain Scenario Simulator
# This script automates Vercel Postgres setup and database seeding

set -e  # Exit on error

echo "🚀 Supply Chain Simulator - Database Setup"
echo "=========================================="
echo ""

# Step 1: Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in environment"
  echo ""
  echo "📋 Manual Setup Required:"
  echo "1. Go to Vercel Dashboard: https://vercel.com/dashboard"
  echo "2. Select your project: sc-sim"
  echo "3. Go to Storage tab → Create Database → Postgres"
  echo "4. Name it: sc-sim-db"
  echo "5. After creation, go to .env.local tab"
  echo "6. Copy the DATABASE_URL connection string"
  echo "7. Run: export DATABASE_URL='your-connection-string'"
  echo "8. Run this script again"
  echo ""
  echo "Alternatively, pull env vars from Vercel:"
  echo "  vercel env pull .env.local"
  echo "  source .env.local"
  echo ""
  exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Step 2: Push Prisma schema
echo "📦 Pushing Prisma schema to database..."
npx prisma db push --accept-data-loss
echo "✅ Schema pushed successfully"
echo ""

# Step 3: Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"
echo ""

# Step 4: Run seed script
echo "🌱 Seeding database with test data..."
npm run db:seed
echo "✅ Database seeded successfully"
echo ""

echo "🎉 Database setup complete!"
echo ""
echo "📊 What was created:"
echo "  - 1 Organization (ACME Supply Chain)"
echo "  - 1 Admin User (admin@acme-supply.com)"
echo "  - 3 Parameters (global constants)"
echo "  - 13 Variables (5 INPUT, 8 OUTPUT with formulas)"
echo "  - 3 Scenarios with input values:"
echo "    • Baseline: Supplier A (moderate cost/speed/quality)"
echo "    • Alternative: Supplier B (cheap, slow, higher defects)"
echo "    • Alternative: Supplier C (expensive, fast, excellent quality)"
echo ""
echo "🧮 Next Steps:"
echo "1. Run calculations: Use tRPC endpoint or calculation engine"
echo "2. View in Prisma Studio: npm run db:studio"
echo "3. Test in browser: npm run dev (visit /admin/scenarios)"
echo ""
echo "🔗 Production: https://sc-sim.vercel.app"
