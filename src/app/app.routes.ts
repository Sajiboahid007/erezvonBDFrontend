import { Routes } from '@angular/router';
import { AdminAttributesComponent } from './component/admin/admin-attributes/admin-attributes.component';
import { AdminDeliveryHistoryComponent } from './component/admin/admin-delivery-history/admin-delivery-history.component';
import { AdminLayoutComponent } from './component/admin/admin-layout/admin-layout.component';
import { AdminOrdersComponent } from './component/admin/admin-orders/admin-orders.component';
import { AdminProductsComponent } from './component/admin/admin-products/admin-products.component';
import { AdminSettingsComponent } from './component/admin/admin-settings/admin-settings.component';
import { CartPageComponent } from './component/cart-page/cart-page.component';
import { CheckoutComponent } from './component/checkout/checkout.component';
import { DashboardComponent } from './component/dashboard-component/dashboard-component';
import { HomePageComponent } from './component/home-page/home-page';
import { LoginComponent } from './component/login-component/login-component';
import { MyOrdersComponent } from './component/my-orders/my-orders.component';
import { OrderSuccessComponent } from './component/order-success/order-success.component';
import { ProductDetailComponent } from './component/product-detail/product-detail.component';
import { RegisterComponent } from './component/register/register.component';
import { ShopCatalogComponent } from './component/shop-catalog/shop-catalog.component';
import { StorefrontLayoutComponent } from './component/storefront-layout/storefront-layout.component';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Public Storefront Routes
  {
    path: '',
    component: StorefrontLayoutComponent,
    children: [
      { path: '', component: HomePageComponent },
      { path: 'shop', component: ShopCatalogComponent },
      { path: 'product/:id', component: ProductDetailComponent },
      { path: 'cart', component: CartPageComponent },
      { path: 'checkout', component: CheckoutComponent },
      { path: 'order-success/:orderNumber', component: OrderSuccessComponent },
      { path: 'my-orders', component: MyOrdersComponent },
      { path: 'auth/login', component: LoginComponent },
      { path: 'auth/register', component: RegisterComponent },
    ],
  },

  // Admin Management Portal Routes
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'products', component: AdminProductsComponent },
      { path: 'orders', component: AdminOrdersComponent },
      { path: 'delivery-history', component: AdminDeliveryHistoryComponent },
      { path: 'attributes', component: AdminAttributesComponent },
      { path: 'settings', component: AdminSettingsComponent },
    ],
  },

  // Wildcard fallback
  { path: '**', redirectTo: '' },
];
