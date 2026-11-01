import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

let cachedClient = null

function ensureEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq > 0) {
          const k = trimmed.slice(0, eq).trim()
          const v = trimmed.slice(eq + 1).trim()
          process.env[k] = v
        }
      }
    }
  } catch {}
}

export function getSupabaseClient() {
  ensureEnv()
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const key = (cachedClient && cachedClient.__key) || anonKey || serviceKey

  if (!url || !key) return null

  if (!cachedClient || cachedClient.__url !== url || cachedClient.__key !== key) {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    cachedClient.__url = url
    cachedClient.__key = key
  }
  return cachedClient
}

export async function checkSupabaseStatus() {
  ensureEnv()
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!url || (!serviceKey && !anonKey)) {
    return {
      configured: false,
      connected: false,
      url: url || null,
      message: 'لم يتم ضبط مفاتيح Supabase بعد في ملف .env (يرجى إدخال SUPABASE_URL ومفتاح API).'
    }
  }

  // تجربة المفاتيح المتاحة (Publishable أو Secret) لاختيار المفتاح الصالح تلقائياً
  const keysToTry = [anonKey, serviceKey].filter(Boolean)
  let lastError = null

  for (const k of keysToTry) {
    try {
      const client = createClient(url, k, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data, error } = await client.from('businesses').select('id').limit(1)

      if (!error) {
        cachedClient = client
        cachedClient.__url = url
        cachedClient.__key = k
        return {
          configured: true,
          connected: true,
          ready: true,
          needsSchema: false,
          url,
          message: 'متصل بنجاح بقاعدة بيانات Supabase السحابية والجداول مهيأة.'
        }
      }

      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        cachedClient = client
        cachedClient.__url = url
        cachedClient.__key = k
        return {
          configured: true,
          connected: true,
          ready: false,
          needsSchema: true,
          url,
          message: 'تم الاتصال بسيرفر Supabase بنجاح! الجداول غير منشأة بعد (يرجى تشغيل كود SQL في SQL Editor).'
        }
      }

      lastError = error
    } catch (err) {
      lastError = err
    }
  }

  return {
    configured: true,
    connected: false,
    url,
    message: `فشل التحقق من قاعدة البيانات: ${lastError?.message || 'Invalid API key'}`
  }
}

