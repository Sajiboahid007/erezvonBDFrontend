import { Injectable, computed, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Observable, from, map, of, tap, catchError } from 'rxjs';
import { AddToCartRequest, Cart, CartItem } from '../models';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService, { optional: true });

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
    return url;
  }

  loadCart(): Observable<Cart | null> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return of(null);
    }

    const run = async (): Promise<Cart | null> => {
      // Find or create cart for user
      let { data: cart } = await this.supabase.client
        .from('Cart')
        .select('Id, UserId')
        .eq('UserId', userId)
        .eq('IsMarkToDelete', false)
        .maybeSingle();

      if (!cart) {
        const { data: createdCart } = await this.supabase.client
          .from('Cart')
          .insert({ UserId: userId, IsMarkToDelete: false, CreatedBy: 'SYSTEM' })
          .select('Id, UserId')
          .single();
        cart = createdCart;
      }

      if (!cart) return null;

      // Fetch cart items with variant and product relations
      const { data: rawItems } = await this.supabase.client
        .from('CartItems')
        .select('*, ProductVariants(*, Products(*, ProductImages(*)), Sizes(*), Colors(*))')
        .eq('CartId', cart.Id)
        .eq('IsMarkToDelete', false);

      const items: CartItem[] = (rawItems || []).map((ci: any) => {
        const pv = ci.ProductVariants || {};
        const prod = pv.Products || {};
        const images = prod.ProductImages || [];
        const firstImg = images.length > 0 ? images[0].ImageUrl : '';

        const price = Number(prod.DiscountPrice || prod.Price || ci.UnitPrice || 0);

        return {
          Id: ci.Id,
          CartId: cart.Id,
          ProductVariantId: ci.ProductVariantId,
          Quantity: ci.Quantity || 1,
          ProductVariant: {
            Id: pv.Id || ci.ProductVariantId,
            StockQuantity: Number(pv.StockQuantity || 10),
            Size: pv.Sizes || { Id: pv.SizeId, Name: 'Standard' },
            Color: pv.Colors || { Id: pv.ColorId, Name: 'Standard', HexCode: '#333' },
            Product: {
              Id: prod.Id || 0,
              Name: prod.Name || 'Product',
              SKU: prod.SKU || '',
              RegularPrice: Number(prod.Price || 0),
              DiscountPrice: Number(prod.DiscountPrice || prod.Price || 0),
              Images: [{ Id: 1, ImageUrl: this.formatImageUrl(firstImg), IsPrimary: true }],
              CategoryId: prod.CategoryId || 1,
              IsFeatured: false,
              IsActive: true,
            },
          } as any,
        };
      });

      const totalItems = items.reduce((acc, i) => acc + i.Quantity, 0);
      const subTotal = items.reduce((acc, i) => {
        const p = i.ProductVariant?.Product?.DiscountPrice || i.ProductVariant?.Product?.RegularPrice || 0;
        return acc + p * i.Quantity;
      }, 0);

      return {
        Id: cart.Id,
        UserId: cart.UserId,
        TotalItems: totalItems,
        SubTotal: subTotal,
        Items: items,
      };
    };

    return from(run()).pipe(
      tap((cart) => {
        if (cart) {
          this.cartSignal.set(cart);
        }
      }),
      catchError(() => of(null))
    );
  }

  addToCart(dto: AddToCartRequest): Observable<any> {
    const userId = this.getCurrentUserId();
    const run = async () => {
      if (!userId) {
        throw new Error('Please login to add items to cart');
      }

      // Find or create cart
      let { data: cart } = await this.supabase.client
        .from('Cart')
        .select('Id')
        .eq('UserId', userId)
        .eq('IsMarkToDelete', false)
        .maybeSingle();

      if (!cart) {
        const { data: created } = await this.supabase.client
          .from('Cart')
          .insert({ UserId: userId, IsMarkToDelete: false, CreatedBy: 'SYSTEM' })
          .select('Id')
          .single();
        cart = created;
      }

      const variantId = dto.ProductVariantId || (dto as any).productVariantId;
      const quantity = Math.max(1, dto.Quantity || (dto as any).quantity || 1);

      // Check if item already exists in cart
      const { data: existing } = await this.supabase.client
        .from('CartItems')
        .select('Id, Quantity')
        .eq('CartId', cart!.Id)
        .eq('ProductVariantId', variantId)
        .eq('IsMarkToDelete', false)
        .maybeSingle();

      if (existing) {
        await this.supabase.client
          .from('CartItems')
          .update({
            Quantity: existing.Quantity + quantity,
            UpdatedDate: new Date().toISOString(),
          })
          .eq('Id', existing.Id);
      } else {
        // Get variant price
        const { data: variant } = await this.supabase.client
          .from('ProductVariants')
          .select('*, Products(Price, DiscountPrice)')
          .eq('Id', variantId)
          .single();

        const unitPrice =
          variant?.Products?.DiscountPrice || variant?.Products?.Price || 0;

        await this.supabase.client.from('CartItems').insert({
          CartId: cart!.Id,
          ProductVariantId: variantId,
          Quantity: quantity,
          UnitPrice: unitPrice,
          IsMarkToDelete: false,
          CreatedBy: 'USER',
        });
      }

      return { success: true };
    };

    return from(run()).pipe(
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
    const run = async () => {
      if (quantity <= 0) {
        await this.supabase.client
          .from('CartItems')
          .update({ IsMarkToDelete: true, UpdatedDate: new Date().toISOString() })
          .eq('Id', cartItemId);
      } else {
        await this.supabase.client
          .from('CartItems')
          .update({ Quantity: quantity, UpdatedDate: new Date().toISOString() })
          .eq('Id', cartItemId);
      }
      return { success: true };
    };

    return from(run()).pipe(
      tap(() => {
        this.loadCart().subscribe();
      })
    );
  }

  removeItem(cartItemId: number): Observable<any> {
    return from(
      this.supabase.client
        .from('CartItems')
        .update({ IsMarkToDelete: true, UpdatedDate: new Date().toISOString() })
        .eq('Id', cartItemId)
    ).pipe(
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

    const run = async () => {
      const { data: cart } = await this.supabase.client
        .from('Cart')
        .select('Id')
        .eq('UserId', userId)
        .eq('IsMarkToDelete', false)
        .maybeSingle();

      if (cart) {
        await this.supabase.client
          .from('CartItems')
          .update({ IsMarkToDelete: true, UpdatedDate: new Date().toISOString() })
          .eq('CartId', cart.Id);
      }
      return { message: 'Cart cleared' };
    };

    return from(run()).pipe(
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
