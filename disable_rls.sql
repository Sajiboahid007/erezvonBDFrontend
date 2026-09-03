-- ==============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO ALLOW FRONTEND DIRECT ACCESS & CREATE ADMIN
-- ==============================================================================

-- 1. Disable Row Level Security (RLS) on all tables so your frontend can read/write directly
ALTER TABLE IF EXISTS "Roles" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Address" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Category" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SubCategory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Sizes" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Colors" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Products" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProductImages" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProductVariants" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Cart" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "CartItems" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "OrderStatus" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PaymentMethods" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Orders" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "OrderItems" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "OrderHistory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Payments" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ShopSettings" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "LogoUrl" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "ShopName" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "StoreName" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "BannerUrl" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "Tagline" TEXT;

-- 2. Grant permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Ensure Roles exist
INSERT INTO "Roles" ("Id", "Name", "IsMarkToDelete", "CreatedBy")
VALUES 
    (1, 'SuperAdmin', FALSE, 'SYSTEM'),
    (2, 'Admin', FALSE, 'SYSTEM'),
    (3, 'Customer', FALSE, 'SYSTEM')
ON CONFLICT ("Id") DO UPDATE SET "Name" = EXCLUDED."Name";

-- 4. Create / Ensure Super Admin User exists
INSERT INTO "Users" (
    "Name",
    "Email",
    "Phone",
    "Password",
    "RoleId",
    "IsActive",
    "IsMarkToDelete",
    "CreatedBy"
)
VALUES (
    'Super Admin',
    'admin@rezvon.com',
    '01700000000',
    'admin123',
    1,
    TRUE,
    FALSE,
    'SYSTEM'
)
ON CONFLICT ("Email") DO UPDATE 
SET "Password" = 'admin123', "RoleId" = 1, "IsActive" = TRUE, "IsMarkToDelete" = FALSE;
