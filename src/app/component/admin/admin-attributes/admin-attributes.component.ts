import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { SharedModule } from '../../../../shared.module';
import { Category, Color, OrderStatus, PaymentMethod, Role, Size, SubCategory } from '../../../core/models';
import { AttributeService } from '../../../core/services/attribute.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { PREDEFINED_COLORS, PredefinedColor, findMatchingHexCode } from '../../../core/utils/color-palette';

@Component({
  selector: 'app-admin-attributes',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './admin-attributes.component.html',
  styleUrl: './admin-attributes.component.scss',
})
export class AdminAttributesComponent implements OnInit {
  categoryService = inject(CategoryService);
  private attributeService = inject(AttributeService);
  private productService = inject(ProductService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  activeTab = signal<'categories' | 'subcategories' | 'sizes' | 'colors' | 'statuses' | 'payments' | 'roles'>('categories');

  categories = signal<Category[]>([]);
  subCategories = signal<SubCategory[]>([]);
  sizes = signal<Size[]>([]);
  colors = signal<Color[]>([]);
  orderStatuses = signal<OrderStatus[]>([
    { Id: 1, Name: 'Pending', Description: 'Order received and awaiting review' },
    { Id: 2, Name: 'Processing', Description: 'Items are being packed and prepared' },
    { Id: 3, Name: 'Shipped', Description: 'Order handed over to courier partner' },
    { Id: 4, Name: 'Delivered', Description: 'Successfully delivered to customer' },
    { Id: 5, Name: 'Cancelled', Description: 'Order cancelled by customer or admin' },
    { Id: 6, Name: 'Returned', Description: 'Parcel returned from courier' },
  ]);
  paymentMethods = signal<PaymentMethod[]>([
    { Id: 1, Name: 'Cash on Delivery', Code: 'COD', AccountNumber: '', Instructions: 'Pay in cash when delivery arrives.', IsActive: true },
    { Id: 2, Name: 'bKash Merchant', Code: 'BKASH', AccountNumber: '01700-000000', Instructions: 'Send money to merchant number and enter TrxID.', IsActive: true },
    { Id: 3, Name: 'Nagad Personal', Code: 'NAGAD', AccountNumber: '01800-000000', Instructions: 'Send money to personal number and enter TrxID.', IsActive: true },
    { Id: 4, Name: 'Rocket', Code: 'ROCKET', AccountNumber: '01900-000000-7', Instructions: 'Send money to Rocket number.', IsActive: true },
  ]);
  roles = signal<Role[]>([
    { Id: 1, Name: 'SuperAdmin', Description: 'Full system control, manage administrators, security, and global settings' },
    { Id: 2, Name: 'Admin', Description: 'Store management, product catalog, inventory tracking, and customer orders' },
    { Id: 3, Name: 'Manager', Description: 'Order processing, shipment dispatch, inventory stock, and customer support' },
    { Id: 4, Name: 'Customer', Description: 'Storefront shopper with standard profile and order history access' },
  ]);

  // Dialog States
  categoryDialogVisible = signal<boolean>(false);
  subCategoryDialogVisible = signal<boolean>(false);
  sizeDialogVisible = signal<boolean>(false);
  colorDialogVisible = signal<boolean>(false);
  statusDialogVisible = signal<boolean>(false);
  paymentDialogVisible = signal<boolean>(false);
  roleDialogVisible = signal<boolean>(false);

  // Category Photo Signals
  @ViewChild('catUploader') catUploader?: any;
  @ViewChild('subCatUploader') subCatUploader?: any;

  categorySelectedFile = signal<File | null>(null);
  categoryImagePreview = signal<string>('');
  isCategoryUploading = signal<boolean>(false);

  // SubCategory Photo Signals
  subCategorySelectedFile = signal<File | null>(null);
  subCategoryImagePreview = signal<string>('');
  isSubCategoryUploading = signal<boolean>(false);

  // Forms data
  categoryForm = { Id: 0, Name: '', ImageUrl: '' };
  subCategoryForm = { Id: 0, CategoryId: 0, Name: '', ImageUrl: '' };
  sizeForm = { Id: 0, Name: '', Code: '' };
  colorForm = { Id: 0, Name: '', HexCode: '#1e3a8a' };
  statusForm = { Id: 0, Name: '', Description: '' };
  paymentForm = { Id: 0, Name: '', Code: 'COD', AccountNumber: '', Instructions: '', IsActive: true };
  roleForm = { Id: 0, Name: '', Description: '' };

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.categoryService.getCategories().subscribe({
      next: (data) => this.categories.set(Array.isArray(data) ? data : []),
      error: () => this.categories.set([]),
    });
    this.categoryService.getSubCategories().subscribe({
      next: (data) => this.subCategories.set(Array.isArray(data) ? data : []),
      error: () => this.subCategories.set([]),
    });
    this.attributeService.getSizes().subscribe({
      next: (data) => this.sizes.set(Array.isArray(data) ? data : []),
      error: () => this.sizes.set([]),
    });
    this.attributeService.getColors().subscribe({
      next: (data) => this.colors.set(Array.isArray(data) ? data : []),
      error: () => this.colors.set([]),
    });
  }

