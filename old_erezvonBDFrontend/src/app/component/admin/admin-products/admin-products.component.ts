import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { SharedModule } from '../../../../shared.module';
import { Category, Color, Product, Size, SubCategory } from '../../../core/models';
import { AttributeService } from '../../../core/services/attribute.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { ShopSettingsService } from '../../../core/services/shop-settings.service';
import { findMatchingHexCode } from '../../../core/utils/color-palette';

export interface SizeVariantInput {
  tempId?: string;
  sizeId: number;
  sizeName: string;
  colorId: number | null;
  colorName?: string;
  colorHex?: string;
  stockQuantity: number;
  enabled: boolean;
  variantId?: number;
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './admin-products.component.html',
  styleUrl: './admin-products.component.scss',
})
export class AdminProductsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private attributeService = inject(AttributeService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  settingsService = inject(ShopSettingsService);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  subCategories = signal<SubCategory[]>([]);
  filteredSubCategories = signal<SubCategory[]>([]);
  sizes = signal<Size[]>([]);
  colors = signal<Color[]>([]);

  // Size + Color Variant Matrix Signal (M-Black=10, L-Navy=7, XL-White=7 etc.)
  sizeVariants = signal<SizeVariantInput[]>([]);
  totalVariantStock = computed<number>(() => {
    return this.sizeVariants()
      .filter((v) => v.enabled)
      .reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0);
  });

  loading = signal<boolean>(true);
  productDialogVisible = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  selectedProduct = signal<Product | null>(null);

  // Multi-Photo Upload Signals (Supports 3, 4, or more photos)
  uploadedPhotos = signal<Array<{
    id?: number;
    file?: File;
    previewUrl: string;
    imageUrl?: string;
    isPrimary: boolean;
    name?: string;
    size?: number;
  }>>([]);
  deletedImageIds = signal<number[]>([]);
  isUploading = signal<boolean>(false);
  imageUploadMode = signal<'file' | 'url'>('file');
  customUrlInput = signal<string>('');

  productForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      sku: ['', Validators.required],
      categoryId: [null, Validators.required],
      subCategoryId: [null],
      brand: [''],
      fabric: [''],
      regularPrice: [0, [Validators.required, Validators.min(1)]],
      discountPrice: [null],
      stockQuantity: [24, [Validators.required, Validators.min(0)]],
      description: [''],
      isFeatured: [false],
    });

    this.productForm.get('categoryId')?.valueChanges.subscribe((catId) => {
      if (catId) {
        this.filterSubCategories(catId);
      }
    });
  }

  filterSubCategories(catId: number): void {
    const subs = this.subCategories().filter((s) => s.CategoryId === catId);
    this.filteredSubCategories.set(subs);
    if (subs.length > 0 && !this.productForm.get('subCategoryId')?.value) {
      this.productForm.patchValue({ subCategoryId: subs[0].Id });
    }
  }

  loadData(): void {
    this.loading.set(true);
    this.productService.getProducts({ limit: 50 }).subscribe({
      next: (res) => {
        this.products.set(Array.isArray(res.data) ? res.data : []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories.set(Array.isArray(cats) ? cats : []),
    });

    this.categoryService.getSubCategories().subscribe({
      next: (subs) => {
        this.subCategories.set(Array.isArray(subs) ? subs : []);
        const currentCat = this.productForm?.get('categoryId')?.value;
        if (currentCat) {
          this.filterSubCategories(currentCat);
        }
      },
    });

    this.attributeService.getSizes().subscribe({
      next: (s) => this.sizes.set(Array.isArray(s) ? s : []),
    });

    this.attributeService.getColors().subscribe({
      next: (c) => this.colors.set(Array.isArray(c) ? c : []),
    });
  }

  getAvailableMasterSizes(): Size[] {
    const list = this.sizes();
    if (list && list.length > 0) {
      return list;
    }
    return [
      { Id: 1, Name: 'S' },
      { Id: 2, Name: 'M' },
      { Id: 3, Name: 'L' },
      { Id: 4, Name: 'XL' },
      { Id: 5, Name: 'XXL' },
    ];
  }

  getAvailableMasterColors(): Array<{ Id: number | null; Name: string; HexCode?: string }> {
    const list = this.colors();
    const options: Array<{ Id: number | null; Name: string; HexCode?: string }> = [
      { Id: null, Name: 'Default / Any Color', HexCode: '#94a3b8' },
    ];
    if (list && list.length > 0) {
      list.forEach((c) => {
        const hex = c.HexCode || findMatchingHexCode(c.Name) || '#1e3a8a';
        options.push({ Id: c.Id, Name: c.Name, HexCode: hex });
      });
    } else {
      options.push(
        { Id: 1, Name: 'Black', HexCode: '#111827' },
        { Id: 2, Name: 'White', HexCode: '#f8fafc' },
        { Id: 3, Name: 'Navy Blue', HexCode: '#1e3a8a' },
        { Id: 4, Name: 'Red', HexCode: '#ef4444' },
        { Id: 5, Name: 'Ash', HexCode: '#9ca3af' },
        { Id: 6, Name: 'Yellow', HexCode: '#eab308' },
        { Id: 7, Name: 'Olive Green', HexCode: '#65a30d' },
        { Id: 8, Name: 'Sky Blue', HexCode: '#38bdf8' }
      );
    }
    return options;
  }

  initSizeVariantsForNew(): void {
    const masterSizes = this.getAvailableMasterSizes();
    const defaultColors = this.getAvailableMasterColors();
    const defaultColor = defaultColors[0];

    // Default preset: M = 10, L = 7, XL = 7, S = 0
    const variants: SizeVariantInput[] = masterSizes.map((s, idx) => {
      const name = (s.Name || '').toUpperCase();
      let defaultStock = 0;
      let enabled = false;

      if (name === 'M') {
        defaultStock = 10;
        enabled = true;
      } else if (name === 'L') {
        defaultStock = 7;
        enabled = true;
      } else if (name === 'XL') {
        defaultStock = 7;
        enabled = true;
      } else if (name === 'S') {
        defaultStock = 5;
        enabled = false;
      }

      return {
        tempId: `var_${s.Id}_${idx}_${Date.now()}`,
        sizeId: s.Id,
        sizeName: s.Name,
        colorId: defaultColor.Id,
        colorName: defaultColor.Name,
        colorHex: defaultColor.HexCode,
        stockQuantity: defaultStock,
        enabled,
      };
    });

    this.sizeVariants.set(variants);
    this.productForm.patchValue({ stockQuantity: this.totalVariantStock() });
  }

  initSizeVariantsForEdit(product: Product): void {
    const masterSizes = this.getAvailableMasterSizes();
    const masterColors = this.getAvailableMasterColors();
    const existingVariants = product.ProductVariants || product.Variants || [];

    if (existingVariants.length > 0) {
      const mapped: SizeVariantInput[] = existingVariants.map((ev, idx) => {
        const szName =
          ev.Sizes?.Name ||
          ev.Size?.Name ||
          masterSizes.find((s) => s.Id === ev.SizeId)?.Name ||
          `Size ${ev.SizeId}`;

        const matchedCol = masterColors.find((c) => c.Id === ev.ColorId);
        const colName = ev.Colors?.Name || ev.Color?.Name || matchedCol?.Name;
        const colHex = ev.Colors?.HexCode || ev.Color?.HexCode || matchedCol?.HexCode || '#94a3b8';

        return {
          tempId: `edit_var_${ev.Id || idx}_${Date.now()}`,
          sizeId: ev.SizeId,
          sizeName: szName,
          colorId: ev.ColorId || null,
          colorName: colName,
          colorHex: colHex,
          stockQuantity: ev.StockQuantity,
          enabled: true,
          variantId: ev.Id,
        };
      });
      this.sizeVariants.set(mapped);
    } else {
      this.initSizeVariantsForNew();
    }

    this.productForm.patchValue({ stockQuantity: this.totalVariantStock() });
  }

  addVariantRow(): void {
    const masterSizes = this.getAvailableMasterSizes();
    const defaultSize = masterSizes[0];
    const defaultColors = this.getAvailableMasterColors();
    const defaultColor = defaultColors[0];

    const newRow: SizeVariantInput = {
      tempId: 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sizeId: defaultSize.Id,
      sizeName: defaultSize.Name,
      colorId: defaultColor.Id,
      colorName: defaultColor.Name,
      colorHex: defaultColor.HexCode,
      stockQuantity: 10,
      enabled: true,
    };

    this.sizeVariants.update((list) => [...list, newRow]);
    this.productForm.patchValue({ stockQuantity: this.totalVariantStock() });
  }

  removeVariantRow(index: number): void {
    this.sizeVariants.update((list) => {
      const next = [...list];
      next.splice(index, 1);
      return next;
    });
    this.productForm.patchValue({ stockQuantity: this.totalVariantStock() });
  }

  onSizeChange(v: SizeVariantInput, newSizeId: any): void {
    const szId = Number(newSizeId);
    const matched = this.getAvailableMasterSizes().find((s) => s.Id === szId);
    this.sizeVariants.update((list) =>
      list.map((item) =>
        item.tempId === v.tempId
          ? { ...item, sizeId: szId, sizeName: matched?.Name || `Size ${szId}` }
          : item
      )
    );
  }

  onColorChange(v: SizeVariantInput, newColorId: any): void {
    const colId =
      newColorId === null || newColorId === 'null' || newColorId === undefined || newColorId === ''
        ? null
        : Number(newColorId);
    const colorsList = this.getAvailableMasterColors();
    const matched = colorsList.find((c) => c.Id === colId);
    this.sizeVariants.update((list) =>
      list.map((item) =>
        item.tempId === v.tempId
          ? { ...item, colorId: colId, colorName: matched?.Name, colorHex: matched?.HexCode }
          : item
      )
    );
  }

  toggleSize(v: SizeVariantInput): void {
    this.sizeVariants.update((list) =>
      list.map((item) =>
        item.tempId === v.tempId ? { ...item, enabled: !item.enabled } : item
      )
    );
    this.productForm.patchValue({ stockQuantity: this.totalVariantStock() });
  }

  onStockChange(v: SizeVariantInput, event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = Math.max(0, parseInt(input.value) || 0);
    this.sizeVariants.update((list) =>
      list.map((item) =>
        item.tempId === v.tempId
          ? { ...item, stockQuantity: val, enabled: val > 0 ? true : item.enabled }
          : item
      )
    );
    this.productForm.patchValue({ stockQuantity: this.totalVariantStock() });
  }

  applyPreset(preset: 'popular' | 'even' | 'all'): void {
    if (preset === 'popular') {
      // M=10, L=7, XL=7
      this.sizeVariants.update((list) =>
        list.map((item) => {
          const name = item.sizeName.toUpperCase();
          if (name === 'M') return { ...item, enabled: true, stockQuantity: 10 };
          if (name === 'L') return { ...item, enabled: true, stockQuantity: 7 };
          if (name === 'XL') return { ...item, enabled: true, stockQuantity: 7 };
          return { ...item, enabled: false, stockQuantity: 0 };
        })
      );
    } else if (preset === 'even') {
      // 10 pcs each for all active rows
      this.sizeVariants.update((list) =>
        list.map((item) => ({ ...item, enabled: true, stockQuantity: 10 }))
      );
    } else if (preset === 'all') {
      this.sizeVariants.update((list) =>
        list.map((item) => ({ ...item, enabled: true, stockQuantity: 20 }))
      );
    }
    this.productForm.patchValue({ stockQuantity: this.totalVariantStock() });
  }

  getActiveSizesSummary(): string {
    const active = this.sizeVariants().filter((v) => v.enabled && v.stockQuantity > 0);
    if (active.length === 0) return '';
    return active
      .map(
        (v) =>
          `${v.sizeName}${v.colorName && v.colorId ? ' (' + v.colorName + ')' : ''}: ${v.stockQuantity}`
      )
      .join(', ');
  }

  // Multi-File Upload Handlers
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      input.value = ''; // Reset input to allow re-selecting same files
    }
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private handleFiles(files: File[]): void {
    const validFiles = files.filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Files',
        detail: 'Please select valid image files (JPG, PNG, WEBP, etc.)',
      });
      return;
    }

    const currentPhotos = [...this.uploadedPhotos()];

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const previewUrl = reader.result as string;
        const isFirst = currentPhotos.length === 0;
        currentPhotos.push({
          file,
          previewUrl,
          isPrimary: isFirst,
          name: file.name,
          size: file.size,
        });
        this.uploadedPhotos.set([...currentPhotos]);
      };
      reader.readAsDataURL(file);
    });
  }

  addUrlPhoto(): void {
    const url = this.customUrlInput().trim();
    if (!url) return;

    const current = [...this.uploadedPhotos()];
    const isFirst = current.length === 0;
    current.push({
      previewUrl: url,
      imageUrl: url,
      isPrimary: isFirst,
      name: `Photo ${current.length + 1}`,
    });
    this.uploadedPhotos.set(current);
    this.customUrlInput.set('');
  }

  setPrimaryPhoto(index: number): void {
    const updated = this.uploadedPhotos().map((p, i) => ({
      ...p,
      isPrimary: i === index,
    }));
    this.uploadedPhotos.set(updated);
  }

  removePhoto(index: number): void {
    const current = [...this.uploadedPhotos()];
    const photoToRemove = current[index];
    if (photoToRemove?.id) {
      this.deletedImageIds.update((ids) => [...ids, photoToRemove.id!]);
      this.productService.deleteProductImage(photoToRemove.id).subscribe();
    }
    const wasPrimary = photoToRemove?.isPrimary;
    current.splice(index, 1);
    if (wasPrimary && current.length > 0) {
      current[0].isPrimary = true;
    }
    this.uploadedPhotos.set(current);
  }

  clearAllPhotos(): void {
    for (const photo of this.uploadedPhotos()) {
      if (photo.id) {
        this.deletedImageIds.update((ids) => [...ids, photo.id!]);
        this.productService.deleteProductImage(photo.id).subscribe();
      }
    }
    this.uploadedPhotos.set([]);
  }

  openNewProductDialog(): void {
    this.isEditMode.set(false);
    this.selectedProduct.set(null);
    this.uploadedPhotos.set([]);
    this.deletedImageIds.set([]);
    this.customUrlInput.set('');
    this.imageUploadMode.set('file');
    this.productForm.reset({
      regularPrice: 0,
      stockQuantity: 24,
      isFeatured: false,
    });
    if (this.categories().length > 0) {
      const firstCat = this.categories()[0];
      this.productForm.patchValue({ categoryId: firstCat.Id });
      this.filterSubCategories(firstCat.Id);
    }
    this.initSizeVariantsForNew();
    this.productDialogVisible.set(true);
  }

  openEditProductDialog(product: Product): void {
    this.isEditMode.set(true);
    this.selectedProduct.set(product);
    this.customUrlInput.set('');
    this.deletedImageIds.set([]);
    this.imageUploadMode.set('file');

    // Preload all existing product photos with their DB ID
    const existingPhotos = (product.Images || []).map((img, idx) => ({
      id: img.Id,
      previewUrl: this.productService.formatImageUrl(img.ImageUrl),
      imageUrl: img.ImageUrl,
      isPrimary: Boolean(img.IsPrimary) || idx === 0,
      name: `Photo ${idx + 1}`,
    }));
    this.uploadedPhotos.set(existingPhotos);

    this.initSizeVariantsForEdit(product);

    this.productForm.patchValue({
      name: product.Name,
      sku: product.SKU,
      categoryId: product.CategoryId,
      subCategoryId: product.SubCategoryId,
      brand: product.Brand,
      fabric: product.Fabric,
      regularPrice: product.RegularPrice,
      discountPrice: product.DiscountPrice,
      stockQuantity: this.totalVariantStock(),
      description: product.Description,
      isFeatured: product.IsFeatured,
    });
    if (product.CategoryId) {
      this.filterSubCategories(product.CategoryId);
    }
    this.productDialogVisible.set(true);
  }

  async saveProduct(): Promise<void> {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isUploading.set(true);

    const formVal = this.productForm.value;
    const targetTotalStock = this.totalVariantStock();

    // Process all uploaded photos (3, 4, or more photos)
    const resolvedPhotos: Array<{ id?: number; url: string; isPrimary: boolean }> = [];

    for (const photo of this.uploadedPhotos()) {
      if (photo.file) {
        try {
          const uploadRes = await firstValueFrom(this.productService.uploadImage(photo.file));
          const url = uploadRes?.url || uploadRes?.filename || uploadRes?.fullUrl || '';
          if (url) {
            resolvedPhotos.push({ url, isPrimary: photo.isPrimary });
          }
        } catch {
          if (photo.previewUrl && !photo.previewUrl.startsWith('data:')) {
            resolvedPhotos.push({ url: photo.previewUrl, isPrimary: photo.isPrimary });
          }
        }
      } else if (photo.imageUrl || photo.previewUrl) {
        resolvedPhotos.push({
          id: photo.id,
          url: photo.imageUrl || photo.previewUrl,
          isPrimary: photo.isPrimary,
        });
      }
    }

    // Ensure at least one primary image exists if photos are present
    if (resolvedPhotos.length > 0 && !resolvedPhotos.some((p) => p.isPrimary)) {
      resolvedPhotos[0].isPrimary = true;
    }

    let subCatId = formVal.subCategoryId;

    // Auto-resolve or create subcategory if not chosen or missing
    if (!subCatId) {
      const match = this.subCategories().find((s) => s.CategoryId === formVal.categoryId);
      if (match) {
        subCatId = match.Id;
      } else {
        try {
          const newSub = await firstValueFrom(
            this.categoryService.createSubCategory({
              CategoryId: formVal.categoryId,
              Name: 'General',
            })
          );
          subCatId = newSub.Id;
          this.categoryService.getSubCategories().subscribe((s) => this.subCategories.set(s || []));
        } catch {
          subCatId = 1;
        }
      }
    }

    const productPayload: any = {
      Name: formVal.name,
      SKU: formVal.sku,
      CategoryId: formVal.categoryId,
      SubCategoryId: subCatId,
      Brand: formVal.brand || 'e-rezvonBD',
      Fabric: formVal.fabric || 'Cotton',
      Price: Number(formVal.regularPrice),
      RegularPrice: Number(formVal.regularPrice),
      DiscountPrice: formVal.discountPrice ? Number(formVal.discountPrice) : null,
      Description: formVal.description || '',
      IsFeatured: Boolean(formVal.isFeatured),
      IsActive: true,
      totalStock: targetTotalStock,
      TotalStock: targetTotalStock,
    };

    if (this.isEditMode() && this.selectedProduct()?.Id) {
      const prodId = this.selectedProduct()!.Id;
      this.productService.updateProduct(prodId, productPayload).subscribe({
        next: async () => {
          // Sync all active photos and delete any removed photos
          if (resolvedPhotos.length > 0) {
            try {
              await firstValueFrom(
                this.productService.uploadMultipleProductImages(
                  prodId,
                  resolvedPhotos.map((p) => ({ ImageUrl: p.url, IsPrimary: p.isPrimary })),
                  true
                )
              );
            } catch {
              for (const photo of resolvedPhotos) {
                if (!photo.id) {
                  this.productService.createProductImage({
                    ProductId: prodId,
                    ImageUrl: photo.url,
                    IsPrimary: photo.isPrimary,
                  }).subscribe();
                }
              }
            }
          }

          // Save each size variant (M=10, L=7, XL=7 etc.)
          // Save each size & color variant (e.g. M-Black=10, L-Navy=7, XL=7 etc.)
          const variantsToSave = this.sizeVariants();
          for (const v of variantsToSave) {
            try {
              if (v.enabled && v.stockQuantity >= 0) {
                if (v.variantId) {
                  await firstValueFrom(
                    this.productService.updateVariant(v.variantId, {
                      SizeId: v.sizeId,
                      ColorId: v.colorId ? v.colorId : undefined,
                      StockQuantity: v.stockQuantity,
                    })
                  );
                } else {
                  await firstValueFrom(
                    this.productService.createVariant({
                      ProductId: prodId,
                      SizeId: v.sizeId,
                      ColorId: v.colorId ? v.colorId : undefined,
                      StockQuantity: v.stockQuantity,
                    })
                  );
                }
              } else if (!v.enabled && v.variantId) {
                await firstValueFrom(
                  this.productService.updateVariant(v.variantId, {
                    StockQuantity: 0,
                  })
                );
              }
            } catch {}
          }

          this.isUploading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Updated',
            detail: `Product and size variants (${this.getActiveSizesSummary()}) updated successfully.`,
          });
          this.productDialogVisible.set(false);
          this.loadData();
        },
        error: (err) => {
          this.isUploading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'Update failed',
          });
        },
      });
    } else {
      this.productService.createProduct(productPayload).subscribe({
        next: async (created) => {
          const prodId = created?.Id || (created as any)?.data?.Id;
          if (prodId && resolvedPhotos.length > 0) {
            try {
              await firstValueFrom(
                this.productService.uploadMultipleProductImages(
                  prodId,
                  resolvedPhotos.map((p) => ({ ImageUrl: p.url, IsPrimary: p.isPrimary })),
                  true
                )
              );
            } catch {}
          }

          // Create each enabled size & color variant for the new product (e.g. M-Black=10, L-Navy=7, XL=7)
          if (prodId) {
            const enabledVariants = this.sizeVariants().filter((v) => v.enabled);
            for (const v of enabledVariants) {
              try {
                await firstValueFrom(
                  this.productService.createVariant({
                    ProductId: prodId,
                    SizeId: v.sizeId,
                    ColorId: v.colorId ? v.colorId : undefined,
                    StockQuantity: v.stockQuantity,
                  })
                );
              } catch {}
            }
          }

          this.isUploading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Created',
            detail: `Product created with size variants (${this.getActiveSizesSummary()}).`,
          });
          this.productDialogVisible.set(false);
          this.loadData();
        },
        error: (err) => {
          this.isUploading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'Creation failed',
          });
        },
      });
    }
  }

  deleteProduct(product: Product): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${product.Name}"? This action cannot be undone.`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      acceptButtonProps: {
        severity: 'danger',
        label: 'Delete',
      },
      rejectButtonProps: {
        severity: 'secondary',
        label: 'Cancel',
        outlined: true,
      },
      accept: () => {
        this.productService.deleteProduct(product.Id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Product deleted successfully.' });
            this.loadData();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to delete product' });
          }
        });
      },
    });
  }
}
