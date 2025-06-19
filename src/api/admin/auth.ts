'use server';

import { prisma } from '../../utils/prisma';
import response from '../../utils/response';
import {
  MESSAGE_ERROR,
  MESSAGE_SUCCESS,
} from '../../constants/message.constant';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { employees } from '@prisma/client';

const ADMIN_SECRET = process.env.SECRET_ADMIN || 'your-default-admin-secret';

async function _generateEmployeeToken(employee: employees) {
  const token = jwt.sign(
    {
      id: employee.id,
      email: employee.email,
      isSuperAdmin: employee.is_super_admin,
    },
    ADMIN_SECRET,
    { expiresIn: '8h' }
  );
  return token;
}

export async function adminLogin({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    const employee = await prisma.employees.findUnique({ where: { email } });

    if (!employee) {
      return response({ status: 404, message: MESSAGE_ERROR.USER_NOT_FOUND });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      employee.password_hash
    );
    if (!isPasswordValid) {
      return response({ status: 401, message: MESSAGE_ERROR.LOGIN_FAIL });
    }

    const token = await _generateEmployeeToken(employee);
    const { password_hash, ...employeeData } = employee;

    return response({
      status: 200,
      data: { token, employee: employeeData },
      message: MESSAGE_SUCCESS.LOGIN_SUCCESS,
    });
  } catch (error) {
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}

export async function verifyEmployeeToken(token: string | undefined) {
  if (!token) {
    throw new Error(MESSAGE_ERROR.UNAUTHORIZED);
  }

  try {
    const decoded = jwt.verify(token, ADMIN_SECRET) as jwt.JwtPayload & {
      id: string;
      isSuperAdmin: boolean;
    };

    const employee = await prisma.employees.findUnique({
      where: { id: decoded.id },
      include: {
        employee_roles: {
          include: {
            roles: {
              include: {
                role_permissions: {
                  include: {
                    permissions: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new Error(MESSAGE_ERROR.UNAUTHORIZED);
    }

    // Structure permissions for easy lookup
    const permissions = new Set<string>();
    if (employee.employee_roles) {
      employee.employee_roles.forEach((roleInfo) => {
        roleInfo.roles.role_permissions.forEach((permInfo) => {
          permissions.add(permInfo.permissions.permission_name);
        });
      });
    }

    return { ...employee, permissions: Array.from(permissions) };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(MESSAGE_ERROR.INVALID_TOKEN);
    }
    throw new Error(MESSAGE_ERROR.UNAUTHORIZED);
  }
}
