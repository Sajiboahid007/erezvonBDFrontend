import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { Color, Size } from '../models';
import { findMatchingHexCode } from '../utils/color-palette';

@Injectable({
  providedIn: 'root',
})
export class AttributeService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

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
    return this.http.get<any>(`${this.apiUrl}/size/get`).pipe(
      map((res) => res?.data || (Array.isArray(res) ? res : [])),
      catchError(() => of([]))
    );
  }

  createSize(data: Partial<Size>): Observable<Size> {
    return this.http.post<any>(`${this.apiUrl}/size/create`, data).pipe(
      map((res) => res?.data || res)
    );
  }

  updateSize(id: number, data: Partial<Size>): Observable<Size> {
    return this.http.put<any>(`${this.apiUrl}/size/update/${id}`, data).pipe(
      map((res) => res?.data || res)
    );
  }

  deleteSize(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/size/delete/${id}`);
  }

  // Colors
  getColors(): Observable<Color[]> {
    return this.http.get<any>(`${this.apiUrl}/color/get`).pipe(
      map((res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        const cache = this.getCachedHexMap();
        return list.map((c: any) => {
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
    return this.http.post<any>(`${this.apiUrl}/color/create`, data).pipe(
      map((res) => {
        const item = res?.data || res;
        const hex = data.HexCode || findMatchingHexCode(item?.Name) || '#3B82F6';
        return { ...item, HexCode: hex };
      })
    );
  }

  updateColor(id: number, data: Partial<Color>): Observable<Color> {
    if (data.Name && data.HexCode) {
      this.setCachedHex(data.Name, data.HexCode);
    }
    return this.http.put<any>(`${this.apiUrl}/color/update/${id}`, data).pipe(
      map((res) => {
        const item = res?.data || res;
        const hex = data.HexCode || findMatchingHexCode(item?.Name) || '#3B82F6';
        return { ...item, HexCode: hex };
      })
    );
  }

  deleteColor(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/color/delete/${id}`);
  }
}
