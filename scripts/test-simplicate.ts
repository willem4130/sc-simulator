#!/usr/bin/env tsx
/**
 * Simplicate API Connection Test Script
 *
 * This script tests your Simplicate API connection and displays available data.
 * It helps verify that your credentials are correct before running the full automation.
 *
 * Usage:
 *   npm run test:simplicate
 *   or
 *   npx tsx scripts/test-simplicate.ts
 */

import * as dotenv from 'dotenv';
import { SimplicateClient } from '../src/lib/simplicate/client';

// Load environment variables directly
dotenv.config();

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function success(msg: string) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function error(msg: string) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg: string) {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
}

function section(title: string) {
  console.log(`\n${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log('─'.repeat(50));
}

async function testSimplicateConnection() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════╗
║     Simplicate API Connection Test               ║
╚═══════════════════════════════════════════════════╝
${colors.reset}`);

  // Step 1: Check environment variables
  section('1. Environment Configuration');

  const apiKey = process.env.SIMPLICATE_API_KEY;
  const apiSecret = process.env.SIMPLICATE_API_SECRET;
  const domain = process.env.SIMPLICATE_DOMAIN;

  if (!apiKey || apiKey.includes('your-')) {
    error('SIMPLICATE_API_KEY is not configured');
    console.log('   Please add your API key to .env file');
    return false;
  }
  success(`API Key: ${apiKey.substring(0, 8)}...`);

  if (!apiSecret || apiSecret.includes('your-')) {
    error('SIMPLICATE_API_SECRET is not configured');
    console.log('   Please add your API secret to .env file');
    return false;
  }
  success(`API Secret: ${'*'.repeat(apiSecret.length)}`);

  if (!domain || domain.includes('your-')) {
    error('SIMPLICATE_DOMAIN is not configured');
    console.log('   Please add your Simplicate domain to .env file');
    return false;
  }
  success(`Domain: ${domain}`);

  // Step 2: Initialize client
  section('2. API Client Initialization');
  const client = new SimplicateClient();
  success('Client initialized');

  // Debug: Show the API endpoint we're using
  console.log(`   API Base URL: https://${domain}/api/v2`);

  // Step 3: Test API connection with projects
  section('3. Testing API Connection');
  info('Fetching projects...');

  try {
    const projects = await client.getProjects({ limit: 5 });
    success(`Connected to Simplicate API successfully!`);
    success(`Found ${projects.length} projects`);

    if (projects.length > 0) {
      console.log('\nRecent projects:');
      projects.forEach((project, idx) => {
        console.log(`   ${idx + 1}. ${project.name} (${project.project_number || 'No number'})`);
        if (project.organization) {
          console.log(`      Organization: ${project.organization.name}`);
        }
        if (project.project_manager) {
          console.log(`      Manager: ${project.project_manager.name}`);
        }
      });
    }
  } catch (err: any) {
    error('Failed to fetch projects');
    console.log(`   ${colors.red}Error: ${err.message}${colors.reset}`);
    console.log('\n   Common issues:');
    console.log('   - Check that your API key and secret are correct');
    console.log('   - Verify your domain is correct (e.g., "yourcompany.simplicate.com")');
    console.log('   - Ensure your API credentials have the correct permissions');
    return false;
  }

  // Step 4: Test employees endpoint
  section('4. Testing Employees Endpoint');
  info('Fetching employees...');

  try {
    const employees = await client.getEmployees({ limit: 5 });
    success(`Found ${employees.length} employees`);

    if (employees.length > 0) {
      console.log('\nEmployee list:');
      employees.forEach((employee, idx) => {
        console.log(`   ${idx + 1}. ${employee.name}${employee.email ? ` (${employee.email})` : ''}`);
      });
    }
  } catch (err: any) {
    error('Failed to fetch employees');
    console.log(`   ${colors.yellow}Warning: ${err.message}${colors.reset}`);
    console.log('   This might be a permissions issue. Continuing...');
  }

  // Step 5: Test hours endpoint
  section('5. Testing Hours Endpoint');
  info('Fetching recent hours...');

  try {
    const hours = await client.getHours();
    success(`Found ${hours.length} hour entries`);

    if (hours.length > 0) {
      const totalHours = hours.reduce((sum, h) => sum + (h.hours || 0), 0);
      console.log(`   Total hours: ${totalHours.toFixed(2)}`);
    }
  } catch (err: any) {
    error('Failed to fetch hours');
    console.log(`   ${colors.yellow}Warning: ${err.message}${colors.reset}`);
  }

  // Step 6: Test documents endpoint
  section('6. Testing Documents Endpoint');
  info('Fetching documents...');

  try {
    const documents = await client.getDocuments();
    success(`Found ${documents.length} documents`);
  } catch (err: any) {
    error('Failed to fetch documents');
    console.log(`   ${colors.yellow}Warning: ${err.message}${colors.reset}`);
  }

  // Step 7: Test webhooks endpoint
  section('7. Testing Webhooks Configuration');
  info('Checking existing webhooks...');

  try {
    const webhooks = await client.getWebhooks();
    success(`Found ${webhooks.length} configured webhooks`);

    if (webhooks.length > 0) {
      console.log('\nConfigured webhooks:');
      webhooks.forEach((webhook, idx) => {
        console.log(`   ${idx + 1}. ${webhook.url}`);
        console.log(`      Events: ${webhook.events.join(', ')}`);
      });
    } else {
      console.log(`   ${colors.yellow}⚠${colors.reset} No webhooks configured yet`);
      console.log('   You will need to configure a webhook for automation to work');
    }
  } catch (err: any) {
    error('Failed to fetch webhooks');
    console.log(`   ${colors.yellow}Warning: ${err.message}${colors.reset}`);
  }

  // Summary
  section('Summary');
  success('Connection test completed!');
  console.log('\nYour Simplicate API connection is working correctly.');
  console.log('\nNext steps:');
  console.log('1. Configure a webhook in Simplicate dashboard');
  console.log('2. Point it to: http://localhost:3000/api/webhooks/simplicate');
  console.log('3. For local testing, use ngrok or similar tunnel service');
  console.log('4. Test the automation workflows\n');

  return true;
}

// Run the test
testSimplicateConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, err);
    process.exit(1);
  });
