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

export async function adminGetAllTags(
  token: string,
  {
    page = 1,
    limit = 20,
    search,
  }: { page?: number; limit?: number; search?: string }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'tag:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const where: Prisma.tagsWhereInput = {
      deleted_at: null,
    };

    if (search) {
      where.tag_name = { contains: search, mode: 'insensitive' };
    }

    const tags = await prisma.tags.findMany({
      where,
      orderBy: { tag_name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.tags.count({ where });

    return response({
      status: 200,
      data: tags,
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

export async function adminCreateTag(
  token: string,
  data: Prisma.tagsCreateInput
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'tag:create')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const newTag = await prisma.tags.create({ data });

    return response({
      status: 201,
      data: newTag,
      message: 'Tag created successfully.',
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

export async function adminUpdateTag(
  token: string,
  tagId: string,
  data: Prisma.tagsUpdateInput
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'tag:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const updatedTag = await prisma.tags.update({
      where: { id: tagId },
      data,
    });

    return response({
      status: 200,
      data: updatedTag,
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

export async function adminDeleteTag(token: string, tagId: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'tag:delete')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    // Soft delete
    await prisma.tags.update({
      where: { id: tagId },
      data: { deleted_at: new Date() },
    });

    return response({
      status: 200,
      message: 'Tag deleted successfully.',
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