  onCategoryDialogVisibleChange(visible: boolean): void {
    this.categoryDialogVisible.set(visible);
    if (!visible) {
      this.categorySelectedFile.set(null);
      this.categoryImagePreview.set('');
      this.catUploader?.clear();
    }
  }

  onSubCategoryDialogVisibleChange(visible: boolean): void {
    this.subCategoryDialogVisible.set(visible);
    if (!visible) {
      this.subCategorySelectedFile.set(null);
      this.subCategoryImagePreview.set('');
      this.subCatUploader?.clear();
    }
  }

  // Category Photo Handlers
  onCategoryFileSelect(event: any): void {
    const file = event?.files?.[0] || event?.currentFiles?.[0];
    if (file) {
      this.handleCategoryFile(file);
    }
  }

  onCategoryFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleCategoryFile(input.files[0]);
    }
  }

  onCategoryFileDropped(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.handleCategoryFile(event.dataTransfer.files[0]);
    }
  }

  private handleCategoryFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.messageService.add({ severity: 'warn', summary: 'Invalid File', detail: 'Please select a valid image file.' });
      return;
    }
    this.categorySelectedFile.set(file);
    const reader = new FileReader();
    reader.onload = () => {
      this.categoryImagePreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeCategoryImage(): void {
    this.categorySelectedFile.set(null);
    this.categoryImagePreview.set('');
    this.categoryForm.ImageUrl = '';
    this.catUploader?.clear();
  }

  openNewCategory(): void {
    this.categoryForm = { Id: 0, Name: '', ImageUrl: '' };
    this.categorySelectedFile.set(null);
    this.categoryImagePreview.set('');
    this.catUploader?.clear();
    this.categoryDialogVisible.set(true);
  }

  openEditCategory(cat: Category): void {
    this.categoryForm = { Id: cat.Id, Name: cat.Name, ImageUrl: cat.ImageUrl || '' };
    this.categorySelectedFile.set(null);
    const validUrl = cat.ImageUrl && (cat.ImageUrl.startsWith('http://') || cat.ImageUrl.startsWith('https://') || cat.ImageUrl.startsWith('data:')) ? cat.ImageUrl : '';
    this.categoryImagePreview.set(validUrl);
    this.catUploader?.clear();
    this.categoryDialogVisible.set(true);
  }

  async saveCategory(): Promise<void> {
    if (!this.categoryForm.Name) return;

    this.isCategoryUploading.set(true);
    let finalImageUrl = this.categoryForm.ImageUrl || '';

    if (this.categorySelectedFile()) {
      try {
        const uploadRes = await firstValueFrom(this.productService.uploadImage(this.categorySelectedFile()!));
        finalImageUrl = uploadRes?.url || uploadRes?.fullUrl || '';
      } catch (err: any) {
        this.isCategoryUploading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Image Upload Failed',
          detail: err?.message || 'Could not upload image to Cloudinary.',
        });
        return;
      }
    }

    const payload = {
      Name: this.categoryForm.Name,
      ImageUrl: finalImageUrl,
      IsActive: true,
    };

    if (this.categoryForm.Id) {
      this.categoryService.updateCategory(this.categoryForm.Id, payload).subscribe({
        next: () => {
          this.isCategoryUploading.set(false);
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Category updated successfully.' });
          this.onCategoryDialogVisibleChange(false);
          this.loadAll();
        },
        error: (err) => {
          this.isCategoryUploading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Update failed' });
        }
      });
    } else {
      this.categoryService.createCategory(payload).subscribe({
        next: () => {
          this.isCategoryUploading.set(false);
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Category created successfully.' });
          this.onCategoryDialogVisibleChange(false);
          this.loadAll();
        },
        error: (err) => {
          this.isCategoryUploading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Creation failed' });
        }
      });
    }
  }

  deleteCategory(cat: Category): void {
    this.confirmationService.confirm({
      message: `Delete category "${cat.Name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      accept: () => {
        this.categoryService.deleteCategory(cat.Id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Category deleted.' });
            this.loadAll();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to delete' });
          }
        });
      },
    });
  }

  // SubCategory Photo Handlers
  onSubCategoryFileSelect(event: any): void {
    const file = event?.files?.[0] || event?.currentFiles?.[0];
    if (file) {
      this.handleSubCategoryFile(file);
    }
  }

  onSubCategoryFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleSubCategoryFile(input.files[0]);
    }
  }

  onSubCategoryFileDropped(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.handleSubCategoryFile(event.dataTransfer.files[0]);
    }
  }

  private handleSubCategoryFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.messageService.add({ severity: 'warn', summary: 'Invalid File', detail: 'Please select a valid image file.' });
      return;
    }
    this.subCategorySelectedFile.set(file);
    const reader = new FileReader();
    reader.onload = () => {
      this.subCategoryImagePreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeSubCategoryImage(): void {
    this.subCategorySelectedFile.set(null);
    this.subCategoryImagePreview.set('');
    this.subCategoryForm.ImageUrl = '';
    this.subCatUploader?.clear();
  }

  openNewSubCategory(): void {
    this.subCategoryForm = { Id: 0, CategoryId: this.categories()[0]?.Id || 0, Name: '', ImageUrl: '' };
    this.subCategorySelectedFile.set(null);
    this.subCategoryImagePreview.set('');
    this.subCatUploader?.clear();
    this.subCategoryDialogVisible.set(true);
  }

  openEditSubCategory(sub: SubCategory): void {
    this.subCategoryForm = { Id: sub.Id, CategoryId: sub.CategoryId, Name: sub.Name, ImageUrl: sub.ImageUrl || '' };
    this.subCategorySelectedFile.set(null);
    const validUrl = sub.ImageUrl && (sub.ImageUrl.startsWith('http://') || sub.ImageUrl.startsWith('https://') || sub.ImageUrl.startsWith('data:')) ? sub.ImageUrl : '';
    this.subCategoryImagePreview.set(validUrl);
    this.subCatUploader?.clear();
    this.subCategoryDialogVisible.set(true);
  }

  async saveSubCategory(): Promise<void> {
    if (!this.subCategoryForm.Name || !this.subCategoryForm.CategoryId) return;

    this.isSubCategoryUploading.set(true);
    let finalImageUrl = this.subCategoryForm.ImageUrl || '';

    if (this.subCategorySelectedFile()) {
      try {
        const uploadRes = await firstValueFrom(this.productService.uploadImage(this.subCategorySelectedFile()!));
        finalImageUrl = uploadRes?.url || uploadRes?.fullUrl || '';
      } catch (err: any) {
        this.isSubCategoryUploading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Image Upload Failed',
          detail: err?.message || 'Could not upload image to Cloudinary.',
        });
        return;
      }
    }

    const payload = {
      CategoryId: this.subCategoryForm.CategoryId,
      Name: this.subCategoryForm.Name,
      ImageUrl: finalImageUrl,
      IsActive: true,
    };

    if (this.subCategoryForm.Id) {
      this.categoryService.updateSubCategory(this.subCategoryForm.Id, payload).subscribe({
        next: () => {
          this.isSubCategoryUploading.set(false);
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Subcategory updated successfully.' });
          this.onSubCategoryDialogVisibleChange(false);
          this.loadAll();
        },
        error: (err) => {
          this.isSubCategoryUploading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Update failed' });
        }
      });
    } else {
      this.categoryService.createSubCategory(payload).subscribe({
        next: () => {
          this.isSubCategoryUploading.set(false);
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Subcategory created successfully.' });
          this.onSubCategoryDialogVisibleChange(false);
          this.loadAll();
        },
        error: (err) => {
          this.isSubCategoryUploading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Creation failed' });
        }
      });
    }
  }

  deleteSubCategory(sub: SubCategory): void {
    this.confirmationService.confirm({
      message: `Delete subcategory "${sub.Name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      accept: () => {
        this.categoryService.deleteSubCategory(sub.Id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Subcategory deleted.' });
            this.loadAll();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to delete' });
          }
        });
      },
    });
  }

  // Size CRUD
  openNewSize(): void {
    this.sizeForm = { Id: 0, Name: '', Code: '' };
    this.sizeDialogVisible.set(true);
  }

  openEditSize(size: Size): void {
    this.sizeForm = { Id: size.Id, Name: size.Name, Code: (size as any).Code || '' };
    this.sizeDialogVisible.set(true);
  }

  saveSize(): void {
    if (!this.sizeForm.Name) return;
    if (this.sizeForm.Id) {
      this.attributeService.updateSize(this.sizeForm.Id, this.sizeForm).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Size updated.' });
          this.sizeDialogVisible.set(false);
          this.loadAll();
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Update failed' });
        }
      });
    } else {
      this.attributeService.createSize(this.sizeForm).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Size created.' });
          this.sizeDialogVisible.set(false);
          this.loadAll();
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Creation failed' });
        }
      });
    }
  }

  deleteSize(size: Size): void {
    this.confirmationService.confirm({
      message: `Delete size "${size.Name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      accept: () => {
        this.attributeService.deleteSize(size.Id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Size deleted.' });
            this.loadAll();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to delete' });
          }
        });
      },
    });
  }

  // Color CRUD
  predefinedColors = PREDEFINED_COLORS;

  openNewColor(): void {
    this.colorForm = { Id: 0, Name: '', HexCode: '#EF4444' };
    this.colorDialogVisible.set(true);
  }

  openEditColor(col: Color): void {
    const defaultHex = findMatchingHexCode(col.Name) || '#1E3A8A';
    this.colorForm = { Id: col.Id, Name: col.Name, HexCode: col.HexCode || defaultHex };
    this.colorDialogVisible.set(true);
  }

  onColorNameInput(name: string): void {
    const matchedHex = findMatchingHexCode(name);
    if (matchedHex) {
      this.colorForm.HexCode = matchedHex;
    }
  }

  selectQuickColor(c: PredefinedColor): void {
    this.colorForm.Name = c.name;
    this.colorForm.HexCode = c.hex;
  }

  saveColor(): void {
    if (!this.colorForm.Name) return;
    if (this.colorForm.Id) {
      this.attributeService.updateColor(this.colorForm.Id, this.colorForm).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Color updated.' });
          this.colorDialogVisible.set(false);
          this.loadAll();
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Update failed' });
        }
      });
    } else {
      this.attributeService.createColor(this.colorForm).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Color created.' });
          this.colorDialogVisible.set(false);
          this.loadAll();
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Creation failed' });
        }
      });
    }
  }

  deleteColor(col: Color): void {
    this.confirmationService.confirm({
      message: `Delete color "${col.Name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      accept: () => {
        this.attributeService.deleteColor(col.Id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Color deleted.' });
            this.loadAll();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to delete' });
          }
        });
      },
    });
  }

  // Order Status CRUD
  openNewStatus(): void {
    this.statusForm = { Id: 0, Name: '', Description: '' };
    this.statusDialogVisible.set(true);
  }

  openEditStatus(status: OrderStatus): void {
    this.statusForm = { Id: status.Id, Name: status.Name, Description: status.Description || '' };
    this.statusDialogVisible.set(true);
  }

  saveStatus(): void {
    if (!this.statusForm.Name) return;
    const isEdit = Boolean(this.statusForm.Id);
    const newStatus: OrderStatus = {
      Id: this.statusForm.Id || (this.orderStatuses().length + 1),
      Name: this.statusForm.Name,
      Description: this.statusForm.Description,
    };
    this.orderStatuses.update((list) => [...list.filter((s) => s.Id !== newStatus.Id), newStatus]);
    this.messageService.add({ severity: 'success', summary: isEdit ? 'Updated' : 'Created', detail: `Order status "${newStatus.Name}" ${isEdit ? 'updated' : 'created'}.` });
    this.statusDialogVisible.set(false);
  }

  deleteStatus(status: OrderStatus): void {
    this.confirmationService.confirm({
      message: `Delete order status "${status.Name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      accept: () => {
        this.orderStatuses.update((list) => list.filter((s) => s.Id !== status.Id));
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Status deleted.' });
      },
    });
  }

  // Payment Method CRUD
  openNewPayment(): void {
    this.paymentForm = { Id: 0, Name: '', Code: 'COD', AccountNumber: '', Instructions: '', IsActive: true };
    this.paymentDialogVisible.set(true);
  }

  openEditPayment(pm: PaymentMethod): void {
    this.paymentForm = {
      Id: pm.Id,
      Name: pm.Name,
      Code: pm.Code,
      AccountNumber: pm.AccountNumber || '',
      Instructions: pm.Instructions || '',
      IsActive: pm.IsActive,
    };
    this.paymentDialogVisible.set(true);
  }

  savePayment(): void {
    if (!this.paymentForm.Name || !this.paymentForm.Code) return;
    const isEdit = Boolean(this.paymentForm.Id);
    const newMethod: PaymentMethod = {
      Id: this.paymentForm.Id || (this.paymentMethods().length + 1),
      Name: this.paymentForm.Name,
      Code: this.paymentForm.Code,
      AccountNumber: this.paymentForm.AccountNumber,
      Instructions: this.paymentForm.Instructions,
      IsActive: this.paymentForm.IsActive,
    };
    this.paymentMethods.update((list) => [...list.filter((p) => p.Id !== newMethod.Id), newMethod]);
    this.messageService.add({ severity: 'success', summary: isEdit ? 'Updated' : 'Created', detail: `Payment method "${newMethod.Name}" ${isEdit ? 'updated' : 'created'}.` });
    this.paymentDialogVisible.set(false);
  }

  togglePaymentActive(pm: PaymentMethod): void {
    pm.IsActive = !pm.IsActive;
    this.paymentMethods.update((list) => [...list]);
    this.messageService.add({ severity: 'info', summary: 'Status Changed', detail: `${pm.Name} is now ${pm.IsActive ? 'active' : 'disabled'}.` });
  }

  deletePayment(pm: PaymentMethod): void {
    this.confirmationService.confirm({
      message: `Delete payment gateway "${pm.Name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      accept: () => {
        this.paymentMethods.update((list) => list.filter((p) => p.Id !== pm.Id));
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Payment gateway deleted.' });
      },
    });
  }

  // Role CRUD
  openNewRole(): void {
    this.roleForm = { Id: 0, Name: '', Description: '' };
    this.roleDialogVisible.set(true);
  }

  openEditRole(role: Role): void {
    this.roleForm = {
      Id: role.Id,
      Name: role.Name,
      Description: role.Description || '',
    };
    this.roleDialogVisible.set(true);
  }

  saveRole(): void {
    if (!this.roleForm.Name) return;
    const isEdit = Boolean(this.roleForm.Id);
    const newRole: Role = {
      Id: this.roleForm.Id || (this.roles().length + 1),
      Name: this.roleForm.Name,
      Description: this.roleForm.Description,
    };
    this.roles.update((list) => [...list.filter((r) => r.Id !== newRole.Id), newRole]);
    this.messageService.add({
      severity: 'success',
      summary: isEdit ? 'Updated' : 'Created',
      detail: `Role "${newRole.Name}" ${isEdit ? 'updated' : 'created'}.`,
    });
    this.roleDialogVisible.set(false);
  }

  deleteRole(role: Role): void {
    this.confirmationService.confirm({
      message: `Delete role "${role.Name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      accept: () => {
        this.roles.update((list) => list.filter((r) => r.Id !== role.Id));
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Role deleted.',
        });
      },
    });
  }

  // Dynamic Add Button helpers for Inline Title Header
  getAddButtonLabel(): string {
    switch (this.activeTab()) {
      case 'categories':
        return 'Add Category';
      case 'subcategories':
        return 'Add Sub-Category';
      case 'sizes':
        return 'Add Size';
      case 'colors':
        return 'Add Color';
      case 'statuses':
        return 'Add Status';
      case 'payments':
        return 'Add Payment Method';
      case 'roles':
        return 'Add Role';
      default:
        return 'Add Item';
    }
  }

  openAddModalForCurrentTab(): void {
    switch (this.activeTab()) {
      case 'categories':
        this.openNewCategory();
        break;
      case 'subcategories':
        this.openNewSubCategory();
        break;
      case 'sizes':
        this.openNewSize();
        break;
      case 'colors':
        this.openNewColor();
        break;
      case 'statuses':
        this.openNewStatus();
        break;
      case 'payments':
        this.openNewPayment();
        break;
      case 'roles':
        this.openNewRole();
        break;
    }
  }
}
