'use server';

import { isEmail, isUUID } from '@/helpers/validate';
import { prisma } from '@/utils/prisma';

export async function getProfileByEmail(email: string) {
  return await prisma.users.findUnique({
    where: {
      email,
    },
  });
}
export async function getProfileById(id: string) {
  return await prisma.users.findUnique({
    where: {
      id,
    },
  });
}

export async function getProfile(idOrEmail: string) {
  if (isEmail(idOrEmail)) {
    return await getProfileByEmail(idOrEmail);
  }
  if (isUUID(idOrEmail)) {
    return await getProfileById(idOrEmail);
  }
  throw new Error('Invalid ID or Email');
}
