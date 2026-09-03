export interface Category {
  Id: number;
  Name: string;
  Slug?: string;
  Description?: string;
  ImageUrl?: string;
  IsActive: boolean;
  CreatedAt?: string;
  SubCategories?: SubCategory[];
  _count?: {
    Products?: number;
  };
}

export interface SubCategory {
  Id: number;
  CategoryId: number;
  Name: string;
  Slug?: string;
  Description?: string;
  ImageUrl?: string;
  IsActive: boolean;
  Category?: Category;
  _count?: {
    Products?: number;
  };
}

export interface Size {
  Id: number;
  Name: string; // e.g. "M", "L", "XL", "32", "34"
  Code?: string;
  Description?: string;
}

export interface Color {
  Id: number;
  Name: string; // e.g. "Midnight Navy", "Black", "Crimson"
  HexCode?: string; // e.g. "#1e3a8a"
}

export interface ProductImage {
  Id?: number;
  ProductId?: number;
  ImageUrl: string;
  IsPrimary: boolean;
  DisplayOrder?: number;
}

export interface ProductVariant {
  Id: number;
  ProductId: number;
  SizeId: number;
  ColorId: number | null;
  StockQuantity: number;
  Sizes?: Size;
  Colors?: Color | null;
  Size?: Size;
  Color?: Color | null;
  SKU?: string;
  AdditionalPrice?: number;
}

export interface Product {
  Id: number;
  Name: string;
  Slug?: string;
  SKU?: string;
  Description?: string;
  Brand?: string;
  Fabric?: string;
  Price: number;
  RegularPrice: number;
  DiscountPrice?: number | null;
  totalStock: number;
  TotalStock?: number;
  CategoryId?: number;
  SubCategoryId?: number;
  IsFeatured?: boolean;
  IsActive?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
  Category?: Category;
  SubCategory?: SubCategory;
  ProductImages?: ProductImage[];
  Images?: ProductImage[];
  ImageUrl?: string;
  ProductVariants: ProductVariant[];
  Variants?: ProductVariant[];
}

export interface ProductFilterParams {
  page?: number;
  limit?: number;
  categoryId?: number;
  subCategoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sizeId?: number;
  colorId?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular' | string;
  search?: string;
  isFeatured?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
