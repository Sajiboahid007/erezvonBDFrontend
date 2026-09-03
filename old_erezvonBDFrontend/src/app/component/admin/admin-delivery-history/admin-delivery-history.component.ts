import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from '../../../../shared.module';
import { Order } from '../../../core/models';
import { OrderService } from '../../../core/services/order.service';
import { ShopSettingsService } from '../../../core/services/shop-settings.service';

@Component({
  selector: 'app-admin-delivery-history',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './admin-delivery-history.component.html',
  styleUrl: './admin-delivery-history.component.scss',
})
export class AdminDeliveryHistoryComponent implements OnInit {
  private orderService = inject(OrderService);
  private messageService = inject(MessageService);
  settingsService = inject(ShopSettingsService);

  deliveredOrders = signal<Order[]>([]);
  selectedOrder = signal<Order | null>(null);
  detailsDialogVisible = signal<boolean>(false);
  loading = signal<boolean>(true);
  searchTerm = signal<string>('');

  // Computed metrics
  totalDeliveredCount = computed<number>(() => this.deliveredOrders().length);
  totalDeliveredRevenue = computed<number>(() => {
    return this.deliveredOrders().reduce(
      (sum, o) => sum + Number(o.GrandTotal ?? o.SubTotal ?? 0),
      0
    );
  });
  totalDeliveredItems = computed<number>(() => {
    return this.deliveredOrders().reduce((sum, o) => {
      const itemsCount = (o.OrderItems || []).reduce((isum, it) => isum + (it.Quantity || 1), 0);
      return sum + (itemsCount || 1);
    }, 0);
  });

  filteredOrders = computed<Order[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.deliveredOrders();
    if (!term) return list;

    return list.filter((o) => {
      const orderNum = (o.OrderNumber || '').toLowerCase();
      const customer = (o.ShippingAddress?.Name || o.User?.Name || '').toLowerCase();
      const phone = (o.ShippingAddress?.Phone || o.User?.Phone || '').toLowerCase();
      const courier = (o.CourierName || '').toLowerCase();
      const tracking = (o.TrackingNumber || '').toLowerCase();
      return (
        orderNum.includes(term) ||
        customer.includes(term) ||
        phone.includes(term) ||
        courier.includes(term) ||
        tracking.includes(term)
      );
    });
  });

  ngOnInit(): void {
    this.loadDeliveredOrders();
  }

  loadDeliveredOrders(): void {
    this.loading.set(true);
    this.orderService.getAdminOrders({ limit: 200 }).subscribe({
      next: (res) => {
        const list = res.data || [];
        // Only delivered orders
        const delivered = list.filter(
          (o) => o.OrderStatusId === 4 || o.OrderStatus?.Name?.toLowerCase() === 'delivered'
        );
        this.deliveredOrders.set(delivered);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  openReceipt(order: Order): void {
    this.selectedOrder.set(order);
    this.detailsDialogVisible.set(true);
  }

  getTotalQuantity(order: Order | null | undefined): number {
    if (!order?.OrderItems || order.OrderItems.length === 0) return 1;
    return order.OrderItems.reduce((acc, item) => acc + (item.Quantity || 1), 0);
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

  printReceipt(): void {
    window.print();
  }
}
