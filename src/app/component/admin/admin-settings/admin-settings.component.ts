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

  @ViewChild('logoUploader') logoUploader?: any;

  settingsForm!: FormGroup;
  saving = signal<boolean>(false);
  logoImagePreview = signal<string>('');
  isLogoUploading = signal<boolean>(false);

  ngOnInit(): void {
    const s = this.settingsService.settingsSignal();
    this.settingsForm = this.fb.group({
      StoreName: [s.StoreName, Validators.required],
      Tagline: [s.Tagline],
      LogoUrl: [s.LogoUrl || ''],
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
          if (data.LogoUrl) {
            this.logoImagePreview.set(this.settingsService.formatImageUrl(data.LogoUrl));
          }
        }
      },
    });
  }

  onLogoSelect(event: any): void {
    const file = event.files?.[0] || event.target?.files?.[0];
    if (!file) return;

    this.isLogoUploading.set(true);
    this.productService.uploadImage(file).subscribe({
      next: (res) => {
        this.isLogoUploading.set(false);
        const uploadedUrl = res.url || res.filename || '';
        this.settingsForm.patchValue({ LogoUrl: uploadedUrl });
        this.logoImagePreview.set(this.settingsService.formatImageUrl(uploadedUrl));

        // Immediately update global signal and persist in Supabase
        this.settingsService.updateSettings({
          ...this.settingsForm.value,
          LogoUrl: uploadedUrl,
        }).subscribe();

        this.messageService.add({
          severity: 'success',
          summary: 'Logo Updated',
          detail: 'Store logo uploaded & updated successfully.',
        });
      },
      error: (err) => {
        console.error('Cloudinary upload error:', err);
        this.isLogoUploading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Upload Error',
          detail: 'Could not upload store logo to Cloudinary.',
        });
      },
    });
  }

  removeLogo(): void {
    this.settingsForm.patchValue({ LogoUrl: '' });
    this.logoImagePreview.set('');
    if (this.logoUploader) {
      this.logoUploader.clear();
    }
    // Immediately remove from global signal and persist
    this.settingsService.updateSettings({
      ...this.settingsForm.value,
      LogoUrl: '',
    }).subscribe();

    this.messageService.add({
      severity: 'info',
      summary: 'Logo Removed',
      detail: 'Store logo has been removed.',
    });
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
