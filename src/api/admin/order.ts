'use server';

import { prisma } from '../../utils/prisma';
import response from '../../utils/response';
import {
  MESSAGE_ERROR,
  MESSAGE_SUCCESS,
} from '../../constants/message.constant';
import { verifyEmployeeToken } from './auth';
import { hasPermission } from './permission';

export async function adminGetAllOrders(
  token: string,
  {
    page = 1,
    limit = 20,
    statusId,
    storeId,
  }: { page?: number; limit?: number; statusId?: string; storeId?: string }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'order:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const where: any = {};
    if (statusId) where.order_status_id = statusId;
    if (storeId) where.store_id = storeId;

    const orders = await prisma.orders.findMany({
      where,
      include: { order_statuses: true, payment_statuses: true },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.orders.count({ where });

    return response({
      status: 200,
      data: orders,
      message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
      paginate: {
        total,
        page,
        limit,
      },
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

export async function adminUpdateOrderStatus(
  token: string,
  orderId: string,
  {
    orderStatusId,
    paymentStatusId,
  }: { orderStatusId?: string; paymentStatusId?: string }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'order:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const dataToUpdate: any = {};
    if (orderStatusId) dataToUpdate.order_status_id = orderStatusId;
    if (paymentStatusId) dataToUpdate.payment_status_id = paymentStatusId;

    if (Object.keys(dataToUpdate).length === 0) {
      return response({
        status: 400,
        message: 'No status provided to update.',
      });
    }

    const updatedOrder = await prisma.orders.update({
      where: { id: orderId },
      data: dataToUpdate,
    });

    // Here you might trigger side effects, like sending a notification email to the user.

    return response({
      status: 200,
      data: updatedOrder,
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
