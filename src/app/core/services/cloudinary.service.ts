import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class CloudinaryService {
  private supabaseService = inject(SupabaseService);

  /**
   * Generates a cryptographic SHA-1 hex signature for Cloudinary signed upload
   */
  private async generateSignature(paramsToSign: Record<string, any>, apiSecret: string): Promise<string> {
    const sortedKeys = Object.keys(paramsToSign).sort();
    const serialized = sortedKeys
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join('&');

    const stringToHash = `${serialized}${apiSecret}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(stringToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Upload image directly to Cloudinary using secure signed upload via native fetch
   */
  uploadImage(
    file: File,
    folder = 'erezvon-bd'
  ): Observable<{ filename: string; url: string; fullUrl: string }> {
    const cloudName = environment.cloudinary?.cloudName;
    const apiKey = environment.cloudinary?.apiKey;
    const apiSecret = environment.cloudinary?.apiSecret;

    const run = async (): Promise<{ filename: string; url: string; fullUrl: string }> => {
      if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary credentials missing in environment.ts');
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const paramsToSign = {
        folder,
        timestamp,
      };

      const signature = await this.generateSignature(paramsToSign, apiSecret);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('folder', folder);
      formData.append('signature', signature);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Cloudinary API upload error:', errorData);
        throw new Error(errorData?.error?.message || `Cloudinary upload failed: ${response.statusText}`);
      }

      const res = await response.json();
      const secureUrl = res.secure_url || res.url;

      return {
        filename: res.public_id || file.name,
        url: secureUrl,
        fullUrl: secureUrl,
      };
    };

    return from(run());
  }
}
