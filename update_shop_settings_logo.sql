-- ==============================================================================
-- ADD LOGO & BRANDING COLUMNS TO ShopSettings TABLE IN SUPABASE
-- Run this script in the Supabase SQL Editor if columns are not already present
-- ==============================================================================

-- 1. Ensure columns exist on ShopSettings table
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "LogoUrl" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "ShopName" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "StoreName" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "Tagline" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "BannerUrl" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "Email" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "Phone" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "WhatsAppNumber" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "Address" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "InsideDhakaDeliveryCharge" NUMERIC DEFAULT 60;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "OutsideDhakaDeliveryCharge" NUMERIC DEFAULT 120;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "FreeDeliveryThreshold" NUMERIC DEFAULT 2000;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "IsMaintenanceMode" BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "FacebookUrl" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "InstagramUrl" TEXT;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "IsMarkToDelete" BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "UpdatedDate" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS "ShopSettings" ADD COLUMN IF NOT EXISTS "CreatedBy" TEXT DEFAULT 'SYSTEM';

-- 2. Disable RLS for ShopSettings table to allow frontend direct access
ALTER TABLE IF EXISTS "ShopSettings" DISABLE ROW LEVEL SECURITY;

-- 3. Ensure permissions are granted to public & authenticated roles
GRANT ALL ON TABLE "ShopSettings" TO anon, authenticated, service_role;
