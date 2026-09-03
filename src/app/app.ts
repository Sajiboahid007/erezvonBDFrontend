import { Component, OnInit, inject, effect } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { SharedModule } from '../shared.module';
import { CartDrawerComponent } from './component/cart-drawer/cart-drawer.component';
import { ShopSettingsService } from './core/services/shop-settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SharedModule, CartDrawerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  title = 'e-rezvonBD-front-end';
  private router = inject(Router);
  private settingsService = inject(ShopSettingsService);
  private titleService = inject(Title);

  constructor() {
    this.settingsService.getSettings().subscribe();

    effect(() => {
      const settings = this.settingsService.settingsSignal();
      if (settings.StoreName) {
        this.titleService.setTitle(
          `${settings.StoreName} | ${settings.Tagline || 'Premium Fashion & Lifestyle'}`
        );
      }
      const iconUrl = settings.LogoUrl;
      if (iconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = iconUrl;
      }
    });
  }

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        // 1. Remove all lingering PrimeNG drawer/dialog masks & backdrop overlays
        const masks = document.querySelectorAll(
          '.p-drawer-mask, .p-dialog-mask, .p-component-overlay, .p-overlay-mask, .p-sidebar-mask'
        );
        masks.forEach((el) => el.remove());

        // 2. Remove any modal scroll-locks and body pointer-event blocks
        document.body.classList.remove('p-overflow-hidden', 'overflow-hidden');
        document.documentElement.classList.remove('p-overflow-hidden', 'overflow-hidden');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('pointer-events');

        // 3. Scroll window to top
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
  }
}
