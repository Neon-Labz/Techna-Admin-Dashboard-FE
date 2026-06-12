import api from '@/lib/axios';

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  moduleId: string;
  moduleName: string;
  amount: number;
  paidDate: string;        // YYYY-MM-DD
  method: 'cash' | 'bank' | 'online';
  status: 'paid' | 'pending' | 'overdue';
  receiptNo: string;
  batch: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePaymentPayload {
  studentId: string;
  studentName?: string;
  moduleId: string;
  moduleName?: string;
  amount: number;
  paidDate: string;        // YYYY-MM-DD
  method: 'cash' | 'bank' | 'online';
  status?: 'paid' | 'pending' | 'overdue';
  receiptNo?: string;
  batch: string;
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

// Unwrap the double-nested response:
// axios gives us response.data
// backend wraps as: { success, message, data: { success, payments: [...] } }
// so we need response.data.data.payments
function extractPayments(data: any): PaymentRecord[] {
  const list =
    data?.data?.payments ??   // { data: { payments: [...] } }  ← your backend
    data?.payments ??          // { payments: [...] }
    data?.data ??              // { data: [...] }
    data;                      // raw array fallback
  // Map _id → id for records that come without id
  return Array.isArray(list)
    ? list.map((p: any) => ({ ...p, id: p.id ?? p._id }))
    : [];
}

export const paymentApi = {

  // GET /api/payments — all payments (ADMIN only)
  async getAll(): Promise<PaymentRecord[]> {
    const { data } = await api.get('/payments');
    return extractPayments(data);
  },

  // GET /api/payments/student/:studentId
  async getByStudent(studentId: string): Promise<PaymentRecord[]> {
    const { data } = await api.get(`/payments/student/${studentId}`);
    return extractPayments(data);
  },

  // GET /api/payments/student/:studentId/tracking
  async getStudentTracking(
    studentId: string,
    params?: {
      year?: number;
      moduleId?: string;
      from?: string;   // YYYY-MM
      to?: string;     // YYYY-MM
    }
  ): Promise<PaymentTrackingResult> {
    const { data } = await api.get(
      `/payments/student/${studentId}/tracking`,
      { params }
    );
    return data?.data ?? data;
  },

  // POST /api/payments — create a new payment (ADMIN only)
  async create(payload: CreatePaymentPayload): Promise<PaymentRecord> {
    const { data } = await api.post('/payments', payload);
    const record = data?.data?.payment ?? data?.payment ?? data?.data ?? data;
    return { ...record, id: record.id ?? record._id };
  },
};