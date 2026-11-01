-- ========================================================================
-- منصة لمسة روائع للظهور المحلي والنمو الذكي (Lamsat Rawai LocalBiz)
-- Supabase PostgreSQL Schema & Migration Script
-- ========================================================================
-- تعليمات التشغيل في Supabase:
-- 1. افتح مشروعك في Supabase (https://app.supabase.com).
-- 2. توجّه إلى القائمة الجانبية -> SQL Editor.
-- 3. الصق هذا الكود كاملاً واضغط Run (تشغيل).
-- ========================================================================

-- تفعيل ملحق UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. جدول المؤسسات (Organizations)
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. جدول بيانات النشاط التجاري (Businesses)
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  category TEXT,
  description TEXT,
  phone TEXT,
  whatsapp_url TEXT,
  website TEXT,
  city TEXT DEFAULT 'جدة',
  country TEXT DEFAULT 'السعودية',
  address TEXT,
  hide_address BOOLEAN DEFAULT true,
  service_area_business BOOLEAN DEFAULT true,
  hours TEXT,
  services JSONB DEFAULT '[]'::jsonb,
  social_links JSONB DEFAULT '{}'::jsonb,
  google_maps_url TEXT,
  google_location_id TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. جدول مناطق الخدمة المعتمدة (Service Areas - SAB)
CREATE TABLE IF NOT EXISTS service_areas (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  country TEXT DEFAULT 'السعودية',
  area_type TEXT DEFAULT 'district',
  coverage_status TEXT DEFAULT 'currently_served',
  status TEXT DEFAULT 'active',
  lifecycle_state TEXT DEFAULT 'tech_fixed',
  services JSONB DEFAULT '[]'::jsonb,
  radius_km NUMERIC DEFAULT 5.0,
  latitude NUMERIC,
  longitude NUMERIC,
  retry_count INTEGER DEFAULT 0,
  source TEXT DEFAULT 'seed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (business_id, city, district)
);

-- 4. جدول فحوصات مراقبة الظهور (Visibility Scans)
CREATE TABLE IF NOT EXISTS visibility_scans (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  business_name TEXT,
  keyword TEXT NOT NULL,
  city TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  date_label TEXT,
  summary JSONB,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. جدول الكلمات المفتاحية المحلية (SEO Keywords)
CREATE TABLE IF NOT EXISTS seo_keywords (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  category TEXT NOT NULL,
  service TEXT,
  city TEXT DEFAULT 'جدة',
  district TEXT,
  intent TEXT,
  priority TEXT DEFAULT 'medium',
  last_rank INTEGER,
  previous_rank INTEGER,
  trend TEXT,
  opportunities TEXT,
  recommendation TEXT,
  source TEXT,
  last_scanned_at TIMESTAMPTZ
);

-- 6. جدول المنافسين المحليين (Competitors)
CREATE TABLE IF NOT EXISTS seo_competitors (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  category TEXT,
  services TEXT,
  rating NUMERIC,
  reviews INTEGER,
  gap TEXT,
  monitored_districts TEXT,
  observed_date TEXT
);

-- 7. جدول فرص وتوصيات التحسين (Recommendations)
CREATE TABLE IF NOT EXISTS seo_recommendations (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  action TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'new',
  impact TEXT,
  executable BOOLEAN DEFAULT true,
  fix_type TEXT,
  requires_approval BOOLEAN DEFAULT false,
  payload JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. جدول صفحات الموقع والبيانات المنظمة (Landing Pages & Schema)
CREATE TABLE IF NOT EXISTS seo_landing_pages (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT DEFAULT 'جدة',
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  h1 TEXT,
  intro TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  packages JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  phone TEXT,
  whatsapp_url TEXT,
  schema_json_ld JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. جدول المراجعات والتقييمات والسمعة (Reviews & Reputation)
CREATE TABLE IF NOT EXISTS seo_reviews (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL,
  date TEXT,
  relative_time TEXT,
  comment TEXT,
  service TEXT,
  district TEXT,
  sentiment TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  reply JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. جدول العملاء والحجوزات (Bookings)
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL,
  district TEXT NOT NULL,
  date_time TIMESTAMPTZ,
  status TEXT DEFAULT 'confirmed',
  source TEXT DEFAULT 'whatsapp',
  amount NUMERIC DEFAULT 300,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. جدول قمع التحويل ورحلة العميل (Analytics Funnel)
CREATE TABLE IF NOT EXISTS analytics_funnel (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  funnel JSONB,
  period TEXT DEFAULT 'آخر 30 يومًا',
  source_breakdown JSONB,
  district_breakdown JSONB,
  service_breakdown JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. جدول سجل العمليات والتدقيق (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor TEXT DEFAULT 'النظام',
  result TEXT DEFAULT 'success',
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. جدول إعدادات النظام ومحرك التحسين (System Settings)
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  settings JSONB,
  auto_settings JSONB,
  onboarding JSONB,
  google_integration JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================================
-- الفهارس لتحسين الأداء (Indexes)
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_service_areas_district ON service_areas(district);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_category ON seo_keywords(category);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_district ON bookings(district);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON seo_landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ========================================================================
-- تفعيل سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)
-- ========================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE visibility_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- السماح بالقراءة العامة لصفحات الموقع الترويجية والبيانات المنظمة (Public SEO Access)
DROP POLICY IF EXISTS "Public Landing Pages View" ON seo_landing_pages;
CREATE POLICY "Public Landing Pages View" ON seo_landing_pages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Service Areas View" ON service_areas;
CREATE POLICY "Public Service Areas View" ON service_areas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Reviews View" ON seo_reviews;
CREATE POLICY "Public Reviews View" ON seo_reviews FOR SELECT USING (true);

-- صلاحيات كاملة للعمليات عبر مفتاح Service Role والمستخدمين المعتمدين وتطبيقات النظام
DROP POLICY IF EXISTS "Auth Users Full Access - organizations" ON organizations;
CREATE POLICY "Full Access - organizations" ON organizations FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Users Full Access - businesses" ON businesses;
CREATE POLICY "Full Access - businesses" ON businesses FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Users Full Access - service_areas" ON service_areas;
CREATE POLICY "Full Access - service_areas" ON service_areas FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Users Full Access - visibility_scans" ON visibility_scans;
CREATE POLICY "Full Access - visibility_scans" ON visibility_scans FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Users Full Access - seo_keywords" ON seo_keywords;
CREATE POLICY "Full Access - seo_keywords" ON seo_keywords FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Users Full Access - seo_competitors" ON seo_competitors;
CREATE POLICY "Full Access - seo_competitors" ON seo_competitors FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Users Full Access - seo_recommendations" ON seo_recommendations;
CREATE POLICY "Full Access - seo_recommendations" ON seo_recommendations FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Users Full Access - seo_landing_pages" ON seo_landing_pages;
CREATE POLICY "Full Access - seo_landing_pages" ON seo_landing_pages FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Users Full Access - seo_reviews" ON seo_reviews;
CREATE POLICY "Full Access - seo_reviews" ON seo_reviews FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Users Full Access - bookings" ON bookings;
CREATE POLICY "Full Access - bookings" ON bookings FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Users Full Access - analytics_funnel" ON analytics_funnel;
CREATE POLICY "Full Access - analytics_funnel" ON analytics_funnel FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Users Full Access - audit_logs" ON audit_logs;
CREATE POLICY "Full Access - audit_logs" ON audit_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth Users Full Access - system_settings" ON system_settings;
CREATE POLICY "Full Access - system_settings" ON system_settings FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
