'use server';

import { prisma } from '../../utils/prisma';
import response from '../../utils/response';
import {
  MESSAGE_ERROR,
  MESSAGE_SUCCESS,
} from '../../constants/message.constant';
import { verifyEmployeeToken } from './auth';

// Helper function to check for required permissions
export function hasPermission(
  admin: { is_super_admin: boolean; permissions: string[] },
  permission: string
) {
  return admin.is_super_admin || admin.permissions.includes(permission);
}

export async function adminGetAllRoles(token: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'role:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const roles = await prisma.roles.findMany({
      include: { _count: { select: { employee_roles: true } } },
    });
    return response({
      status: 200,
      data: roles,
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

export async function adminGetAllPermissions(token: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'permission:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const permissions = await prisma.permissions.findMany({
      orderBy: { permission_group: 'asc' },
    });
    // Group permissions for easier use on the frontend
    const groupedPermissions = permissions.reduce((acc, perm) => {
      const group = perm.permission_group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return response({
      status: 200,
      data: groupedPermissions,
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

export async function adminUpdateRolePermissions(
  token: string,
  roleId: string,
  permissionIds: string[]
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'role:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    await prisma.$transaction([
      // Remove existing permissions for the role
      prisma.role_permissions.deleteMany({ where: { role_id: roleId } }),
      // Add the new set of permissions
      prisma.role_permissions.createMany({
        data: permissionIds.map((pid) => ({
          role_id: roleId,
          permission_id: pid,
        })),
      }),
    ]);

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
