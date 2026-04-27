// Auth
export type AuthType = 'outlet' | 'admin';
export type OutletMode = 'operator' | 'manager';

export interface OutletSession {
  type: 'outlet';
  outletId: string;
  outletName: string;
  mode: OutletMode;
}

export interface AdminSession {
  type: 'admin';
  userId: string;
  adminName: string;
}

export type AuthSession = OutletSession | AdminSession;

// Orders
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type OrderSource = 'OFFLINE' | 'ZOMATO' | 'SWIGGY';
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
export type PaymentMode = 'CASH' | 'CARD' | 'UPI';

export interface Category {
  id: string;
  name: string;
  outletId: string;
  createdAt: string;
}

export interface Outlet {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  username: string;
  taxRate: number;
  taxEnabled: boolean;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  isAvailable: boolean;
  outletId: string;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  outletId: string;
}

export interface OrderItem {
  id: string;
  menuItemId?: string | null;
  menuItem?: MenuItem | null;
  itemName?: string | null;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  source: OrderSource;
  outletId: string;
  tableId?: string | null;
  table?: Table | null;
  outlet?: Outlet | null;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  bill?: Bill | null;
  createdAt: string;
}

export interface Bill {
  id: string;
  orderId: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMode: PaymentMode;
  isPaid: boolean;
  createdAt: string;
  order?: Order;
  dailySequence?: number;
}
