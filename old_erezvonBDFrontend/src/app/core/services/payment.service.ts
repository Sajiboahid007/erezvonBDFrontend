import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Payment, PaymentMethod } from '../models';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(`${this.apiUrl}/payment/methods`);
  }

  submitPayment(data: {
    OrderId: number;
    PaymentMethodId: number;
    Amount: number;
    TransactionId?: string;
    SenderNumber?: string;
  }): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/payment/submit`, data);
  }
}
