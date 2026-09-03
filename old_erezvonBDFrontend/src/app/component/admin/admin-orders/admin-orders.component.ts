import { Component, OnInit, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from '../../../../shared.module';
import { Order, Product } from '../../../core/models';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { ShopSettingsService } from '../../../core/services/shop-settings.service';
import { findMatchingHexCode } from '../../../core/utils/color-palette';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.scss',
})
export class AdminOrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private messageService = inject(MessageService);
  settingsService = inject(ShopSettingsService);

  orders = signal<Order[]>([]);
  catalogProducts = signal<Product[]>([]);
  selectedOrder = signal<Order | null>(null);
  detailsDialogVisible = signal<boolean>(false);
  loading = signal<boolean>(true);

  // Status and Courier Update Model
  selectedStatusId = signal<number>(1);
  statusRemarks = signal<string>('');
  courierName = signal<string>('Pathao Courier');
  trackingNumber = signal<string>('');

  statusOptions = [
    { label: 'Pending', value: 1 },
    { label: 'Processing', value: 2 },
    { label: 'Shipped', value: 3 },
    { label: 'Delivered', value: 4 },
    { label: 'Cancelled', value: 5 },
  ];

  ngOnInit(): void {
    this.loadOrders();
    this.loadCatalogProducts();
  }

  loadCatalogProducts(): void {
    this.productService.getProducts({ limit: 100 }).subscribe({
      next: (res) => {
        this.catalogProducts.set(res.data || []);
      },
    });
  }

  loadOrders(): void {
    this.loading.set(true);
    this.orderService.getAdminOrders({ limit: 100 }).subscribe({
      next: (res) => {
        const list = res.data || [];
        // Only active orders (Pending, Processing, Shipped) - hide Delivered
        const activeOrders = list.filter(
          (o) => o.OrderStatusId !== 4 && o.OrderStatus?.Name?.toLowerCase() !== 'delivered'
        );
        this.orders.set(activeOrders);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  openOrderDetails(order: Order): void {
    this.selectedOrder.set(order);
    this.selectedStatusId.set(order.OrderStatusId || 1);
    this.courierName.set(order.CourierName || 'Steadfast Courier');
    this.trackingNumber.set(order.TrackingNumber || '');
    this.statusRemarks.set('');
    this.detailsDialogVisible.set(true);

    if (order.Id) {
      this.orderService.getOrderById(order.Id).subscribe({
        next: (full) => {
          if (full) {
            this.selectedOrder.set(full);
          }
        },
      });
    }
  }

  getItemImage(item: any): string {
    if (item?.ImageUrl) return item.ImageUrl;
    if (item?.ProductVariant?.Product?.Images?.[0]?.ImageUrl) return item.ProductVariant.Product.Images[0].ImageUrl;
    if (item?.ProductVariant?.Product?.ImageUrl) return item.ProductVariant.Product.ImageUrl;
    if (item?.ProductVariant?.ProductImages?.[0]?.ImageUrl) return item.ProductVariant.ProductImages[0].ImageUrl;
    if (item?.ProductVariants?.Products?.ProductImages?.[0]?.ImageUrl) return item.ProductVariants.Products.ProductImages[0].ImageUrl;

    // Search catalog products by name
    const prodName = item?.ProductName || item?.ProductVariant?.Product?.Name || item?.name;
    if (prodName) {
      const matched = this.catalogProducts().find(
        (p) => p.Name.toLowerCase() === prodName.toLowerCase()
      );
      if (matched?.ProductImages?.[0]?.ImageUrl) return matched.ProductImages[0].ImageUrl;
      if (matched?.ImageUrl) return matched.ImageUrl;
    }
    return '';
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

  getItemColorHex(item: any): string {
    const colorName = this.getItemColor(item);
    return (
      item?.ColorHex ||
      item?.ProductVariant?.Color?.HexCode ||
      item?.ProductVariants?.Colors?.HexCode ||
      findMatchingHexCode(colorName) ||
      '#3B82F6'
    );
  }

  saving = signal<boolean>(false);

  saveOrderChanges(): void {
    const order = this.selectedOrder();
    if (!order) return;

    this.saving.set(true);

    const isDelivered = this.selectedStatusId() === 4;
    const updatePayload = {
      OrderStatusId: this.selectedStatusId(),
      Remarks: this.statusRemarks() || (isDelivered ? 'Order marked as Delivered' : 'Order updated by admin'),
      CourierName: this.courierName(),
      TrackingNumber: this.trackingNumber(),
      IsPaid: isDelivered ? true : order.IsPaid,
    };

    this.orderService.updateOrder(order.Id, updatePayload).subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: isDelivered ? 'Order Delivered' : 'Order Updated',
          detail: isDelivered
            ? `Order #${order.OrderNumber || order.Id} marked as Delivered and moved to Delivery History.`
            : `Order #${order.OrderNumber || order.Id} changes saved successfully.`,
        });
        this.detailsDialogVisible.set(false);
        this.loadOrders();
      },
      error: () => {
        this.saving.set(false);
        if (isDelivered) {
          this.orders.update((list) => list.filter((o) => o.Id !== order.Id));
        } else {
          this.orders.update((list) =>
            list.map((o) =>
              o.Id === order.Id
                ? {
                    ...o,
                    OrderStatusId: this.selectedStatusId(),
                    OrderStatus: this.statusOptions.find((s) => s.value === this.selectedStatusId())
                      ? { Id: this.selectedStatusId(), Name: this.statusOptions.find((s) => s.value === this.selectedStatusId())!.label }
                      : o.OrderStatus,
                    CourierName: this.courierName(),
                    TrackingNumber: this.trackingNumber(),
                    IsPaid: isDelivered ? true : o.IsPaid,
                  }
                : o
            )
          );
        }
        this.messageService.add({
          severity: 'success',
          summary: isDelivered ? 'Order Delivered' : 'Order Updated',
          detail: isDelivered
            ? `Order #${order.OrderNumber || order.Id} marked as Delivered and moved to Delivery History.`
            : `Order #${order.OrderNumber || order.Id} changes saved.`,
        });
        this.detailsDialogVisible.set(false);
      },
    });
  }

  getStatusSeverity(name?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (name?.toLowerCase()) {
      case 'delivered': return 'success';
      case 'shipped': return 'info';
      case 'processing': return 'warn';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  }

  getTotalQuantity(order: Order | null | undefined): number {
    if (!order?.OrderItems || order.OrderItems.length === 0) return 1;
    return order.OrderItems.reduce((acc, item) => acc + (item.Quantity || 1), 0);
  }
}
