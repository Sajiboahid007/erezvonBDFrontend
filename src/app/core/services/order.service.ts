import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import {
  Address,
  CreateOrderDto,
  CreateOrderPayload,
  Order,
  OrderFilterParams,
  PaginatedResponse,
  UpdateCourierDto,
  UpdateOrderStatusDto,
} from '../models';
import { AuthService } from './auth.service';
import { findMatchingHexCode } from '../utils/color-palette';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = 'http://localhost:3000/api';

  createShippingAddress(address: Partial<Address>): Observable<number> {
    const user = this.authService.currentUserSignal();
    const addressPayload = {
      UserId: address.UserId !== undefined ? address.UserId : (user?.Id || null),
      Name: address.Name || user?.Name || 'Customer',
      Phone: address.Phone || user?.Phone || '',
      Email: address.Email || user?.Email || null,
      Street: address.Street || 'Street Address',
      Thana: address.Thana || 'Thana',
      District: address.District || 'Dhaka',
      City: address.City || address.District || 'Dhaka',
      PostalCode: address.PostalCode || null,
    };

    return this.http.post<any>(`${this.apiUrl}/address/create`, addressPayload).pipe(
      map((res) => {
        const id = res?.data?.Id || res?.data?.id || res?.Id || res?.id;
        return Number(id);
      })
    );
  }

  createOrderWithPayload(payload: CreateOrderPayload): Observable<Order> {
    return this.http.post<any>(`${this.apiUrl}/order/create`, payload).pipe(
      map((res) => this.formatOrder(res?.data || res))
    );
  }

  createOrder(dto: CreateOrderDto | CreateOrderPayload): Observable<Order> {
    const user = this.authService.currentUserSignal();

    const sendOrder = (shippingAddressId: number): Observable<Order> => {
      const items = (dto.Items || (dto as any).items || []).map((i: any) => ({
        ProductVariantId: Number(i.ProductVariantId || i.productVariantId),
        Quantity: Math.max(1, Number(i.Quantity || i.quantity || 1)),
      }));

      const hasPaymentDetails =
        dto.PaymentDetails?.TransactionId ||
        (dto as any).TransactionId ||
        dto.PaymentDetails?.SenderNumber ||
        (dto as any).SenderNumber;

      const payload: CreateOrderPayload = {
        ShippingAddressId: shippingAddressId,
        PaymentMethodId: dto.PaymentMethodId || 1,
        IsInsideDhaka: Boolean(dto.IsInsideDhaka),
        DeliveryCharge: dto.DeliveryCharge || 0,
        Discount: dto.Discount || 0,
        CourierName: dto.CourierName,
        ...(dto.IsFromCart ? { IsFromCart: true } : {}),
        ...(items.length > 0 && !dto.IsFromCart ? { Items: items } : {}),
        ...(hasPaymentDetails
          ? {
              PaymentDetails: {
                TransactionId: dto.PaymentDetails?.TransactionId || (dto as any).TransactionId || '',
                SenderNumber: dto.PaymentDetails?.SenderNumber || (dto as any).SenderNumber || undefined,
                Amount: dto.PaymentDetails?.Amount || 0,
              },
            }
          : {}),
      };

      return this.createOrderWithPayload(payload);
    };

    if (dto.ShippingAddressId) {
      return sendOrder(dto.ShippingAddressId);
    }

    // Step 1: Auto-create shipping address record first
    const addressToCreate = (dto as any).Address || {
      Name: user?.Name || 'Customer',
      Phone: user?.Phone || '',
      Email: user?.Email || null,
      Street: 'Street Address',
      Thana: 'Thana',
      District: 'Dhaka',
      City: 'Dhaka',
    };

    return this.createShippingAddress(addressToCreate).pipe(
      switchMap((addressId) => sendOrder(addressId))
    );
  }

  getMyOrders(): Observable<Order[]> {
    const user = this.authService.currentUserSignal();
    const userId = user?.Id;
    if (!userId) {
      return of([]);
    }

    return this.http.get<any>(`${this.apiUrl}/order/get/${userId}`).pipe(
      map((res) => {
        const list = res?.data || res || [];
        return (Array.isArray(list) ? list : []).map((o: any) => this.formatOrder(o));
      }),
      catchError(() => of([]))
    );
  }

  getOrderById(id: number): Observable<Order> {
    return this.http.get<any>(`${this.apiUrl}/order/get-by-id/${id}`).pipe(
      map((res) => this.formatOrder(res?.data || res))
    );
  }

  trackOrder(orderNumber: string, phone: string): Observable<Order> {
    return this.http.post<any>(`${this.apiUrl}/order/track`, { orderNumber, phone }).pipe(
      map((res) => this.formatOrder(res?.data || res))
    );
  }

  // Admin Order Management
  getAdminOrders(filters?: OrderFilterParams): Observable<PaginatedResponse<Order>> {
    let params = new HttpParams();
    if (filters) {
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.orderStatusId) params = params.set('statusId', filters.orderStatusId.toString());
      if (filters.search) params = params.set('search', filters.search);
      if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
      if (filters.toDate) params = params.set('toDate', filters.toDate);
    }
    return this.http.get<any>(`${this.apiUrl}/order/admin/get-all`, { params }).pipe(
      map((res) => {
        const raw = res?.data || res;
        const rawItems = raw?.items || (Array.isArray(raw) ? raw : []);
        const formattedItems = rawItems.map((o: any) => this.formatOrder(o));
        return {
          data: formattedItems,
          total: raw?.pagination?.total || formattedItems.length,
          page: raw?.pagination?.page || 1,
          limit: raw?.pagination?.limit || 20,
          totalPages: raw?.pagination?.totalPages || 1,
        };
      }),
      catchError(() => of({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 }))
    );
  }

  updateOrderStatus(id: number, dto: UpdateOrderStatusDto): Observable<Order> {
    return this.http.patch<any>(`${this.apiUrl}/order/update-status/${id}`, dto).pipe(
      map((res) => this.formatOrder(res?.data || res))
    );
  }

  updateCourier(id: number, dto: UpdateCourierDto): Observable<Order> {
    return this.http.patch<any>(`${this.apiUrl}/order/update-status/${id}`, dto).pipe(
      map((res) => this.formatOrder(res?.data || res))
    );
  }

  updateOrder(id: number, data: {
    OrderStatusId?: number;
    Remarks?: string;
    CourierName?: string;
    TrackingNumber?: string;
    IsPaid?: boolean;
  }): Observable<Order> {
    const payload = {
      ...data,
      statusId: data.OrderStatusId,
      orderStatusId: data.OrderStatusId,
      courierName: data.CourierName,
      trackingNumber: data.TrackingNumber,
      remarks: data.Remarks,
    };
    return this.http.patch<any>(`${this.apiUrl}/order/update-status/${id}`, payload).pipe(
      map((res) => this.formatOrder(res?.data || res)),
      catchError(() => {
        return this.http.put<any>(`${this.apiUrl}/order/update/${id}`, payload).pipe(
          map((res) => this.formatOrder(res?.data || res)),
          catchError(() => of(this.formatOrder({ Id: id, ...data })))
        );
      })
    );
  }

  formatImageUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    if (cleanUrl.startsWith('/uploads/')) {
      return `http://localhost:3000${cleanUrl}`;
    }
    return `http://localhost:3000/uploads/${url}`;
  }

  formatOrder(o: any): Order {
    if (!o) return o;
    const subTotal =
      o.SubTotal !== undefined && o.SubTotal !== null
        ? Number(o.SubTotal)
        : o.subTotal !== undefined && o.subTotal !== null
        ? Number(o.subTotal)
        : 0;

    const delivery =
      o.DeliveryCharge !== undefined && o.DeliveryCharge !== null
        ? Number(o.DeliveryCharge)
        : o.deliveryCharge !== undefined && o.deliveryCharge !== null
        ? Number(o.deliveryCharge)
        : 0;

    const discount =
      o.DiscountAmount !== undefined && o.DiscountAmount !== null
        ? Number(o.DiscountAmount)
        : o.discountAmount !== undefined && o.discountAmount !== null
        ? Number(o.discountAmount)
        : Number(o.Discount || o.discount || 0);

    const grandTotal =
      o.GrandTotal !== undefined && o.GrandTotal !== null
        ? Number(o.GrandTotal)
        : o.grandTotal !== undefined && o.grandTotal !== null
        ? Number(o.grandTotal)
        : o.Total !== undefined && o.Total !== null
        ? Number(o.Total)
        : o.total !== undefined && o.total !== null
        ? Number(o.total)
        : o.totalAmount !== undefined && o.totalAmount !== null
        ? Number(o.totalAmount)
        : o.TotalAmount !== undefined && o.TotalAmount !== null
        ? Number(o.TotalAmount)
        : o.amount !== undefined && o.amount !== null
        ? Number(o.amount)
        : o.Amount !== undefined && o.Amount !== null
        ? Number(o.Amount)
        : subTotal + delivery - discount;

    const dateVal =
      o.CreatedAt ||
      o.createdAt ||
      o.created_at ||
      o.Date ||
      o.date ||
      o.OrderDate ||
      o.orderDate ||
      o.UpdatedAt ||
      o.updatedAt ||
      new Date().toISOString();

    const address =
      o.ShippingAddress ||
      o.shippingAddress ||
      o.Address ||
      o.address ||
      o.User?.Addresses?.[0] ||
      o.user?.addresses?.[0] || {
        Name:
          o.CustomerName ||
          o.customerName ||
          o.customer ||
          o.User?.Name ||
          o.user?.name ||
          o.Name ||
          o.name ||
          'Guest Customer',
        Phone:
          o.CustomerPhone ||
          o.customerPhone ||
          o.phone ||
          o.Phone ||
          o.User?.Phone ||
          o.user?.phone ||
          '',
        Street: o.street || o.Street || '',
        Thana: o.thana || o.Thana || '',
        District: o.district || o.District || '',
        City: o.city || o.City || '',
      };

    const statusObj =
      o.OrderStatus ||
      o.orderStatus ||
      (typeof o.status === 'string'
        ? { Id: o.OrderStatusId || 1, Name: o.status }
        : typeof o.Status === 'string'
        ? { Id: o.OrderStatusId || 1, Name: o.Status }
        : o.status || o.Status || { Id: 1, Name: 'Pending' });

    const items = (o.OrderItems || o.orderItems || o.items || o.Items || []).map((item: any) => {
      const variant = item.ProductVariants || item.productVariants || item.ProductVariant || item.productVariant || item.Variant || item.variant;
      const product = variant?.Products || variant?.products || variant?.Product || variant?.product || item.Product || item.product;
      
      const sizeName = item.SizeName || item.sizeName || variant?.Sizes?.Name || variant?.sizes?.Name || variant?.Size?.Name || variant?.size?.Name || item.Size?.Name || item.Size || item.size || '';
      const colorName = item.ColorName || item.colorName || variant?.Colors?.Name || variant?.colors?.Name || variant?.Color?.Name || variant?.color?.Name || item.Color?.Name || item.Color || item.color || '';
      const colorHex = variant?.Colors?.HexCode || variant?.Color?.HexCode || findMatchingHexCode(colorName) || '#3B82F6';

      const rawImage =
        item.ImageUrl ||
        item.imageUrl ||
        item.image ||
        item.Image ||
        variant?.Products?.ProductImages?.[0]?.ImageUrl ||
        variant?.Products?.ProductImages?.[0]?.imageUrl ||
        variant?.Product?.ProductImages?.[0]?.ImageUrl ||
        variant?.Product?.Images?.[0]?.ImageUrl ||
        variant?.ProductImages?.[0]?.ImageUrl ||
        variant?.Images?.[0]?.ImageUrl ||
        product?.ProductImages?.[0]?.ImageUrl ||
        product?.ProductImages?.[0]?.imageUrl ||
        product?.Images?.[0]?.ImageUrl ||
        product?.Images?.[0]?.imageUrl ||
        product?.ImageUrl ||
        product?.imageUrl ||
        '';

      const unitPrice = Number(
        item.UnitPrice ?? item.unitPrice ?? item.price ?? item.Price ?? (product?.DiscountPrice || product?.RegularPrice || 0)
      );
      const qty = item.Quantity ?? item.quantity ?? item.qty ?? item.Qty ?? 1;
      const formattedImg = this.formatImageUrl(rawImage);

      return {
        ...item,
        Id: item.Id || item.id || 0,
        Quantity: qty,
        UnitPrice: unitPrice,
        TotalPrice: Number(item.TotalPrice ?? item.totalPrice ?? (qty * unitPrice)),
        ProductName: item.ProductName || product?.Name || item.name || 'Product',
        SizeName: sizeName,
        ColorName: colorName,
        ColorHex: colorHex,
        ImageUrl: formattedImg,
        ProductVariant: {
          Id: variant?.Id || variant?.id || item.ProductVariantId || item.productVariantId,
          Size: sizeName ? { Name: sizeName } : undefined,
          Color: colorName ? { Name: colorName, HexCode: colorHex } : undefined,
          Product: {
            Id: product?.Id || product?.id || item.ProductId || item.productId || 0,
            Name: product?.Name || product?.name || item.ProductName || item.productName || item.Name || item.name || 'Product',
            SKU: product?.SKU || product?.sku || item.SKU || item.sku || '',
            Images: formattedImg ? [{ ImageUrl: formattedImg, IsPrimary: true }] : [],
          },
        },
      };
    });

    return {
      ...o,
      Id: o.Id ?? o.id ?? 0,
      OrderNumber:
        o.OrderNumber ||
        o.orderNumber ||
        o.order_number ||
        (o.Id ? `#ORD-${o.Id}` : o.id ? `#ORD-${o.id}` : 'N/A'),
      SubTotal: subTotal,
      DeliveryCharge: delivery,
      DiscountAmount: discount,
      GrandTotal: grandTotal,
      CreatedAt: dateVal,
      ShippingAddress: address,
      OrderStatus: statusObj,
      OrderStatusId: o.OrderStatusId || o.orderStatusId || statusObj?.Id || 1,
      IsPaid: Boolean(
        o.IsPaid ?? o.isPaid ?? (o.paymentStatus === 'PAID' || o.PaymentStatus === 'PAID' || o.is_paid)
      ),
      OrderItems: items,
    };
  }
}
