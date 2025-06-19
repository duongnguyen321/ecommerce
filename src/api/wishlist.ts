'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '../constants/message.constant';
import { verifyToken } from './auth';
import { PAGINATE_DEFAULT } from '@/constants/paginate.constant';
import redis from '@/utils/redis';
import { CACHE_KEY } from '@/constants/redis.constant';

// Wishlist has session-based cache as per DBML - cache during user's session
export async function getMyWishlist(
  token: string,
  {
    page = PAGINATE_DEFAULT.PAGE,
    limit = PAGINATE_DEFAULT.LIMIT,
  }: { page?: number; limit?: number }
) {
  try {
    const user = await verifyToken(token);
    const cacheKey = CACHE_KEY.WISHLIST_BY_USER(user.id);

    return redis.cached(
      cacheKey,
      async () => {
        const where = { user_id: user.id };
        const wishlist = await prisma.wishlists.findMany({
          where,
          include: {
            products: {
              include: {
                images: { take: 1 },
                product_variants: {
                  where: { status: 'active', deleted_at: null },
                  take: 1,
                },
              },
            },
          },
          orderBy: { added_at: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        });

        const total = await prisma.wishlists.count({ where });

        return response({
          status: 200,
          message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
          data: wishlist,
          paginate: {
            total,
            page,
            limit,
          },
        });
      },
      '15 minutes' // Session-based cache as per DBML strategy
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

// Wishlist operations should invalidate cache when items are added/removed
export async function toggleWishlistItem(token: string, productId: string) {
  try {
    const user = await verifyToken(token);

    // Invalidate wishlist cache when items are added/removed
    await redis.del(CACHE_KEY.WISHLIST_BY_USER(user.id));

    const existingItem = await prisma.wishlists.findUnique({
      where: {
        user_id_product_id: { user_id: user.id, product_id: productId },
      },
    });

    if (existingItem) {
      await prisma.wishlists.delete({
        where: {
          user_id_product_id: { user_id: user.id, product_id: productId },
        },
      });
      return response({
        status: 200,
        message: MESSAGE_SUCCESS.REMOVE_FROM_CART_SUCCESS,
      });
    } else {
      const newItem = await prisma.wishlists.create({
        data: {
          user_id: user.id,
          product_id: productId,
        },
      });
      return response({
        status: 201,
        data: newItem,
        message: MESSAGE_SUCCESS.ADD_TO_CART_SUCCESS,
      });
    }
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
