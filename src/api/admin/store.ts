'use server';

import { prisma } from '../../utils/prisma';
import response from '../../utils/response';
import {
  MESSAGE_ERROR,
  MESSAGE_SUCCESS,
} from '../../constants/message.constant';
import { verifyEmployeeToken } from './auth';
import { hasPermission } from './permission';
import { stores, suppliers } from '@prisma/client';

// ====== Store Management ======

export async function adminGetAllStores(token: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'store:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }
    const stores = await prisma.stores.findMany();
    return response({ status: 200, data: stores });
  } catch (error) {
    if (error instanceof Error)
      return response({ status: 401, message: error.message });
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}

export async function adminCreateStore(
  token: string,
  data: Omit<stores, 'id'>
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'store:create')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }
    const newStore = await prisma.stores.create({ data });
    return response({
      status: 201,
      data: newStore,
      message: 'Store created successfully.',
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

// ====== Supplier Management ======

export async function adminGetAllSuppliers(token: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'supplier:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }
    const suppliers = await prisma.suppliers.findMany();
    return response({ status: 200, data: suppliers });
  } catch (error) {
    if (error instanceof Error)
      return response({ status: 401, message: error.message });
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}

export async function adminCreateSupplier(
  token: string,
  data: Omit<suppliers, 'id'>
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'supplier:create')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }
    const newSupplier = await prisma.suppliers.create({ data });
    return response({
      status: 201,
      data: newSupplier,
      message: 'Supplier created successfully.',
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
