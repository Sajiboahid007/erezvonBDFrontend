import { Product, ProductVariant } from './product.model';

export interface CartItem {
  Id: number;
  CartId?: number;
  ProductVariantId: number;
  Quantity: number;
  CreatedAt?: string;
  UpdatedAt?: string;
  ProductVariant?: ProductVariant & {
    Product?: Product;
  };
}

export interface Cart {
  Id: number;
  UserId?: number;
  Items: CartItem[];
  SubTotal: number;
  TotalItems: number;
}

export interface AddToCartRequest {
  ProductVariantId: number;
  Quantity: number;
}

export interface UpdateCartItemRequest {
  Quantity: number;
}
