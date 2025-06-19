'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '../constants/message.constant';
import { verifyToken } from './auth';

// Note: Cart items are NOT cached as per DBML - user-specific data that changes constantly
export async function getMyCart(token: string) {
  try {
    const user = await verifyToken(token);
    const cartItems = await prisma.cart_items.findMany({
      where: { user_id: user.id },
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
      orderBy: { created_at: 'desc' },
    });
    return response({
      status: 200,
      data: cartItems,
      message: MESSAGE_SUCCESS.GET_USER_SUCCESS,
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

// Note: Cart operations are NOT cached as per DBML
export async function addToCart({
  token,
  variantId,
  quantity,
}: {
  token: string;
  variantId: string;
  quantity: number;
}) {
  try {
    const user = await verifyToken(token);

    const existingItem = await prisma.cart_items.findFirst({
      where: { user_id: user.id, variant_id: variantId },
    });

    if (existingItem) {
      const updatedItem = await prisma.cart_items.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
      return response({
        status: 200,
        data: updatedItem,
        message: MESSAGE_SUCCESS.UPDATE_CART_SUCCESS,
      });
    } else {
      const newItem = await prisma.cart_items.create({
        data: {
          user_id: user.id,
          variant_id: variantId,
          quantity: quantity,
        },
      });
      return response({
        status: 201,
        data: newItem,
        message: MESSAGE_SUCCESS.ADD_TO_CART_SUCCESS,
      });
    }
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

// Note: Cart operations are NOT cached as per DBML
export async function updateCartItemQuantity({
  token,
  cartItemId,
  quantity,
}: {
  token: string;
  cartItemId: string;
  quantity: number;
}) {
  try {
    const user = await verifyToken(token);
    const updatedItem = await prisma.cart_items.updateMany({
      where: { id: cartItemId, user_id: user.id },
      data: { quantity },
    });
    if (updatedItem.count === 0) {
      return response({
        status: 404,
        message: MESSAGE_ERROR.CART_ITEM_NOT_FOUND,
      });
    }
    return response({
      status: 200,
      data: updatedItem,
      message: MESSAGE_SUCCESS.UPDATE_CART_SUCCESS,
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

// Note: Cart operations are NOT cached as per DBML
export async function removeCartItem({
  token,
  cartItemId,
}: {
  token: string;
  cartItemId: string;
}) {
  try {
    const user = await verifyToken(token);
    const deletedItem = await prisma.cart_items.deleteMany({
      where: { id: cartItemId, user_id: user.id },
    });
    if (deletedItem.count === 0) {
      return response({
        status: 404,
        message: MESSAGE_ERROR.CART_ITEM_NOT_FOUND,
      });
    }
    return response({
      status: 200,
      message: MESSAGE_SUCCESS.REMOVE_FROM_CART_SUCCESS,
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
