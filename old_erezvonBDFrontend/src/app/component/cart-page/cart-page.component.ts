import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SharedModule } from '../../../shared.module';
import { CartService } from '../../core/services/cart.service';
import { ShopSettingsService } from '../../core/services/shop-settings.service';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss',
})
export class CartPageComponent {
  cartService = inject(CartService);
  settingsService = inject(ShopSettingsService);
  private router = inject(Router);

  isInsideDhaka = signal<boolean>(true);

  deliveryCharge = computed<number>(() => {
    const settings = this.settingsService.settingsSignal();
    const subTotal = this.cartService.subTotal();
    if (subTotal >= (settings.FreeDeliveryThreshold)) {
      return 0;
    }
    return this.isInsideDhaka()
      ? settings.InsideDhakaDeliveryCharge || 60
      : settings.OutsideDhakaDeliveryCharge || 120;
  });

  grandTotal = computed<number>(() => {
    return this.cartService.subTotal() + this.deliveryCharge();
  });

  increment(itemId: number, currentQty: number): void {
    this.cartService.updateQuantity(itemId, currentQty + 1).subscribe();
  }

  decrement(itemId: number, currentQty: number): void {
    if (currentQty > 1) {
      this.cartService.updateQuantity(itemId, currentQty - 1).subscribe();
    } else {
      this.cartService.removeItem(itemId).subscribe();
    }
  }

  removeItem(itemId: number): void {
    this.cartService.removeItem(itemId).subscribe();
  }

  goToCheckout(): void {
    this.router.navigate(['/checkout']);
  }
}
