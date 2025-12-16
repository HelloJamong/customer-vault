const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
    },
  });

  console.log('=== Users in Database ===');
  users.forEach(user => {
    console.log(`ID: ${user.id}, Username: ${user.username}, Name: ${user.name}, Role: "${user.role}", Active: ${user.isActive}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
