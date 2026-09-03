import { Component, OnInit, inject, signal } from '@angular/core';
import { SharedModule } from '../../../shared.module';
import { DashboardSummary, LowStockVariant, SalesReportItem, TopProduct } from '../../core/models';
import { DashboardService } from '../../core/services/dashboard.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { ShopSettingsService } from '../../core/services/shop-settings.service';

@Component({
  selector: 'app-dashboard-component',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dashboard-component.html',
  styleUrl: './dashboard-component.scss',
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  settingsService = inject(ShopSettingsService);

  summary = signal<DashboardSummary>({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    lowStockCount: 0,
    totalCustomers: 0,
    totalProducts: 0,
    monthlyRevenueGrowth: 14.5,
    orderGrowth: 8.2,
  });

  topProducts = signal<TopProduct[]>([]);
  lowStockItems = signal<LowStockVariant[]>([]);
  salesReport = signal<SalesReportItem[]>([]);
  loading = signal<boolean>(true);

  // Chart config
  chartData: any;
  chartOptions: any;

  ngOnInit(): void {
    this.initChartOptions();
    this.loadDashboardData();
  }

  initChartOptions(): void {
    const textColor = '#334155';
    const textColorSecondary = '#94a3b8';
    const surfaceBorder = '#e2e8f0';

    this.chartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.6,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { weight: '600', size: 11 },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColorSecondary, font: { size: 10 } },
          grid: { color: surfaceBorder, drawBorder: false },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: {
            color: '#2563eb',
            font: { size: 10 },
            callback: (v: any) => '৳' + Number(v).toLocaleString(),
          },
          grid: { color: surfaceBorder, drawBorder: false },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: {
            color: '#10b981',
            font: { size: 10 },
            stepSize: 1,
          },
          grid: { drawOnChartArea: false },
        },
      },
    };
  }

  loadDashboardData(): void {
    this.loading.set(true);

    // 1. Fetch live orders to compute real delivered revenue and daily timeline
    this.orderService.getAdminOrders({ limit: 100 }).subscribe({
      next: (res) => {
        const orders = res.data || [];
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(
          (o) => o.OrderStatusId === 1 || o.OrderStatus?.Name?.toLowerCase() === 'pending'
        ).length;

        // Revenue from Delivered or Paid orders
        const deliveredOrders = orders.filter(
          (o) =>
            o.OrderStatusId === 4 ||
            o.OrderStatus?.Name?.toLowerCase() === 'delivered' ||
            o.IsPaid
        );

        const deliveredRevenue = deliveredOrders.reduce(
          (sum, o) => sum + Number(o.GrandTotal ?? o.SubTotal ?? 0),
          0
        );

        const totalRevenue = deliveredRevenue;

        this.summary.set({
          totalOrders: totalOrders,
          pendingOrders: pendingOrders,
          totalRevenue: totalRevenue,
          lowStockCount: 0,
          totalCustomers: new Set(orders.map((o) => o.UserId || o.ShippingAddress?.Phone)).size || 1,
          totalProducts: 0,
          monthlyRevenueGrowth: 12.5,
          orderGrowth: 8.0,
        });

        // Build Daily Timeline Chart
        this.buildChartFromOrders(orders);
      },
      error: () => {
        this.setupDefaultChartData();
      },
    });

    // 2. Fetch products for low stock analysis & top products
    this.productService.getProducts({ limit: 100 }).subscribe({
      next: (res) => {
        const prods = res.data || [];
        const lowStock: LowStockVariant[] = [];

        prods.forEach((p) => {
          (p.Variants || []).forEach((v) => {
            if ((v.StockQuantity ?? 0) <= 5) {
              lowStock.push({
                variantId: v.Id ?? 0,
                productId: p.Id || 0,
                productName: p.Name,
                sku: v.SKU || p.SKU || '',
                sizeName: v.Size?.Name || 'Standard',
                colorName: v.Color?.Name || 'Default',
                stockQuantity: v.StockQuantity ?? 0,
                imageUrl: p.Images?.[0]?.ImageUrl,
              });
            }
          });
        });

        this.lowStockItems.set(lowStock.slice(0, 10));
        this.summary.update((s) => ({
          ...s,
          totalProducts: prods.length,
          lowStockCount: lowStock.length,
        }));

        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    // 3. Top products
    this.dashboardService.getTopProducts(5).subscribe({
      next: (prods) => {
        if (prods && prods.length > 0) {
          this.topProducts.set(prods);
        }
      },
      error: () => {},
    });
  }

  buildChartFromOrders(orders: any[]): void {
    if (!orders || orders.length === 0) {
      this.setupDefaultChartData();
      return;
    }

    // Group orders by Date
    const dateMap = new Map<string, { revenue: number; count: number }>();

    orders.forEach((o) => {
      const rawDate = o.CreatedAt || o.UpdatedAt || new Date().toISOString();
      const dateKey = new Date(rawDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const isDeliveredOrPaid =
        o.OrderStatusId === 4 ||
        o.OrderStatus?.Name?.toLowerCase() === 'delivered' ||
        o.IsPaid;

      const current = dateMap.get(dateKey) || { revenue: 0, count: 0 };
      current.count += 1;
      if (isDeliveredOrPaid) {
        current.revenue += Number(o.GrandTotal ?? o.SubTotal ?? 0);
      }
      dateMap.set(dateKey, current);
    });

    const labels = Array.from(dateMap.keys());
    const revenueData = labels.map((k) => dateMap.get(k)!.revenue);
    const countData = labels.map((k) => dateMap.get(k)!.count);

    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Revenue (৳)',
          data: revenueData,
          fill: true,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Orders Count',
          data: countData,
          fill: false,
          borderColor: '#10b981',
          tension: 0.4,
          yAxisID: 'y1',
        },
      ],
    };
  }

  setupDefaultChartData(): void {
    this.chartData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Revenue (৳)',
          data: [0, 0, 0, 0, 0, 0, 0],
          fill: true,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Orders',
          data: [0, 0, 0, 0, 0, 0, 0],
          fill: false,
          borderColor: '#10b981',
          tension: 0.4,
          yAxisID: 'y1',
        },
      ],
    };
  }
}
