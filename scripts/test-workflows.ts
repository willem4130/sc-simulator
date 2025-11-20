/**
 * Test Workflows Script
 *
 * Quick script to test all workflows manually
 */

import { runContractDistribution } from '../src/lib/workflows/contract-distribution';
import { runHoursReminder } from '../src/lib/workflows/hours-reminder';
import { runInvoiceGeneration } from '../src/lib/workflows/invoice-generation';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('🧪 Testing Simplicate Workflows\n');

  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'contracts':
      await testContractDistribution();
      break;

    case 'hours':
      await testHoursReminder();
      break;

    case 'invoices':
      await testInvoiceGeneration();
      break;

    case 'all':
      await testContractDistribution();
      await testHoursReminder();
      await testInvoiceGeneration();
      break;

    case 'status':
      await showStatus();
      break;

    default:
      console.log(`
Usage: npx tsx scripts/test-workflows.ts <command>

Commands:
  contracts   Test contract distribution workflow
  hours       Test hours reminder workflow
  invoices    Test invoice generation workflow
  all         Test all workflows
  status      Show system status

Examples:
  npx tsx scripts/test-workflows.ts contracts
  npx tsx scripts/test-workflows.ts hours
  npx tsx scripts/test-workflows.ts status
      `);
  }

  await prisma.$disconnect();
}

async function testContractDistribution() {
  console.log('📋 Testing Contract Distribution Workflow');
  console.log('─'.repeat(50));

  try {
    // Find a test project
    const project = await prisma.project.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!project) {
      console.log('⚠️  No active projects found. Create a project first.');
      return;
    }

    console.log(`Using project: ${project.name} (${project.id})`);

    const result = await runContractDistribution({
      projectId: project.id,
      templateName: 'Test Contract',
    });

    console.log('✅ Workflow completed!');
    console.log(`   Contracts created: ${result.contractsCreated}`);

    if (result.errors) {
      console.log('⚠️  Some errors occurred:', result.errors.length);
    }
  } catch (error) {
    console.error('❌ Workflow failed:', error);
  }

  console.log();
}

async function testHoursReminder() {
  console.log('⏰ Testing Hours Reminder Workflow');
  console.log('─'.repeat(50));

  try {
    const result = await runHoursReminder({
      period: 'current',
    });

    console.log('✅ Workflow completed!');
    console.log(`   Reminders sent: ${result.remindersSent}`);

    if (result.errors) {
      console.log('⚠️  Some errors occurred:', result.errors.length);
    }
  } catch (error) {
    console.error('❌ Workflow failed:', error);
  }

  console.log();
}

async function testInvoiceGeneration() {
  console.log('💰 Testing Invoice Generation Workflow');
  console.log('─'.repeat(50));

  try {
    const result = await runInvoiceGeneration();

    console.log('✅ Workflow completed!');
    console.log(`   Invoices created: ${result.invoicesCreated}`);

    if (result.errors) {
      console.log('⚠️  Some errors occurred:', result.errors.length);
    }
  } catch (error) {
    console.error('❌ Workflow failed:', error);
  }

  console.log();
}

async function showStatus() {
  console.log('📊 System Status');
  console.log('─'.repeat(50));

  try {
    // Count entities
    const [
      projectCount,
      userCount,
      contractCount,
      hoursCount,
      invoiceCount,
      automationCount,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.user.count(),
      prisma.contract.count(),
      prisma.hoursEntry.count(),
      prisma.invoice.count(),
      prisma.automationLog.count(),
    ]);

    console.log(`Projects:     ${projectCount}`);
    console.log(`Users:        ${userCount}`);
    console.log(`Contracts:    ${contractCount}`);
    console.log(`Hours:        ${hoursCount}`);
    console.log(`Invoices:     ${invoiceCount}`);
    console.log(`Automations:  ${automationCount}`);

    console.log();

    // Recent automations
    const recentAutomations = await prisma.automationLog.findMany({
      take: 5,
      orderBy: { startedAt: 'desc' },
      include: { project: true },
    });

    if (recentAutomations.length > 0) {
      console.log('Recent Automations:');
      for (const log of recentAutomations) {
        const status =
          log.status === 'SUCCESS' ? '✅' : log.status === 'FAILED' ? '❌' : '⏳';
        console.log(
          `  ${status} ${log.workflowType} - ${log.project?.name || 'N/A'} (${log.startedAt.toLocaleString()})`
        );
      }
    }

    console.log();

    // Contract status
    const contractStats = await prisma.contract.groupBy({
      by: ['status'],
      _count: true,
    });

    if (contractStats.length > 0) {
      console.log('Contract Status:');
      for (const stat of contractStats) {
        console.log(`  ${stat.status}: ${stat._count}`);
      }
    }

    console.log();

    // Hours status
    const hoursStats = await prisma.hoursEntry.groupBy({
      by: ['status'],
      _count: true,
    });

    if (hoursStats.length > 0) {
      console.log('Hours Status:');
      for (const stat of hoursStats) {
        console.log(`  ${stat.status}: ${stat._count}`);
      }
    }

    console.log();

    // Invoice status
    const invoiceStats = await prisma.invoice.groupBy({
      by: ['status'],
      _count: true,
    });

    if (invoiceStats.length > 0) {
      console.log('Invoice Status:');
      for (const stat of invoiceStats) {
        console.log(`  ${stat.status}: ${stat._count}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to fetch status:', error);
  }

  console.log();
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
