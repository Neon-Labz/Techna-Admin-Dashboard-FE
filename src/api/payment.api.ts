import api from '@/lib/axios';

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  moduleId: string;
  moduleName: string;
  amount: number;
  paidDate: string;
  method: 'cash' | 'bank' | 'online';
  status: 'paid' | 'pending' | 'overdue';
  receiptNo: string;
  batch: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePaymentPayload {
  studentId: string;
  studentName?: string;
  moduleId: string;
  moduleName?: string;
  amount: number;
  paidDate: string;
  method: 'cash' | 'bank' | 'online';
  status?: 'paid' | 'pending' | 'overdue';
  receiptNo?: string;
  batch: string;
  notes?: string;
}

export interface PaymentTrackingResult {
  success: boolean;
  studentId: string;
  year: number;
  moduleId?: string;
  paidMonths: string[];
  pendingMonths: string[];
  payments: PaymentRecord[];
}

function unwrapResponse(result: any): any {
  const body = result?.data ?? result;

  if (
    body &&
    typeof body === 'object' &&
    'success' in body &&
    'data' in body
  ) {
    return body.data;
  }

  return body;
}

function normalizePayment(payment: any): PaymentRecord {
  return { ...payment, id: payment.id ?? payment._id };
}

function extractPayments(result: any): PaymentRecord[] {
  const unwrapped = unwrapResponse(result);
  const list =
    unwrapped?.payments ??
    unwrapped?.data ??
    unwrapped;

  return Array.isArray(list) ? list.map(normalizePayment) : [];
}

function extractRecord(result: any): PaymentRecord {
  const unwrapped = unwrapResponse(result);
  const payment = unwrapped?.payment ?? unwrapped;
  return normalizePayment(payment);
}

export const paymentApi = {
  async getAll(): Promise<PaymentRecord[]> {
    const result = await api.get('/payments');
    return extractPayments(result);
  },

  async getByStudent(studentId: string): Promise<PaymentRecord[]> {
    const result = await api.get(`/payments/student/${studentId}`);
    return extractPayments(result);
  },

  async getStudentTracking(
    studentId: string,
    params?: {
      year?: number;
      moduleId?: string;
      from?: string;
      to?: string;
    },
  ): Promise<PaymentTrackingResult> {
    const result = await api.get(`/payments/student/${studentId}/tracking`, {
      params,
    });
    return unwrapResponse(result) as PaymentTrackingResult;
  },

  async create(payload: CreatePaymentPayload): Promise<PaymentRecord> {
    const result = await api.post('/payments', payload);
    return extractRecord(result);
  },

  async update(
    id: string,
    payload: Partial<CreatePaymentPayload>,
  ): Promise<PaymentRecord> {
    const result = await api.patch(`/payments/${id}`, payload);
    return extractRecord(result);
  },
};
