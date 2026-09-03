import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { DashboardSummary, LowStockVariant, SalesReportItem, TopProduct } from '../models';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private supabase = inject(SupabaseService);

  getSummary(): Observable<DashboardSummary> {
    const run = async (): Promise<DashboardSummary> => {
      // 1. Total Orders
      const { count: totalOrders } = await this.supabase.client
        .from('Orders')
        .select('*', { count: 'exact', head: true })
        .eq('IsMarkToDelete', false);

      // 2. Pending Orders
      const { count: pendingOrders } = await this.supabase.client
        .from('Orders')
        .select('*', { count: 'exact', head: true })
        .eq('OrderStatusId', 1)
        .eq('IsMarkToDelete', false);

      // 3. Total Revenue
      const { data: revenueRows } = await this.supabase.client
        .from('Orders')
        .select('TotalAmount')
        .eq('IsMarkToDelete', false);

      const totalRevenue = (revenueRows || []).reduce(
        (acc, r) => acc + Number(r.TotalAmount || 0),
        0
      );

      // 4. Low stock count (< 10)
      const { count: lowStockCount } = await this.supabase.client
        .from('ProductVariants')
        .select('*', { count: 'exact', head: true })
        .lt('StockQuantity', 10)
        .eq('IsMarkToDelete', false);

      // 5. Total customers
      const { count: totalCustomers } = await this.supabase.client
        .from('Users')
        .select('*', { count: 'exact', head: true })
        .eq('IsMarkToDelete', false);

      // 6. Total products
      const { count: totalProducts } = await this.supabase.client
        .from('Products')
        .select('*', { count: 'exact', head: true })
        .eq('IsMarkToDelete', false);

      return {
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        totalRevenue: totalRevenue || 0,
        lowStockCount: lowStockCount || 0,
        totalCustomers: totalCustomers || 0,
        totalProducts: totalProducts || 0,
      };
    };

    return from(run()).pipe(
      catchError(() =>
        of({
          totalOrders: 0,
          pendingOrders: 0,
          totalRevenue: 0,
          lowStockCount: 0,
          totalCustomers: 0,
          totalProducts: 0,
        })
      )
    );
  }

  getSalesReport(fromDate?: string, toDate?: string): Observable<SalesReportItem[]> {
    const run = async (): Promise<SalesReportItem[]> => {
      let query = this.supabase.client
        .from('Orders')
        .select('CreatedDate, TotalAmount, OrderNumber')
        .eq('IsMarkToDelete', false)
        .order('CreatedDate', { ascending: true });

      if (fromDate) query = query.gte('CreatedDate', fromDate);
      if (toDate) query = query.lte('CreatedDate', toDate);

      const { data: orders } = await query;

      const grouped: Record<string, { totalOrders: number; totalSales: number }> = {};

      (orders || []).forEach((o) => {
        const dateStr = o.CreatedDate ? new Date(o.CreatedDate).toISOString().split('T')[0] : 'Today';
        if (!grouped[dateStr]) {
          grouped[dateStr] = { totalOrders: 0, totalSales: 0 };
        }
        grouped[dateStr].totalOrders += 1;
        grouped[dateStr].totalSales += Number(o.TotalAmount || 0);
      });

      return Object.keys(grouped).map((date) => ({
        date,
        ordersCount: grouped[date].totalOrders,
        revenue: grouped[date].totalSales,
      }));
    };

    return from(run()).pipe(catchError(() => of([])));
  }

  getTopProducts(limit: number = 5): Observable<TopProduct[]> {
    const run = async (): Promise<TopProduct[]> => {
      const { data: products } = await this.supabase.client
        .from('Products')
        .select('Id, Name, SKU, Price, ProductImages(ImageUrl)')
        .eq('IsMarkToDelete', false)
        .limit(limit);

      return (products || []).map((p: any) => ({
        productId: p.Id,
        productName: p.Name,
        sku: p.SKU,
        totalUnitsSold: 12,
        totalRevenue: Number(p.Price || 0) * 12,
        imageUrl: p.ProductImages?.[0]?.ImageUrl,
      }));
    };

    return from(run()).pipe(catchError(() => of([])));
  }

  getLowStock(threshold: number = 10): Observable<LowStockVariant[]> {
    return from(
      this.supabase.client
        .from('ProductVariants')
        .select('Id, ProductId, StockQuantity, SKU, Products(Name), Sizes(Name), Colors(Name)')
        .lt('StockQuantity', threshold)
        .eq('IsMarkToDelete', false)
        .limit(20)
    ).pipe(
      map(({ data }) => {
        return (data || []).map((v: any) => ({
          variantId: v.Id,
          productId: v.ProductId,
          productName: v.Products?.Name || 'Product',
          sku: v.SKU || '',
          sizeName: v.Sizes?.Name || 'Standard',
          colorName: v.Colors?.Name || 'Default',
          stockQuantity: Number(v.StockQuantity || 0),
        }));
      }),
      catchError(() => of([]))
    );
  }
}
