#!/bin/bash

# Automated Vercel Postgres creation for sc-sim project
# This script uses Vercel CLI to create a Postgres database

set -e

echo "🗄️  Creating Vercel Postgres Database"
echo "====================================="
echo ""

# Check if logged in
if ! vercel whoami &>/dev/null; then
  echo "❌ Not logged in to Vercel"
  echo "Run: vercel login"
  exit 1
fi

echo "✅ Logged in as: $(vercel whoami)"
echo ""

# Create Postgres database
echo "📦 Creating Postgres database: sc-sim-db"
echo "This may take a moment..."
echo ""

# Use vercel postgres create command
# Note: This requires the project to be linked first
vercel postgres create sc-sim-db --region iad1

echo ""
echo "✅ Database created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Pull environment variables: vercel env pull .env.local"
echo "2. Setup database schema: ./scripts/setup-database.sh"
echo "3. Or run all in one: ./scripts/full-setup.sh"
