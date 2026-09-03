import { User, Address } from './user.model';
import { ProductVariant, Product } from './product.model';

export interface OrderStatus {
  Id: number;
  Name: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned' | string;
  Description?: string;
}

export interface PaymentMethod {
  Id: number;
  Name: 'Cash on Delivery' | 'bKash' | 'Nagad' | 'Rocket' | 'Card' | string;
  Code: 'COD' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'CARD' | string;
  AccountNumber?: string;
  Instructions?: string;
  IsActive: boolean;
}

export interface Payment {
  Id: number;
  OrderId: number;
  PaymentMethodId: number;
  Amount: number;
  TransactionId?: string;
  SenderNumber?: string;
  IsVerified: boolean;
  CreatedAt: string;
  PaymentMethod?: PaymentMethod;
}

export interface OrderItem {
  Id: number;
  OrderId: number;
  ProductVariantId: number;
  Quantity: number;
  UnitPrice: number;
  TotalPrice: number;
  ProductName?: string;
  SizeName?: string;
  ColorName?: string;
  ColorHex?: string;
  ImageUrl?: string;
  Size?: string;
  Color?: string;
  ProductVariant?: ProductVariant & {
    Product?: Product;
  };
  ProductVariants?: any;
}

export interface OrderHistory {
  Id: number;
  OrderId: number;
  OrderStatusId: number;
  Remarks?: string;
  CreatedAt: string;
  OrderStatus?: OrderStatus;
}

export interface Order {
  Id: number;
  OrderNumber: string;
  UserId?: number;
  ShippingAddressId?: number;
  OrderStatusId: number;
  SubTotal: number;
  DeliveryCharge: number;
  DiscountAmount: number;
  GrandTotal: number;
  IsInsideDhaka: boolean;
  IsPaid: boolean;
  CourierName?: string;
  TrackingNumber?: string;
  Notes?: string;
  CreatedAt: string;
  UpdatedAt?: string;
  User?: User;
  ShippingAddress?: Address;
  OrderStatus?: OrderStatus;
  OrderItems?: OrderItem[];
  Payments?: Payment[];
  PaymentMethod?: PaymentMethod;
  PaymentMethodId?: number;
  OrderHistories?: OrderHistory[];
}

export interface CreateOrderPayload {
  ShippingAddressId: number;
  PaymentMethodId: number;
  IsInsideDhaka: boolean;
  DeliveryCharge?: number;
  Discount?: number;
  CourierName?: string;
  Items?: Array<{
    ProductVariantId: number;
    Quantity: number;
  }>;
  IsFromCart?: boolean;
  PaymentDetails?: {
    TransactionId: string;
    SenderNumber?: string;
    Amount: number;
  };
}

export interface CreateOrderDto {
  ShippingAddressId?: number;
  Address?: Address;
  PaymentMethodId: number;
  IsInsideDhaka: boolean;
  DeliveryCharge?: number;
  Discount?: number;
  CourierName?: string;
  Notes?: string;
  items?: {
    ProductVariantId: number;
    Quantity: number;
  }[];
  Items?: {
    ProductVariantId: number;
    Quantity: number;
  }[];
  IsFromCart?: boolean;
  TransactionId?: string;
  SenderNumber?: string;
  PaymentDetails?: {
    TransactionId: string;
    SenderNumber?: string;
    Amount: number;
  };
}

export interface OrderFilterParams {
  page?: number;
  limit?: number;
  orderStatusId?: number;
  isPaid?: boolean;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface UpdateOrderStatusDto {
  OrderStatusId: number;
  Remarks?: string;
}

export interface UpdateCourierDto {
  CourierName: string;
  TrackingNumber: string;
}
