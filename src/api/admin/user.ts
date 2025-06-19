'use server';

import { prisma } from '../../utils/prisma';
import response from '../../utils/response';
import {
  MESSAGE_ERROR,
  MESSAGE_SUCCESS,
} from '../../constants/message.constant';
import { verifyEmployeeToken } from './auth';
import { hasPermission } from './permission';
import { Prisma } from '@prisma/client';

export async function adminGetAllUsers(
  token: string,
  {
    page = 1,
    limit = 20,
    search,
  }: { page?: number; limit?: number; search?: string }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'user:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const where: Prisma.usersWhereInput = {
      deleted_at: null, // Only fetch active users
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        {
          user_profiles: {
            full_name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const users = await prisma.users.findMany({
      where,
      select: {
        id: true,
        email: true,
        created_at: true,
        user_profiles: {
          select: { full_name: true, phone_number: true, loyalty_points: true },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.users.count({ where });

    return response({
      status: 200,
      data: users,
      message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
      paginate: {
        total,
        page,
        limit,
      },
    });
  } catch (error) {
    if (error instanceof Error)
      return response({ status: 401, message: error.message });
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}

export async function adminGetUserDetail(token: string, userId: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'user:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
        user_addresses: true,
        orders: { take: 10, orderBy: { created_at: 'desc' } },
      },
    });

    if (!user) {
      return response({ status: 404, message: MESSAGE_ERROR.USER_NOT_FOUND });
    }

    const { password_hash, ...userData } = user;
    return response({
      status: 200,
      data: userData,
      message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
    });
  } catch (error) {
    if (error instanceof Error)
      return response({ status: 401, message: error.message });
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}

export async function adminDeactivateUser(token: string, userId: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'user:delete')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    await prisma.users.update({
      where: { id: userId },
      data: { deleted_at: new Date() },
    });

    return response({
      status: 200,
      message: 'User account has been deactivated.',
    });
  } catch (error) {
    if (error instanceof Error)
      return response({ status: 500, message: error.message });
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}
