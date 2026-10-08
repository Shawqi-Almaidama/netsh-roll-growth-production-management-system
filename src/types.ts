export type RoleCode =
  | 'SUPERVISOR'
  | 'PROD_MANAGER'
  | 'SALES_OFFICER'
  | 'WAREHOUSE_KEEPER'
  | 'ACCOUNTANT'
  | 'ADMIN';

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone?: string;
  roleCode: RoleCode;
  roleNameAr: string;
  branchId: number | null;
  branchName?: string;
  permissions: string[];
}

export interface Farm {
  id: number;
  farm_code: string;
  farm_name: string;
  location: string;
  capacity: number;
  branch_id: number;
  branch_name?: string;
  supervisor_name?: string;
  house_count?: number;
  current_houses_capacity?: number;
  status: string;
}

export interface House {
  id: number;
  farm_id: number;
  house_code: string;
  house_name: string;
  house_type: string;
  capacity: number;
  current_status: 'ACTIVE' | 'CLEANING' | 'EMPTY' | 'MAINTENANCE';
  notes?: string;
  farm_name: string;
  farm_code: string;
  supervisor_name?: string;
  active_flock_id?: number;
  active_flock_code?: string;
  active_flock_breed?: string;
  active_flock_count?: number;
}

export interface Flock {
  id: number;
  house_id: number;
  flock_code: string;
  breed: string;
  initial_count: number;
  current_count: number;
  total_mortality: number;
  entry_date: string;
  target_weight_g: number;
  status: 'ACTIVE' | 'HARVESTED' | 'TRANSFERRED';
  notes?: string;
  house_name: string;
  house_code: string;
  house_type: string;
  farm_name: string;
  farm_code: string;
}

export interface DailyProductionRecord {
  id: number;
  flock_id: number;
  house_id: number;
  record_date: string;
  production_quantity: number;
  unit: string;
  mortality_count: number;
  feed_consumed_kg: number;
  water_consumed_liters: number;
  avg_weight_g: number;
  temperature_c?: number;
  humidity_pct?: number;
  supervisor_id: number;
  notes?: string;
  created_at: string;
  flock_code: string;
  breed: string;
  current_count: number;
  house_name: string;
  house_code: string;
  house_type: string;
  farm_name: string;
  supervisor_name: string;
}

export type RequisitionType = 'CHICKS' | 'FEED' | 'TREATMENT' | 'SUPPLY';
export type RequisitionStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface RequisitionItem {
  id?: number;
  requisition_id?: number;
  itemType?: string;
  item_type?: string;
  itemRefId?: number | null;
  item_ref_id?: number | null;
  itemName: string;
  item_name?: string;
  quantity: number;
  unit: string;
  specifications?: string;
}

export interface Requisition {
  id: number;
  request_no: string;
  req_type: RequisitionType;
  requester_id: number;
  requester_name: string;
  requester_role?: string;
  requester_email?: string;
  requester_phone?: string;
  farm_id?: number;
  farm_name?: string;
  farm_code?: string;
  house_id?: number;
  house_name?: string;
  house_code?: string;
  flock_id?: number;
  flock_code?: string;
  flock_breed?: string;
  request_date: string;
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
  status: RequisitionStatus;
  reviewer_id?: number;
  reviewer_name?: string;
  review_date?: string;
  review_notes?: string;
  notes?: string;
  created_at: string;
  items_count?: number;
  total_quantity?: number;
  items?: RequisitionItem[];
}

export interface Product {
  id: number;
  product_code: string;
  product_name: string;
  category: string;
  unit: string;
  unit_price: number;
  current_stock: number;
  min_stock_alert: number;
  description?: string;
  is_low_stock?: number | boolean;
}

export interface Customer {
  id: number;
  customer_code: string;
  customer_name: string;
  phone: string;
  address?: string;
  commercial_reg?: string;
  tax_number?: string;
  customer_type: 'WHOLESALE' | 'RETAIL' | 'HORECA';
  notes?: string;
  created_at: string;
  total_invoices?: number;
  total_sales?: number;
}

export interface InvoiceLine {
  id?: number;
  invoice_id?: number;
  productId: number;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  unit?: string;
  category?: string;
}

export type SalesInvoiceItem = InvoiceLine;

export interface SalesInvoice {
  id: number;
  invoice_no: string;
  customer_id: number;
  customer_name: string;
  customer_code: string;
  customer_phone?: string;
  customer_address?: string;
  customer_tax?: string;
  user_id: number;
  issuer_name: string;
  invoice_date: string;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total_amount: number;
  payment_status: 'PAID' | 'PENDING' | 'PARTIAL';
  notes?: string;
  created_at: string;
  lines_count?: number;
  lines?: InvoiceLine[];
}

export interface Warehouse {
  id: number;
  warehouse_code: string;
  warehouse_name: string;
  location: string;
  capacity: number;
  keeper_name?: string;
  branch_name?: string;
  total_receipts?: number;
}

export interface WarehouseReceipt {
  id: number;
  receipt_no: string;
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  product_id: number;
  product_name: string;
  product_code: string;
  unit: string;
  category: string;
  quantity: number;
  supplier_name: string;
  received_by: number;
  receiver_name: string;
  received_by_name?: string;
  receipt_date: string;
  supply_date?: string;
  batch_number?: string;
  notes?: string;
  created_at: string;
  items?: Array<{
    product_id: number;
    product_name: string;
    quantity_received: number;
    unit: string;
    batch_number?: string;
  }>;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  link?: string;
  is_read: number;
  created_at: string;
}

export interface DashboardKPIs {
  farmsCount: number;
  housesCount: number;
  activeHousesCount: number;
  totalCapacity: number;
  activeFlocksCount: number;
  currentBirdsCount: number;
  totalMortality: number;
  productsCount: number;
  lowStockCount: number;
  totalStockValuation: number;
  totalSalesRevenue: number;
  totalInvoicesCount: number;
  pendingRequisitionsCount: number;
}

export interface TestResultItem {
  id: string;
  name: string;
  category: string;
  status: 'PASSED' | 'FAILED';
  details: string;
  durationMs: number;
}
