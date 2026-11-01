

-- Local SEO module: additive tables. اربط كل سجل بالنشاط والمؤسسة وسياسات RLS في بيئة Supabase/MySQL المدارة.
CREATE TABLE IF NOT EXISTS seo_audits (
  id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36) NOT NULL, business_id VARCHAR(36) NOT NULL,
  audit_type VARCHAR(80) NOT NULL, status ENUM('queued','running','completed','failed') DEFAULT 'queued',
  score INT NULL, findings JSON, source VARCHAR(120), started_at TIMESTAMP NULL, completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (organization_id) REFERENCES organizations(id), FOREIGN KEY (business_id) REFERENCES businesses(id)
);
CREATE TABLE IF NOT EXISTS seo_recommendations (
  id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36) NOT NULL, business_id VARCHAR(36) NOT NULL,
  title VARCHAR(240) NOT NULL, description TEXT, reason TEXT, action TEXT, priority ENUM('high','medium','low') DEFAULT 'medium',
  status ENUM('new','pending_approval','ready','in_progress','completed','failed','deferred','rejected') DEFAULT 'new', evidence JSON,
  impact TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, executed_at TIMESTAMP NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id), FOREIGN KEY (business_id) REFERENCES businesses(id)
);
CREATE TABLE IF NOT EXISTS seo_tasks (
  id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36) NOT NULL, business_id VARCHAR(36) NOT NULL,
  recommendation_id VARCHAR(36), assignee_user_id VARCHAR(36), title VARCHAR(240) NOT NULL, status VARCHAR(40) DEFAULT 'open',
  due_at TIMESTAMP NULL, completed_at TIMESTAMP NULL, FOREIGN KEY (organization_id) REFERENCES organizations(id), FOREIGN KEY (business_id) REFERENCES businesses(id)
);
CREATE TABLE IF NOT EXISTS keywords (
  id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36) NOT NULL, business_id VARCHAR(36) NOT NULL,
  term VARCHAR(255) NOT NULL, city VARCHAR(120), district VARCHAR(180), intent VARCHAR(80), relevance VARCHAR(40),
  search_volume DECIMAL(12,2) NULL, competition VARCHAR(80) NULL, related_page VARCHAR(500), last_analyzed_at TIMESTAMP NULL,
  source VARCHAR(160), FOREIGN KEY (organization_id) REFERENCES organizations(id), FOREIGN KEY (business_id) REFERENCES businesses(id)
);
CREATE TABLE IF NOT EXISTS keyword_clusters (
  id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36) NOT NULL, business_id VARCHAR(36) NOT NULL,
  name VARCHAR(180) NOT NULL, intent VARCHAR(80), keyword_ids JSON, source VARCHAR(160), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id), FOREIGN KEY (business_id) REFERENCES businesses(id)
);
CREATE TABLE IF NOT EXISTS competitor_profiles (
  id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36) NOT NULL, business_id VARCHAR(36) NOT NULL,
  name VARCHAR(180) NOT NULL, public_url VARCHAR(1000), category VARCHAR(180), services TEXT, public_rating DECIMAL(3,2) NULL,
  public_review_count INT NULL, service_areas TEXT, strengths TEXT, weaknesses TEXT, gaps TEXT, source VARCHAR(160), last_checked_at TIMESTAMP NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id), FOREIGN KEY (business_id) REFERENCES businesses(id)
);
CREATE TABLE IF NOT EXISTS website_audits (
  id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36) NOT NULL, business_id VARCHAR(36) NOT NULL, url VARCHAR(1000), status VARCHAR(40),
  title_ok BOOLEAN, meta_ok BOOLEAN, headings_ok BOOLEAN, mobile_ok BOOLEAN, broken_links_count INT NULL, findings JSON, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id), FOREIGN KEY (business_id) REFERENCES businesses(id)
);
CREATE TABLE IF NOT EXISTS content_drafts (
  id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36) NOT NULL, business_id VARCHAR(36) NOT NULL, page_type VARCHAR(80), title VARCHAR(255),
  slug VARCHAR(255), seo_title VARCHAR(255), meta_description TEXT, content LONGTEXT, status ENUM('draft','pending_approval','approved','published','rejected') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, approved_at TIMESTAMP NULL, FOREIGN KEY (organization_id) REFERENCES organizations(id), FOREIGN KEY (business_id) REFERENCES businesses(id)
);
CREATE TABLE IF NOT EXISTS review_analysis (
  id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36) NOT NULL, business_id VARCHAR(36) NOT NULL, source VARCHAR(160), period_start DATE, period_end DATE,
  sentiment_summary JSON, recurring_topics JSON, suggested_replies JSON, status VARCHAR(40) DEFAULT 'needs_review', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id), FOREIGN KEY (business_id) REFERENCES businesses(id)
);
CREATE TABLE IF NOT EXISTS ranking_observations (
  id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36) NOT NULL, business_id VARCHAR(36) NOT NULL, city VARCHAR(120), district VARCHAR(180), query VARCHAR(255),
  position DECIMAL(8,2) NULL, source VARCHAR(160), is_confirmed BOOLEAN DEFAULT FALSE, observed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id), FOREIGN KEY (business_id) REFERENCES businesses(id)
);
CREATE TABLE IF NOT EXISTS seo_reports (
  id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36) NOT NULL, business_id VARCHAR(36) NOT NULL, period_start DATE, period_end DATE,
  google_metrics JSON, booking_metrics JSON, comparison JSON, source VARCHAR(160), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id), FOREIGN KEY (business_id) REFERENCES businesses(id)
);
CREATE TABLE IF NOT EXISTS seo_integrations (
  id VARCHAR(36) PRIMARY KEY, organization_id VARCHAR(36) NOT NULL, business_id VARCHAR(36) NOT NULL, provider VARCHAR(80) NOT NULL,
  status VARCHAR(40) DEFAULT 'not_configured', scopes JSON, last_sync_at TIMESTAMP NULL, last_error TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id), FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- Core Service Areas Module
CREATE TABLE IF NOT EXISTS service_areas (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  country VARCHAR(80) DEFAULT 'السعودية',
  city VARCHAR(120) NOT NULL,
  district VARCHAR(180) NOT NULL,
  area_type ENUM('district', 'city', 'custom_radius') DEFAULT 'district',
  coverage_status ENUM('currently_served', 'planned') DEFAULT 'currently_served',
  google_status ENUM('needs_review', 'active', 'paused', 'rejected') DEFAULT 'needs_review',
  services JSON,
  radius_km DECIMAL(6,2) DEFAULT 5.0,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  maps_url VARCHAR(1000),
  source VARCHAR(80) DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_business_district (business_id, city, district)
);

-- Service Area Google Sync History
CREATE TABLE IF NOT EXISTS service_area_sync_logs (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  areas_count INT NOT NULL,
  status ENUM('success', 'failed', 'pending') NOT NULL,
  google_response JSON,
  error_message TEXT,
  synced_by VARCHAR(80),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Local Visibility Monitoring Scans
CREATE TABLE IF NOT EXISTS visibility_scans (
  id VARCHAR(36) PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  city VARCHAR(120) NOT NULL,
  districts_count INT NOT NULL,
  summary JSON,
  results JSON,
  status ENUM('queued', 'running', 'completed', 'failed') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

