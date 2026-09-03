import { Component, OnInit, inject, signal } from '@angular/core';
import { SharedModule } from '../../../shared.module';
import { Order } from '../../core/models';
import { OrderService } from '../../core/services/order.service';
import { ShopSettingsService } from '../../core/services/shop-settings.service';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './my-orders.component.html',
  styleUrl: './my-orders.component.scss',
})
export class MyOrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  settingsService = inject(ShopSettingsService);

  orders = signal<Order[]>([]);
  selectedOrder = signal<Order | null>(null);
  detailsDialogVisible = signal<boolean>(false);
  loading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.orderService.getMyOrders().subscribe({
      next: (data) => {
        this.orders.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  viewDetails(order: Order): void {
    this.selectedOrder.set(order);
    this.detailsDialogVisible.set(true);
  }

  getItemImage(item: any): string {
    return (
      item?.ImageUrl ||
      item?.ProductVariant?.Product?.Images?.[0]?.ImageUrl ||
      item?.ProductVariant?.Product?.ProductImages?.[0]?.ImageUrl ||
      item?.ProductVariant?.Product?.ImageUrl ||
      ''
    );
  }

  getItemSize(item: any): string {
    return (
      item?.SizeName ||
      item?.ProductVariant?.Size?.Name ||
      item?.ProductVariants?.Sizes?.Name ||
      item?.size ||
      item?.Size ||
      ''
    );
  }

  getItemColor(item: any): string {
    return (
      item?.ColorName ||
      item?.ProductVariant?.Color?.Name ||
      item?.ProductVariants?.Colors?.Name ||
      item?.color ||
      item?.Color ||
      ''
    );
  }

  getStatusSeverity(statusName?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (statusName?.toLowerCase()) {
      case 'delivered':
        return 'success';
      case 'shipped':
        return 'info';
      case 'processing':
        return 'secondary';
      case 'pending':
        return 'warn';
      case 'cancelled':
      case 'returned':
        return 'danger';
      default:
        return 'info';
    }
  }
}
