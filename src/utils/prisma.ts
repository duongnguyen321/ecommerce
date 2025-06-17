import {PrismaClient} from '@prisma/client';

export const prisma = ((): PrismaClient => {
	if (global.prismaClient) return global.prismaClient
	const prismaClient = new PrismaClient()
	global.prismaClient = prismaClient
	return prismaClient
})()

