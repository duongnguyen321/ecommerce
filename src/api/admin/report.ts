'use server';

import { prisma } from '../../utils/prisma';
import response from '../../utils/response';
import {
  MESSAGE_ERROR,
  MESSAGE_SUCCESS,
} from '../../constants/message.constant';
import { verifyEmployeeToken } from './auth';
import { hasPermission } from './permission';

export async function adminGetSalesReport(
  token: string,
  {
    storeId,
    startDate,
    endDate,
  }: { storeId?: string; startDate: string; endDate: string }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'report:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const reports = await prisma.daily_sales_reports.findMany({
      where: {
        store_id: storeId,
        report_date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: {
        report_date: 'asc',
      },
    });

    return response({
      status: 200,
      data: reports,
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
