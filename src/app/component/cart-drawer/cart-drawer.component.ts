import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SharedModule } from '../../../shared.module';
import { CartService } from '../../core/services/cart.service';
import { ShopSettingsService } from '../../core/services/shop-settings.service';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.scss',
})
export class CartDrawerComponent {
  cartService = inject(CartService);
  settingsService = inject(ShopSettingsService);
  private router = inject(Router);

  closeDrawer(): void {
    this.cartService.toggleCartDrawer(false);
  }

  incrementQuantity(itemId: number, currentQty: number): void {
    this.cartService.updateQuantity(itemId, currentQty + 1).subscribe();
  }

  decrementQuantity(itemId: number, currentQty: number): void {
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
    this.closeDrawer();
    this.router.navigate(['/checkout']);
  }

  goToCart(): void {
    this.closeDrawer();
    this.router.navigate(['/cart']);
  }
}
