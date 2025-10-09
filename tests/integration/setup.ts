import { PrismaClient } from '../../generated/prisma';
import { beforeAll, afterAll, beforeEach } from 'vitest';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

// Nettoyer et préparer la base de données avant tous les tests
beforeAll(async () => {
  // Supprimer toutes les données existantes
  await prisma.task.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.board.deleteMany();
  await prisma.user.deleteMany();
});

// Nettoyer après chaque test pour garantir l'isolation
beforeEach(async () => {
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
