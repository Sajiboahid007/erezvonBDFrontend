import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { Payment, PaymentMethod } from '../models';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private supabase = inject(SupabaseService);

  getPaymentMethods(): Observable<PaymentMethod[]> {
    return from(
      this.supabase.client
        .from('PaymentMethods')
        .select('*')
        .eq('IsMarkToDelete', false)
        .order('Id', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error fetching payment methods:', error);
          return [];
        }
        return data || [];
      }),
      catchError(() => of([]))
    );
  }

  submitPayment(data: {
    OrderId: number;
    PaymentMethodId: number;
    Amount: number;
    TransactionId?: string;
    SenderNumber?: string;
  }): Observable<Payment> {
    const payload = {
      OrderId: data.OrderId,
      PaymentMethodId: data.PaymentMethodId,
      Amount: data.Amount,
      TransactionId: data.TransactionId || null,
      SenderNumber: data.SenderNumber || null,
      IsSuccessful: true,
      IsMarkToDelete: false,
      CreatedBy: 'USER',
    };

    const run = async (): Promise<Payment> => {
      const { data: payment, error } = await this.supabase.client
        .from('Payments')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Mark order as paid
      await this.supabase.client
        .from('Orders')
        .update({ IsPaid: true, UpdatedDate: new Date().toISOString() })
        .eq('Id', data.OrderId);

      return payment;
    };

    return from(run());
  }
}
