'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '../constants/message.constant';
import { PAGINATE_DEFAULT } from '@/constants/paginate.constant';
import redis from '@/utils/redis';
import { CACHE_KEY } from '@/constants/redis.constant';

// Tags are static data and should have long-term cache as per DBML
export async function getProductTags({
  page = PAGINATE_DEFAULT.PAGE,
  limit = PAGINATE_DEFAULT.LIMIT,
}: {
  page?: number;
  limit?: number;
}) {
  const cacheKey = CACHE_KEY.PRODUCT_TAGS(page, limit);
  return redis.cached(
    cacheKey,
    async () => {
      try {
        const where = {
          deleted_at: null,
          product_tags: {
            some: {
              products: {
                status: 'active' as const,
                deleted_at: null,
              },
            },
          },
        };
        const tags = await prisma.tags.findMany({
          where,
          select: {
            id: true,
            tag_name: true,
            _count: {
              select: { product_tags: true },
            },
          },
          orderBy: {
            product_tags: {
              _count: 'desc',
            },
          },
          skip: (page - 1) * limit,
          take: limit,
        });

        const total = await prisma.tags.count({ where });

        return response({
          status: 200,
          message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
          data: tags,
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
    '1 hour' // Long-term cache as per DBML strategy for static data
  );
}
