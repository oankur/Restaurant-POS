import api from './client';
import type { Outlet, MenuItem, Table, Order, Bill, Category } from '../types';

// Admin credentials
export const updateAdminCredentials = (data: { currentPassword: string; newUsername?: string; newPassword?: string }) =>
  api.put('/auth/admin/credentials', data).then((r) => r.data);

// Outlets
export const getOutlets = () => api.get<Outlet[]>('/outlets').then((r) => r.data);
export const getOutlet = (id: string) => api.get<Outlet>(`/outlets/${id}`).then((r) => r.data);
export const createOutlet = (data: { name: string; address: string; phone: string; username: string; password: string; managerPassword: string }) =>
  api.post<Outlet>('/outlets', data).then((r) => r.data);
export const updateOutlet = (id: string, data: Partial<Outlet> & { password?: string; managerPassword?: string }) =>
  api.put<Outlet>(`/outlets/${id}`, data).then((r) => r.data);
export const deleteOutlet = (id: string) => api.delete(`/outlets/${id}`).then((r) => r.data);
export const updateOutletSettings = (id: string, taxRate: number) =>
  api.put(`/outlets/${id}/settings`, { taxRate }).then((r) => r.data);

// Menu
export const getMenu = (outletId: string) => api.get<MenuItem[]>(`/menu/${outletId}`).then((r) => r.data);
export const createMenuItem = (data: Partial<MenuItem>) => api.post<MenuItem>('/menu', data).then((r) => r.data);
export const updateMenuItem = (id: string, data: Partial<MenuItem>) => api.put<MenuItem>(`/menu/${id}`, data).then((r) => r.data);
export const deleteMenuItem = (id: string) => api.delete(`/menu/${id}`).then((r) => r.data);

// Tables
export const getTables = (outletId: string) => api.get<Table[]>(`/tables/${outletId}`).then((r) => r.data);
export const createTable = (data: Partial<Table>) => api.post<Table>('/tables', data).then((r) => r.data);
export const updateTable = (id: string, data: Partial<Table>) => api.put<Table>(`/tables/${id}`, data).then((r) => r.data);
export const deleteTable = (id: string) => api.delete(`/tables/${id}`).then((r) => r.data);

// Orders
export const getOrders = (outletId: string, params?: Record<string, string>) =>
  api.get<Order[]>(`/orders/outlet/${outletId}`, { params }).then((r) => r.data);
export const getOrder = (id: string) => api.get<Order>(`/orders/${id}`).then((r) => r.data);
export const createOrder = (data: any) => api.post<Order>('/orders', data).then((r) => r.data);
export const updateOrderStatus = (id: string, status: string) =>
  api.put<Order>(`/orders/${id}/status`, { status }).then((r) => r.data);
export const cancelOrder = (id: string) => api.delete(`/orders/${id}`).then((r) => r.data);

// Billing
export const generateBill = (orderId: string, paymentMode: string) =>
  api.post<Bill>(`/billing/generate/${orderId}`, { paymentMode }).then((r) => r.data);
export const getBillByOrder = (orderId: string) =>
  api.get<Bill>(`/billing/order/${orderId}`).then((r) => r.data);

// Reports
export const getOutletReport = (outletId: string, from?: string, to?: string) =>
  api.get(`/reports/outlet/${outletId}`, { params: { from, to } }).then((r) => r.data);
export const getAllReports = () => api.get('/reports/all').then((r) => r.data);

// Categories
export const getCategories = (outletId: string) => api.get<Category[]>(`/categories/${outletId}`).then((r) => r.data);
export const createCategory = (name: string, outletId: string) => api.post<Category>('/categories', { name, outletId }).then((r) => r.data);
export const updateCategory = (id: string, name: string) => api.put<Category>(`/categories/${id}`, { name }).then((r) => r.data);
export const deleteCategory = (id: string) => api.delete(`/categories/${id}`).then((r) => r.data);

// Integrations
export const simulateOrder = (outletId: string, source: 'ZOMATO' | 'SWIGGY') =>
  api.post(`/integrations/simulate/${outletId}`, { source }).then((r) => r.data);
