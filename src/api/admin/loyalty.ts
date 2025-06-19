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

export async function adminGetAllMembershipTiers(token: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'loyalty:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const tiers = await prisma.membership_tiers.findMany({
      orderBy: { points_threshold: 'asc' },
    });

    return response({
      status: 200,
      data: tiers,
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

export async function adminCreateMembershipTier(
  token: string,
  data: Prisma.membership_tiersCreateInput
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'loyalty:create')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const newTier = await prisma.membership_tiers.create({ data });

    return response({
      status: 201,
      data: newTier,
      message: 'Membership tier created successfully.',
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

export async function adminUpdateMembershipTier(
  token: string,
  tierId: string,
  data: Prisma.membership_tiersUpdateInput
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'loyalty:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const updatedTier = await prisma.membership_tiers.update({
      where: { id: tierId },
      data,
    });

    return response({
      status: 200,
      data: updatedTier,
      message: MESSAGE_SUCCESS.UPDATE_DATA_SUCCESS,
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

export async function adminDeleteMembershipTier(token: string, tierId: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'loyalty:delete')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    await prisma.membership_tiers.delete({ where: { id: tierId } });

    return response({
      status: 200,
      message: 'Membership tier deleted successfully.',
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
