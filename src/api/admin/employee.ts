'use server';

import { prisma } from '../../utils/prisma';
import response from '../../utils/response';
import {
  MESSAGE_ERROR,
  MESSAGE_SUCCESS,
} from '../../constants/message.constant';
import { verifyEmployeeToken } from './auth';
import { _hashPassword } from '../auth';
import { hasPermission } from './permission';

export async function adminGetAllEmployees(token: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'employee:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const employees = await prisma.employees.findMany({
      select: {
        id: true,
        full_name: true,
        email: true,
        status: true,
        store_id: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return response({
      status: 200,
      data: employees,
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

export async function adminCreateEmployee(
  token: string,
  data: {
    email: string;
    fullName: string;
    password: string;
    storeId?: string;
    roleIds: string[];
  }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'employee:create')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const hashedPassword = await _hashPassword(data.password);
    const newEmployee = await prisma.employees.create({
      data: {
        email: data.email,
        full_name: data.fullName,
        password_hash: hashedPassword,
        store_id: data.storeId,
        employee_roles: {
          create: data.roleIds.map((roleId) => ({ role_id: roleId })),
        },
      },
    });

    return response({
      status: 201,
      data: newEmployee,
      message: 'Employee created successfully',
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

export async function adminUpdateEmployee(
  token: string,
  employeeId: string,
  data: {
    fullName?: string;
    status?: 'active' | 'terminated';
    storeId?: string;
    roleIds?: string[];
  }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'employee:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    await prisma.$transaction(async (tx) => {
      // Update basic details
      await tx.employees.update({
        where: { id: employeeId },
        data: {
          full_name: data.fullName,
          status: data.status,
          store_id: data.storeId,
        },
      });
      // Update roles if provided
      if (data.roleIds) {
        await tx.employee_roles.deleteMany({
          where: { employee_id: employeeId },
        });
        await tx.employee_roles.createMany({
          data: data.roleIds.map((roleId) => ({
            employee_id: employeeId,
            role_id: roleId,
          })),
        });
      }
    });

    return response({
      status: 200,
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