export function backupLocalState(state, rootDir) {
  const backupDir = path.join(rootDir, 'data', 'backups')
  fs.mkdirSync(backupDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = path.join(backupDir, `runtime_backup_${timestamp}.json`)
  fs.writeFileSync(backupFile, JSON.stringify(state, null, 2), 'utf8')
  return {
    filePath: backupFile,
    fileName: path.basename(backupFile),
    filename: path.basename(backupFile),
    timestamp: new Date().toISOString()
  }
}

export async function migrateRuntimeToSupabase(state, rootDir) {
  const status = await checkSupabaseStatus()
  if (!status.configured) {
    throw new Error('يرجى ضبط مفاتيح SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في ملف .env أولاً.')
  }
  if (!status.connected && !status.needsSchema) {
    throw new Error(`تعذر الاتصال بـ Supabase: ${status.message}`)
  }

  const supabase = getSupabaseClient()
  if (!supabase) throw new Error('تعذر تهيئة عميل Supabase.')

  // 1. إنشاء نسخة احتياطية محلية قبل أي عملية
  const backup = backupLocalState(state, rootDir)

  const startTime = Date.now()
  const report = {
    startedAt: new Date().toISOString(),
    backupCreated: backup,
    transferred: {},
    errors: [],
    success: false
  }

  try {
    const businessId = state.business?.id || 'biz_jeddah_home_massage'
    const orgId = state.organization?.id || 'org_demo'

    // 1. المؤسسة (Organizations)
    if (state.organization) {
      const { error } = await supabase.from('organizations').upsert({
        id: orgId,
        name: state.organization.name || 'نشاط المساج المنزلي — جدة'
      }, { onConflict: 'id' })
      if (error) report.errors.push({ table: 'organizations', message: error.message })
      else report.transferred.organizations = 1
    }

    // 2. النشاط التجاري (Businesses)
    if (state.business) {
      const b = state.business
      const { error } = await supabase.from('businesses').upsert({
        id: businessId,
        organization_id: orgId,
        name_ar: b.nameAr || 'مساج منزلي في جدة',
        name_en: b.nameEn || 'Jeddah Home Massage',
        category: b.category || 'خدمات المساج والعناية المنزلية',
        description: b.description || '',
        phone: b.phone || '',
        whatsapp_url: b.whatsappUrl || '',
        website: b.website || '',
        city: b.city || 'جدة',
        country: b.country || 'السعودية',
        address: b.address || '',
        hide_address: Boolean(b.hideAddress),
        service_area_business: Boolean(b.serviceAreaBusiness),
        hours: b.hours || 'يوميًا 10:00 ص — 12:00 ص',
        services: b.services || [],
        social_links: b.socialLinks || {},
        google_maps_url: b.googleMapsUrl || '',
        google_location_id: b.googleLocationId || '',
        photos: b.photos || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      if (error) report.errors.push({ table: 'businesses', message: error.message })
      else report.transferred.businesses = 1
    }

    // 3. مناطق الخدمة (Service Areas - 35 حي)
    if (Array.isArray(state.areas) && state.areas.length) {
      const areaRows = state.areas.map(a => ({
        id: a.id,
        business_id: businessId,
        city: a.city || 'جدة',
        district: a.district,
        country: a.country || 'السعودية',
        area_type: a.areaType || 'district',
        coverage_status: a.coverageStatus || 'currently_served',
        status: a.status || 'active',
        lifecycle_state: a.lifecycleState || 'tech_fixed',
        services: a.services || ['مساج استرخاء', 'مساج سويدي', 'مساج علاجي', 'عناية منزلية'],
        radius_km: a.radiusKm || 5.0,
        latitude: a.latitude,
        longitude: a.longitude,
        retry_count: a.retryCount || 0,
        source: a.source || 'seed',
        notes: a.notes || '',
        updated_at: new Date().toISOString()
      }))
      const { error } = await supabase.from('service_areas').upsert(areaRows, { onConflict: 'id' })
      if (error) report.errors.push({ table: 'service_areas', message: error.message })
      else report.transferred.service_areas = areaRows.length
    }

    // 4. فحوصات مراقبة الظهور (Visibility Scans)
    if (Array.isArray(state.visibilityScans) && state.visibilityScans.length) {
      const scanRows = state.visibilityScans.map(s => ({
        id: s.id,
        business_id: businessId,
        business_name: s.businessName || 'لمسة روائع للمساج والعنايه',
        keyword: s.keyword || 'مساج منزلي جدة',
        city: s.city || 'جدة',
        status: s.status || 'completed',
        date_label: s.dateLabel || '',
        summary: s.summary || {},
        results: s.results || []
      }))
      const { error } = await supabase.from('visibility_scans').upsert(scanRows, { onConflict: 'id' })
      if (error) report.errors.push({ table: 'visibility_scans', message: error.message })
      else report.transferred.visibility_scans = scanRows.length
    }

    // 5. الكلمات المفتاحية المحلية (SEO Keywords)
    const keywords = state.seo?.keywords || []
    if (keywords.length) {
      const kwRows = keywords.map(k => ({
        id: k.id,
        business_id: businessId,
        term: k.term,
        category: k.category,
        service: k.service || '',
        city: k.city || 'جدة',
        district: k.district || '',
        intent: k.intent || '',
        priority: k.priority || 'medium',
        last_rank: k.lastRank || null,
        previous_rank: k.previousRank || null,
        trend: k.trend || 'stable',
        opportunities: k.opportunities || '',
        recommendation: k.recommendation || '',
        source: k.source || 'فحص إحداثيات محلي معتمد',
        last_scanned_at: k.lastScannedAt || null
      }))
      const { error } = await supabase.from('seo_keywords').upsert(kwRows, { onConflict: 'id' })
      if (error) report.errors.push({ table: 'seo_keywords', message: error.message })
      else report.transferred.seo_keywords = kwRows.length
    }

    // 6. المنافسين (Competitors)
    const competitors = state.seo?.competitors || []
    if (competitors.length) {
      const compRows = competitors.map(c => ({
        id: c.id,
        business_id: businessId,
        name: c.name,
        url: c.url || '',
        category: c.category || '',
        services: c.services || '',
        rating: c.rating || 4.5,
        reviews: c.reviews || 0,
        gap: c.gap || '',
        monitored_districts: c.monitoredDistricts || '',
        observed_date: c.observedDate || ''
      }))
      const { error } = await supabase.from('seo_competitors').upsert(compRows, { onConflict: 'id' })
      if (error) report.errors.push({ table: 'seo_competitors', message: error.message })
      else report.transferred.seo_competitors = compRows.length
    }

    // 7. التوصيات وفرص التحسين (Recommendations)
    const recommendations = state.seo?.recommendations || []
    if (recommendations.length) {
      const recRows = recommendations.map(r => ({
        id: r.id,
        business_id: businessId,
        title: r.title,
        description: r.description || '',
        reason: r.reason || '',
        action: r.action || '',
        priority: r.priority || 'medium',
        status: r.status || 'new',
        impact: r.impact || '',
        executable: Boolean(r.executable),
        fix_type: r.fixType || '',
        requires_approval: Boolean(r.requiresApproval),
        payload: r.payload || {},
        updated_at: r.updatedAt || new Date().toISOString()
      }))
      const { error } = await supabase.from('seo_recommendations').upsert(recRows, { onConflict: 'id' })
      if (error) report.errors.push({ table: 'seo_recommendations', message: error.message })
      else report.transferred.seo_recommendations = recRows.length
    }

    // 8. صفحات الموقع والـ Schema (Landing Pages)
    const landingPages = state.seo?.landingPages || []
    if (landingPages.length) {
      const lpRows = landingPages.map(lp => ({
        id: lp.id,
        business_id: businessId,
        service: lp.service,
        district: lp.district,
        city: lp.city || 'جدة',
        slug: lp.slug,
        title: lp.title,
        meta_description: lp.metaDescription || '',
        h1: lp.h1 || '',
        intro: lp.intro || '',
        benefits: lp.benefits || [],
        packages: lp.packages || [],
        faqs: lp.faqs || [],
        phone: lp.phone || '',
        whatsapp_url: lp.whatsappUrl || '',
        schema_json_ld: lp.schemaJsonLd || {},
        created_at: lp.createdAt || new Date().toISOString()
      }))
      const { error } = await supabase.from('seo_landing_pages').upsert(lpRows, { onConflict: 'id' })
      if (error) report.errors.push({ table: 'seo_landing_pages', message: error.message })
      else report.transferred.seo_landing_pages = lpRows.length
    }

    // 9. التقييمات والسمعة (Reviews)
    const reviews = state.seo?.reviews || []
    if (reviews.length) {
      const revRows = reviews.map(r => ({
        id: r.id,
        business_id: businessId,
        author: r.author,
        rating: r.rating,
        date: r.date || '',
        relative_time: r.relativeTime || '',
        comment: r.comment || '',
        service: r.service || '',
        district: r.district || '',
        sentiment: r.sentiment || 'positive',
        tags: r.tags || [],
        reply: r.reply || null,
        created_at: new Date().toISOString()
      }))
      const { error } = await supabase.from('seo_reviews').upsert(revRows, { onConflict: 'id' })
      if (error) report.errors.push({ table: 'seo_reviews', message: error.message })
      else report.transferred.seo_reviews = revRows.length
    }

    // 10. العملاء والحجوزات (Bookings)
    const bookings = state.bookings || []
    if (bookings.length) {
      const bkgRows = bookings.map(b => ({
        id: b.id,
        business_id: businessId,
        client_name: b.clientName,
        phone: b.phone,
        service: b.service,
        district: b.district,
        date_time: b.dateTime || new Date().toISOString(),
        status: b.status || 'confirmed',
        source: b.source || 'whatsapp',
        amount: b.amount || 300,
        notes: b.notes || '',
        created_at: b.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      const { error } = await supabase.from('bookings').upsert(bkgRows, { onConflict: 'id' })
      if (error) report.errors.push({ table: 'bookings', message: error.message })
      else report.transferred.bookings = bkgRows.length
    }

    // 11. قمع التحويل ورحلة العميل (Analytics Funnel)
    if (state.analytics) {
      const an = state.analytics
      const { error } = await supabase.from('analytics_funnel').upsert({
        id: 'analytics_primary',
        business_id: businessId,
        funnel: an.funnel || {},
        period: an.period || 'آخر 30 يومًا',
        source_breakdown: an.sourceBreakdown || {},
        district_breakdown: an.districtBreakdown || {},
        service_breakdown: an.serviceBreakdown || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      if (error) report.errors.push({ table: 'analytics_funnel', message: error.message })
      else report.transferred.analytics_funnel = 1
    }

    // 12. سجل العمليات (Audit Logs)
    const auditLogs = state.audit || []
    if (auditLogs.length) {
      const logRows = auditLogs.slice(0, 50).map(a => ({
        id: a.id,
        business_id: businessId,
        action: a.action,
        actor: a.actor || 'النظام',
        result: a.result || 'success',
        details: a.details || '',
        created_at: a.createdAt || new Date().toISOString()
      }))
      const { error } = await supabase.from('audit_logs').upsert(logRows, { onConflict: 'id' })
      if (error) report.errors.push({ table: 'audit_logs', message: error.message })
      else report.transferred.audit_logs = logRows.length
    }

    // 13. إعدادات النظام ومحرك التحسين (System Settings)
    const { error: settingsErr } = await supabase.from('system_settings').upsert({
      id: 'settings_primary',
      business_id: businessId,
      settings: state.settings || {},
      auto_settings: state.seo?.autoSettings || {},
      onboarding: state.onboarding || {},
      google_integration: state.google || {},
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    if (settingsErr) report.errors.push({ table: 'system_settings', message: settingsErr.message })
    else report.transferred.system_settings = 1

    report.durationMs = Date.now() - startTime
    report.success = report.errors.length === 0
    report.completedAt = new Date().toISOString()

    return report
  } catch (err) {
    report.durationMs = Date.now() - startTime
    report.success = false
    report.errors.push({ table: 'general', message: err.message })
    return report
  }
}
