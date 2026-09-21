const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('ng_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('ng_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('ng_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data?.message || `حدث خطأ في الخادم (${res.status})`;
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
  getUsers: () => request<{ success: boolean; users: any[] }>('/auth/users'),
  createUser: (userData: any) =>
    request<{ success: boolean; message: string; userId: number }>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
  toggleUserActive: (userId: number) =>
    request<{ success: boolean; message: string; newStatus: number }>(`/auth/users/${userId}/toggle`, {
      method: 'PUT'
    }),
  toggleUserStatus: (userId: number) =>
    request<{ success: boolean; message: string; newStatus: number }>(`/auth/users/${userId}/toggle`, {
      method: 'PUT'
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
  getDailyProduction: (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request<{ success: boolean; records: any[] }>(`/production/daily${params ? `?${params}` : ''}`);
  },
  recordDailyProduction: (data: any) =>
    request<{ success: boolean; message: string; recordId: number }>('/production/daily', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
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
  reviewRequisition: (id: number, data: { decision: string; reviewNotes?: string }) =>
    request<{ success: boolean; message: string; status: string }>(`/requisitions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Products & Customers
  getProducts: (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request<{ success: boolean; products: any[] }>(`/catalog/products${params ? `?${params}` : ''}`);
  },
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
    request<{ success: boolean; customers: any[] }>(`/catalog/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
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
    request<{ success: boolean; message: string; invoiceId: number; invoiceNo: string; totalAmount: number }>('/sales/invoices', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Warehouses
  getWarehouses: () => request<{ success: boolean; warehouses: any[] }>('/warehouse/list'),
  getWarehouseReceipts: (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request<{ success: boolean; receipts: any[] }>(`/warehouse/receipts${params ? `?${params}` : ''}`);
  },
  getWarehouseReceiptDetails: (id: number) =>
    request<{ success: boolean; receipt: any }>(`/warehouse/receipts/${id}`),
  createWarehouseReceipt: (data: any) =>
    request<{ success: boolean; message: string; receiptId: number; receiptNo: string; newStock: number }>('/warehouse/receipts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Reports
  getDailyProductionReport: (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request<{ success: boolean; reportCode: string; reportName: string; summary: any; records: any[]; rows?: any[] }>(`/reports/daily-production${params ? `?${params}` : ''}`);
  },
  getRequisitionsReport: (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request<{ success: boolean; reportCode: string; reportName: string; summary: any; records: any[]; rows?: any[] }>(`/reports/requisitions${params ? `?${params}` : ''}`);
  },
  getSalesReport: (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request<{ success: boolean; reportCode: string; reportName: string; summary: any; records: any[]; rows?: any[] }>(`/reports/sales${params ? `?${params}` : ''}`);
  },
  getWarehouseReceiptsReport: (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request<{ success: boolean; reportCode: string; reportName: string; summary: any; records: any[]; rows?: any[] }>(`/reports/warehouse-receipts${params ? `?${params}` : ''}`);
  },
  getProductsInventoryReport: (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request<{ success: boolean; reportCode: string; reportName: string; summary: any; records: any[]; rows?: any[] }>(`/reports/products-inventory${params ? `?${params}` : ''}`);
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
  createBackup: () => request<{ success: boolean; message: string; backup: any }>('/system/backup', { method: 'POST' }),
  getBackups: () => request<{ success: boolean; backups: any[] }>('/system/backups'),
  restoreBackup: (filename: string) => request<{ success: boolean; message: string }>('/system/restore', {
    method: 'POST',
    body: JSON.stringify({ filename })
  }),

  // Dashboard & Notifications
  getDashboardStats: (period?: string) =>
    request<any>(`/dashboard/stats${period ? `?period=${encodeURIComponent(period)}` : ''}`),
  getNotifications: () => request<{ success: boolean; notifications: any[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: number) => request<{ success: boolean; message: string }>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request<{ success: boolean; message: string }>('/notifications/read-all', { method: 'PUT' }),

  // Academic Audit & Verification (T-01 to T-23)
  runAcademicAudit: () => request<{ success: boolean; suiteName: string; passedCount: number; failedCount: number; totalCount: number; results: any[] }>('/system/audit-test'),
  runAuditTests: async () => {
    const res = await api.runAcademicAudit();
    return {
      success: res.success,
      passed: res.passedCount,
      failed: res.failedCount,
      total: res.totalCount,
      results: res.results
    };
  }
};
