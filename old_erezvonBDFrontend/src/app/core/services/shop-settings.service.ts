import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ShopSettings } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ShopSettingsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

  settingsSignal = signal<ShopSettings>({
    StoreName: 'e-rezvonBD',
    Tagline: 'Premium Fashion & Lifestyle E-Commerce Store',
    CurrencySymbol: '৳',
    InsideDhakaDeliveryCharge: 60,
    OutsideDhakaDeliveryCharge: 120,
    FreeDeliveryThreshold: 2000,
    MaintenanceMode: false,
    Email: 'support@erezvonbd.com',
    Phone: '+880 1700-000000',
    WhatsApp: '+880 1700-000000',
    Address: 'Dhaka, Bangladesh',
  });

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

  getSettings(): Observable<ShopSettings> {
    return this.http.get<any>(`${this.apiUrl}/shop-settings/get`).pipe(
      map((res) => {
        const raw = res?.data || res;
        if (!raw) return this.settingsSignal();
        return {
          StoreName: raw.ShopName || raw.StoreName || 'e-rezvonBD',
          Tagline: raw.Tagline || 'Premium Fashion & Lifestyle E-Commerce Store',
          BannerUrl: raw.BannerUrl || raw.BannerImage ? this.formatImageUrl(raw.BannerUrl || raw.BannerImage) : undefined,
          LogoUrl: raw.LogoUrl || raw.Logo ? this.formatImageUrl(raw.LogoUrl || raw.Logo) : undefined,
          CurrencySymbol: '৳',
          InsideDhakaDeliveryCharge: 60,
          OutsideDhakaDeliveryCharge: 120,
          FreeDeliveryThreshold: raw.FreeDeliveryThreshold || 2000,
          MaintenanceMode: raw.IsMaintenanceMode || raw.MaintenanceMode || false,
          Email: raw.Email || 'support@erezvonbd.com',
          Phone: raw.Phone || '+880 1700-000000',
          WhatsApp: raw.WhatsAppNumber || raw.WhatsApp || '+880 1700-000000',
          Address: raw.Address || 'Dhaka, Bangladesh',
          FacebookUrl: raw.FacebookUrl,
          InstagramUrl: raw.InstagramUrl,
        };
      }),
      tap((settings) => {
        if (settings) {
          this.settingsSignal.set(settings);
        }
      }),
      catchError(() => of(this.settingsSignal()))
    );
  }

  updateSettings(data: Partial<ShopSettings>): Observable<ShopSettings> {
    const payload = {
      ShopName: data.StoreName,
      Tagline: data.Tagline,
      BannerUrl: data.BannerUrl,
      LogoUrl: data.LogoUrl,
      Email: data.Email,
      Phone: data.Phone,
      WhatsAppNumber: data.WhatsApp,
      Address: data.Address,
      FreeDeliveryThreshold: data.FreeDeliveryThreshold,
      IsMaintenanceMode: data.MaintenanceMode,
      FacebookUrl: data.FacebookUrl,
      InstagramUrl: data.InstagramUrl,
    };

    return this.http.put<any>(`${this.apiUrl}/shop-settings/update`, payload).pipe(
      map((res) => {
        const raw = res?.data || res;
        return {
          ...this.settingsSignal(),
          ...data,
        };
      }),
      tap((updated) => {
        this.settingsSignal.set(updated);
      })
    );
  }
}
