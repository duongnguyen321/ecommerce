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

export async function adminGetAllCustomerGroups(token: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'customer_group:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const groups = await prisma.customer_groups.findMany({
      include: {
        _count: {
          select: { customer_group_members: true },
        },
      },
      orderBy: { group_name: 'asc' },
    });

    return response({
      status: 200,
      data: groups,
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

export async function adminCreateCustomerGroup(
  token: string,
  data: Prisma.customer_groupsCreateInput
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'customer_group:create')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const newGroup = await prisma.customer_groups.create({ data });

    return response({
      status: 201,
      data: newGroup,
      message: 'Customer group created successfully.',
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

export async function adminAddUserToGroup(
  token: string,
  { groupId, userId }: { groupId: string; userId: string }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'customer_group:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    await prisma.customer_group_members.create({
      data: {
        customer_group_id: groupId,
        user_id: userId,
      },
    });

    return response({
      status: 200,
      message: 'User added to group successfully.',
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

export async function adminRemoveUserFromGroup(
  token: string,
  { groupId, userId }: { groupId: string; userId: string }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'customer_group:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    await prisma.customer_group_members.delete({
      where: {
        customer_group_id_user_id: {
          customer_group_id: groupId,
          user_id: userId,
        },
      },
    });

    return response({
      status: 200,
      message: 'User removed from group successfully.',
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
