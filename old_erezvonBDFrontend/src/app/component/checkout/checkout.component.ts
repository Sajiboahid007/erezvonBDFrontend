import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { SharedModule } from '../../../shared.module';
import { CreateOrderPayload, PaymentMethod, Product, ProductVariant } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { PaymentService } from '../../core/services/payment.service';
import { ProductService } from '../../core/services/product.service';
import { ShopSettingsService } from '../../core/services/shop-settings.service';

export interface DirectBuyItem {
  productVariantId: number;
  quantity: number;
  productName: string;
  sizeName: string;
  colorName?: string;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
  stockAvailable?: number;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private paymentService = inject(PaymentService);
  private messageService = inject(MessageService);
  authService = inject(AuthService);
  cartService = inject(CartService);
  settingsService = inject(ShopSettingsService);

  paymentMethods = signal<PaymentMethod[]>([]);
  selectedPaymentMethodId = signal<number>(1);
  isInsideDhaka = signal<boolean>(true);
  submitting = signal<boolean>(false);
  loadingDirectItem = signal<boolean>(false);

  // Direct Buy Item (if navigating directly from "Buy Now")
  directBuyItem = signal<DirectBuyItem | null>(null);
  isDirectBuy = computed<boolean>(() => !!this.directBuyItem());

  checkoutForm!: FormGroup;

  subTotal = computed<number>(() => {
    if (this.isDirectBuy()) {
      return this.directBuyItem()?.totalPrice || 0;
    }
    return this.cartService.subTotal();
  });

  totalItemCount = computed<number>(() => {
    if (this.isDirectBuy()) {
      return this.directBuyItem()?.quantity || 1;
    }
    return this.cartService.itemCount();
  });

  deliveryCharge = computed<number>(() => {
    const settings = this.settingsService.settingsSignal();
    const st = this.subTotal();
    if (st >= (settings.FreeDeliveryThreshold || 2000)) {
      return 0;
    }
    return this.isInsideDhaka()
      ? settings.InsideDhakaDeliveryCharge || 70
      : settings.OutsideDhakaDeliveryCharge || 130;
  });

  grandTotal = computed<number>(() => {
    return this.subTotal() + this.deliveryCharge();
  });

  ngOnInit(): void {
    const currentUser = this.authService.currentUserSignal();
    this.checkoutForm = this.fb.group({
      name: [currentUser?.Name || '', Validators.required],
      phone: [currentUser?.Phone || '', Validators.required],
      email: [currentUser?.Email || '', [Validators.email]],
      street: ['', Validators.required],
      thana: ['', Validators.required],
      district: ['Dhaka', Validators.required],
      city: ['Dhaka', Validators.required],
      postalCode: [''],
      notes: [''],
      senderNumber: [''],
      transactionId: [''],
    });

    this.checkDirectBuyParams();

    this.paymentService.getPaymentMethods().subscribe({
      next: (methods) => {
        if (methods && methods.length > 0) {
          this.paymentMethods.set(methods);
          this.selectedPaymentMethodId.set(methods[0].Id);
        } else {
          this.paymentMethods.set([
            { Id: 1, Name: 'Cash on Delivery', Code: 'COD', IsActive: true },
            { Id: 2, Name: 'bKash Merchant / Personal', Code: 'BKASH', AccountNumber: '01700-000000', IsActive: true },
            { Id: 3, Name: 'Nagad Personal', Code: 'NAGAD', AccountNumber: '01700-000000', IsActive: true },
          ]);
          this.selectedPaymentMethodId.set(1);
        }
      },
      error: () => {
        this.paymentMethods.set([
          { Id: 1, Name: 'Cash on Delivery', Code: 'COD', IsActive: true },
          { Id: 2, Name: 'bKash Personal', Code: 'BKASH', AccountNumber: '01700-000000', IsActive: true },
        ]);
      },
    });
  }

  private checkDirectBuyParams(): void {
    this.route.queryParams.subscribe((params) => {
      const variantId = Number(params['variantId']);
      const quantity = Math.max(1, Number(params['quantity']) || 1);

      if (variantId) {
        this.loadDirectVariant(variantId, quantity);
      }
    });
  }

