const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function testUserBoards() {
  const testUsers = [
    'test@example.com',
    'tralala@mail.fr',
    'pepito@test.com',
    'kiki@test.com'
  ];

  for (const email of testUsers) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log(`\n❌ User ${email} NOT FOUND`);
      continue;
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: { board: true }
    });

    console.log(`\n👤 ${email} (${user.id})`);
    console.log(`   Boards: ${memberships.length}`);
    memberships.forEach(m => {
      console.log(`   - ${m.board.name} (${m.role})`);
    });
  }

  await prisma.$disconnect();
}

testUserBoards().catch(console.error);
