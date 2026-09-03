import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabaseClient: SupabaseClient;

  constructor() {
    this.supabaseClient = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  get client(): SupabaseClient {
    return this.supabaseClient;
  }

  get auth() {
    return this.supabaseClient.auth;
  }

  get storage() {
    return this.supabaseClient.storage;
  }

  from(table: string) {
    return this.supabaseClient.from(table);
  }
}
