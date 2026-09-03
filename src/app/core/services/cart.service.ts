import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { AddToCartRequest, Cart, CartItem } from '../models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private messageService = inject(MessageService, { optional: true });
  private apiUrl = 'http://localhost:3000/api';

  cartSignal = signal<Cart | null>(null);
  cartDrawerSignal = signal<boolean>(false);

  cartItems = computed<CartItem[]>(() => this.cartSignal()?.Items || []);
  itemCount = computed<number>(() => {
    const cart = this.cartSignal();
    if (cart?.TotalItems !== undefined) return cart.TotalItems;
    return this.cartItems().reduce((acc, item) => acc + item.Quantity, 0);
  });
  subTotal = computed<number>(() => {
    const cart = this.cartSignal();
    if (cart?.SubTotal !== undefined) return cart.SubTotal;
    return this.cartItems().reduce((acc, item) => {
      const price =
        item.ProductVariant?.Product?.DiscountPrice ||
        item.ProductVariant?.Product?.RegularPrice ||
        0;
      const additional = item.ProductVariant?.AdditionalPrice || 0;
      return acc + (price + additional) * item.Quantity;
    }, 0);
  });

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.loadCart().subscribe();
    }
  }

  toggleCartDrawer(state?: boolean): void {
    if (state !== undefined) {
      this.cartDrawerSignal.set(state);
    } else {
      this.cartDrawerSignal.update((v) => !v);
    }
  }

  private getCurrentUserId(): number | null {
    return this.authService.currentUserSignal()?.Id || null;
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

  loadCart(): Observable<Cart | null> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return of(null);
    }

    return this.http.get<any>(`${this.apiUrl}/cart/get/${userId}`).pipe(
      map((res) => {
        const raw = res?.data || res;
        if (!raw) return null;
        const formatted: Cart = {
          Id: raw.cartId || raw.Id || 0,
          UserId: raw.userId || raw.UserId,
          TotalItems: raw.totalItems || 0,
          SubTotal: raw.subTotal || 0,
          Items: (raw.items || raw.CartItems || []).map((ci: any) => {
            const rawImageUrl =
              ci.primaryImage ||
              ci.PrimaryImage ||
              ci.imageUrl ||
              ci.ImageUrl ||
              ci.image ||
              ci.Image ||
              ci.productImage ||
              ci.ProductImage ||
              ci.ProductVariants?.ProductImages?.[0]?.ImageUrl ||
              ci.ProductVariants?.ProductImages?.[0]?.imageUrl ||
              ci.ProductVariants?.Images?.[0]?.ImageUrl ||
              ci.ProductVariants?.Images?.[0]?.imageUrl ||
              ci.ProductVariants?.Products?.ProductImages?.[0]?.ImageUrl ||
              ci.ProductVariants?.Products?.ProductImages?.[0]?.imageUrl ||
              ci.ProductVariants?.Products?.Images?.[0]?.ImageUrl ||
              ci.ProductVariants?.Products?.Images?.[0]?.imageUrl ||
              ci.ProductVariants?.Product?.ProductImages?.[0]?.ImageUrl ||
              ci.ProductVariants?.Product?.Images?.[0]?.ImageUrl ||
              ci.ProductVariant?.ProductImages?.[0]?.ImageUrl ||
              ci.ProductVariant?.Product?.ProductImages?.[0]?.ImageUrl ||
              ci.ProductVariant?.Product?.Images?.[0]?.ImageUrl ||
              ci.Product?.ProductImages?.[0]?.ImageUrl ||
              ci.Product?.Images?.[0]?.ImageUrl ||
              '';

            const resolvedImage = this.formatImageUrl(rawImageUrl);

            return {
              Id: ci.id || ci.Id,
              CartId: raw.cartId || raw.Id,
              ProductVariantId: ci.productVariantId || ci.ProductVariantId,
              Quantity: ci.quantity || ci.Quantity || 1,
              ProductVariant: {
                Id: ci.productVariantId || ci.ProductVariantId,
                StockQuantity: ci.stockAvailable || 10,
                Size: ci.size ? { Id: 1, Name: ci.size } : (ci.ProductVariants?.Sizes || ci.ProductVariant?.Size),
                Color: ci.color ? { Id: 1, Name: ci.color, HexCode: '#333' } : (ci.ProductVariants?.Colors || ci.ProductVariant?.Color),
                Product: {
                  Id: ci.productId || ci.ProductVariants?.Products?.Id || ci.ProductVariant?.Product?.Id || 0,
                  Name: ci.productName || ci.ProductVariants?.Products?.Name || ci.ProductVariant?.Product?.Name || 'Product',
                  SKU: ci.sku || ci.ProductVariants?.Products?.SKU || ci.ProductVariant?.Product?.SKU || '',
                  RegularPrice: ci.currentPrice || ci.unitPrice || ci.ProductVariants?.Products?.RegularPrice || 0,
                  DiscountPrice: ci.currentPrice || ci.unitPrice || ci.ProductVariants?.Products?.DiscountPrice || 0,
                  Images: [{ Id: 1, ImageUrl: resolvedImage, IsPrimary: true }],
                  CategoryId: 1,
                  IsFeatured: false,
                  IsActive: true,
                },
              } as any,
            };
          }),
        };
        return formatted;
      }),
      tap((cart) => {
        if (cart) {
          this.cartSignal.set(cart);
        }
      }),
      catchError(() => of(null))
    );
  }

  addToCart(dto: AddToCartRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cart-item/add`, dto).pipe(
      tap(() => {
        this.loadCart().subscribe();
        this.toggleCartDrawer(true);
        if (this.messageService) {
          this.messageService.add({
            severity: 'success',
            summary: 'Added to Cart',
            detail: 'Product successfully added to your shopping cart.',
            life: 2500,
          });
        }
      })
    );
  }

  updateQuantity(cartItemId: number, quantity: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/cart-item/update-quantity/${cartItemId}`, { Quantity: quantity }).pipe(
      tap(() => {
        this.loadCart().subscribe();
      })
    );
  }

  removeItem(cartItemId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/cart-item/remove/${cartItemId}`).pipe(
      tap(() => {
        this.loadCart().subscribe();
        if (this.messageService) {
          this.messageService.add({
            severity: 'info',
            summary: 'Item Removed',
            detail: 'Item removed from your cart.',
            life: 2000,
          });
        }
      })
    );
  }

  clearCart(): Observable<any> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      this.cartSignal.set(null);
      return of({ message: 'Cart cleared' });
    }

    return this.http.delete<any>(`${this.apiUrl}/cart/clear/${userId}`).pipe(
      tap(() => {
        this.cartSignal.set(null);
      }),
      catchError(() => {
        this.cartSignal.set(null);
        return of({ message: 'Cart cleared' });
      })
    );
  }
}
