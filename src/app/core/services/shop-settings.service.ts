import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, map, catchError, of, tap } from 'rxjs';
import { ShopSettings } from '../models';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class ShopSettingsService {
  private supabase = inject(SupabaseService);

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
    return url;
  }

  getSettings(): Observable<ShopSettings> {
    return from(
      this.supabase.client
        .from('ShopSettings')
        .select('*')
        .eq('IsMarkToDelete', false)
        .order('Id', { ascending: true })
        .limit(1)
        .maybeSingle()
    ).pipe(
      map(({ data: raw, error }) => {
        if (error || !raw) {
          return this.settingsSignal();
        }
        return {
          StoreName: raw.ShopName || raw.StoreName || 'e-rezvonBD',
          Tagline: raw.Tagline || 'Premium Fashion & Lifestyle E-Commerce Store',
          BannerUrl: raw.BannerUrl ? this.formatImageUrl(raw.BannerUrl) : undefined,
          LogoUrl: raw.LogoUrl ? this.formatImageUrl(raw.LogoUrl) : undefined,
          CurrencySymbol: '৳',
          InsideDhakaDeliveryCharge: 60,
          OutsideDhakaDeliveryCharge: 120,
          FreeDeliveryThreshold: Number(raw.FreeDeliveryThreshold) || 2000,
          MaintenanceMode: Boolean(raw.IsMaintenanceMode),
          Email: raw.Email || 'support@erezvonbd.com',
          Phone: raw.Phone || '+880 1700-000000',
          WhatsApp: raw.WhatsAppNumber || '+880 1700-000000',
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
    const payload: any = {
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
      UpdatedDate: new Date().toISOString(),
      CreatedBy: 1,
    };

    return from(
      this.supabase.client
        .from('ShopSettings')
        .upsert({ Id: 1, ...payload })
        .select()
        .single()
    ).pipe(
      map(({ data: raw, error }) => {
        if (error) throw error;
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
