import { Component, OnInit, inject, signal } from '@angular/core';
import { SharedModule } from '../../../../shared.module';
import { AuthService } from '../../../core/services/auth.service';
import { ShopSettingsService } from '../../../core/services/shop-settings.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent implements OnInit {
  authService = inject(AuthService);
  settingsService = inject(ShopSettingsService);

  sidebarOpen = signal<boolean>(true);
  mobileSidebarOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.settingsService.getSettings().subscribe({
      next: () => {},
      error: () => {},
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  logout(): void {
    this.authService.logout();
  }
}
