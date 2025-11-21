#!/usr/bin/env tsx
/**
 * Sync script to import data from Simplicate API into local database
 */

import { getSimplicateClient } from '../src/lib/simplicate/client'
import { db } from '../src/server/db'

async function main() {
  console.log('🔄 Starting Simplicate sync...\n')

  const client = getSimplicateClient()

  try {
    // Test API connection
    console.log('📡 Testing Simplicate API connection...')
    const projects = await client.getProjects({ limit: 5 })

    console.log(`✅ Successfully connected to Simplicate!`)
    console.log(`📊 Found ${projects.length} projects\n`)

    // Display sample data
    console.log('Sample projects:')
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name} (${project.project_number || 'N/A'})`)
      console.log(`   Status: ${project.status || 'N/A'}`)
      console.log(`   Client: ${project.organization?.name || 'N/A'}`)
      console.log('')
    })

    // Ask if user wants to import
    console.log('\n📥 To import this data into your database, we need to create a sync function.')
    console.log('   This will:')
    console.log('   - Import all projects from Simplicate')
    console.log('   - Create records in your local database')
    console.log('   - Link employees, hours, and invoices')

  } catch (error) {
    console.error('❌ Error connecting to Simplicate API:', error)
    process.exit(1)
  }
}

main()
  .then(() => {
    console.log('\n✅ Sync test complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
