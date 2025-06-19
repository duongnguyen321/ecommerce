'use server';

import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '@/constants/message.constant';
import { isEmail, isUUID } from '@/helpers/validate';
import { prisma } from '@/utils/prisma';
import response from '@/utils/response';
import {
  cart_items,
  customer_group_members,
  loyalty_point_history,
  orders,
  post_comments,
  product_reviews,
  product_view_history,
  support_tickets,
  user_addresses,
  user_profiles,
  users,
  wishlists,
} from '@prisma/client';
import { verifyToken } from './auth';
import { verifyEmployeeToken } from './admin/auth';
import { hasPermission } from './admin/permission';
import redis from '@/utils/redis';
import { CACHE_KEY } from '@/constants/redis.constant';

const selectUser = {
  id: true,
  email: true,
  created_at: true,
  user_addresses: true,
  cart_items: true,
  customer_group_members: true,
  loyalty_point_history: true,
  orders: true,
  post_comments: true,
  product_reviews: true,
  product_view_history: true,
  support_tickets: true,
  user_profiles: true,
  wishlists: true,
};
export type User = users & {
  user_addresses: user_addresses;
  cart_items: cart_items;
  customer_group_members: customer_group_members;
  loyalty_point_history: loyalty_point_history;
  orders: orders;
  post_comments: post_comments;
  product_reviews: product_reviews;
  product_view_history: product_view_history;
  support_tickets: support_tickets;
  user_profiles: user_profiles;
  wishlists: wishlists;
};
export async function getProfileByEmail(token: string, email: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'user:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const user = await prisma.users.findUnique({
      where: {
        email,
      },
      select: selectUser,
    });
    if (!user) {
      throw new Error(MESSAGE_ERROR.USER_NOT_FOUND);
    }
    return response<User>({
      status: 200,
      data: user,
      message: MESSAGE_SUCCESS.GET_USER_SUCCESS,
    });
  } catch (error) {
    if (error instanceof Error) {
      return response({ status: 500, message: error.message });
    }
    throw new Error(MESSAGE_ERROR.SOME_THING_WENT_WRONG);
  }
}

export const getUserByEmail = getProfileByEmail;

export async function getProfileById(token: string, id: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'user:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const user = await prisma.users.findUnique({
      where: {
        id,
      },
      select: selectUser,
    });
    if (!user) {
      throw new Error(MESSAGE_ERROR.USER_NOT_FOUND);
    }
    return response<User>({
      status: 200,
      data: user,
      message: MESSAGE_SUCCESS.GET_USER_SUCCESS,
    });
  } catch (error) {
    if (error instanceof Error) {
      return response({ status: 500, message: error.message });
    }
    throw new Error(MESSAGE_ERROR.SOME_THING_WENT_WRONG);
  }
}

export const getUserById = getProfileById;

export async function getProfile(token: string, idOrEmail: string) {
  try {
    if (isEmail(idOrEmail)) {
      return await getProfileByEmail(token, idOrEmail);
    }
    if (isUUID(idOrEmail)) {
      return await getProfileById(token, idOrEmail);
    }
    throw new Error(MESSAGE_ERROR.USER_NOT_FOUND);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(MESSAGE_ERROR.SOME_THING_WENT_WRONG);
  }
}

export const getUser = getProfile;

export async function getMyProfile(token: string) {
  try {
    const user = await verifyToken(token);
    // Note: verifyToken already caches the user data, so we can return it directly
    return response({
      status: 200,
      data: user,
      message: MESSAGE_SUCCESS.GET_USER_SUCCESS,
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

export async function updateMyProfile(
  token: string,
  data: Partial<Omit<user_profiles, 'id' | 'user_id'>>
) {
  try {
    const user = await verifyToken(token);

    // Invalidate user-related caches
    await redis.delPattern(CACHE_KEY.USER_PATTERN(user.id));
    await redis.del(CACHE_KEY.USER_BY_TOKEN(token));
    await redis.del(CACHE_KEY.LOYALTY_INFO_BY_USER(user.id));

    const updatedProfile = await prisma.user_profiles.update({
      where: { user_id: user.id },
      data: data,
    });

    return response({
      status: 200,
      data: updatedProfile,
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
