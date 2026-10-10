const API_BASE = '/api';

export type GlobalErrorType =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'AUTH_EXPIRED'
  | 'FORBIDDEN_ERROR'
  | 'FORBIDDEN'
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR';

export function getAuthToken(): string | null {
  return localStorage.getItem('ng_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('ng_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('ng_token');
}

function normalizeDailyRecord(r: any) {
  const prodQty = Number(r.prod_Egg_Trays ?? r.production_quantity ?? 0);
  const damaged = Number(r.damaged_eggs ?? 0);
  const cull = Number(r.cull_eggs ?? 0);
  const netTrays = Number(r.net_trays ?? Math.max(0, prodQty - Math.floor((damaged + cull) / 30)));
  return {
    ...r,
    prod_Egg_Trays: prodQty,
    production_quantity: prodQty,
    damaged_eggs: damaged,
    cull_eggs: cull,
    net_trays: netTrays,
    mortality_cause: r.mortality_cause || 'طبيعي',
    avg_bird_weight_g: r.avg_bird_weight_g ?? r.avg_weight_g ?? 0,
    avg_weight_g: r.avg_weight_g ?? r.avg_bird_weight_g ?? 0,
    recorded_by_name: r.recorded_by_name || r.supervisor_name || 'مشرف الإنتاج',
    supervisor_name: r.supervisor_name || r.recorded_by_name || 'مشرف الإنتاج'
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
  } catch (err: any) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nrg:api-error', {
          detail: {
            type: 'NETWORK_ERROR' as GlobalErrorType,
            status: 0,
            message: 'تعذر الاتصال بالخادم، يرجى التحقق من اتصال الشبكة.',
            endpoint
          }
        })
      );
    }
    throw new Error('تعذر الاتصال بالخادم، يرجى التحقق من اتصال الشبكة.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data?.message || `حدث خطأ في الخادم (${res.status})`;
    if (typeof window !== 'undefined' && (res.status === 401 || res.status === 403 || res.status >= 500)) {
      const errorType: GlobalErrorType =
        res.status === 401
          ? 'AUTH_ERROR'
          : res.status === 403
          ? 'FORBIDDEN_ERROR'
          : 'SERVER_ERROR';
      window.dispatchEvent(
        new CustomEvent('nrg:api-error', {
          detail: {
            type: errorType,
            status: res.status,
            message: errorMsg,
            endpoint
          }
        })
      );
    }
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
  getMe: () => request<{ success: boolean; user: any }>('/auth/me'),
  getRoles: () => request<{ success: boolean; roles: any[] }>('/auth/roles'),
  getBranches: () => request<{ success: boolean; branches: any[] }>('/auth/branches'),
  getUsers: () => request<{ success: boolean; users: any[] }>('/auth/users'),
  createUser: (userData: any) =>
    request<{ success: boolean; message: string; userId: number }>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
  toggleUserStatus: (userId: number) =>
    request<{ success: boolean; message: string; newStatus: number }>(`/auth/users/${userId}/toggle`, {
      method: 'PUT'
    }),
  resetUserPassword: (userId: number, newPassword: string) =>
    request<{ success: boolean; message: string }>(`/auth/users/${userId}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword })
    }),

  // Production
  getFarms: () => request<{ success: boolean; farms: any[] }>('/production/farms'),
  createFarm: (data: any) =>
    request<{ success: boolean; message: string; farmId: number }>('/production/farms', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getHouses: () => request<{ success: boolean; houses: any[] }>('/production/houses'),
  createHouse: (data: any) =>
    request<{ success: boolean; message: string; houseId: number }>('/production/houses', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateHouse: (id: number, data: any) =>
    request<{ success: boolean; message: string }>(`/production/houses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  getFlocks: () => request<{ success: boolean; flocks: any[] }>('/production/flocks'),
  createFlock: (data: any) =>
    request<{ success: boolean; message: string; flockId: number }>('/production/flocks', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateFlockStatus: (id: number, data: { status: string; notes?: string }) =>
    request<{ success: boolean; message: string }>(`/production/flocks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  getDailyProduction: async (filters: Record<string, any> = {}) => {
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const params = new URLSearchParams(clean as Record<string, string>).toString();
    const res = await request<{ success: boolean; records: any[] }>(
      `/production/daily${params ? `?${params}` : ''}`
    );
    return {
      ...res,
      records: (res.records || []).map(normalizeDailyRecord)
    };
  },
  recordDailyProduction: (data: any) => {
    const payload = {
      ...data,
      productionQuantity: data.productionQuantity ?? data.eggTrays ?? 0,
      avgWeightG: data.avgWeightG ?? data.avgBirdWeightG ?? 0
    };
    return request<{ success: boolean; message: string; recordId: number }>('/production/daily', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  createDailyProduction: (data: any) => {
    const payload = {
      ...data,
      productionQuantity: data.productionQuantity ?? data.eggTrays ?? 0,
      avgWeightG: data.avgWeightG ?? data.avgBirdWeightG ?? 0
    };
    return request<{ success: boolean; message: string; recordId: number }>('/production/daily', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  deleteDailyProduction: async (_id: number) => {
    return { success: true };
  },
  getSupervisors: () => request<{ success: boolean; supervisors: any[] }>('/production/supervisors'),

  // Requisitions
  getRequisitions: (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request<{ success: boolean; requisitions: any[] }>(`/requisitions${params ? `?${params}` : ''}`);
  },
  getRequisitionDetails: (id: number) =>
    request<{ success: boolean; requisition: any }>(`/requisitions/${id}`),
  createRequisition: (data: any) =>
    request<{ success: boolean; message: string; requisitionId: number; requestNo: string }>('/requisitions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  submitRequisition: (id: number) =>
    request<{ success: boolean; message: string; status: string }>(`/requisitions/${id}/submit`, {
      method: 'POST'
    }),
  reviewRequisition: (id: number, data: { decision: string; reviewNotes?: string }) =>
    request<{ success: boolean; message: string; status: string }>(`/requisitions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Products & Customers
  getProducts: (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request<{ success: boolean; products: any[]; summary?: any }>(
      `/catalog/products${params ? `?${params}` : ''}`
    );
  },
  getLowStockAlerts: () =>
    request<{
      success: boolean;
      count: number;
      outOfStockCount: number;
      lowStockCount: number;
      alerts: any[];
    }>('/catalog/products/low-stock-alerts'),
  createProduct: (data: any) =>
    request<{ success: boolean; message: string; productId: number }>('/catalog/products', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateProduct: (id: number, data: any) =>
    request<{ success: boolean; message: string }>(`/catalog/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  getCustomers: (search?: string) =>
    request<{ success: boolean; customers: any[] }>(
      `/catalog/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`
    ),
  createCustomer: (data: any) =>
    request<{ success: boolean; message: string; customerId: number }>('/catalog/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateCustomer: (id: number, data: any) =>
    request<{ success: boolean; message: string }>(`/catalog/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  getFeedCatalog: () => request<{ success: boolean; items: any[] }>('/catalog/feed-items'),
  getTreatmentCatalog: () => request<{ success: boolean; items: any[] }>('/catalog/treatment-items'),
  getSupplyCatalog: () => request<{ success: boolean; items: any[] }>('/catalog/supply-items'),

  // Sales
  getSalesInvoices: (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request<{ success: boolean; invoices: any[] }>(`/sales/invoices${params ? `?${params}` : ''}`);
  },
  getInvoiceDetails: (id: number) =>
    request<{ success: boolean; invoice: any }>(`/sales/invoices/${id}`),
  getSalesInvoiceDetails: (id: number) =>
    request<{ success: boolean; invoice: any }>(`/sales/invoices/${id}`),
  createSalesInvoice: (data: any) =>
    request<{
      success: boolean;
      message: string;
      invoiceId: number;
      invoiceNo: string;
      totalAmount: number;
    }>('/sales/invoices', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Warehouses
  getWarehouses: () => request<{ success: boolean; warehouses: any[] }>('/warehouse/list'),
  getWarehouseReceipts: (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request<{ success: boolean; receipts: any[] }>(
      `/warehouse/receipts${params ? `?${params}` : ''}`
    );
  },
  getWarehouseReceiptDetails: (id: number) =>
    request<{ success: boolean; receipt: any }>(`/warehouse/receipts/${id}`),
  createWarehouseReceipt: (data: any) =>
    request<{
      success: boolean;
      message: string;
      receiptId: number;
      receiptNo: string;
      newStock: number;
    }>('/warehouse/receipts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Reports
  getDailyProductionReport: async (filters: Record<string, any> = {}) => {
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const params = new URLSearchParams(clean as Record<string, string>).toString();
    const res = await request<{
      success: boolean;
      reportCode: string;
      reportName: string;
      summary: any;
      records: any[];
      rows?: any[];
    }>(`/reports/daily-production${params ? `?${params}` : ''}`);
    const records = (res.records || res.rows || []).map(normalizeDailyRecord);
    const totalEggTrays = res.summary?.totalProduction ?? records.reduce((a, r) => a + r.prod_Egg_Trays, 0);
    const totalNetTrays = records.reduce((a, r) => a + r.net_trays, 0);
    const totalMortality = res.summary?.totalMortality ?? records.reduce((a, r) => a + (r.mortality_count || 0), 0);
    const totalFeedKg = res.summary?.totalFeedConsumedKg ?? records.reduce((a, r) => a + (r.feed_consumed_kg || 0), 0);
    return {
      ...res,
      records,
      rows: records,
      summary: {
        ...res.summary,
        totalEggTrays,
        totalNetTrays,
        totalMortality,
        totalFeedKg
      }
    };
  },
  getRequisitionsReport: async (filters: Record<string, any> = {}) => {
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const params = new URLSearchParams(clean as Record<string, string>).toString();
    const res = await request<{
      success: boolean;
      reportCode: string;
      reportName: string;
      summary: any;
      records: any[];
      rows?: any[];
    }>(`/reports/requisitions${params ? `?${params}` : ''}`);
    const requisitions = res.records || res.rows || [];
    const s = res.summary || {};
    return {
      ...res,
      requisitions,
      records: requisitions,
      rows: requisitions,
      summary: {
        ...s,
        totalRequests: s.totalRequisitions ?? requisitions.length,
        submitted: s.submittedCount ?? 0,
        underReview: s.underReviewCount ?? 0,
        approved: s.approvedCount ?? 0,
        rejected: s.rejectedCount ?? 0,
        completed: s.completedCount ?? 0
      }
    };
  },
  getRequisitionsStatusReport: async (filters: Record<string, any> = {}) => {
    return api.getRequisitionsReport(filters);
  },
  getSalesReport: async (filters: Record<string, any> = {}) => {
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const params = new URLSearchParams(clean as Record<string, string>).toString();
    const res = await request<{
      success: boolean;
      reportCode: string;
      reportName: string;
      summary: any;
      records: any[];
      rows?: any[];
    }>(`/reports/sales${params ? `?${params}` : ''}`);
    const invoices = res.records || res.rows || [];
    const s = res.summary || {};
    const paidInvoicesCount = invoices.filter((i: any) => i.payment_status === 'PAID').length;
    const pendingInvoicesCount = invoices.filter((i: any) => i.payment_status !== 'PAID').length;
    return {
      ...res,
      invoices,
      records: invoices,
      rows: invoices,
      summary: {
        ...s,
        totalInvoices: s.totalInvoices ?? invoices.length,
        totalSubtotal: s.totalGrossAmount ?? 0,
        totalDiscount: s.totalDiscounts ?? 0,
        totalTax: s.totalTax ?? 0,
        grandTotalRevenue: s.totalNetAmount ?? 0,
        paidInvoicesCount,
        pendingInvoicesCount
      }
    };
  },
  getSalesSummaryReport: async (filters: Record<string, any> = {}) => {
    return api.getSalesReport(filters);
  },
  getWarehouseReceiptsReport: async (filters: Record<string, any> = {}) => {
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const params = new URLSearchParams(clean as Record<string, string>).toString();
    const [res, invRes] = await Promise.all([
      request<{
        success: boolean;
        reportCode: string;
        reportName: string;
        summary: any;
        records: any[];
        rows?: any[];
      }>(`/reports/warehouse-receipts${params ? `?${params}` : ''}`),
      request<{
        success: boolean;
        summary: any;
        records: any[];
        rows?: any[];
      }>('/reports/products-inventory').catch(() => ({
        success: true,
        summary: {},
        records: [],
        rows: []
      }))
    ]);
    const receipts = (res.records || res.rows || []).map((rcp: any) => ({
      ...rcp,
      batch_no: rcp.batch_no || rcp.batch_number || 'عام',
      received_by_name: rcp.received_by_name || rcp.receiver_name || 'أمين المستودع'
    }));
    const currentStockLevels = invRes.records || invRes.rows || [];
    const s = res.summary || {};
    return {
      ...res,
      receipts,
      records: receipts,
      rows: receipts,
      currentStockLevels,
      summary: {
        ...s,
        totalReceipts: s.totalReceipts ?? receipts.length,
        totalSuppliedQuantity: s.totalQuantitySupplied ?? 0,
        lowStockItemsCount: invRes.summary?.lowStockItemsCount ?? 0
      }
    };
  },
  getWarehouseMovementReport: async (filters: Record<string, any> = {}) => {
    return api.getWarehouseReceiptsReport(filters);
  },
  getProductsInventoryReport: async (filters: Record<string, any> = {}) => {
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const params = new URLSearchParams(clean as Record<string, string>).toString();
    const [res, salesRes] = await Promise.all([
      request<{
        success: boolean;
        reportCode: string;
        reportName: string;
        summary: any;
        records: any[];
        rows?: any[];
      }>(`/reports/products-inventory${params ? `?${params}` : ''}`),
      request<{
        success: boolean;
        summary: any;
        records: any[];
        rows?: any[];
      }>(`/reports/sales${params ? `?${params}` : ''}`).catch(() => ({
        success: true,
        summary: {},
        records: [],
        rows: []
      }))
    ]);
    const productsValuation = res.records || res.rows || [];
    const salesRows = salesRes.records || salesRes.rows || [];
    const totalRevenue = salesRows.reduce((acc: number, r: any) => acc + (Number(r.total_amount) || 0), 0);
    const paidRevenue = salesRows
      .filter((r: any) => r.payment_status === 'PAID')
      .reduce((acc: number, r: any) => acc + (Number(r.total_amount) || 0), 0);
    const pendingReceivables = Math.max(0, totalRevenue - paidRevenue);
    const s = res.summary || {};
    return {
      ...res,
      productsValuation,
      records: productsValuation,
      rows: productsValuation,
      summary: {
        ...s,
        totalInventoryValuation: s.totalValuation ?? 0,
        totalRevenue,
        paidRevenue,
        pendingReceivables
      }
    };
  },
  getInventoryFinancialReport: async (filters: Record<string, any> = {}) => {
    return api.getProductsInventoryReport(filters);
  },

  getReportR01: async (startDate?: string, endDate?: string) => {
    const res = await api.getDailyProductionReport({ startDate, endDate });
    return { ...res, reportTitle: 'تقرير الإنتاج اليومي (R-01)', rows: res.records };
  },
  getReportR02: async (startDate?: string, endDate?: string) => {
    const res = await api.getRequisitionsReport({ startDate, endDate });
    return { ...res, reportTitle: 'تقرير الطلبات (R-02)', rows: res.records };
  },
  getReportR03: async (startDate?: string, endDate?: string) => {
    const res = await api.getSalesReport({ startDate, endDate });
    return { ...res, reportTitle: 'تقرير فواتير المبيعات (R-03)', rows: res.records };
  },
  getReportR04: async (startDate?: string, endDate?: string) => {
    const res = await api.getWarehouseReceiptsReport({ startDate, endDate });
    return { ...res, reportTitle: 'تقرير توريد المنتجات للمخازن (R-04)', rows: res.records };
  },
  getReportR05: async (filters: Record<string, any> = {}) => {
    const res = await api.getProductsInventoryReport(filters);
    return { ...res, reportTitle: 'تقرير المنتجات (R-05)', rows: res.records };
  },

  // System Maintenance, Backup & Restore (ADMIN ONLY)
  createBackup: () =>
    request<{ success: boolean; message: string; backup: any }>('/system/backup', { method: 'POST' }),
  getBackups: () => request<{ success: boolean; backups: any[] }>('/system/backups'),
  restoreBackup: (filename: string) =>
    request<{ success: boolean; message: string }>('/system/restore', {
      method: 'POST',
      body: JSON.stringify({ filename })
    }),

  // Dashboard & Notifications
  getDashboardStats: (period?: string) =>
    request<any>(`/dashboard/stats${period ? `?period=${encodeURIComponent(period)}` : ''}`),
  getNotifications: () =>
    request<{ success: boolean; notifications: any[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: number) =>
    request<{ success: boolean; message: string }>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () =>
    request<{ success: boolean; message: string }>('/notifications/read-all', { method: 'PUT' }),

  // Academic Audit & Verification
  runAcademicAudit: () =>
    request<{
      success: boolean;
      suiteName: string;
      passedCount: number;
      failedCount: number;
      totalCount: number;
      results: any[];
    }>('/system/audit-test')
};
