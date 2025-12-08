#!/bin/bash

# Automated database setup - attempts to create DB via Vercel API
# If API doesn't work, opens browser for manual creation

set -e

echo "🚀 Automated Database Setup for Supply Chain Simulator"
echo "======================================================="
echo ""

# Get Vercel auth token
VERCEL_TOKEN=$(cat ~/.config/vercel/auth.json 2>/dev/null | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ Vercel token not found"
  echo "Run: vercel login"
  exit 1
fi

echo "✅ Vercel token found"
echo ""

# Get project ID
PROJECT_ID="prj_rIjhT53bNh8dh6T9aGpQq3wxhpQK"
TEAM_ID="team_35o4JbqV7137Up2uZqbKkLXF"

echo "📦 Attempting to create Postgres database via API..."
echo ""

# Try to create database via API
RESPONSE=$(curl -s -X POST "https://api.vercel.com/v1/postgres/databases" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"sc-sim-db\",
    \"region\": \"iad1\",
    \"projectId\": \"$PROJECT_ID\",
    \"teamId\": \"$TEAM_ID\"
  }")

echo "API Response: $RESPONSE"
echo ""

# Check if database was created
if echo "$RESPONSE" | grep -q "error"; then
  echo "⚠️  API creation failed (expected - most users need to use dashboard)"
  echo ""
  echo "📋 Manual Setup Required:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "1. Opening Vercel dashboard in browser..."
  echo "2. Go to Storage tab"
  echo "3. Click 'Create Database'"
  echo "4. Select 'Postgres'"
  echo "5. Name: sc-sim-db"
  echo "6. Region: Washington D.C."
  echo "7. Click 'Create'"
  echo ""

  # Open browser to project
  open "https://vercel.com/willem4130s-projects/sc-sim/stores" 2>/dev/null || \
  xdg-open "https://vercel.com/willem4130s-projects/sc-sim/stores" 2>/dev/null || \
  echo "🔗 Open: https://vercel.com/willem4130s-projects/sc-sim/stores"

  echo ""
  echo "Waiting 30 seconds for you to create the database..."
  sleep 30
fi

echo ""
echo "📥 Pulling environment variables..."
vercel env pull .env.local --yes

if [ ! -f ".env.local" ]; then
  echo "❌ Failed to pull .env.local"
  exit 1
fi

if ! grep -q "DATABASE_URL" .env.local; then
  echo "❌ DATABASE_URL not found"
  echo "Please ensure database was created and try again"
  exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Load environment
export $(grep "^DATABASE_URL=" .env.local | xargs)

echo "📦 Pushing Prisma schema..."
npx prisma db push --accept-data-loss --skip-generate

echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "🌱 Seeding database..."
npm run db:seed

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Database: sc-sim-db (Postgres)"
echo "✅ Schema: 9 tables pushed"
echo "✅ Seed data: 3 scenarios ready"
echo ""
echo "🔗 Next steps:"
echo "  npm run dev              # Test locally"
echo "  npm run db:studio        # View data"
echo "  vercel --prod            # Redeploy with DB"
echo ""
echo "Production: https://sc-sim.vercel.app"
