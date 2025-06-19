'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR } from '../constants/message.constant';
import { verifyToken } from './auth';

// Note: Product view history is NOT cached directly as per DBML - this data is often processed asynchronously
// and pushed to recommendation systems or a separate cache
export async function logProductView(
  productId: string,
  token?: string,
  sessionId?: string
) {
  try {
    let userId: string | undefined = undefined;

    if (token) {
      try {
        const user = await verifyToken(token);
        userId = user.id;
      } catch (error) {
        // Token might be invalid or expired, but we can still log the view as a guest
        console.warn('Could not verify token for product view log:', error);
      }
    }

    if (!userId && !sessionId) {
      // We need at least one identifier to make the log useful
      return response({
        status: 400,
        message: 'Session ID or user token is required.',
      });
    }

    // Log view directly to database without caching - important data source for recommendation algorithms
    await prisma.product_view_history.create({
      data: {
        product_id: productId,
        user_id: userId,
        session_id: sessionId,
      },
    });

    // This endpoint doesn't need to return data, just confirm it worked.
    return response({ status: 204 });
  } catch (error) {
    // We don't want to block the user experience if logging fails.
    // Log the error for debugging, but don't return a server error to the client.
    console.error('Failed to log product view:', error);
    return response({ status: 204 });
  }
}
