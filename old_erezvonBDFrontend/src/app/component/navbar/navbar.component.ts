import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SharedModule } from '../../../shared.module';
import { Category, Product } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { CategoryService } from '../../core/services/category.service';
import { ProductService } from '../../core/services/product.service';
import { ShopSettingsService } from '../../core/services/shop-settings.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  authService = inject(AuthService);
  cartService = inject(CartService);
  categoryService = inject(CategoryService);
  productService = inject(ProductService);
  settingsService = inject(ShopSettingsService);
  private router = inject(Router);

  categories = signal<Category[]>([]);
  searchQuery = signal<string>('');
  searchResults = signal<Product[]>([]);
  isSearching = signal<boolean>(false);
  mobileMenuOpen = signal<boolean>(false);
  userMenuOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats || []),
      error: () => {},
    });
    this.settingsService.getSettings().subscribe({
      next: () => {},
      error: () => {},
    });
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  onSearchInput(): void {
    const query = this.searchQuery().trim();
    if (query.length > 1) {
      this.isSearching.set(true);
      this.productService.searchProducts(query).subscribe({
        next: (res) => {
          this.searchResults.set(res || []);
          this.isSearching.set(false);
        },
        error: () => this.isSearching.set(false),
      });
    } else {
      this.searchResults.set([]);
    }
  }

  submitSearch(): void {
    const query = this.searchQuery().trim();
    if (query) {
      this.searchResults.set([]);
      this.router.navigate(['/shop'], { queryParams: { search: query } });
    }
  }

  selectProduct(product: Product): void {
    this.searchResults.set([]);
    this.searchQuery.set('');
    this.router.navigate(['/product', product.Id]);
  }

  toggleCart(): void {
    this.cartService.toggleCartDrawer();
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout();
  }
}
