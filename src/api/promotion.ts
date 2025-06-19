'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '../constants/message.constant';
import { PAGINATE_DEFAULT } from '@/constants/paginate.constant';
import redis from '@/utils/redis';
import { CACHE_KEY } from '@/constants/redis.constant';

// Promotions have short-term cache (5-10 minutes) as per DBML
export async function getActivePromotions({
  page = PAGINATE_DEFAULT.PAGE,
  limit = PAGINATE_DEFAULT.LIMIT,
}: {
  page?: number;
  limit?: number;
}) {
  const cacheKey = CACHE_KEY.ACTIVE_PROMOTIONS(page, limit);
  return redis.cached(
    cacheKey,
    async () => {
      try {
        const where = {
          status: 'active' as const,
          start_date: { lte: new Date() },
          end_date: { gte: new Date() },
        };
        const promotions = await prisma.promotions.findMany({
          where,
          orderBy: {
            end_date: 'asc',
          },
          skip: (page - 1) * limit,
          take: limit,
        });

        const total = await prisma.promotions.count({ where });

        return response({
          status: 200,
          message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
          data: promotions,
          paginate: {
            total,
            page,
            limit,
          },
        });
      } catch (error) {
        return response({
          status: 500,
          message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
        });
      }
    },
    '5 minutes' // Short-term cache as per DBML strategy
  );
}
