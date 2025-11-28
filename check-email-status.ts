import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_hqWLrvVu3k9e@ep-spring-fog-agqz47wr-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
});

async function main() {
  const emails = await prisma.sentEmail.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      toEmail: true,
      subject: true,
      status: true,
      error: true,
      resendId: true,
      sentAt: true,
      createdAt: true,
    }
  });

  console.log('Recent SentEmail records:');
  console.log(JSON.stringify(emails, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
