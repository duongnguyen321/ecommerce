import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { Transporter } from 'nodemailer';

declare global {
  var redisClient: RedisClientType | undefined;
  var prismaClient: PrismaClient | undefined;
  var transporter: Transporter | undefined;
}
