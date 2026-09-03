import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { DashboardSummary, LowStockVariant, SalesReportItem, TopProduct } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/summary`).pipe(
      map((res) => res?.data || res),
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

  getSalesReport(from?: string, to?: string): Observable<SalesReportItem[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<any>(`${this.apiUrl}/dashboard/sales-report`, { params }).pipe(
      map((res) => res?.data?.timeline || res?.data || res || []),
      catchError(() => of([]))
    );
  }

  getTopProducts(limit: number = 5): Observable<TopProduct[]> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/top-products`, {
      params: { limit: limit.toString() },
    }).pipe(
      map((res) => {
        const items = res?.data || (Array.isArray(res) ? res : []);
        return items.map((p: any) => ({
          productId: p.productId || p.Id,
          productName: p.name || p.productName || 'Product',
          sku: p.sku || '',
          totalUnitsSold: p.totalQuantitySold || p.totalUnitsSold || 0,
          totalRevenue: p.totalSalesAmount || p.totalRevenue || 0,
          imageUrl: p.image || p.imageUrl,
        }));
      }),
      catchError(() => of([]))
    );
  }

  getLowStock(threshold: number = 10): Observable<LowStockVariant[]> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/low-stock`, {
      params: { threshold: threshold.toString() },
    }).pipe(
      map((res) => {
        const items = res?.data?.items || res?.data || (Array.isArray(res) ? res : []);
        return items.map((v: any) => ({
          variantId: v.variantId || v.Id,
          productId: v.productId || v.ProductId,
          productName: v.productName || 'Product',
          sku: v.sku || '',
          sizeName: v.size || v.sizeName || 'Standard',
          colorName: v.color || v.colorName || 'Default',
          stockQuantity: v.stockQuantity || 0,
        }));
      }),
      catchError(() => of([]))
    );
  }
}
