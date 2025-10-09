import { PrismaClient } from '../../generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

export const createTestUser = async (overrides: {
  email?: string;
  name?: string;
  password?: string;
} = {}) => {
  const hashedPassword = await bcrypt.hash(overrides.password || 'Password123!', 10);

  return prisma.user.create({
    data: {
      email: overrides.email || `test-${Date.now()}@example.com`,
      name: overrides.name || 'Test User',
      password: hashedPassword
    }
  });
};

export const createTestBoard = async (userId: string, overrides: { name?: string } = {}) => {
  const board = await prisma.board.create({
    data: {
      name: overrides.name || `Test Board ${Date.now()}`
    }
  });

  await prisma.membership.create({
    data: {
      userId,
      boardId: board.id,
      role: 'OWNER'
    }
  });

  return board;
};

export const createTestTask = async (
  boardId: string,
  createdBy: string,
  overrides: {
    title?: string;
    description?: string;
    status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
    assignedTo?: string;
  } = {}
) => {
  return prisma.task.create({
    data: {
      title: overrides.title || `Test Task ${Date.now()}`,
      description: overrides.description || 'Test description',
      status: overrides.status || 'TODO',
      boardId,
      createdBy,
      assignedTo: overrides.assignedTo
    }
  });
};

export { prisma };