  private loadDirectVariant(variantId: number, quantity: number): void {
    this.loadingDirectItem.set(true);
    // Fetch products to find the corresponding variant
    this.productService.getProducts({ limit: 100 }).subscribe({
      next: (res) => {
        let foundProduct: Product | undefined;
        let foundVariant: ProductVariant | undefined;

        for (const prod of res.data || []) {
          const v = (prod.ProductVariants || prod.Variants || []).find((v) => v.Id === variantId);
          if (v) {
            foundProduct = prod;
            foundVariant = v;
            break;
          }
        }

        if (foundProduct && foundVariant) {
          const unitPrice =
            foundProduct.DiscountPrice !== null && foundProduct.DiscountPrice !== undefined
              ? foundProduct.DiscountPrice
              : (foundProduct.Price || foundProduct.RegularPrice || 0);
          const sizeName = foundVariant.Sizes?.Name || foundVariant.Size?.Name || 'M';
          const colorName = foundVariant.Colors?.Name || foundVariant.Color?.Name || undefined;
          const rawImg = foundProduct.ProductImages?.[0]?.ImageUrl || foundProduct.Images?.[0]?.ImageUrl || '';

          this.directBuyItem.set({
            productVariantId: foundVariant.Id,
            quantity,
            productName: foundProduct.Name,
            sizeName,
            colorName,
            unitPrice,
            totalPrice: unitPrice * quantity,
            imageUrl: rawImg,
            stockAvailable: foundVariant.StockQuantity,
          });
        }
        this.loadingDirectItem.set(false);
      },
      error: () => {
        this.loadingDirectItem.set(false);
      },
    });
  }

  isNonCod(): boolean {
    const pm = this.paymentMethods().find((m) => m.Id === this.selectedPaymentMethodId());
    return pm?.Code !== 'COD';
  }

  selectPaymentMethod(id: number): void {
    this.selectedPaymentMethodId.set(id);
  }

  placeOrder(): void {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Incomplete Address',
        detail: 'Please fill in all required shipping details (Name, Phone, Street, Thana, District, City).',
      });
      return;
    }

    if (!this.isDirectBuy() && this.cartService.cartItems().length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Cart is empty',
        detail: 'Please add items to cart or select a product to checkout.',
      });
      return;
    }

    const formVal = this.checkoutForm.value;
    this.submitting.set(true);

    const currentUser = this.authService.currentUserSignal();

    // Step 1: Create Shipping Address
    const addressPayload = {
      UserId: currentUser?.Id || null,
      Name: String(formVal.name).trim(),
      Phone: String(formVal.phone).trim(),
      Email: formVal.email ? String(formVal.email).trim() : null,
      Street: String(formVal.street).trim(),
      Thana: String(formVal.thana).trim(),
      District: String(formVal.district).trim(),
      City: String(formVal.city || formVal.district).trim(),
      PostalCode: formVal.postalCode ? String(formVal.postalCode).trim() : null,
    };

    this.orderService.createShippingAddress(addressPayload).subscribe({
      next: (shippingAddressId: number) => {
        // Step 2: Create Order with Variant Items
        const hasPaymentDetails = Boolean(formVal.transactionId || formVal.senderNumber);
        const paymentDetails = hasPaymentDetails
          ? {
              TransactionId: String(formVal.transactionId || '').trim(),
              SenderNumber: formVal.senderNumber ? String(formVal.senderNumber).trim() : undefined,
              Amount: this.grandTotal(),
            }
          : undefined;

        let orderPayload: CreateOrderPayload;

        if (this.isDirectBuy()) {
          const item = this.directBuyItem()!;
          orderPayload = {
            ShippingAddressId: shippingAddressId,
            PaymentMethodId: this.selectedPaymentMethodId(),
            IsInsideDhaka: this.isInsideDhaka(),
            DeliveryCharge: this.deliveryCharge(),
            Discount: 0,
            Items: [
              {
                ProductVariantId: item.productVariantId,
                Quantity: item.quantity,
              },
            ],
            PaymentDetails: paymentDetails,
          };
        } else {
          orderPayload = {
            ShippingAddressId: shippingAddressId,
            PaymentMethodId: this.selectedPaymentMethodId(),
            IsInsideDhaka: this.isInsideDhaka(),
            DeliveryCharge: this.deliveryCharge(),
            Discount: 0,
            IsFromCart: true,
            PaymentDetails: paymentDetails,
          };
        }

        this.orderService.createOrderWithPayload(orderPayload).subscribe({
          next: (order) => {
            this.submitting.set(false);
            if (!this.isDirectBuy()) {
              this.cartService.clearCart().subscribe();
            }
            this.messageService.add({
              severity: 'success',
              summary: 'Order Placed!',
              detail: `Your order #${order.OrderNumber || order.Id} has been successfully placed.`,
              life: 3000,
            });
            this.router.navigate(['/order-success', order.OrderNumber || order.Id]);
          },
          error: (err) => {
            this.submitting.set(false);
            const errorMsg =
              err?.error?.message ||
              err?.message ||
              'Could not process your order. Please verify stock availability and details.';
            this.messageService.add({
              severity: 'error',
              summary: 'Order Placement Failed',
              detail: errorMsg,
              life: 5000,
            });
          },
        });
      },
      error: (err) => {
        this.submitting.set(false);
        const errorMsg =
          err?.error?.message || err?.message || 'Could not save shipping address. Please check your details.';
        this.messageService.add({
          severity: 'error',
          summary: 'Address Error',
          detail: errorMsg,
          life: 4000,
        });
      },
    });
  }
}

