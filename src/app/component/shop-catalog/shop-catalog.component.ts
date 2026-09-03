import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SharedModule } from '../../../shared.module';
import { Category, Color, Product, ProductFilterParams, Size, SubCategory } from '../../core/models';
import { AttributeService } from '../../core/services/attribute.service';
import { CartService } from '../../core/services/cart.service';
import { CategoryService } from '../../core/services/category.service';
import { ProductService } from '../../core/services/product.service';
import { ShopSettingsService } from '../../core/services/shop-settings.service';
import { findMatchingHexCode } from '../../core/utils/color-palette';

@Component({
  selector: 'app-shop-catalog',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './shop-catalog.component.html',
  styleUrl: './shop-catalog.component.scss',
})
export class ShopCatalogComponent implements OnInit {
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  attributeService = inject(AttributeService);
  cartService = inject(CartService);
  settingsService = inject(ShopSettingsService);
  private route = inject(ActivatedRoute);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  subCategories = signal<SubCategory[]>([]);
  sizes = signal<Size[]>([]);
  colors = signal<Color[]>([]);

  totalRecords = signal<number>(0);
  loading = signal<boolean>(false);

  // Filters State
  selectedCategory = signal<number | undefined>(undefined);
  selectedSubCategory = signal<number | undefined>(undefined);
  priceRange = signal<number[]>([0, 10000]);
  selectedSize = signal<number | undefined>(undefined);
  selectedColor = signal<number | undefined>(undefined);
  selectedSort = signal<string>('newest');
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(12);

  sortOptions = [
    { label: 'Newest Arrivals', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Popular', value: 'popular' },
  ];

  ngOnInit(): void {
    this.loadAttributes();

    this.route.queryParams.subscribe((params) => {
      if (params['categoryId']) {
        this.selectedCategory.set(Number(params['categoryId']));
        this.loadSubCategories(Number(params['categoryId']));
      }
      if (params['search']) {
        this.searchQuery.set(params['search']);
      }
      this.loadProducts();
    });
  }

  loadAttributes(): void {
    this.categoryService.getCategories().subscribe({
      next: (data) => this.categories.set(data || []),
    });
    this.attributeService.getSizes().subscribe({
      next: (data) => this.sizes.set(data || []),
    });
    this.attributeService.getColors().subscribe({
      next: (data) => {
        const enriched = (data || []).map((c) => ({
          ...c,
          HexCode: c.HexCode || findMatchingHexCode(c.Name) || '#1e3a8a',
        }));
        this.colors.set(enriched);
      },
    });
  }

  loadSubCategories(categoryId: number): void {
    this.categoryService.getSubCategories(categoryId).subscribe({
      next: (data) => this.subCategories.set(data || []),
    });
  }

  loadProducts(): void {
    this.loading.set(true);
    const filterParams: ProductFilterParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
      categoryId: this.selectedCategory(),
      subCategoryId: this.selectedSubCategory(),
      minPrice: this.priceRange()[0],
      maxPrice: this.priceRange()[1],
      sizeId: this.selectedSize(),
      colorId: this.selectedColor(),
      sort: this.selectedSort(),
      search: this.searchQuery() || undefined,
    };

    this.productService.getProducts(filterParams).subscribe({
      next: (res) => {
        this.products.set(res.data || []);
        this.totalRecords.set(res.total || 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectCategory(catId?: number): void {
    this.selectedCategory.set(catId);
    this.selectedSubCategory.set(undefined);
    if (catId) {
      this.loadSubCategories(catId);
    } else {
      this.subCategories.set([]);
    }
    this.currentPage.set(1);
    this.loadProducts();
  }

  selectSubCategory(subId?: number): void {
    this.selectedSubCategory.set(subId);
    this.currentPage.set(1);
    this.loadProducts();
  }

  selectSize(sizeId?: number): void {
    this.selectedSize.set(this.selectedSize() === sizeId ? undefined : sizeId);
    this.currentPage.set(1);
    this.loadProducts();
  }

  selectColor(colorId?: number): void {
    this.selectedColor.set(this.selectedColor() === colorId ? undefined : colorId);
    this.currentPage.set(1);
    this.loadProducts();
  }

  onPageChange(event: any): void {
    this.currentPage.set(event.page + 1);
    this.pageSize.set(event.rows);
    this.loadProducts();
  }

  resetFilters(): void {
    this.selectedCategory.set(undefined);
    this.selectedSubCategory.set(undefined);
    this.priceRange.set([0, 10000]);
    this.selectedSize.set(undefined);
    this.selectedColor.set(undefined);
    this.selectedSort.set('newest');
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadProducts();
  }

  quickAddToCart(product: Product, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (product.Variants && product.Variants.length > 0) {
      const variant = product.Variants[0];
      if (variant.Id) {
        this.cartService.addToCart({
          ProductVariantId: variant.Id,
          Quantity: 1,
        }).subscribe();
      }
    }
  }
}
