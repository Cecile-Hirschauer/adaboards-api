import { PrismaClient } from '../../generated/prisma';
import { beforeAll, afterAll } from 'vitest';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

// Nettoyer avant tous les tests
beforeAll(async () => {
  // Supprimer toutes les données existantes
  await prisma.task.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.board.deleteMany();
  await prisma.user.deleteMany();
});

// Fermer la connexion après tous les tests
afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
