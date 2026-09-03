import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { SharedModule } from '../../../shared.module';
import { Color, Product, ProductImage, ProductVariant, Size } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { ShopSettingsService } from '../../core/services/shop-settings.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService, { optional: true });
  authService = inject(AuthService);
  productService = inject(ProductService);
  cartService = inject(CartService);
  settingsService = inject(ShopSettingsService);

  product = signal<Product | null>(null);
  selectedImage = signal<string>('');
  selectedVariantId = signal<number | null>(null);
  quantity = signal<number>(1);
  loading = signal<boolean>(true);
  suggestedProducts = signal<Product[]>([]);
  addingToCart = signal<boolean>(false);

  // List of all variants
  variants = computed<ProductVariant[]>(() => {
    const p = this.product();
    return p?.ProductVariants || p?.Variants || [];
  });

  // Selected Variant based on selectedVariantId
  selectedVariant = computed<ProductVariant | null>(() => {
    const vars = this.variants();
    const vid = this.selectedVariantId();
    if (vars.length === 0) return null;
    if (vid) {
      const found = vars.find((v) => v.Id === vid);
      if (found) return found;
    }
    return vars[0] || null;
  });

  // Available Sizes derived from variants
  availableSizes = computed<Array<{ variant: ProductVariant; size: Size; isOutOfStock: boolean }>>(() => {
    const vars = this.variants();
    return vars.map((v) => {
      const sizeObj: Size = v.Sizes || v.Size || { Id: v.SizeId, Name: `Size ${v.SizeId}` };
      return {
        variant: v,
        size: sizeObj,
        isOutOfStock: (v.StockQuantity ?? 0) <= 0,
      };
    });
  });

  // Current Stock of selected variant
  currentStock = computed<number>(() => {
    const variant = this.selectedVariant();
    return variant?.StockQuantity ?? 0;
  });

  isOutOfStock = computed<boolean>(() => {
    return this.currentStock() <= 0;
  });

  // Dynamic Stock Badge Info
  stockBadgeInfo = computed<{ text: string; badgeClass: string }>(() => {
    const stock = this.currentStock();
    const variant = this.selectedVariant();
    const sizeName = variant?.Sizes?.Name || variant?.Size?.Name;

    if (stock <= 0) {
      return {
        text: sizeName ? `Size ${sizeName} - Out of Stock` : 'Out of Stock',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }

    if (stock <= 10) {
      return {
        text: sizeName ? `Only ${stock} left in stock for Size ${sizeName}` : `Only ${stock} left in stock`,
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
      };
    }

    return {
      text: sizeName ? `In Stock (${stock} available for Size ${sizeName})` : `In Stock (${stock} available)`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  });

  // Effective Price calculation
  effectivePrice = computed<number>(() => {
    const p = this.product();
    if (!p) return 0;
    const base = p.DiscountPrice !== null && p.DiscountPrice !== undefined ? p.DiscountPrice : (p.Price || p.RegularPrice || 0);
    const additional = this.selectedVariant()?.AdditionalPrice || 0;
    return base + additional;
  });

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = Number(params['id']);
      if (id) {
        this.loadProduct(id);
      }
    });
  }

  loadProduct(id: number): void {
    this.loading.set(true);
    this.productService.getProductById(id).subscribe({
      next: (prod) => {
        this.product.set(prod);
        if (prod.ProductImages && prod.ProductImages.length > 0) {
          this.selectedImage.set(prod.ProductImages[0].ImageUrl);
        } else if (prod.Images && prod.Images.length > 0) {
          this.selectedImage.set(prod.Images[0].ImageUrl);
        }

        const variants = prod.ProductVariants || prod.Variants || [];
        if (variants.length > 0) {
          // Auto-select first in-stock variant, or first variant if all out of stock
          const inStockVariant = variants.find((v) => v.StockQuantity > 0);
          const initialVariant = inStockVariant || variants[0];
          this.selectedVariantId.set(initialVariant.Id);
          this.quantity.set(initialVariant.StockQuantity > 0 ? 1 : 1);
        }

        this.loading.set(false);
        this.loadSuggestedProducts(prod.CategoryId, prod.Id);
      },
      error: (err) => {
        this.loading.set(false);
        if (this.messageService) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'Could not load product details.',
          });
        }
      },
    });
  }

  loadSuggestedProducts(categoryId?: number, currentProductId?: number): void {
    this.productService.getProducts({ categoryId, limit: 8 }).subscribe({
      next: (res) => {
        const list = (res.data || []).filter((p) => p.Id !== currentProductId);
        if (list.length > 0) {
          this.suggestedProducts.set(list.slice(0, 4));
        } else {
          this.productService.getFeaturedProducts(6).subscribe({
            next: (feat) => {
              this.suggestedProducts.set((feat || []).filter((p) => p.Id !== currentProductId).slice(0, 4));
            },
          });
        }
      },
      error: () => {
        this.productService.getFeaturedProducts(6).subscribe({
          next: (feat) => {
            this.suggestedProducts.set((feat || []).filter((p) => p.Id !== currentProductId).slice(0, 4));
          },
        });
      },
    });
  }

  selectVariant(variant: ProductVariant): void {
    if (variant.StockQuantity <= 0) {
      if (this.messageService) {
        const sizeName = variant.Sizes?.Name || variant.Size?.Name || 'this size';
        this.messageService.add({
          severity: 'warn',
          summary: 'Out of Stock',
          detail: `Size ${sizeName} is currently out of stock.`,
          life: 2500,
        });
      }
      return;
    }

    this.selectedVariantId.set(variant.Id);

    // Adjust quantity if current quantity exceeds new variant's available stock
    if (this.quantity() > variant.StockQuantity) {
      this.quantity.set(Math.max(1, variant.StockQuantity));
    }
  }

  selectThumbnail(img: ProductImage): void {
    this.selectedImage.set(img.ImageUrl);
  }

  incrementQuantity(): void {
    const max = this.currentStock();
    if (this.quantity() < max) {
      this.quantity.update((q) => q + 1);
    } else if (this.messageService) {
      this.messageService.add({
        severity: 'info',
        summary: 'Maximum Available Stock Reached',
        detail: `You have reached the maximum available stock (${max} units) for this size.`,
        life: 2500,
      });
    }
  }

  decrementQuantity(): void {
    if (this.quantity() > 1) {
      this.quantity.update((q) => q - 1);
    }
  }

  addToCart(): void {
    const variant = this.selectedVariant();
    if (!variant || variant.StockQuantity <= 0) {
      if (this.messageService) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Item Unavailable',
          detail: 'Please select an in-stock size before adding to cart.',
        });
      }
      return;
    }

    this.addingToCart.set(true);
    this.cartService
      .addToCart({
        ProductVariantId: variant.Id,
        Quantity: this.quantity(),
      })
      .subscribe({
        next: () => {
          this.addingToCart.set(false);
        },
        error: (err) => {
          this.addingToCart.set(false);
          if (this.messageService) {
            this.messageService.add({
              severity: 'error',
              summary: 'Stock Limit Exceeded',
              detail: err?.error?.message || 'Requested quantity exceeds available stock.',
            });
          }
        },
      });
  }

  buyNow(): void {
    const variant = this.selectedVariant();
    if (!variant || variant.StockQuantity <= 0) {
      if (this.messageService) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Out of Stock',
          detail: 'Selected size is currently out of stock.',
        });
      }
      return;
    }

    // Direct Buy Now: navigate to checkout with the selected variant and quantity
    this.router.navigate(['/checkout'], {
      queryParams: {
        variantId: variant.Id,
        quantity: this.quantity(),
      },
    });
  }
}
