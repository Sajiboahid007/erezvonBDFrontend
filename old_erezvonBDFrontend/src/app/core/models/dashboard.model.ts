export interface DashboardSummary {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  lowStockCount: number;
  totalCustomers: number;
  totalProducts: number;
  monthlyRevenueGrowth?: number;
  orderGrowth?: number;
}

export interface SalesReportItem {
  date: string;
  ordersCount: number;
  revenue: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  sku: string;
  imageUrl?: string;
  totalUnitsSold: number;
  totalRevenue: number;
  categoryName?: string;
}

export interface LowStockVariant {
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  sizeName: string;
  colorName: string;
  colorHex?: string;
  stockQuantity: number;
  imageUrl?: string;
}
