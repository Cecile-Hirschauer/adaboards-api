const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function checkMemberships() {
  console.log('\n=== USERS ===');
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  users.forEach(u => console.log(`${u.email} (${u.id})`));

  console.log('\n=== BOARDS ===');
  const boards = await prisma.board.findMany({ select: { id: true, name: true } });
  boards.forEach(b => console.log(`${b.name} (${b.id})`));

  console.log('\n=== MEMBERSHIPS ===');
  const memberships = await prisma.membership.findMany({
    include: {
      user: { select: { email: true } },
      board: { select: { name: true } }
    }
  });
  memberships.forEach(m => {
    console.log(`${m.user.email} -> ${m.board.name} (${m.role})`);
  });

  await prisma.$disconnect();
}

checkMemberships().catch(console.error);
