import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Reactivate all super_admin accounts that are inactive
  const result = await prisma.user.updateMany({
    where: {
      role: 'super_admin',
      isActive: false,
    },
    data: {
      isActive: true,
    },
  });

  console.log(`Reactivated ${result.count} super admin account(s)`);

  // Show all super admins
  const superAdmins = await prisma.user.findMany({
    where: {
      role: 'super_admin',
    },
    select: {
      id: true,
      username: true,
      name: true,
      isActive: true,
    },
  });

  console.log('\nSuper Admin Accounts:');
  console.table(superAdmins);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
