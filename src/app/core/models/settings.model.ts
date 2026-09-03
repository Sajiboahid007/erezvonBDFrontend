export interface ShopSettings {
  Id?: number;
  StoreName: string;
  Tagline?: string;
  LogoUrl?: string;
  BannerUrl?: string;
  Email?: string;
  Phone?: string;
  WhatsApp?: string;
  Address?: string;
  FacebookUrl?: string;
  InstagramUrl?: string;
  YouTubeUrl?: string;
  InsideDhakaDeliveryCharge: number;
  OutsideDhakaDeliveryCharge: number;
  FreeDeliveryThreshold: number;
  MaintenanceMode: boolean;
  CurrencySymbol: string;
}
