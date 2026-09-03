import { Component, inject } from '@angular/core';
import { SharedModule } from '../../../shared.module';
import { ShopSettingsService } from '../../core/services/shop-settings.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  settingsService = inject(ShopSettingsService);
}
