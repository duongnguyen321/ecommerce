'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '../constants/message.constant';
import { verifyToken } from './auth';
import redis from '@/utils/redis';
import { CACHE_KEY } from '@/constants/redis.constant';

// Vouchers have short-term cache (1-5 minutes) as per DBML to quickly reflect changes in quantity
export async function validateVoucher(token: string, code: string) {
  try {
    await verifyToken(token);

    const cacheKey = CACHE_KEY.VOUCHER_BY_CODE(code);
    return redis.cached(
      cacheKey,
      async () => {
        const voucher = await prisma.vouchers.findFirst({
          where: {
            code: code,
            status: 'active',
            start_date: { lte: new Date() },
            end_date: { gte: new Date() },
            used_quantity: { lt: prisma.vouchers.fields.initial_quantity },
          },
        });

        if (!voucher) {
          return response({
            status: 404,
            message: 'Invalid or expired voucher code.',
          });
        }

        // Additional checks can be added here, e.g., if the voucher is applicable to the user's cart

        return response({
          status: 200,
          data: voucher,
          message: 'Voucher is valid.',
        });
      },
      '2 minutes' // Short-term cache as per DBML strategy
    );
  } catch (error) {
    if (error instanceof Error) {
      return response({ status: 401, message: error.message });
    }
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}
