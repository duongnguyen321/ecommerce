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

export async function adminGetAllReturnRequests(
  token: string,
  {
    page = 1,
    limit = 20,
    status,
  }: { page?: number; limit?: number; status?: any }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'return:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const where: Prisma.return_requestsWhereInput = {};
    if (status) {
      where.status = status;
    }

    const requests = await prisma.return_requests.findMany({
      where,
      include: {
        orders: { select: { code: true } },
        employees: { select: { full_name: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.return_requests.count({ where });

    return response({
      status: 200,
      data: requests,
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

export async function adminGetReturnRequestDetails(
  token: string,
  requestId: string
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'return:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const request = await prisma.return_requests.findUnique({
      where: { id: requestId },
      include: {
        return_request_items: {
          include: {
            order_items: true,
          },
        },
        orders: true,
        employees: true,
        refund_transactions: true,
      },
    });

    return response({
      status: 200,
      data: request,
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

export async function adminUpdateReturnRequestStatus(
  token: string,
  requestId: string,
  status: any
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'return:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const updatedRequest = await prisma.return_requests.update({
      where: { id: requestId },
      data: {
        status,
        processed_by_employee_id: admin.id,
      },
    });

    // Potential side-effects: if status is 'completed', trigger refund, restock inventory etc.
    // This logic can be added here.

    return response({
      status: 200,
      data: updatedRequest,
      message: 'Return request status updated.',
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
