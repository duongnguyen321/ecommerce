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

// ====== Attribute Management ======

export async function adminGetAllAttributes(token: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'attribute:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const attributes = await prisma.attributes.findMany({
      include: {
        attribute_values: true,
      },
      orderBy: {
        attribute_name: 'asc',
      },
    });

    return response({
      status: 200,
      data: attributes,
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

export async function adminCreateAttribute(
  token: string,
  data: Prisma.attributesCreateInput
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'attribute:create')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const newAttribute = await prisma.attributes.create({ data });

    return response({
      status: 201,
      data: newAttribute,
      message: 'Attribute created successfully.',
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

export async function adminAddAttributeValue(
  token: string,
  attributeId: string,
  value: string
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'attribute:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const newValue = await prisma.attribute_values.create({
      data: {
        attribute_id: attributeId,
        value: value,
      },
    });

    return response({
      status: 201,
      data: newValue,
      message: 'Attribute value added successfully.',
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

export async function adminDeleteAttributeValue(
  token: string,
  attributeValueId: string
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'attribute:delete')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    await prisma.attribute_values.delete({ where: { id: attributeValueId } });

    return response({
      status: 200,
      message: 'Attribute value deleted successfully.',
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
