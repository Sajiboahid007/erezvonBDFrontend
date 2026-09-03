import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import {
  PaginatedResponse,
  Product,
  ProductFilterParams,
  ProductImage,
  ProductVariant,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

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

  uploadImage(file: File): Observable<{ filename: string; url: string; fullUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/upload`, formData, {
      headers: { 'X-Skip-Error-Toast': 'true' }
    }).pipe(
      map((res) => res?.data || res)
    );
  }

  getProducts(filters?: ProductFilterParams): Observable<PaginatedResponse<Product>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        const val = (filters as any)[key];
        if (val !== undefined && val !== null && val !== '') {
          params = params.set(key, val.toString());
        }
      });
    }
    return this.http.get<any>(`${this.apiUrl}/product/get`, { params }).pipe(
      map((res) => {
        const raw = res?.data || res;
        const items = raw?.items || (Array.isArray(raw) ? raw : []);
        const formattedItems = items.map((p: any) => this.formatProduct(p));
        return {
          data: formattedItems,
          total: raw?.pagination?.total || formattedItems.length,
          page: raw?.pagination?.page || 1,
          limit: raw?.pagination?.limit || 12,
          totalPages: raw?.pagination?.totalPages || 1,
        };
      }),
      catchError(() => of({ data: [], total: 0, page: 1, limit: 12, totalPages: 1 }))
    );
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<any>(`${this.apiUrl}/product/get/${id}`).pipe(
      map((res) => this.formatProduct(res?.data || res))
    );
  }

  searchProducts(query: string): Observable<Product[]> {
    return this.http.get<any>(`${this.apiUrl}/product/search`, {
      params: { q: query },
    }).pipe(
      map((res) => {
        const items = res?.data || (Array.isArray(res) ? res : []);
        return items.map((p: any) => this.formatProduct(p));
      }),
      catchError(() => of([]))
    );
  }

  getFeaturedProducts(limit: number = 8): Observable<Product[]> {
    return this.http.get<any>(`${this.apiUrl}/product/featured`, {
      params: { limit: limit.toString() },
    }).pipe(
      map((res) => {
        const items = res?.data || (Array.isArray(res) ? res : []);
        return items.map((p: any) => this.formatProduct(p));
      }),
      catchError(() => of([]))
    );
  }

  formatProduct(p: any): Product {
    if (!p) return p;
    const variants: ProductVariant[] = (p.ProductVariants || p.Variants || p.variants || p.productVariants || []).map((v: any) => {
      const sizeObj = v.Sizes || v.Size || (v.size ? { Id: v.SizeId || 0, Name: v.size } : undefined);
      const colorObj = v.Colors || v.Color || (v.color ? { Id: v.ColorId || 0, Name: v.color, HexCode: '#333' } : null);
      const stock =
        v.StockQuantity !== undefined && v.StockQuantity !== null
          ? Number(v.StockQuantity)
          : v.stockQuantity !== undefined && v.stockQuantity !== null
          ? Number(v.stockQuantity)
          : v.Stock !== undefined && v.Stock !== null
          ? Number(v.Stock)
          : v.stock !== undefined && v.stock !== null
          ? Number(v.stock)
          : v.Quantity !== undefined && v.Quantity !== null
          ? Number(v.Quantity)
          : v.quantity !== undefined && v.quantity !== null
          ? Number(v.quantity)
          : 0;

      return {
        ...v,
        Id: v.Id ?? v.id,
        ProductId: v.ProductId ?? v.productId ?? p.Id ?? p.id,
        SizeId: v.SizeId ?? v.sizeId,
        ColorId: v.ColorId !== undefined ? v.ColorId : (v.colorId !== undefined ? v.colorId : null),
        StockQuantity: stock,
        Sizes: sizeObj,
        Size: sizeObj,
        Colors: colorObj,
        Color: colorObj,
        SKU: v.SKU || v.sku || '',
        AdditionalPrice: Number(v.AdditionalPrice || v.additionalPrice || 0),
      };
    });

    const totalStock =
      variants.length > 0
        ? variants.reduce((sum: number, v: any) => sum + (v.StockQuantity || 0), 0)
        : p.totalStock !== undefined && p.totalStock !== null
        ? Number(p.totalStock)
        : p.TotalStock !== undefined && p.TotalStock !== null
        ? Number(p.TotalStock)
        : p.StockQuantity !== undefined && p.StockQuantity !== null
        ? Number(p.StockQuantity)
        : p.stockQuantity !== undefined && p.stockQuantity !== null
        ? Number(p.stockQuantity)
        : p.Stock !== undefined && p.Stock !== null
        ? Number(p.Stock)
        : p.stock !== undefined && p.stock !== null
        ? Number(p.stock)
        : 0;

    const formattedImages: ProductImage[] = (p.ProductImages || p.Images || p.images || p.productImages || []).map((img: any) => ({
      ...img,
      Id: img.Id ?? img.id,
      ProductId: img.ProductId ?? img.productId ?? p.Id ?? p.id,
      ImageUrl: this.formatImageUrl(img.ImageUrl || img.imageUrl || img.url),
      IsPrimary: Boolean(img.IsPrimary ?? img.isPrimary),
    }));

    const price = p.Price !== undefined ? Number(p.Price) : (p.RegularPrice !== undefined ? Number(p.RegularPrice) : 0);
    const discountPrice = p.DiscountPrice !== null && p.DiscountPrice !== undefined ? Number(p.DiscountPrice) : undefined;

    return {
      ...p,
      Id: p.Id ?? p.id,
      Price: price,
      RegularPrice: price,
      DiscountPrice: discountPrice,
      totalStock: totalStock,
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
      ...data,
      Price: data.RegularPrice,
    };
    return this.http.post<any>(`${this.apiUrl}/product/create`, payload).pipe(
      map((res) => this.formatProduct(res?.data || res))
    );
  }

  updateProduct(id: number, data: Partial<Product>): Observable<Product> {
    const payload = {
      ...data,
      Price: data.RegularPrice,
    };
    return this.http.put<any>(`${this.apiUrl}/product/update/${id}`, payload).pipe(
      map((res) => this.formatProduct(res?.data || res))
    );
  }

  deleteProduct(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/product/delete/${id}`);
  }

  // Product Variants
  getVariantsByProduct(productId: number): Observable<ProductVariant[]> {
    return this.http.get<any>(`${this.apiUrl}/product-variant/get-by-product/${productId}`).pipe(
      map((res) => {
        const list = res?.data || res || [];
        return (Array.isArray(list) ? list : []).map((v: any) => ({
          ...v,
          Id: v.Id ?? v.id,
          StockQuantity:
            v.StockQuantity !== undefined
              ? Number(v.StockQuantity)
              : v.stockQuantity !== undefined
              ? Number(v.stockQuantity)
              : 0,
        }));
      }),
      catchError(() => of([]))
    );
  }

  createVariant(data: Partial<ProductVariant>): Observable<ProductVariant> {
    const payload = {
      ...data,
      stockQuantity: data.StockQuantity,
      StockQuantity: data.StockQuantity,
      stock: data.StockQuantity,
      Stock: data.StockQuantity,
      quantity: data.StockQuantity,
      Quantity: data.StockQuantity,
    };
    return this.http.post<any>(`${this.apiUrl}/product-variant/create`, payload).pipe(
      map((res) => res?.data || res),
      catchError(() => of({ Id: Date.now(), ...payload } as any))
    );
  }

  updateVariant(id: number, data: Partial<ProductVariant>): Observable<ProductVariant> {
    const payload = {
      ...data,
      stockQuantity: data.StockQuantity,
      StockQuantity: data.StockQuantity,
      stock: data.StockQuantity,
      Stock: data.StockQuantity,
      quantity: data.StockQuantity,
      Quantity: data.StockQuantity,
    };
    return this.http.put<any>(`${this.apiUrl}/product-variant/update/${id}`, payload).pipe(
      map((res) => res?.data || res),
      catchError(() => {
        return this.http.patch<any>(`${this.apiUrl}/product-variant/update/${id}`, payload).pipe(
          map((res) => res?.data || res),
          catchError(() => of({ Id: id, ...payload } as any))
        );
      })
    );
  }

  deleteVariant(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/product-variant/delete/${id}`);
  }

  // Product Images
  getImagesByProduct(productId: number): Observable<ProductImage[]> {
    return this.http.get<any>(`${this.apiUrl}/product-image/get-by-product/${productId}`).pipe(
      map((res) => res?.data || res || []),
      catchError(() => of([]))
    );
  }

  createProductImage(data: Partial<ProductImage>): Observable<ProductImage> {
    const prodId = data.ProductId;
    return this.http.post<any>(`${this.apiUrl}/product-image/upload/${prodId}`, {
      ImageUrl: data.ImageUrl,
      IsPrimary: data.IsPrimary ?? true,
    }).pipe(
      map((res) => res?.data || res)
    );
  }

  uploadMultipleProductImages(
    productId: number,
    images: Array<{ ImageUrl: string; IsPrimary?: boolean }>,
    replaceAll: boolean = true
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/product-image/upload-multiple/${productId}`, {
      images,
      replaceAll,
    }).pipe(
      map((res) => res?.data || res)
    );
  }

  setPrimaryImage(id: number): Observable<ProductImage> {
    return this.http.patch<any>(`${this.apiUrl}/product-image/set-primary/${id}`, {}).pipe(
      map((res) => res?.data || res)
    );
  }

  deleteProductImage(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/product-image/delete/${id}`);
  }
}
