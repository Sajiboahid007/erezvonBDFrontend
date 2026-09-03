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
        .order('Id', { ascending: true })
        .limit(1)
        .maybeSingle()
    ).pipe(
      map(({ data: raw, error }) => {
        if (error || !raw) {
          if (error) console.warn('Supabase getSettings error:', error);
          return this.settingsSignal();
        }
        return {
          StoreName: raw.ShopName || raw.StoreName || 'e-rezvonBD',
          Tagline: raw.Tagline || 'Premium Fashion & Lifestyle E-Commerce Store',
          LogoUrl: raw.LogoUrl ? this.formatImageUrl(raw.LogoUrl) : undefined,
          CurrencySymbol: '৳',
          InsideDhakaDeliveryCharge: Number(raw.InsideDhakaDeliveryCharge) || 60,
          OutsideDhakaDeliveryCharge: Number(raw.OutsideDhakaDeliveryCharge) || 120,
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
    const updatedState: ShopSettings = {
      ...this.settingsSignal(),
      ...data,
    };
    // Immediately set signal so all components (sidebar, navbar, header) update in real-time
    this.settingsSignal.set(updatedState);

    const run = async (): Promise<ShopSettings> => {
      const payload: any = {
        ShopName: data.StoreName ?? updatedState.StoreName,
        Tagline: data.Tagline ?? updatedState.Tagline,
        LogoUrl: data.LogoUrl !== undefined ? data.LogoUrl : (updatedState.LogoUrl || null),
        UpdatedDate: new Date().toISOString(),
      };

      if (data.Email !== undefined) payload.Email = data.Email;
      if (data.Phone !== undefined) payload.Phone = data.Phone;
      if (data.WhatsApp !== undefined) payload.WhatsAppNumber = data.WhatsApp;
      if (data.Address !== undefined) payload.Address = data.Address;
      if (data.FreeDeliveryThreshold !== undefined) payload.FreeDeliveryThreshold = Number(data.FreeDeliveryThreshold);
      if (data.MaintenanceMode !== undefined) payload.IsMaintenanceMode = Boolean(data.MaintenanceMode);
      if (data.FacebookUrl !== undefined) payload.FacebookUrl = data.FacebookUrl;
      if (data.InstagramUrl !== undefined) payload.InstagramUrl = data.InstagramUrl;

      const { data: res, error: updateError } = await this.supabase.client
        .from('ShopSettings')
        .update(payload)
        .eq('Id', 1)
        .select();

      if (updateError) {
        console.warn('Full update failed, trying minimal update of ShopName, Tagline, LogoUrl:', updateError);
        const minPayload = {
          ShopName: payload.ShopName,
          Tagline: payload.Tagline,
          LogoUrl: payload.LogoUrl,
          UpdatedDate: new Date().toISOString(),
        };
        const { error: minError } = await this.supabase.client
          .from('ShopSettings')
          .update(minPayload)
          .eq('Id', 1);

        if (minError) {
          console.error('Minimal ShopSettings update error:', minError);
        }
      }

      return updatedState;
    };

    return from(run()).pipe(
      tap((s) => this.settingsSignal.set(s)),
      catchError(() => of(updatedState))
    );
  }
}
