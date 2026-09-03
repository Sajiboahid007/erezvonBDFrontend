import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SharedModule } from '../../../shared.module';
import { ShopSettingsService } from '../../core/services/shop-settings.service';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './order-success.component.html',
  styleUrl: './order-success.component.scss',
})
export class OrderSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  settingsService = inject(ShopSettingsService);

  orderNumber = signal<string>('');

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.orderNumber.set(params['orderNumber'] || 'ORD-2026-001');
    });
  }
}
