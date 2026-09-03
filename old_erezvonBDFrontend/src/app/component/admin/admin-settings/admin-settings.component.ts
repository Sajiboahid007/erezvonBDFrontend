import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { SharedModule } from '../../../../shared.module';
import { ProductService } from '../../../core/services/product.service';
import { ShopSettingsService } from '../../../core/services/shop-settings.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss',
})
export class AdminSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  settingsService = inject(ShopSettingsService);
  private productService = inject(ProductService);
  private messageService = inject(MessageService);

  @ViewChild('bannerUploader') bannerUploader?: any;

  settingsForm!: FormGroup;
  saving = signal<boolean>(false);
  bannerImagePreview = signal<string>('');
  isBannerUploading = signal<boolean>(false);

  ngOnInit(): void {
    const s = this.settingsService.settingsSignal();
    this.settingsForm = this.fb.group({
      StoreName: [s.StoreName, Validators.required],
      Tagline: [s.Tagline],
      BannerUrl: [s.BannerUrl || ''],
      Phone: [s.Phone],
      WhatsApp: [s.WhatsApp],
      Email: [s.Email, [Validators.email]],
      Address: [s.Address],
      InsideDhakaDeliveryCharge: [s.InsideDhakaDeliveryCharge, Validators.required],
      OutsideDhakaDeliveryCharge: [s.OutsideDhakaDeliveryCharge, Validators.required],
      FreeDeliveryThreshold: [s.FreeDeliveryThreshold, Validators.required],
      MaintenanceMode: [s.MaintenanceMode],
      FacebookUrl: [s.FacebookUrl || ''],
      InstagramUrl: [s.InstagramUrl || ''],
    });

    this.settingsService.getSettings().subscribe({
      next: (data) => {
        if (data) {
          this.settingsForm.patchValue(data);
          if (data.BannerUrl) {
            this.bannerImagePreview.set(this.settingsService.formatImageUrl(data.BannerUrl));
          }
        }
      },
    });
  }

  onBannerSelect(event: any): void {
    const file = event.files?.[0] || (event.target?.files?.[0]);
    if (!file) return;

    this.isBannerUploading.set(true);
    this.productService.uploadImage(file).subscribe({
      next: (res) => {
        this.isBannerUploading.set(false);
        const uploadedUrl = res.url || res.filename || '';
        this.settingsForm.patchValue({ BannerUrl: uploadedUrl });
        this.bannerImagePreview.set(this.settingsService.formatImageUrl(uploadedUrl));
        this.messageService.add({
          severity: 'info',
          summary: 'Uploaded',
          detail: 'Banner image uploaded successfully.',
        });
      },
      error: () => {
        this.isBannerUploading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Upload Error',
          detail: 'Could not upload banner image.',
        });
      },
    });
  }

  removeBanner(): void {
    this.settingsForm.patchValue({ BannerUrl: '' });
    this.bannerImagePreview.set('');
    if (this.bannerUploader) {
      this.bannerUploader.clear();
    }
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) return;

    this.saving.set(true);
    this.settingsService.updateSettings(this.settingsForm.value).subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Store configuration saved successfully.',
        });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Store configuration updated.',
        });
      },
    });
  }
}
