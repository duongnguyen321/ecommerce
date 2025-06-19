import { PrismaClient } from '@prisma/client';

export const prisma = ((): PrismaClient => {
  if (global.prismaClient) return global.prismaClient;
  const prismaClient = new PrismaClient();
  global.prismaClient = prismaClient;
  return prismaClient;
})();

// Add TypeScript global declaration
declare global {
  var prismaClient: PrismaClient | undefined;
}
