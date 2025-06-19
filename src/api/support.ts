'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '../constants/message.constant';
import { verifyToken } from './auth';
import { support_tickets } from '@prisma/client';
import { PAGINATE_DEFAULT } from '@/constants/paginate.constant';

// Note: Support tickets are NOT cached as per DBML - operational data requiring real-time accuracy
export async function getMySupportTickets(
  token: string,
  {
    page = PAGINATE_DEFAULT.PAGE,
    limit = PAGINATE_DEFAULT.LIMIT,
  }: { page?: number; limit?: number }
) {
  try {
    const user = await verifyToken(token);
    const tickets = await prisma.support_tickets.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const total = await prisma.support_tickets.count({
      where: { user_id: user.id },
    });
    return response({
      status: 200,
      message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
      data: tickets,
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

// Note: Support ticket details are NOT cached as per DBML - operational data requiring real-time accuracy
export async function getSupportTicketDetails(token: string, ticketId: string) {
  try {
    const user = await verifyToken(token);
    const ticket = await prisma.support_tickets.findFirst({
      where: { id: ticketId, user_id: user.id },
      include: {
        ticket_replies: { orderBy: { created_at: 'asc' } },
      },
    });
    if (!ticket) {
      return response({ status: 404, message: 'Ticket not found.' });
    }
    return response({
      status: 200,
      data: ticket,
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

// Note: Support ticket creation is NOT cached as per DBML - operational data requiring real-time accuracy
export async function createSupportTicket(
  token: string,
  data: Omit<
    support_tickets,
    | 'id'
    | 'user_id'
    | 'code'
    | 'status'
    | 'created_at'
    | 'closed_at'
    | 'assignee_id'
  >
) {
  try {
    const user = await verifyToken(token);
    const newTicket = await prisma.support_tickets.create({
      data: {
        ...data,
        user_id: user.id,
        code: `TICKET-${Date.now()}`,
      },
    });
    return response({
      status: 201,
      data: newTicket,
      message: 'Support ticket created successfully.',
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

// Note: Ticket replies are NOT cached as per DBML - operational data requiring real-time accuracy
export async function addTicketReply(
  token: string,
  { ticketId, content }: { ticketId: string; content: string }
) {
  try {
    const user = await verifyToken(token);
    // Ensure the user owns the ticket they are replying to
    const ticket = await prisma.support_tickets.findFirst({
      where: { id: ticketId, user_id: user.id },
    });
    if (!ticket) {
      return response({
        status: 404,
        message: 'Ticket not found or permission denied.',
      });
    }

    const newReply = await prisma.ticket_replies.create({
      data: {
        ticket_id: ticketId,
        content: content,
        replier_id: user.id,
        replier_type: 'USER',
      },
    });

    // Update ticket status (no cache invalidation needed as support tickets are not cached)
    await prisma.support_tickets.update({
      where: { id: ticketId },
      data: { status: 'pending_reply' },
    });

    return response({
      status: 201,
      data: newReply,
      message: 'Reply added successfully.',
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
