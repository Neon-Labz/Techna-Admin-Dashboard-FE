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
  paidDate: string;        // YYYY-MM-DD
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

/**
 * lib/axios interceptor already unwraps the outer envelope one level:
 *   HTTP body  : { success, message, data: <controller_return>, timestamp, path }
 *   After axios: <controller_return>   (i.e. response.data.data)
 *
 * Payment controller returns: { success: true, payments: [...] }
 * So `result` here IS { success: true, payments: [...] } — no extra `.data` wrapper.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPayments(result: any): PaymentRecord[] {
  const list: unknown =
    result?.payments ??   // { success, payments: [...] }  ← controller shape
    result?.data ??        // raw array fallback
    result;
  return Array.isArray(list)
    ? list.map((p) => ({ ...p, id: (p as { id?: string; _id?: string }).id ?? (p as { _id?: string })._id }))
    : [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRecord(result: any): PaymentRecord {
  // controller returns { success: true, payment: { ... } }
  const rec = result?.payment ?? result;
  return { ...rec, id: rec.id ?? rec._id };
}

export const paymentApi = {

  // GET /api/payments — all payments (ADMIN only)
  async getAll(): Promise<PaymentRecord[]> {
    const result = await (api.get('/payments') as unknown as Promise<unknown>);
    return extractPayments(result);
  },

  // GET /api/payments/student/:studentId
  async getByStudent(studentId: string): Promise<PaymentRecord[]> {
    const result = await (api.get(`/payments/student/${studentId}`) as unknown as Promise<unknown>);
    return extractPayments(result);
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
    const result = await (api.get(
      `/payments/student/${studentId}/tracking`,
      { params }
    ) as unknown as Promise<PaymentTrackingResult>);
    return result;
  },

  // POST /api/payments — create a new payment (ADMIN only)
  async create(payload: CreatePaymentPayload): Promise<PaymentRecord> {
    const result = await (api.post('/payments', payload) as unknown as Promise<unknown>);
    return extractRecord(result);
  },

  // PATCH /api/payments/:id — update an existing payment (ADMIN only)
  async update(id: string, payload: Partial<CreatePaymentPayload>): Promise<PaymentRecord> {
    const result = await (api.patch(`/payments/${id}`, payload) as unknown as Promise<unknown>);
    return extractRecord(result);
  },
};
