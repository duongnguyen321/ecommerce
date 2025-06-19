'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '../constants/message.constant';
import { verifyToken } from './auth';
import { PAGINATE_DEFAULT } from '@/constants/paginate.constant';
import redis from '@/utils/redis';
import { CACHE_KEY } from '@/constants/redis.constant';

// Loyalty point history is NOT cached (append-only log table), but user profile and tier info are cached
export async function getMyLoyaltyInfo(
  token: string,
  {
    page = PAGINATE_DEFAULT.PAGE,
    limit = PAGINATE_DEFAULT.LIMIT,
  }: { page?: number; limit?: number }
) {
  try {
    const user = await verifyToken(token);

    if (!user || !user.user_profiles) {
      throw new Error(MESSAGE_ERROR.USER_NOT_FOUND);
    }

    // --- Fetch non-cacheable data (point history - append-only log table) ---
    const where = { user_id: user.id };
    const [pointsHistory, total] = await Promise.all([
      prisma.loyalty_point_history.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.loyalty_point_history.count({ where }),
    ]);

    // --- Fetch and cache user profile and tier info (long-term cache 1 hour) ---
    const cacheKey = CACHE_KEY.LOYALTY_INFO_BY_USER(user.id);
    const profileData = await redis.cached(
      cacheKey,
      async () => {
        const profile = user.user_profiles!;
        const tier = profile.membership_tier_id
          ? await prisma.membership_tiers.findUnique({
              where: { id: profile.membership_tier_id },
            })
          : null;
        return {
          currentPoints: profile.loyalty_points,
          membershipTier: tier,
        };
      },
      '1 hour' // Long-term cache as per DBML strategy
    );

    return response({
      status: 200,
      data: {
        ...profileData,
        history: pointsHistory, // Point history is not cached as per DBML
      },
      paginate: {
        total,
        page,
        limit,
      },
      message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
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
