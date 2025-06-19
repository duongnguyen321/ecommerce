'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '../constants/message.constant';
import { verifyToken } from './auth';
import { user_addresses } from '@prisma/client';
import redis from '@/utils/redis';
import { CACHE_KEY } from '@/constants/redis.constant';

export async function getMyAddresses(token: string) {
  try {
    const user = await verifyToken(token);
    const cacheKey = CACHE_KEY.ADDRESS_BY_USER(user.id);
    return redis.cached(
      cacheKey,
      async () => {
        const addresses = await prisma.user_addresses.findMany({
          where: { user_id: user.id },
          orderBy: { is_default: 'desc' },
        });
        return response({
          status: 200,
          data: addresses,
          message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
        });
      },
      '30 minutes'
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

export async function addAddress(
  token: string,
  data: Omit<user_addresses, 'id' | 'user_id' | 'is_default'> & {
    is_default?: boolean;
  }
) {
  try {
    const user = await verifyToken(token);
    await redis.del(CACHE_KEY.ADDRESS_BY_USER(user.id));

    if (data.is_default) {
      await prisma.user_addresses.updateMany({
        where: { user_id: user.id },
        data: { is_default: false },
      });
    }

    const newAddress = await prisma.user_addresses.create({
      data: {
        ...data,
        user_id: user.id,
      },
    });

    return response({
      status: 201,
      data: newAddress,
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

export async function updateAddress(
  token: string,
  addressId: string,
  data: Partial<Omit<user_addresses, 'id' | 'user_id'>>
) {
  try {
    const user = await verifyToken(token);
    await redis.del(CACHE_KEY.ADDRESS_BY_USER(user.id));

    if (data.is_default) {
      await prisma.user_addresses.updateMany({
        where: { user_id: user.id, NOT: { id: addressId } },
        data: { is_default: false },
      });
    }

    const updatedAddress = await prisma.user_addresses.update({
      where: { id: addressId, user_id: user.id },
      data,
    });

    return response({
      status: 200,
      data: updatedAddress,
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

export async function deleteAddress(token: string, addressId: string) {
  try {
    const user = await verifyToken(token);
    await redis.del(CACHE_KEY.ADDRESS_BY_USER(user.id));
    await prisma.user_addresses.deleteMany({
      where: { id: addressId, user_id: user.id },
    });
    return response({
      status: 200,
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

export async function setDefaultAddress(token: string, addressId: string) {
  try {
    const user = await verifyToken(token);
    await redis.del(CACHE_KEY.ADDRESS_BY_USER(user.id));

    await prisma.$transaction([
      prisma.user_addresses.updateMany({
        where: { user_id: user.id },
        data: { is_default: false },
      }),
      prisma.user_addresses.update({
        where: { id: addressId, user_id: user.id },
        data: { is_default: true },
      }),
    ]);

    return response({
      status: 200,
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
