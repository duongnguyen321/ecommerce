'use server';

import { prisma } from '../../utils/prisma';
import response from '../../utils/response';
import {
  MESSAGE_ERROR,
  MESSAGE_SUCCESS,
} from '../../constants/message.constant';
import { verifyEmployeeToken } from './auth';
import { Prisma } from '@prisma/client';
import { hasPermission } from './permission';

type VariantData = {
  sku: string;
  variant_name: string;
  price: number;
  allow_preorder?: boolean;
  status?: 'active' | 'hidden' | 'discontinued';
  // and other variant fields
};

export async function adminCreateProduct(
  token: string,
  productData: {
    name: string;
    description?: string;
    status?: 'active' | 'hidden' | 'discontinued';
    variants: VariantData[];
    // and other product fields
  }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'product:create')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const { variants, ...prodData } = productData;

    const newProduct = await prisma.products.create({
      data: {
        ...prodData,
        product_variants: {
          create: variants.map((v) => ({
            ...v,
            price: new Prisma.Decimal(v.price),
          })),
        },
      },
      include: { product_variants: true },
    });

    return response({
      status: 201,
      data: newProduct,
      message: 'Product created successfully.',
    });
  } catch (error) {
    if (error instanceof Error) {
      return response({ status: 500, message: error.message });
    }
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}

export async function adminUpdateProduct(
  token: string,
  productId: string,
  productData: Partial<Omit<Prisma.productsUpdateInput, 'product_variants'>> & {
    variants?: (Partial<VariantData> & { id?: string })[];
  }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'product:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const { variants, ...prodData } = productData;
    const transaction_queries = [];

    // Update main product data if provided
    if (Object.keys(prodData).length > 0) {
      transaction_queries.push(
        prisma.products.update({
          where: { id: productId },
          data: prodData,
        })
      );
    }

    // Update variants if provided
    if (variants) {
      for (const variant of variants) {
        if (variant.id) {
          // Update existing variant
          const { id, ...variantData } = variant;
          transaction_queries.push(
            prisma.product_variants.update({
              where: { id: id },
              data: variantData,
            })
          );
        } else {
          // Create new variant for this product
          transaction_queries.push(
            prisma.product_variants.create({
              data: {
                product_id: productId,
                ...variant,
                price: new Prisma.Decimal(variant.price || 0),
              } as any,
            })
          );
        }
      }
    }

    await prisma.$transaction(transaction_queries);

    return response({
      status: 200,
      message: MESSAGE_SUCCESS.UPDATE_DATA_SUCCESS,
    });
  } catch (error) {
    if (error instanceof Error) {
      return response({ status: 500, message: error.message });
    }
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}

export async function adminDeleteProduct(token: string, productId: string) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'product:delete')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    await prisma.products.update({
      where: { id: productId },
      data: { deleted_at: new Date(), status: 'discontinued' },
    });

    return response({ status: 200, message: 'Product archived successfully.' });
  } catch (error) {
    if (error instanceof Error) {
      return response({ status: 500, message: error.message });
    }
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}
