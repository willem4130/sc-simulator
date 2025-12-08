#!/bin/bash

# Full automated setup for Supply Chain Scenario Simulator
# This script:
# 1. Links Vercel project (interactive if not linked)
# 2. Creates Postgres database
# 3. Pulls environment variables
# 4. Pushes schema and seeds data

set -e

echo "🚀 Supply Chain Simulator - Full Setup"
echo "========================================"
echo ""

# Check if logged in
if ! vercel whoami &>/dev/null; then
  echo "❌ Not logged in to Vercel"
  echo "Run: vercel login"
  exit 1
fi

VERCEL_USER=$(vercel whoami)
echo "✅ Logged in as: $VERCEL_USER"
echo ""

# Step 1: Check if project is linked
if [ ! -f ".vercel/project.json" ]; then
  echo "📦 Project not linked to Vercel"
  echo "Linking project..."
  echo ""

  # Try to link with project name sc-sim
  vercel link --project=sc-sim --yes || {
    echo "⚠️  Could not auto-link. Please link manually:"
    echo "   vercel link"
    exit 1
  }

  echo "✅ Project linked"
  echo ""
fi

# Step 2: Check for existing Postgres databases
echo "🔍 Checking for existing Postgres databases..."
EXISTING_DB=$(vercel postgres ls 2>&1 | grep -c "sc-sim-db" || true)

if [ "$EXISTING_DB" -gt 0 ]; then
  echo "✅ Database 'sc-sim-db' already exists"
else
  echo "📦 Creating new Postgres database: sc-sim-db"
  echo "Region: Washington D.C. (iad1)"
  echo ""

  # Create database
  vercel postgres create sc-sim-db --region iad1 || {
    echo "⚠️  Could not create database automatically"
    echo "Please create manually:"
    echo "1. Go to https://vercel.com/dashboard"
    echo "2. Select project: sc-sim"
    echo "3. Storage → Create Database → Postgres"
    echo "4. Name: sc-sim-db"
    exit 1
  }

  echo "✅ Database created"
fi

echo ""

# Step 3: Pull environment variables
echo "📥 Pulling environment variables from Vercel..."
vercel env pull .env.local --yes

if [ -f ".env.local" ]; then
  echo "✅ Environment variables saved to .env.local"
else
  echo "❌ Failed to pull environment variables"
  exit 1
fi

echo ""

# Step 4: Load environment variables
echo "🔧 Loading environment variables..."
set -a
source .env.local
set +a

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env.local"
  echo "Please check your Vercel project settings"
  exit 1
fi

echo "✅ DATABASE_URL loaded"
echo ""

# Step 5: Push Prisma schema
echo "📦 Pushing Prisma schema to database..."
npx prisma db push --accept-data-loss
echo "✅ Schema pushed"
echo ""

# Step 6: Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate
echo "✅ Client generated"
echo ""

# Step 7: Seed database
echo "🌱 Seeding database with test data..."
npm run db:seed
echo "✅ Database seeded"
echo ""

echo "🎉 Setup Complete!"
echo ""
echo "📊 What was created:"
echo "  ✅ Vercel Postgres database: sc-sim-db"
echo "  ✅ Database schema: 9 tables (Organization, User, Scenario, Variable, etc.)"
echo "  ✅ Test data:"
echo "     - 1 Organization (ACME Supply Chain)"
echo "     - 1 Admin User (admin@acme-supply.com)"
echo "     - 3 Parameters (global constants)"
echo "     - 13 Variables (5 INPUT, 8 OUTPUT with formulas)"
echo "     - 3 Scenarios with full data"
echo ""
echo "🧮 Next Steps:"
echo "1. Start dev server: npm run dev"
echo "2. Visit: http://localhost:3000/admin/scenarios"
echo "3. Test calculations via tRPC or calculation engine"
echo "4. View data in Prisma Studio: npm run db:studio"
echo ""
echo "🔗 Production: https://sc-sim.vercel.app"
