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

// ====== Voucher Management ======
export async function adminCreateVoucher(
  token: string,
  data: Prisma.vouchersCreateInput
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'voucher:create')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }
    const voucher = await prisma.vouchers.create({ data });
    return response({
      status: 201,
      data: voucher,
      message: 'Voucher created successfully.',
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

// ====== Promotion Management ======
export async function adminCreatePromotion(
  token: string,
  data: Prisma.promotionsCreateInput
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'promotion:create')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }
    const promotion = await prisma.promotions.create({ data });
    return response({
      status: 201,
      data: promotion,
      message: 'Promotion created successfully.',
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

export async function adminGetAllPromotions(
  token: string,
  {
    page = 1,
    limit = 20,
    status,
  }: { page?: number; limit?: number; status?: any }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'promotion:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const where: Prisma.promotionsWhereInput = {};
    if (status) {
      where.status = status;
    }

    const promotions = await prisma.promotions.findMany({
      where,
      orderBy: { end_date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.promotions.count({ where });

    return response({
      status: 200,
      data: promotions,
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

export async function adminUpdatePromotion(
  token: string,
  promotionId: string,
  data: Prisma.promotionsUpdateInput
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'promotion:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const promotion = await prisma.promotions.update({
      where: { id: promotionId },
      data,
    });

    return response({
      status: 200,
      data: promotion,
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

// ====== Post Management ======
export async function adminCreatePost(
  token: string,
  data: Omit<Prisma.postsCreateInput, 'employees'>
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'post:create')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }
    const post = await prisma.posts.create({
      data: { ...data, author_id: admin.id },
    });
    return response({
      status: 201,
      data: post,
      message: 'Post created successfully.',
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

// ====== Review Management ======
export async function adminGetAllReviews(
  token: string,
  {
    page = 1,
    limit = 20,
    status,
  }: { page?: number; limit?: number; status?: any }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'review:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const where: Prisma.product_reviewsWhereInput = {};
    if (status) {
      where.status = status;
    }

    const reviews = await prisma.product_reviews.findMany({
      where,
      include: {
        users: { select: { email: true } },
        products: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.product_reviews.count({ where });

    return response({
      status: 200,
      data: reviews,
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

export async function adminUpdateReviewStatus(
  token: string,
  reviewId: string,
  status: any
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'review:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const review = await prisma.product_reviews.update({
      where: { id: reviewId },
      data: { status },
    });

    return response({
      status: 200,
      data: review,
      message: 'Review status updated.',
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
