'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '../constants/message.constant';
import { verifyToken } from './auth';
import { product_reviews } from '@prisma/client';
import { PAGINATE_DEFAULT } from '@/constants/paginate.constant';
import redis from '@/utils/redis';
import { CACHE_KEY } from '@/constants/redis.constant';

export async function addProductReview(
  token: string,
  data: Omit<product_reviews, 'id' | 'user_id' | 'status' | 'created_at'>
) {
  try {
    const user = await verifyToken(token);

    // Check if user has purchased the product
    const orderItem = await prisma.order_items.findFirst({
      where: {
        order_id: data.order_id,
        orders: {
          user_id: user.id,
          order_statuses: {
            status_name: 'Completed', // or whatever status signifies a completed order
          },
        },
      },
    });

    if (!orderItem) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const newReview = await prisma.product_reviews.create({
      data: {
        ...data,
        user_id: user.id,
        status: 'pending_approval',
      },
    });

    // Invalidate cache for this product's reviews
    await redis.delPattern(`reviews:product:${data.product_id}:*`);

    return response({
      status: 201,
      data: newReview,
      message: MESSAGE_SUCCESS.UPDATE_DATA_SUCCESS,
    });
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

export async function getReviewsByProduct(
  productId: string,
  {
    page = PAGINATE_DEFAULT.PAGE,
    limit = PAGINATE_DEFAULT.LIMIT,
  }: { page?: number; limit?: number }
) {
  const cacheKey = CACHE_KEY.REVIEWS_BY_PRODUCT(productId, page, limit);
  return redis.cached(
    cacheKey,
    async () => {
      try {
        const where = {
          product_id: productId,
          status: 'approved' as const,
        };
        const reviews = await prisma.product_reviews.findMany({
          where,
          include: {
            users: {
              select: {
                user_profiles: {
                  select: {
                    full_name: true,
                    avatar_url: true,
                  },
                },
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        });

        const total = await prisma.product_reviews.count({ where });

        return response({
          status: 200,
          message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
          data: reviews,
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
    '20 minutes'
  );
}
