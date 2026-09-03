import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of, switchMap } from 'rxjs';
import {
  PaginatedResponse,
  Product,
  ProductFilterParams,
  ProductImage,
  ProductVariant,
} from '../models';
import { SupabaseService } from './supabase.service';
import { CloudinaryService } from './cloudinary.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private supabase = inject(SupabaseService);
  private cloudinary = inject(CloudinaryService);

  formatImageUrl(url?: string): string {
    if (!url) return '';
    return url;
  }

  // Direct browser-to-Cloudinary image upload
  uploadImage(file: File): Observable<{ filename: string; url: string; fullUrl: string }> {
    return this.cloudinary.uploadImage(file);
  }

  getProducts(filters?: ProductFilterParams): Observable<PaginatedResponse<Product>> {
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 12;
    const fromIndex = (page - 1) * limit;
    const toIndex = fromIndex + limit - 1;

    let query = this.supabase.client
      .from('Products')
      .select(
        '*, Category(*), SubCategory(*), ProductImages(*), ProductVariants(*, Sizes(*), Colors(*))',
        { count: 'exact' }
      )
      .eq('IsMarkToDelete', false);

    if (filters?.categoryId) {
      query = query.eq('CategoryId', Number(filters.categoryId));
    }
    if (filters?.subCategoryId) {
      query = query.eq('SubCategoryId', Number(filters.subCategoryId));
    }
    if (filters?.minPrice !== undefined && filters?.minPrice !== null && !isNaN(Number(filters.minPrice))) {
      query = query.gte('Price', Number(filters.minPrice));
    }
    if (filters?.maxPrice !== undefined && filters?.maxPrice !== null && !isNaN(Number(filters.maxPrice))) {
      query = query.lte('Price', Number(filters.maxPrice));
    }
    if (filters?.search) {
      query = query.ilike('Name', `%${filters.search.trim()}%`);
    }

    if (filters?.sort === 'price_asc') {
      query = query.order('Price', { ascending: true });
    } else if (filters?.sort === 'price_desc') {
      query = query.order('Price', { ascending: false });
    } else {
      query = query.order('Id', { ascending: false });
    }

    query = query.range(fromIndex, toIndex);

    return from(query).pipe(
      map(({ data, count, error }) => {
        if (error) {
          console.error('Error fetching products from Supabase:', error);
          return { data: [], total: 0, page, limit, totalPages: 1 };
        }
        const total = count || (data || []).length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const formatted = (data || []).map((p: any) => this.formatProduct(p));

        return {
          data: formatted,
          total,
          page,
          limit,
          totalPages,
        };
      }),
      catchError(() => of({ data: [], total: 0, page: 1, limit: 12, totalPages: 1 }))
    );
  }

  getProductById(id: number): Observable<Product> {
    return from(
      this.supabase.client
        .from('Products')
        .select('*, Category(*), SubCategory(*), ProductImages(*), ProductVariants(*, Sizes(*), Colors(*))')
        .eq('Id', id)
        .eq('IsMarkToDelete', false)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.formatProduct(data);
      })
    );
  }

  searchProducts(query: string): Observable<Product[]> {
    return from(
      this.supabase.client
        .from('Products')
        .select('*, Category(*), SubCategory(*), ProductImages(*), ProductVariants(*, Sizes(*), Colors(*))')
        .eq('IsMarkToDelete', false)
        .ilike('Name', `%${query.trim()}%`)
        .limit(10)
    ).pipe(
      map(({ data, error }) => {
        if (error) return [];
        return (data || []).map((p: any) => this.formatProduct(p));
      }),
      catchError(() => of([]))
    );
  }

  getFeaturedProducts(limit: number = 8): Observable<Product[]> {
    return from(
      this.supabase.client
        .from('Products')
        .select('*, Category(*), SubCategory(*), ProductImages(*), ProductVariants(*, Sizes(*), Colors(*))')
        .eq('IsMarkToDelete', false)
        .order('Id', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }) => {
        if (error) return [];
        return (data || []).map((p: any) => this.formatProduct(p));
      }),
      catchError(() => of([]))
    );
  }

  formatProduct(p: any): Product {
    if (!p) return p;
    const variants: ProductVariant[] = (p.ProductVariants || p.Variants || []).map((v: any) => {
      const sizeObj = v.Sizes || (v.Size ? { Id: v.SizeId, Name: v.Size } : undefined);
      const colorObj = v.Colors || (v.Color ? { Id: v.ColorId, Name: v.Color, HexCode: '#333' } : null);
      const stock = Number(v.StockQuantity ?? v.stockQuantity ?? 0);

      return {
        ...v,
        Id: v.Id,
        ProductId: v.ProductId || p.Id,
        SizeId: v.SizeId,
        ColorId: v.ColorId ?? null,
        StockQuantity: stock,
        Sizes: sizeObj,
        Size: sizeObj,
        Colors: colorObj,
        Color: colorObj,
        SKU: v.SKU || '',
        AdditionalPrice: 0,
      };
    });

    const totalStock =
      variants.length > 0
        ? variants.reduce((sum: number, v: any) => sum + (v.StockQuantity || 0), 0)
        : Number(p.StockQuantity || 0);

    const rawImages = (p.ProductImages || p.Images || []).filter((img: any) => !img.IsMarkToDelete);
    const seenUrls = new Set<string>();
    const formattedImages: ProductImage[] = [];

    for (const img of rawImages) {
      const url = this.formatImageUrl(typeof img === 'string' ? img : img.ImageUrl);
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        formattedImages.push({
          ...img,
          Id: img.Id || 0,
          ProductId: img.ProductId || p.Id,
          ImageUrl: url,
          IsPrimary: Boolean(img.IsPrimary),
        });
      }
    }

    const price = Number(p.Price || 0);
    const discountPrice = p.DiscountPrice !== null && p.DiscountPrice !== undefined ? Number(p.DiscountPrice) : undefined;

    return {
      ...p,
      Id: p.Id,
      Price: price,
      RegularPrice: price,
      DiscountPrice: discountPrice,
      totalStock,
      TotalStock: totalStock,
      ProductImages: formattedImages,
      Images: formattedImages,
      ProductVariants: variants,
      Variants: variants,
    };
  }

  // Admin Product Operations
  createProduct(data: Partial<Product>): Observable<Product> {
    const payload = {
      Name: data.Name,
      Description: data.Description || null,
      CategoryId: data.CategoryId,
      SubCategoryId: data.SubCategoryId,
      Brand: data.Brand || null,
      Fabric: data.Fabric || null,
      Price: data.RegularPrice || data.Price || 0,
      DiscountPrice: data.DiscountPrice || null,
      SKU: data.SKU || `SKU-${Date.now()}`,
      IsMarkToDelete: false,
      CreatedBy: 'Admin',
    };

    return from(
      this.supabase.client
        .from('Products')
        .insert(payload)
        .select()
        .single()
    ).pipe(
      switchMap(({ data: createdProd, error }) => {
        if (error) throw error;

        // If initial images exist, insert them
        const images = (data as any).Images || (data as any).ProductImages || [];
        if (Array.isArray(images) && images.length > 0) {
          const imgRows = images.map((img: any, idx: number) => ({
            ProductId: createdProd.Id,
            ImageUrl: typeof img === 'string' ? img : img.ImageUrl,
            IsPrimary: idx === 0,
            IsMarkToDelete: false,
            CreatedBy: 'Admin',
          }));
          return from(this.supabase.client.from('ProductImages').insert(imgRows)).pipe(
            map(() => this.formatProduct(createdProd))
          );
        }

        return of(this.formatProduct(createdProd));
      })
    );
  }

  updateProduct(id: number, data: Partial<Product>): Observable<Product> {
    const payload: any = {
      ...(data.Name !== undefined ? { Name: data.Name } : {}),
      ...(data.Description !== undefined ? { Description: data.Description } : {}),
      ...(data.CategoryId !== undefined ? { CategoryId: data.CategoryId } : {}),
      ...(data.SubCategoryId !== undefined ? { SubCategoryId: data.SubCategoryId } : {}),
      ...(data.Brand !== undefined ? { Brand: data.Brand } : {}),
      ...(data.Fabric !== undefined ? { Fabric: data.Fabric } : {}),
      ...(data.Price !== undefined || data.RegularPrice !== undefined
        ? { Price: data.RegularPrice || data.Price }
        : {}),
      ...(data.DiscountPrice !== undefined ? { DiscountPrice: data.DiscountPrice } : {}),
      ...(data.SKU !== undefined ? { SKU: data.SKU } : {}),
      UpdatedDate: new Date().toISOString(),
      UpdatedBy: 'Admin',
    };

    return from(
      this.supabase.client
        .from('Products')
        .update(payload)
        .eq('Id', id)
        .select('*, Category(*), SubCategory(*), ProductImages(*), ProductVariants(*, Sizes(*), Colors(*))')
        .single()
    ).pipe(
      map(({ data: updated, error }) => {
        if (error) throw error;
        return this.formatProduct(updated);
      })
    );
  }

  deleteProduct(id: number): Observable<{ message: string }> {
    return from(
      this.supabase.client
        .from('Products')
        .update({ IsMarkToDelete: true, UpdatedDate: new Date().toISOString() })
        .eq('Id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { message: 'Product deleted successfully' };
      })
    );
  }

  // Product Variants
  getVariantsByProduct(productId: number): Observable<ProductVariant[]> {
    return from(
      this.supabase.client
        .from('ProductVariants')
        .select('*, Sizes(*), Colors(*)')
        .eq('ProductId', productId)
        .eq('IsMarkToDelete', false)
    ).pipe(
      map(({ data, error }) => {
        if (error) return [];
        return (data || []).map((v: any) => ({
          ...v,
          Id: v.Id,
          StockQuantity: Number(v.StockQuantity || 0),
          Sizes: v.Sizes,
          Colors: v.Colors,
        }));
      }),
      catchError(() => of([]))
    );
  }

  createVariant(data: Partial<ProductVariant>): Observable<ProductVariant> {
    const payload = {
      ProductId: data.ProductId,
      SizeId: data.SizeId,
      ColorId: data.ColorId || null,
      StockQuantity: Number(data.StockQuantity || 0),
      IsMarkToDelete: false,
      CreatedBy: 'Admin',
    };

    return from(
      this.supabase.client
        .from('ProductVariants')
        .insert(payload)
        .select('*, Sizes(*), Colors(*)')
        .single()
    ).pipe(
      map(({ data: created, error }) => {
        if (error) throw error;
        return created;
      })
    );
  }

  updateVariant(id: number, data: Partial<ProductVariant>): Observable<ProductVariant> {
    const payload: any = {
      ...(data.SizeId !== undefined ? { SizeId: data.SizeId } : {}),
      ...(data.ColorId !== undefined ? { ColorId: data.ColorId } : {}),
      ...(data.StockQuantity !== undefined ? { StockQuantity: Number(data.StockQuantity) } : {}),
      UpdatedDate: new Date().toISOString(),
      UpdatedBy: 'Admin',
    };

    return from(
      this.supabase.client
        .from('ProductVariants')
        .update(payload)
        .eq('Id', id)
        .select('*, Sizes(*), Colors(*)')
        .single()
    ).pipe(
      map(({ data: updated, error }) => {
        if (error) throw error;
        return updated;
      })
    );
  }

  deleteVariant(id: number): Observable<{ message: string }> {
    return from(
      this.supabase.client
        .from('ProductVariants')
        .update({ IsMarkToDelete: true, UpdatedDate: new Date().toISOString() })
        .eq('Id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { message: 'Variant deleted successfully' };
      })
    );
  }

  // Product Images
  getImagesByProduct(productId: number): Observable<ProductImage[]> {
    return from(
      this.supabase.client
        .from('ProductImages')
        .select('*')
        .eq('ProductId', productId)
        .eq('IsMarkToDelete', false)
        .order('IsPrimary', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) return [];
        return (data || []).map((img: any) => ({
          ...img,
          ImageUrl: this.formatImageUrl(img.ImageUrl),
        }));
      }),
      catchError(() => of([]))
    );
  }

  createProductImage(data: Partial<ProductImage>): Observable<ProductImage> {
    const payload = {
      ProductId: data.ProductId,
      ImageUrl: data.ImageUrl,
      IsPrimary: data.IsPrimary ?? true,
      IsMarkToDelete: false,
      CreatedBy: 'Admin',
    };

    return from(
      this.supabase.client
        .from('ProductImages')
        .insert(payload)
        .select()
        .single()
    ).pipe(
      map(({ data: created, error }) => {
        if (error) throw error;
        return created;
      })
    );
  }

  uploadMultipleProductImages(
    productId: number,
    images: Array<{ ImageUrl: string; IsPrimary?: boolean }>,
    replaceAll: boolean = true
  ): Observable<any> {
    const run = async () => {
      // Deduplicate incoming images by URL
      const seen = new Set<string>();
      const uniqueImages: Array<{ ImageUrl: string; IsPrimary?: boolean }> = [];
      for (const img of images) {
        if (img.ImageUrl && !seen.has(img.ImageUrl)) {
          seen.add(img.ImageUrl);
          uniqueImages.push(img);
        }
      }

      if (replaceAll) {
        await this.supabase.client
          .from('ProductImages')
          .delete()
          .eq('ProductId', productId);
      }

      if (uniqueImages.length === 0) return [];

      const rows = uniqueImages.map((img, idx) => ({
        ProductId: productId,
        ImageUrl: img.ImageUrl,
        IsPrimary: img.IsPrimary !== undefined ? img.IsPrimary : idx === 0,
        IsMarkToDelete: false,
        CreatedBy: 'Admin',
      }));

      const { data, error } = await this.supabase.client
        .from('ProductImages')
        .insert(rows)
        .select();

      if (error) throw error;
      return data;
    };

    return from(run());
  }

  setPrimaryImage(id: number): Observable<ProductImage> {
    const run = async () => {
      const { data: img } = await this.supabase.client
        .from('ProductImages')
        .select('ProductId')
        .eq('Id', id)
        .single();

      if (img?.ProductId) {
        await this.supabase.client
          .from('ProductImages')
          .update({ IsPrimary: false })
          .eq('ProductId', img.ProductId);
      }

      const { data, error } = await this.supabase.client
        .from('ProductImages')
        .update({ IsPrimary: true })
        .eq('Id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    };

    return from(run());
  }

  deleteProductImage(id: number): Observable<{ message: string }> {
    return from(
      this.supabase.client
        .from('ProductImages')
        .update({ IsMarkToDelete: true })
        .eq('Id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { message: 'Image deleted successfully' };
      })
    );
  }
}
