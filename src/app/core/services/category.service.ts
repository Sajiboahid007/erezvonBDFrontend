import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { Category, SubCategory } from '../models';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
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

  // Categories
  getCategories(): Observable<Category[]> {
    return this.http.get<any>(`${this.apiUrl}/category/get`).pipe(
      map((res) => {
        const raw = res?.data || res || [];
        const items = Array.isArray(raw) ? raw : [];
        return items.map((c: any) => ({
          ...c,
          ImageUrl: c.ImageUrl ? this.formatImageUrl(c.ImageUrl) : undefined,
        }));
      }),
      catchError(() => of([]))
    );
  }

  getCategoryById(id: number): Observable<Category> {
    return this.http.get<any>(`${this.apiUrl}/category/get/${id}`).pipe(
      map((res) => {
        const c = res?.data || res;
        return {
          ...c,
          ImageUrl: c?.ImageUrl ? this.formatImageUrl(c.ImageUrl) : undefined,
        };
      })
    );
  }

  createCategory(data: Partial<Category>): Observable<Category> {
    return this.http.post<any>(`${this.apiUrl}/category/create`, data).pipe(
      map((res) => res?.data || res)
    );
  }

  updateCategory(id: number, data: Partial<Category>): Observable<Category> {
    return this.http.put<any>(`${this.apiUrl}/category/update/${id}`, data).pipe(
      map((res) => res?.data || res)
    );
  }

  deleteCategory(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/category/delete/${id}`);
  }

  // SubCategories
  getSubCategories(categoryId?: number): Observable<SubCategory[]> {
    const options = categoryId ? { params: { categoryId: categoryId.toString() } } : {};
    return this.http.get<any>(`${this.apiUrl}/subcategory/get`, options).pipe(
      map((res) => {
        const raw = res?.data || res || [];
        const items = Array.isArray(raw) ? raw : [];
        return items.map((s: any) => ({
          ...s,
          ImageUrl: s.ImageUrl ? this.formatImageUrl(s.ImageUrl) : undefined,
        }));
      }),
      catchError(() => of([]))
    );
  }

  createSubCategory(data: Partial<SubCategory>): Observable<SubCategory> {
    return this.http.post<any>(`${this.apiUrl}/subcategory/create`, data).pipe(
      map((res) => res?.data || res)
    );
  }

  updateSubCategory(id: number, data: Partial<SubCategory>): Observable<SubCategory> {
    return this.http.put<any>(`${this.apiUrl}/subcategory/update/${id}`, data).pipe(
      map((res) => res?.data || res)
    );
  }

  deleteSubCategory(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/subcategory/delete/${id}`);
  }
}
