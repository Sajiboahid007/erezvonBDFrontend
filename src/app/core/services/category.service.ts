import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { Category, SubCategory } from '../models';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private supabase = inject(SupabaseService);

  formatImageUrl(url?: string): string {
    if (!url) return '';
    return url;
  }

  // Categories
  getCategories(): Observable<Category[]> {
    return from(
      this.supabase.client
        .from('Category')
        .select('*, Products(count)')
        .eq('IsMarkToDelete', false)
        .order('Id', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error fetching categories from Supabase:', error);
          return [];
        }
        return (data || []).map((c: any) => ({
          ...c,
          ImageUrl: c.ImageUrl ? this.formatImageUrl(c.ImageUrl) : undefined,
          _count: {
            Products: c.Products?.[0]?.count || 0,
          },
        }));
      }),
      catchError(() => of([]))
    );
  }

  getCategoryById(id: number): Observable<Category> {
    return from(
      this.supabase.client
        .from('Category')
        .select('*')
        .eq('Id', id)
        .eq('IsMarkToDelete', false)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return {
          ...data,
          ImageUrl: data?.ImageUrl ? this.formatImageUrl(data.ImageUrl) : undefined,
        };
      })
    );
  }

  createCategory(data: Partial<Category>): Observable<Category> {
    const payload = {
      Name: data.Name,
      Description: data.Description || null,
      ImageUrl: data.ImageUrl || null,
      IsMarkToDelete: false,
      CreatedBy: 'Admin',
    };

    return from(
      this.supabase.client
        .from('Category')
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

  updateCategory(id: number, data: Partial<Category>): Observable<Category> {
    const payload = {
      ...(data.Name !== undefined ? { Name: data.Name } : {}),
      ...(data.Description !== undefined ? { Description: data.Description } : {}),
      ...(data.ImageUrl !== undefined ? { ImageUrl: data.ImageUrl } : {}),
      UpdatedDate: new Date().toISOString(),
      UpdatedBy: 'Admin',
    };

    return from(
      this.supabase.client
        .from('Category')
        .update(payload)
        .eq('Id', id)
        .select()
        .single()
    ).pipe(
      map(({ data: updated, error }) => {
        if (error) throw error;
        return updated;
      })
    );
  }

  deleteCategory(id: number): Observable<{ message: string }> {
    return from(
      this.supabase.client
        .from('Category')
        .update({ IsMarkToDelete: true, UpdatedDate: new Date().toISOString() })
        .eq('Id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { message: 'Category deleted successfully' };
      })
    );
  }

  // SubCategories
  getSubCategories(categoryId?: number): Observable<SubCategory[]> {
    let query = this.supabase.client
      .from('SubCategory')
      .select('*, Products(count)')
      .eq('IsMarkToDelete', false)
      .order('Id', { ascending: true });

    if (categoryId) {
      query = query.eq('CategoryId', categoryId);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error fetching subcategories from Supabase:', error);
          return [];
        }
        return (data || []).map((s: any) => ({
          ...s,
          ImageUrl: s.ImageUrl ? this.formatImageUrl(s.ImageUrl) : undefined,
          _count: {
            Products: s.Products?.[0]?.count || 0,
          },
        }));
      }),
      catchError(() => of([]))
    );
  }

  createSubCategory(data: Partial<SubCategory>): Observable<SubCategory> {
    const payload = {
      CategoryId: data.CategoryId,
      Name: data.Name,
      Description: data.Description || null,
      ImageUrl: data.ImageUrl || null,
      IsMarkToDelete: false,
      CreatedBy: 'Admin',
    };

    return from(
      this.supabase.client
        .from('SubCategory')
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

  updateSubCategory(id: number, data: Partial<SubCategory>): Observable<SubCategory> {
    const payload = {
      ...(data.CategoryId !== undefined ? { CategoryId: data.CategoryId } : {}),
      ...(data.Name !== undefined ? { Name: data.Name } : {}),
      ...(data.Description !== undefined ? { Description: data.Description } : {}),
      ...(data.ImageUrl !== undefined ? { ImageUrl: data.ImageUrl } : {}),
      UpdatedDate: new Date().toISOString(),
      UpdatedBy: 'Admin',
    };

    return from(
      this.supabase.client
        .from('SubCategory')
        .update(payload)
        .eq('Id', id)
        .select()
        .single()
    ).pipe(
      map(({ data: updated, error }) => {
        if (error) throw error;
        return updated;
      })
    );
  }

  deleteSubCategory(id: number): Observable<{ message: string }> {
    return from(
      this.supabase.client
        .from('SubCategory')
        .update({ IsMarkToDelete: true, UpdatedDate: new Date().toISOString() })
        .eq('Id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { message: 'SubCategory deleted successfully' };
      })
    );
  }
}
