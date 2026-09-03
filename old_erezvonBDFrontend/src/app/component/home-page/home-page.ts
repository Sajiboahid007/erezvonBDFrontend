import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { SharedModule } from '../../../shared.module';
import { Category, Product } from '../../core/models';
import { CartService } from '../../core/services/cart.service';
import { CategoryService } from '../../core/services/category.service';
import { ProductService } from '../../core/services/product.service';
import { ShopSettingsService } from '../../core/services/shop-settings.service';

export interface HeroSlide {
  id: number;
  imageUrl: string;
  badge?: string;
  headline?: string;
  tagline?: string;
  link?: string;
  queryParams?: Record<string, string | number | boolean>;
  product?: Product;
}

export interface ShowcaseItem {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  altText: string;
  categoryQuery: Record<string, string | number | boolean>;
  badge?: string;
  isFeatured?: boolean;
  itemCount?: number;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePageComponent implements OnInit, OnDestroy {
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  cartService = inject(CartService);
  settingsService = inject(ShopSettingsService);

  featuredProducts = signal<Product[]>([]);
  allProducts = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal<boolean>(true);

  // Slider State
  currentSlideIndex = signal<number>(0);
  private autoSlideTimer: any = null;

  // Hero Slides dynamically generated strictly from the first 4 Categories in Database
  heroSlides = computed<HeroSlide[]>(() => {
    const cats = this.categories().slice(0, 4);
    const prods = this.allProducts().length > 0 ? this.allProducts() : this.featuredProducts();
    const settings = this.settingsService.settingsSignal();
    const tagline = settings?.Tagline || "Premium Men's Fashion — New Collection";

    return cats.map((cat, idx) => {
      // 1. Resolve category image: from Category.ImageUrl, or fallback to first product image of that category
      let resolvedImageUrl = '';
      if (cat.ImageUrl) {
        resolvedImageUrl = this.categoryService.formatImageUrl(cat.ImageUrl);
      } else {
        const prodInCat = prods.find((p) => p.CategoryId === cat.Id && p.Images && p.Images.length > 0);
        const pImg = prodInCat?.Images?.find((img) => img.IsPrimary) || prodInCat?.Images?.[0];
        if (pImg?.ImageUrl) {
          resolvedImageUrl = this.productService.formatImageUrl(pImg.ImageUrl);
        }
      }

      return {
        id: cat.Id || (idx + 1),
        imageUrl: resolvedImageUrl,
        badge: `${cat.Name.toUpperCase()} COLLECTION`,
        headline: cat.Name,
        tagline: cat.Description || tagline,
        link: '/shop',
        queryParams: { categoryId: cat.Id },
      };
    });
  });

  // Active Slide Data
  activeSlide = computed<HeroSlide | null>(() => {
    const list = this.heroSlides();
    if (list.length === 0) return null;
    const idx = this.currentSlideIndex() % list.length;
    return list[idx] || list[0];
  });

  // Dynamic Showcase Gallery Items built directly from Database Categories & Products
  showcaseItems = computed<ShowcaseItem[]>(() => {
    const cats = this.categories();
    const prods = this.allProducts().length > 0 ? this.allProducts() : this.featuredProducts();
    const featured = this.featuredProducts();

    // The 5 signature style categories to showcase
    const styleDefinitions = [
      {
        id: 1,
        title: 'Formal Wear',
        subtitle: 'Blazers, Tailored Suits & Crisp Shirts',
        keywords: ['formal', 'blazer', 'suit', 'shirt', 'executive', 'office'],
        badge: 'Formal',
        defaultSearch: 'Formal',
      },
      {
        id: 2,
        title: 'Casual Edit',
        subtitle: 'T-Shirts, Denim & Weekend Essentials',
        keywords: ['casual', 't-shirt', 'tee', 'denim', 'jeans', 'polo'],
        badge: 'Casual',
        defaultSearch: 'Casual',
      },
      {
        id: 3,
        title: 'Traditional',
        subtitle: 'Heritage Panjabi, Kurta & Ethnic Sets',
        keywords: ['traditional', 'panjabi', 'punjabi', 'kurta', 'ethnic', 'eid'],
        badge: 'Ethnic',
        defaultSearch: 'Panjabi',
      },
      {
        id: 4,
        title: 'Winter Collection',
        subtitle: 'Jackets, Premium Hoodies & Outerwear',
        keywords: ['winter', 'jacket', 'hoodie', 'sweater', 'coat', 'outerwear'],
        badge: 'Outerwear',
        defaultSearch: 'Winter',
      },
      {
        id: 5,
        title: 'Complete Look',
        subtitle: 'Signature Outfits & Coordinated Accessories',
        keywords: ['complete', 'look', 'outfit', 'set', 'accessories', 'combo'],
        badge: 'Curated Ensemble',
        defaultSearch: 'Complete',
        isFeatured: true,
      },
    ];

    return styleDefinitions.map((style, idx) => {
      // 1. Try to find a matching category in the database by keyword or by index
      const matchedCategory = cats.find((c) =>
        style.keywords.some((kw) => c.Name.toLowerCase().includes(kw))
      ) || (cats.length > idx ? cats[idx] : undefined);

      // 2. Try to find a matching product in the database belonging to this style / category
      const matchedProduct = prods.find((p) => {
        const pName = (p.Name || '').toLowerCase();
        const pCatName = (p.Category?.Name || '').toLowerCase();
        const matchesCategory = matchedCategory ? p.CategoryId === matchedCategory.Id : false;
        const matchesKeywords = style.keywords.some((kw) => pName.includes(kw) || pCatName.includes(kw));
        return (matchesCategory || matchesKeywords) && p.Images && p.Images.length > 0;
      }) || (style.isFeatured && featured.length > 0 && featured[0].Images?.length ? featured[0] : undefined)
        || (prods.length > idx && prods[idx]?.Images?.length ? prods[idx] : undefined);

      // 3. Resolve Image URL from uploaded Database Category or Product
      let resolvedImageUrl = '';
      if (matchedCategory?.ImageUrl) {
        resolvedImageUrl = this.categoryService.formatImageUrl(matchedCategory.ImageUrl);
      } else if (matchedProduct?.Images && matchedProduct.Images.length > 0) {
        const pImg = matchedProduct.Images.find((img) => img.IsPrimary) || matchedProduct.Images[0];
        if (pImg?.ImageUrl) {
          resolvedImageUrl = this.productService.formatImageUrl(pImg.ImageUrl);
        }
      }

      // 4. Determine Query Params
      let categoryQuery: Record<string, string | number | boolean> = {};
      if (matchedCategory?.Id) {
        categoryQuery = { categoryId: matchedCategory.Id };
      } else if (style.isFeatured) {
        categoryQuery = { isFeatured: true };
      } else {
        categoryQuery = { search: style.defaultSearch };
      }

      return {
        id: style.id,
        title: matchedCategory?.Name || style.title,
        subtitle: matchedCategory?.Description || style.subtitle,
        imageUrl: resolvedImageUrl,
        altText: `${matchedCategory?.Name || style.title} - Rezvon Men's Collection`,
        categoryQuery,
        badge: style.badge,
        isFeatured: style.isFeatured,
        itemCount: matchedCategory?._count?.Products,
      };
    });
  });

  ngOnInit(): void {
    this.loadData();
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  startAutoSlide(): void {
    this.stopAutoSlide();
    this.autoSlideTimer = setInterval(() => {
      this.nextSlide();
    }, 5500);
  }

  stopAutoSlide(): void {
    if (this.autoSlideTimer) {
      clearInterval(this.autoSlideTimer);
      this.autoSlideTimer = null;
    }
  }

  nextSlide(): void {
    const total = this.heroSlides().length;
    if (total <= 1) return;
    this.currentSlideIndex.update((curr) => (curr + 1) % total);
  }

  prevSlide(): void {
    const total = this.heroSlides().length;
    if (total <= 1) return;
    this.currentSlideIndex.update((curr) => (curr - 1 + total) % total);
  }

  goToSlide(index: number): void {
    this.currentSlideIndex.set(index);
    this.startAutoSlide();
  }

  loadData(): void {
    this.loading.set(true);

    // Fetch Shop Settings from Database
    this.settingsService.getSettings().subscribe();

    // Fetch Categories from Database
    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats || []),
      error: () => this.categories.set([]),
    });

    // Fetch Featured Products from Database
    this.productService.getFeaturedProducts(12).subscribe({
      next: (products) => {
        this.featuredProducts.set(products || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });

    // Fetch All Products Catalog from Database
    this.productService.getProducts({ limit: 40 }).subscribe({
      next: (res) => {
        this.allProducts.set(res.data || []);
        if (this.featuredProducts().length === 0) {
          const featured = (res.data || []).filter((p) => p.IsFeatured);
          this.featuredProducts.set(featured.length > 0 ? featured : (res.data || []).slice(0, 8));
        }
      },
      error: () => {},
    });
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

