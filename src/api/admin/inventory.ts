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

export async function adminGetInventory(
  token: string,
  {
    storeId,
    page = 1,
    limit = 50,
  }: { storeId: string; page?: number; limit?: number }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'inventory:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const inventory = await prisma.inventory.findMany({
      where: { store_id: storeId },
      include: { product_variants: { include: { products: true } } },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.inventory.count({
      where: { store_id: storeId },
    });

    return response({
      status: 200,
      data: inventory,
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

type GoodsReceiptItemData = {
  variant_id: string;
  quantity: number;
  unit_cost: number;
};

export async function adminCreateGoodsReceipt(
  token: string,
  {
    supplierId,
    storeId,
    notes,
    items,
  }: {
    supplierId: string;
    storeId: string;
    notes?: string;
    items: GoodsReceiptItemData[];
  }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'inventory:create')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const totalAmount = items.reduce(
      (acc, item) => acc + item.quantity * item.unit_cost,
      0
    );

    const newReceipt = await prisma.$transaction(async (tx) => {
      // Create the main receipt record
      const receipt = await tx.goods_receipts.create({
        data: {
          supplier_id: supplierId,
          store_id: storeId,
          created_by_employee_id: admin.id,
          total_amount: new Prisma.Decimal(totalAmount),
          notes: notes,
          code: `GR-${Date.now()}`,
        },
      });

      // Create receipt items and update inventory
      for (const item of items) {
        await tx.goods_receipt_items.create({
          data: {
            goods_receipt_id: receipt.id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            unit_cost: new Prisma.Decimal(item.unit_cost),
            subtotal: new Prisma.Decimal(item.quantity * item.unit_cost),
          },
        });

        await tx.inventory.upsert({
          where: {
            variant_id_store_id: {
              variant_id: item.variant_id,
              store_id: storeId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            variant_id: item.variant_id,
            store_id: storeId,
            quantity: item.quantity,
          },
        });
      }

      return receipt;
    });

    return response({
      status: 201,
      data: newReceipt,
      message: 'Goods receipt created and inventory updated.',
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
