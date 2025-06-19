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

export async function adminGetAllSupportTickets(
  token: string,
  {
    page = 1,
    limit = 20,
    status,
  }: { page?: number; limit?: number; status?: any }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'support:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const where: Prisma.support_ticketsWhereInput = {};
    if (status) {
      where.status = status;
    }

    const tickets = await prisma.support_tickets.findMany({
      where,
      include: {
        users: { select: { email: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.support_tickets.count({ where });

    return response({
      status: 200,
      data: tickets,
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

export async function adminGetSupportTicketDetails(
  token: string,
  ticketId: string
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'support:read')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const ticket = await prisma.support_tickets.findUnique({
      where: { id: ticketId },
      include: {
        ticket_replies: { orderBy: { created_at: 'asc' } },
        users: { select: { email: true, user_profiles: true } },
        employees: { select: { full_name: true } },
      },
    });

    return response({ status: 200, data: ticket });
  } catch (error) {
    if (error instanceof Error)
      return response({ status: 401, message: error.message });
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}

export async function adminReplyToTicket(
  token: string,
  ticketId: string,
  content: string
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'support:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const newReply = await prisma.ticket_replies.create({
      data: {
        ticket_id: ticketId,
        content,
        replier_id: admin.id,
        replier_type: 'EMPLOYEE',
      },
    });

    await prisma.support_tickets.update({
      where: { id: ticketId },
      data: { status: 'in_progress' },
    });

    return response({ status: 201, data: newReply });
  } catch (error) {
    if (error instanceof Error)
      return response({ status: 500, message: error.message });
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}

export async function adminUpdateTicketStatus(
  token: string,
  ticketId: string,
  {
    status,
    assigneeId,
  }: {
    status?: any;
    assigneeId?: string;
  }
) {
  try {
    const admin = await verifyEmployeeToken(token);
    if (!hasPermission(admin, 'support:update')) {
      return response({
        status: 403,
        message: MESSAGE_ERROR.PERMISSION_DENIED,
      });
    }

    const data: Prisma.support_ticketsUpdateInput = {};
    if (status) data.status = status;
    if (assigneeId)
      data.employees = {
        connect: {
          id: assigneeId,
        },
      };

    const updatedTicket = await prisma.support_tickets.update({
      where: { id: ticketId },
      data,
    });

    return response({ status: 200, data: updatedTicket });
  } catch (error) {
    if (error instanceof Error)
      return response({ status: 500, message: error.message });
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}
