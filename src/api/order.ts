'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '../constants/message.constant';
import { verifyToken } from './auth';
import { Prisma } from '@prisma/client';
import { validateVoucher } from './voucher';
import { PAGINATE_DEFAULT } from '@/constants/paginate.constant';
import redis from '@/utils/redis';
import { CACHE_KEY } from '@/constants/redis.constant';

export async function createOrder(
  token: string,
  {
    shippingAddress,
    paymentMethodId,
    voucherCode,
  }: {
    shippingAddress: string;
    paymentMethodId: string;
    voucherCode?: string;
  }
) {
  try {
    const user = await verifyToken(token);
    if (!user || !user.user_profiles) {
      throw new Error('User profile not found. Please complete your profile.');
    }
    const userProfile = user.user_profiles;

    const cartItems = await prisma.cart_items.findMany({
      where: { user_id: user.id },
      include: { product_variants: true },
    });

    if (cartItems.length === 0) {
      return response({ status: 400, message: 'Your cart is empty' });
    }

    const orderData = await prisma.$transaction(async (tx) => {
      // 1. Calculate subtotal
      const subtotal = cartItems.reduce(
        (acc, item) =>
          acc + Number(item.product_variants.price) * item.quantity,
        0
      );

      // 2. Handle voucher (optional)
      let discountAmount = 0;
      let voucherId: string | undefined = undefined;

      if (voucherCode) {
        const voucherResponse = await validateVoucher(token, voucherCode);
        if (voucherResponse.status === 200 && voucherResponse.data) {
          const voucher = voucherResponse.data;
          voucherId = voucher.id;
          if (voucher.discount_type === 'fixed_amount') {
            discountAmount = Number(voucher.discount_value);
          } else if (voucher.discount_type === 'percentage') {
            discountAmount = (subtotal * Number(voucher.discount_value)) / 100;
            if (
              voucher.max_discount_amount &&
              discountAmount > Number(voucher.max_discount_amount)
            ) {
              discountAmount = Number(voucher.max_discount_amount);
            }
          }
        }
      }

      // 3. Calculate total
      const shippingFee = 0; // Placeholder
      const total = subtotal - discountAmount + shippingFee;

      // 4. Create Order
      const newOrder = await tx.orders.create({
        data: {
          user_id: user.id,
          user_name_snapshot: userProfile.full_name,
          user_email_snapshot: user.email,
          user_phone_snapshot: userProfile.phone_number,
          shipping_address_snapshot: shippingAddress,
          subtotal: new Prisma.Decimal(subtotal),
          discount_amount: new Prisma.Decimal(discountAmount),
          shipping_fee: new Prisma.Decimal(shippingFee),
          total: new Prisma.Decimal(total),
          order_status_id: 'pending_confirmation', // Default status
          payment_method_id: paymentMethodId,
          payment_status_id: 'unpaid', // Default status
          voucher_id: voucherId,
          type: 'online',
          code: `ORD-${Date.now()}`, // Simple unique code
        },
      });

      // 5. Create Order Items
      const orderItemsData = cartItems.map((item) => ({
        order_id: newOrder.id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        sku_snapshot: item.product_variants.sku,
        product_name_snapshot: '', // Needs join with products table
        variant_name_snapshot: item.product_variants.variant_name,
        unit_price: new Prisma.Decimal(item.product_variants.price),
        subtotal: new Prisma.Decimal(
          Number(item.product_variants.price) * item.quantity
        ),
      }));

      await tx.order_items.createMany({ data: orderItemsData });

      // 6. Decrease inventory (Note: Inventory is NOT cached as per DBML)
      for (const item of cartItems) {
        await tx.inventory.updateMany({
          where: { variant_id: item.variant_id /* and store_id */ },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // 7. Update voucher usage and invalidate cache
      if (voucherId && voucherCode) {
        await tx.vouchers.update({
          where: { id: voucherId },
          data: { used_quantity: { increment: 1 } },
        });
        // Invalidate voucher cache after usage (vouchers have short-term cache)
        await redis.del(CACHE_KEY.VOUCHER_BY_CODE(voucherCode));
      }

      // 8. Clear user's cart
      await tx.cart_items.deleteMany({ where: { user_id: user.id } });

      return newOrder;
    });

    return response({
      status: 201,
      data: orderData,
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

// Note: Orders are NOT cached as per DBML - transactional data requiring high accuracy
export async function getMyOrders(
  token: string,
  {
    page = PAGINATE_DEFAULT.PAGE,
    limit = PAGINATE_DEFAULT.LIMIT,
  }: { page?: number; limit?: number }
) {
  try {
    const user = await verifyToken(token);
    const orders = await prisma.orders.findMany({
      where: { user_id: user.id },
      include: {
        order_items: {
          include: {
            product_variants: {
              include: {
                products: {
                  select: {
                    name: true,
                    images: { take: 1, select: { url: true } },
                  },
                },
              },
            },
          },
        },
        order_statuses: true,
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.orders.count({ where: { user_id: user.id } });

    return response({
      status: 200,
      message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
      data: orders,
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

// Note: Order details are NOT cached as per DBML - transactional data requiring high accuracy
export async function getOrderDetails(token: string, orderId: string) {
  try {
    const user = await verifyToken(token);
    const order = await prisma.orders.findFirst({
      where: { id: orderId, user_id: user.id },
      include: {
        order_items: {
          include: {
            product_variants: {
              include: {
                products: {
                  include: {
                    images: { take: 1 },
                  },
                },
              },
            },
          },
        },
        order_statuses: true,
        payment_methods: true,
        payment_statuses: true,
      },
    });

    if (!order) {
      return response({
        status: 404,
        message: MESSAGE_ERROR.PRODUCT_NOT_FOUND,
      });
    }

    return response({
      status: 200,
      data: order,
      message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
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
