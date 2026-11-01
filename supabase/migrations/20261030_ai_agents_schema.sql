-- Migration: Add Autonomous AI Sales & Marketing Agents Schema
-- Project: Lamsat Rawai (لمسة روائع للمساج والعناية - جدة)
-- Database: Supabase (PostgreSQL)

-- 1. AI AGENTS TABLE
CREATE TABLE IF NOT EXISTS ai_agents (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(120) NOT NULL,
  description TEXT,
  status VARCHAR(40) DEFAULT 'idle', -- 'idle', 'running', 'paused', 'error'
  autonomous_enabled BOOLEAN DEFAULT TRUE,
  tasks_count INT DEFAULT 0,
  successful_tasks INT DEFAULT 0,
  failed_tasks INT DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  error_log TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AI TASKS TABLE
CREATE TABLE IF NOT EXISTS ai_tasks (
  id VARCHAR(80) PRIMARY KEY,
  agent_id VARCHAR(80) REFERENCES ai_agents(id) ON DELETE CASCADE,
  task_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(40) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 3. AI LEADS (PROSPECTS & PARTNERS IN JEDDAH)
CREATE TABLE IF NOT EXISTS ai_leads (
  id VARCHAR(80) PRIMARY KEY,
  business_name VARCHAR(255),
  contact_name VARCHAR(180),
  category VARCHAR(120), -- 'hotel', 'corporate', 'individual_vip', 'sports_club', 'event'
  district VARCHAR(180) NOT NULL, -- حي في جدة (الروضة، الشاطئ، الحمراء، أبحر، etc.)
  city VARCHAR(80) DEFAULT 'جدة',
  phone VARCHAR(80),
  email VARCHAR(180),
  social_handle VARCHAR(180), -- Instagram / LinkedIn / Google Maps
  source VARCHAR(120) NOT NULL, -- 'google_places', 'instagram_public', 'linkedin_public', 'partner_portal', 'jeddah_business_directory'
  source_url TEXT,
  consent_status VARCHAR(60) DEFAULT 'unverified', -- 'consented', 'public_commercial', 'opted_out', 'unverified'
  score INT DEFAULT 0, -- 0 - 100
  score_reason TEXT,
  priority VARCHAR(40) DEFAULT 'medium', -- 'high', 'medium', 'low'
  status VARCHAR(60) DEFAULT 'new', -- 'new', 'analyzed', 'contacted', 'engaged', 'converted', 'rejected', 'blacklisted'
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone, district)
);

-- 4. AI CAMPAIGNS (MARKETING CAMPAIGNS IN JEDDAH)
CREATE TABLE IF NOT EXISTS ai_campaigns (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(60) NOT NULL, -- 'whatsapp', 'instagram', 'email', 'sms'
  target_districts JSONB DEFAULT '[]'::jsonb, -- الأحياء المستهدفة
  target_audience VARCHAR(180),
  tone VARCHAR(80) DEFAULT 'saudi_friendly_luxury', -- اللهجة السعودية الترحيبية الراقية
  offer_title VARCHAR(255),
  discount_details TEXT,
  message_template TEXT NOT NULL,
  suggested_timing VARCHAR(120),
  status VARCHAR(40) DEFAULT 'draft', -- 'draft', 'scheduled', 'active', 'paused', 'completed'
  leads_targeted INT DEFAULT 0,
  messages_sent INT DEFAULT 0,
  replies_count INT DEFAULT 0,
  bookings_generated INT DEFAULT 0,
  revenue_generated NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AI CONVERSATIONS
CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR(80) PRIMARY KEY,
  lead_id VARCHAR(80) REFERENCES ai_leads(id) ON DELETE SET NULL,
  customer_name VARCHAR(180),
  contact_endpoint VARCHAR(180) NOT NULL, -- phone or IG handle
  channel VARCHAR(60) NOT NULL, -- 'whatsapp', 'instagram', 'email'
  status VARCHAR(60) DEFAULT 'active', -- 'active', 'waiting_customer', 'booked', 'closed', 'opted_out'
  intent VARCHAR(100), -- 'inquiry_price', 'booking_request', 'home_visit_question', 'partnership', 'complaint'
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI MESSAGES
CREATE TABLE IF NOT EXISTS ai_messages (
  id VARCHAR(80) PRIMARY KEY,
  conversation_id VARCHAR(80) REFERENCES ai_conversations(id) ON DELETE CASCADE,
  sender VARCHAR(40) NOT NULL, -- 'agent', 'lead', 'admin'
  content TEXT NOT NULL,
  channel VARCHAR(60) NOT NULL,
  status VARCHAR(40) DEFAULT 'delivered', -- 'draft', 'pending_approval', 'sent', 'delivered', 'read', 'failed'
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by VARCHAR(80),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AI FOLLOWUPS (SMART FOLLOWUP MANAGER)
CREATE TABLE IF NOT EXISTS ai_followups (
  id VARCHAR(80) PRIMARY KEY,
  lead_id VARCHAR(80) REFERENCES ai_leads(id) ON DELETE CASCADE,
  conversation_id VARCHAR(80) REFERENCES ai_conversations(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  attempt_number INT DEFAULT 1,
  suggested_message TEXT,
  status VARCHAR(40) DEFAULT 'scheduled', -- 'scheduled', 'sent', 'cancelled', 'suppressed'
  reason VARCHAR(180),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AI BOOKINGS (AUTONOMOUS BOOKING RECORDS)
CREATE TABLE IF NOT EXISTS ai_bookings (
  id VARCHAR(80) PRIMARY KEY,
  lead_id VARCHAR(80) REFERENCES ai_leads(id) ON DELETE SET NULL,
  client_name VARCHAR(180) NOT NULL,
  phone VARCHAR(80) NOT NULL,
  service_name VARCHAR(180) NOT NULL, -- 'مساج سويدي منزلي', 'مساج استرخائي', etc.
  district VARCHAR(180) NOT NULL,
  booking_datetime TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10, 2) DEFAULT 300.00,
  source VARCHAR(80) DEFAULT 'ai_sales_agent',
  status VARCHAR(40) DEFAULT 'confirmed', -- 'pending', 'confirmed', 'completed', 'cancelled'
  confirmation_sent BOOLEAN DEFAULT TRUE,
  reminder_sent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AI REPORTS
CREATE TABLE IF NOT EXISTS ai_reports (
  id VARCHAR(80) PRIMARY KEY,
  report_type VARCHAR(60) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  discovered_leads INT DEFAULT 0,
  qualified_leads INT DEFAULT 0,
  messages_sent INT DEFAULT 0,
  messages_received INT DEFAULT 0,
  response_rate NUMERIC(5, 2) DEFAULT 0.00,
  bookings_count INT DEFAULT 0,
  conversion_rate NUMERIC(5, 2) DEFAULT 0.00,
  total_revenue NUMERIC(12, 2) DEFAULT 0.00,
  agent_performance JSONB DEFAULT '{}'::jsonb,
  insights TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AI ANALYTICS (FUNNEL & PERFORMANCE CACHE)
CREATE TABLE IF NOT EXISTS ai_analytics (
  id VARCHAR(80) PRIMARY KEY,
  metric_key VARCHAR(100) UNIQUE NOT NULL,
  metric_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. AI SETTINGS
CREATE TABLE IF NOT EXISTS ai_settings (
  id VARCHAR(80) PRIMARY KEY,
  rate_limit_per_hour INT DEFAULT 30,
  whatsapp_enabled BOOLEAN DEFAULT TRUE,
  instagram_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  require_approval_for_outreach BOOLEAN DEFAULT FALSE,
  require_approval_for_discounts BOOLEAN DEFAULT TRUE,
  business_hours VARCHAR(120) DEFAULT '10:00 - 00:00',
  preferred_tone VARCHAR(80) DEFAULT 'saudi_friendly_respectful',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. AI ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS ai_activity_logs (
  id VARCHAR(80) PRIMARY KEY,
  agent_id VARCHAR(80),
  agent_name VARCHAR(120),
  action_type VARCHAR(100) NOT NULL,
  details TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  severity VARCHAR(40) DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. AI SUPPRESSION LIST (DO NOT CONTACT / GDPR & CITC COMPLIANCE)
CREATE TABLE IF NOT EXISTS ai_suppression_list (
  id VARCHAR(80) PRIMARY KEY,
  identifier VARCHAR(180) UNIQUE NOT NULL, -- phone or handle
  reason VARCHAR(255),
  source VARCHAR(100),
  suppressed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all AI tables
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suppression_list ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and service_role full access policies
DO $$
BEGIN
  CREATE POLICY "Allow service_role full access to ai_agents" ON ai_agents FOR ALL TO service_role USING (true) WITH CHECK (true);
  CREATE POLICY "Allow service_role full access to ai_tasks" ON ai_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
  CREATE POLICY "Allow service_role full access to ai_leads" ON ai_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
  CREATE POLICY "Allow service_role full access to ai_campaigns" ON ai_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
  CREATE POLICY "Allow service_role full access to ai_conversations" ON ai_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);
  CREATE POLICY "Allow service_role full access to ai_messages" ON ai_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
  CREATE POLICY "Allow service_role full access to ai_followups" ON ai_followups FOR ALL TO service_role USING (true) WITH CHECK (true);
  CREATE POLICY "Allow service_role full access to ai_bookings" ON ai_bookings FOR ALL TO service_role USING (true) WITH CHECK (true);
  CREATE POLICY "Allow service_role full access to ai_reports" ON ai_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
  CREATE POLICY "Allow service_role full access to ai_analytics" ON ai_analytics FOR ALL TO service_role USING (true) WITH CHECK (true);
  CREATE POLICY "Allow service_role full access to ai_settings" ON ai_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
  CREATE POLICY "Allow service_role full access to ai_activity_logs" ON ai_activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
  CREATE POLICY "Allow service_role full access to ai_suppression_list" ON ai_suppression_list FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN others THEN
  NULL;
END $$;

