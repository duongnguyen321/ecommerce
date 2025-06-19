import { STATUS_MESSAGE } from '@/constants/message.constant';

function statusRes(status: number): string {
  return STATUS_MESSAGE[status] || 'Lỗi không xác định';
}

interface IPagination {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  canNext: boolean;
  canPrev: boolean;
}

interface InputResponse<T> {
  status: number;
  message?: string;
  errors?: string | string[];
  data?:
    | T
    | {
        [key: string]: any;
      }
    | null;
  paginate?: Omit<IPagination, 'canNext' | 'canPrev' | 'totalPages'> | null;
}

function response<T = null>(body: InputResponse<T>): any {
  if (!body.message) {
    body.message = statusRes(body.status);
  }

  if (body.status >= 400) {
    if (body.message && !body.errors) body.errors = body.message;
    else body.errors = statusRes(body.status);
  }
  if (!body.data) {
    body.data = null;
  }

  const { paginate, ...rest } = body;

  if (paginate) {
    return {
      ...rest,
      paginate: {
        ...paginate,
        totalPages: Math.ceil(paginate.total / paginate.limit),
        canPrev: paginate.page > 1,
        canNext: paginate.page * paginate.limit < paginate.total,
      },
    };
  }

  return { ...rest, paginate: null };
}

export default response;
