import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of, switchMap, catchError } from 'rxjs';
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
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  formatImageUrl(url?: string): string {
    if (!url) return '';
    return url;
  }

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
      IsMarkToDelete: false,
      CreatedBy: 'USER',
    };

    return from(
      this.supabase.client
        .from('Address')
        .insert(addressPayload)
        .select('Id')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return Number(data.Id);
      })
    );
  }

  createOrderWithPayload(payload: CreateOrderPayload): Observable<Order> {
    const user = this.authService.currentUserSignal();
    const run = async (): Promise<Order> => {
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Calculate items & totals
      let subTotal = 0;
      const orderItemRows: any[] = [];

      for (const item of payload.Items || []) {
        const { data: variant } = await this.supabase.client
          .from('ProductVariants')
          .select('*, Products(*), Sizes(*), Colors(*)')
          .eq('Id', item.ProductVariantId)
          .single();

        const unitPrice = Number(variant?.Products?.DiscountPrice || variant?.Products?.Price || 0);
        const lineTotal = unitPrice * item.Quantity;
        subTotal += lineTotal;

        orderItemRows.push({
          ProductVariantId: item.ProductVariantId,
          ProductName: variant?.Products?.Name || 'Product',
          SizeName: variant?.Sizes?.Name || 'Standard',
          ColorName: variant?.Colors?.Name || null,
          Quantity: item.Quantity,
          UnitPrice: unitPrice,
          LineTotal: lineTotal,
          IsMarkToDelete: false,
          CreatedBy: 'USER',
        });
      }

      const deliveryCharge = Number(payload.DeliveryCharge || 0);
      const discount = Number(payload.Discount || 0);
      const totalAmount = Math.max(0, subTotal + deliveryCharge - discount);

      // 2. Insert Orders
      const { data: order, error: orderErr } = await this.supabase.client
        .from('Orders')
        .insert({
          UserId: user?.Id || null,
          OrderNumber: orderNumber,
          ShippingAddressId: payload.ShippingAddressId,
          OrderStatusId: 1, // Pending
          PaymentMethodId: payload.PaymentMethodId || 1,
          SubTotal: subTotal,
          DeliveryCharge: deliveryCharge,
          Discount: discount,
          TotalAmount: totalAmount,
          IsInsideDhaka: payload.IsInsideDhaka ?? true,
          IsPaid: false,
          CourierName: payload.CourierName || null,
          IsMarkToDelete: false,
          CreatedBy: user?.Name || 'USER',
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 3. Insert OrderItems
      if (orderItemRows.length > 0) {
        const itemsWithOrderId = orderItemRows.map((i) => ({
          ...i,
          OrderId: order.Id,
        }));
        await this.supabase.client.from('OrderItems').insert(itemsWithOrderId);
      }

      // 4. Insert initial OrderHistory
      await this.supabase.client.from('OrderHistory').insert({
        OrderId: order.Id,
        OrderStatusId: 1,
        Remarks: 'Order placed successfully',
        IsMarkToDelete: false,
        CreatedBy: 'SYSTEM',
      });

      // 5. Insert Payment if payment details provided
      if (payload.PaymentDetails?.TransactionId) {
        await this.supabase.client.from('Payments').insert({
          OrderId: order.Id,
          PaymentMethodId: payload.PaymentMethodId || 1,
          Amount: payload.PaymentDetails.Amount || totalAmount,
          TransactionId: payload.PaymentDetails.TransactionId,
          SenderNumber: payload.PaymentDetails.SenderNumber || null,
          IsSuccessful: false,
          IsMarkToDelete: false,
          CreatedBy: 'USER',
        });
      }

      // Fetch full created order
      const full = await this.fetchFullOrder(order.Id);
      return this.formatOrder(full);
    };

    return from(run());
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

    return from(
      this.supabase.client
        .from('Orders')
        .select('*, Address(*), OrderStatus(*), PaymentMethods(*), OrderItems(*), OrderHistory(*, OrderStatus(*))')
        .eq('UserId', userId)
        .eq('IsMarkToDelete', false)
        .order('Id', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) return [];
        return (data || []).map((o: any) => this.formatOrder(o));
      }),
      catchError(() => of([]))
    );
  }

  getOrderById(id: number): Observable<Order> {
    return from(this.fetchFullOrder(id)).pipe(
      map((order) => this.formatOrder(order))
    );
  }

  trackOrder(orderNumber: string, phone: string): Observable<Order> {
    const run = async () => {
      const { data: order, error } = await this.supabase.client
        .from('Orders')
        .select('*, Address(*), OrderStatus(*), PaymentMethods(*), OrderItems(*), OrderHistory(*, OrderStatus(*))')
        .eq('OrderNumber', orderNumber.trim())
        .eq('IsMarkToDelete', false)
        .single();

      if (error || !order) {
        throw new Error('Order not found with provided order number');
      }

      return this.formatOrder(order);
    };

    return from(run());
  }

  getAdminOrders(filters?: OrderFilterParams): Observable<PaginatedResponse<Order>> {
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 20;
    const fromIndex = (page - 1) * limit;
    const toIndex = fromIndex + limit - 1;

    let query = this.supabase.client
      .from('Orders')
      .select(
        '*, Address(*), OrderStatus(*), PaymentMethods(*), OrderItems(*), OrderHistory(*, OrderStatus(*))',
        { count: 'exact' }
      )
      .eq('IsMarkToDelete', false)
      .order('Id', { ascending: false })
      .range(fromIndex, toIndex);

    if (filters?.orderStatusId) {
      query = query.eq('OrderStatusId', Number(filters.orderStatusId));
    }
    if (filters?.search) {
      query = query.ilike('OrderNumber', `%${filters.search.trim()}%`);
    }

    return from(query).pipe(
      map(({ data, count, error }) => {
        if (error) {
          console.error('Error fetching admin orders:', error);
          return { data: [], total: 0, page, limit, totalPages: 1 };
        }
        const total = count || (data || []).length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const formatted = (data || []).map((o: any) => this.formatOrder(o));
        return {
          data: formatted,
          total,
          page,
          limit,
          totalPages,
        };
      }),
      catchError(() => of({ data: [], total: 0, page: 1, limit, totalPages: 1 }))
    );
  }

  updateOrderStatus(id: number, dto: UpdateOrderStatusDto): Observable<Order> {
    const run = async () => {
      const statusId = dto.OrderStatusId || (dto as any).statusId;
      await this.supabase.client
        .from('Orders')
        .update({
          OrderStatusId: statusId,
          UpdatedDate: new Date().toISOString(),
        })
        .eq('Id', id);

      await this.supabase.client.from('OrderHistory').insert({
        OrderId: id,
        OrderStatusId: statusId,
        Remarks: dto.Remarks || (dto as any).remarks || 'Status updated by admin',
        IsMarkToDelete: false,
        CreatedBy: 'Admin',
      });

      const full = await this.fetchFullOrder(id);
      return this.formatOrder(full);
    };

    return from(run());
  }

  updateCourier(id: number, dto: UpdateCourierDto): Observable<Order> {
    const run = async () => {
      await this.supabase.client
        .from('Orders')
        .update({
          CourierName: dto.CourierName || (dto as any).courierName,
          TrackingNumber: dto.TrackingNumber || (dto as any).trackingNumber,
          UpdatedDate: new Date().toISOString(),
        })
        .eq('Id', id);

      const full = await this.fetchFullOrder(id);
      return this.formatOrder(full);
    };

    return from(run());
  }

  updateOrder(id: number, data: {
    OrderStatusId?: number;
    Remarks?: string;
    CourierName?: string;
    TrackingNumber?: string;
    IsPaid?: boolean;
  }): Observable<Order> {
    const run = async () => {
      const updatePayload: any = {
        UpdatedDate: new Date().toISOString(),
      };
      if (data.OrderStatusId) updatePayload.OrderStatusId = data.OrderStatusId;
      if (data.CourierName) updatePayload.CourierName = data.CourierName;
      if (data.TrackingNumber) updatePayload.TrackingNumber = data.TrackingNumber;
      if (data.IsPaid !== undefined) updatePayload.IsPaid = data.IsPaid;

      await this.supabase.client.from('Orders').update(updatePayload).eq('Id', id);

      if (data.OrderStatusId) {
        await this.supabase.client.from('OrderHistory').insert({
          OrderId: id,
          OrderStatusId: data.OrderStatusId,
          Remarks: data.Remarks || 'Order updated',
          IsMarkToDelete: false,
          CreatedBy: 'Admin',
        });
      }

      const full = await this.fetchFullOrder(id);
      return this.formatOrder(full);
    };

    return from(run());
  }

  private async fetchFullOrder(id: number): Promise<any> {
    const { data } = await this.supabase.client
      .from('Orders')
      .select('*, Address(*), OrderStatus(*), PaymentMethods(*), OrderItems(*), OrderHistory(*, OrderStatus(*))')
      .eq('Id', id)
      .single();
    return data;
  }

  formatOrder(o: any): Order {
    if (!o) return o;
    const subTotal = Number(o.SubTotal || 0);
    const deliveryCharge = Number(o.DeliveryCharge || 0);
    const discount = Number(o.Discount || 0);
    const totalAmount = Number(o.TotalAmount || subTotal + deliveryCharge - discount);

    const items = (o.OrderItems || []).map((i: any) => ({
      Id: i.Id,
      OrderId: i.OrderId,
      ProductVariantId: i.ProductVariantId,
      ProductName: i.ProductName,
      SizeName: i.SizeName,
      ColorName: i.ColorName,
      Quantity: Number(i.Quantity || 1),
      UnitPrice: Number(i.UnitPrice || 0),
      LineTotal: Number(i.LineTotal || i.Quantity * i.UnitPrice || 0),
    }));

    return {
      ...o,
      Id: o.Id,
      OrderNumber: o.OrderNumber,
      SubTotal: subTotal,
      DeliveryCharge: deliveryCharge,
      Discount: discount,
      TotalAmount: totalAmount,
      IsPaid: Boolean(o.IsPaid),
      OrderStatus: o.OrderStatus || { Id: o.OrderStatusId, Name: 'Pending' },
      PaymentMethod: o.PaymentMethods || { Id: o.PaymentMethodId, Name: 'Cash on Delivery' },
      ShippingAddress: o.Address || {},
      Items: items,
      OrderItems: items,
      History: o.OrderHistory || [],
    };
  }
}
