import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { Color, Size } from '../models';
import { findMatchingHexCode } from '../utils/color-palette';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AttributeService {
  private supabase = inject(SupabaseService);

  private getCachedHexMap(): Record<string, string> {
    try {
      const stored = localStorage.getItem('e_rezvon_color_hex_map');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private setCachedHex(name: string, hex: string): void {
    try {
      const map = this.getCachedHexMap();
      map[name.trim().toLowerCase()] = hex;
      localStorage.setItem('e_rezvon_color_hex_map', JSON.stringify(map));
    } catch {}
  }

  // Sizes
  getSizes(): Observable<Size[]> {
    return from(
      this.supabase.client
        .from('Sizes')
        .select('*')
        .eq('IsMarkToDelete', false)
        .order('Id', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error fetching sizes from Supabase:', error);
          return [];
        }
        return data || [];
      }),
      catchError(() => of([]))
    );
  }

  createSize(data: Partial<Size>): Observable<Size> {
    const payload = {
      Name: data.Name,
      IsMarkToDelete: false,
      CreatedBy: 'Admin',
    };

    return from(
      this.supabase.client
        .from('Sizes')
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

  updateSize(id: number, data: Partial<Size>): Observable<Size> {
    return from(
      this.supabase.client
        .from('Sizes')
        .update({
          Name: data.Name,
          UpdatedDate: new Date().toISOString(),
          UpdatedBy: 'Admin',
        })
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

  deleteSize(id: number): Observable<{ message: string }> {
    return from(
      this.supabase.client
        .from('Sizes')
        .update({ IsMarkToDelete: true, UpdatedDate: new Date().toISOString() })
        .eq('Id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { message: 'Size deleted successfully' };
      })
    );
  }

  // Colors
  getColors(): Observable<Color[]> {
    return from(
      this.supabase.client
        .from('Colors')
        .select('*')
        .eq('IsMarkToDelete', false)
        .order('Id', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error fetching colors from Supabase:', error);
          return [];
        }
        const cache = this.getCachedHexMap();
        return (data || []).map((c: any) => {
          const lowerName = (c.Name || '').trim().toLowerCase();
          const hex = c.HexCode || cache[lowerName] || findMatchingHexCode(c.Name) || '#3B82F6';
          return {
            ...c,
            HexCode: hex,
          };
        });
      }),
      catchError(() => of([]))
    );
  }

  createColor(data: Partial<Color>): Observable<Color> {
    if (data.Name && data.HexCode) {
      this.setCachedHex(data.Name, data.HexCode);
    }

    const payload = {
      Name: data.Name,
      IsMarkToDelete: false,
      CreatedBy: 'Admin',
    };

    return from(
      this.supabase.client
        .from('Colors')
        .insert(payload)
        .select()
        .single()
    ).pipe(
      map(({ data: created, error }) => {
        if (error) throw error;
        const hex = data.HexCode || findMatchingHexCode(created?.Name) || '#3B82F6';
        return { ...created, HexCode: hex };
      })
    );
  }

  updateColor(id: number, data: Partial<Color>): Observable<Color> {
    if (data.Name && data.HexCode) {
      this.setCachedHex(data.Name, data.HexCode);
    }

    return from(
      this.supabase.client
        .from('Colors')
        .update({
          Name: data.Name,
          UpdatedDate: new Date().toISOString(),
          UpdatedBy: 'Admin',
        })
        .eq('Id', id)
        .select()
        .single()
    ).pipe(
      map(({ data: updated, error }) => {
        if (error) throw error;
        const hex = data.HexCode || findMatchingHexCode(updated?.Name) || '#3B82F6';
        return { ...updated, HexCode: hex };
      })
    );
  }

  deleteColor(id: number): Observable<{ message: string }> {
    return from(
      this.supabase.client
        .from('Colors')
        .update({ IsMarkToDelete: true, UpdatedDate: new Date().toISOString() })
        .eq('Id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { message: 'Color deleted successfully' };
      })
    );
  }
}
