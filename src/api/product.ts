'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '../constants/message.constant';
import { PAGINATE_DEFAULT } from '@/constants/paginate.constant';
import redis from '@/utils/redis';
import { CACHE_KEY } from '@/constants/redis.constant';

export async function getProducts({
  page = PAGINATE_DEFAULT.PAGE,
  limit = PAGINATE_DEFAULT.LIMIT,
  sortBy = 'created_at',
  sortOrder = 'desc',
  category,
}: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  category?: string;
}) {
  const cacheKey = CACHE_KEY.PRODUCTS(page, limit, sortBy, sortOrder, category);
  return redis.cached(
    cacheKey,
    async () => {
      try {
        const where: any = {
          status: 'active',
          deleted_at: null,
        };

        if (category) {
          where.product_tags = {
            some: {
              tags: {
                tag_name: category,
              },
            },
          };
        }

        const products = await prisma.products.findMany({
          where,
          include: {
            images: true,
            product_variants: {
              where: {
                status: 'active',
                deleted_at: null,
              },
            },
            product_tags: {
              include: {
                tags: true,
              },
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip: (page - 1) * limit,
          take: limit,
        });

        const total = await prisma.products.count({ where });

        return response({
          status: 200,
          message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
          data: products,
          paginate: {
            total,
            page,
            limit,
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          return response({ status: 500, message: error.message });
        }
        return response({
          status: 500,
          message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
        });
      }
    },
    '10 minutes'
  );
}

export async function getProductById(id: string) {
  const cacheKey = CACHE_KEY.PRODUCT_BY_ID(id);
  return redis.cached(
    cacheKey,
    async () => {
      try {
        const product = await prisma.products.findUnique({
          where: { id, status: 'active', deleted_at: null },
          include: {
            images: true,
            product_variants: {
              where: { status: 'active', deleted_at: null },
              include: {
                variant_attribute_values: {
                  include: {
                    attribute_values: {
                      include: {
                        attributes: true,
                      },
                    },
                  },
                },
              },
            },
            product_reviews: {
              where: { status: 'approved' },
              include: {
                users: {
                  select: {
                    user_profiles: {
                      select: { full_name: true, avatar_url: true },
                    },
                  },
                },
              },
            },
            product_tags: { include: { tags: true } },
          },
        });

        if (!product) {
          return response({
            status: 404,
            message: MESSAGE_ERROR.PRODUCT_NOT_FOUND,
          });
        }

        return response({
          status: 200,
          data: product,
          message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
        });
      } catch (error) {
        if (error instanceof Error) {
          return response({ status: 500, message: error.message });
        }
        return response({
          status: 500,
          message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
        });
      }
    },
    '10 minutes'
  );
}
