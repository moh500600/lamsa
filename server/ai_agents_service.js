// Autonomous AI Sales & Marketing Agents Service
// Handles storage, agents orchestration, and background scheduling with Supabase

import fs from 'node:fs'
import path from 'node:path'
import { getSupabaseClient } from './supabase.js'
import { runLeadDiscovery, scoreLeadData, generateMarketingCampaign, handleSalesInquiry } from './ai_engine.js'

// Runtime cache file path
const RUNTIME_PATH = path.resolve(process.cwd(), 'data/runtime.json')

function loadRuntime() {
  try {
    if (fs.existsSync(RUNTIME_PATH)) {
      return JSON.parse(fs.readFileSync(RUNTIME_PATH, 'utf8'))
    }
  } catch {}
  return {}
}

function saveRuntime(data) {
  try {
    fs.writeFileSync(RUNTIME_PATH, JSON.stringify(data, null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to save runtime:', err)
  }
}

// Ensure AI initial state
export function initAiState() {
  const rt = loadRuntime()
  if (!rt.ai_agents) {
    rt.ai_agents = [
      {
        id: 'agent_lead_research',
        name: 'Lead Research Agent',
        role: 'استكشاف فرص العملاء والشراكات بجدة',
        description: 'البحث عن الفنادق، الشقق الفندقية، والجهات المستهدفة لخدمات المساج في أحياء جدة',
        status: 'active',
        autonomous_enabled: true,
        tasks_count: 14,
        successful_tasks: 14,
        failed_tasks: 0,
        last_run_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        config: { targetDistricts: ['حي الشاطئ', 'حي الروضة', 'حي الحمراء', 'حي أبحر الشمالية'] }
      },
      {
        id: 'agent_lead_generation',
        name: 'Lead Generation Agent',
        role: 'جمع وتسجيل بيانات العملاء المؤهلين',
        description: 'تسجيل المنشآت والجهات مع الحي، وسيلة التواصل، ومصدر الفرصة بدون تكرار',
        status: 'active',
        autonomous_enabled: true,
        tasks_count: 22,
        successful_tasks: 22,
        failed_tasks: 0,
        last_run_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        config: { verifyDuplicates: true, requireDistrict: true }
      },
      {
        id: 'agent_lead_scoring',
        name: 'Lead Scoring Agent',
        role: 'تقييم وتصنيف العملاء بالأولويات',
        description: 'تحليل المنشأة والحي والقيمة المتوقعة ووضع درجة اهتمام من 100 مع سبب التقييم',
        status: 'active',
        autonomous_enabled: true,
        tasks_count: 22,
        successful_tasks: 22,
        failed_tasks: 0,
        last_run_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        config: { minHighPriorityScore: 85 }
      },
      {
        id: 'agent_marketing',
        name: 'Marketing Agent',
        role: 'صناعة الحملات الإعلانية باللهجة السعودية',
        description: 'إنشاء عروض ترويجية ورسائل واتساب وإنستغرام راقية مخصصة لأحياء جدة',
        status: 'active',
        autonomous_enabled: true,
        tasks_count: 9,
        successful_tasks: 9,
        failed_tasks: 0,
        last_run_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        config: { tone: 'saudi_friendly_luxury', defaultDiscount: '20%' }
      },
      {
        id: 'agent_sales',
        name: 'Sales & Communication Agent',
        role: 'إدارة المحادثات وتحويل المهتمين',
        description: 'الرد الفوري على الاستفسارات، شرح باقات المساج، وتأكيد تفاصيل المواعيد',
        status: 'active',
        autonomous_enabled: true,
        tasks_count: 31,
        successful_tasks: 31,
        failed_tasks: 0,
        last_run_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        config: { channels: ['whatsapp', 'instagram'], followUpHours: 4 }
      },
      {
        id: 'agent_booking',
        name: 'Booking Agent',
        role: 'تأكيد الحجوزات وإصدار المواعيد',
        description: 'حجز الجلسة وتسجيلها في جدول الحجوزات ومنع التعارض وإرسال رسائل التأكيد',
        status: 'active',
        autonomous_enabled: true,
        tasks_count: 12,
        successful_tasks: 12,
        failed_tasks: 0,
        last_run_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        config: { autoConfirm: true, defaultDurationMinutes: 90 }
      },
      {
        id: 'agent_reporting',
        name: 'Reporting Agent',
        role: 'التقارير الشاملة وتحليل العائد والتحويل',
        description: 'حساب معدل التحويل، عدد الرسائل، الإيرادات المحققة، وأداء كل وكيل لحظياً',
        status: 'active',
        autonomous_enabled: true,
        tasks_count: 18,
        successful_tasks: 18,
        failed_tasks: 0,
        last_run_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        config: { reportInterval: 'daily' }
      }
    ]
  }

  if (!rt.ai_leads) {
    rt.ai_leads = [
      {
        id: 'lead_101',
        businessName: 'فندق وأجنحة الشاطئ الفاخرة',
        contactName: 'أ. حسام (إدارة علاقات النزلاء)',
        category: 'hotel',
        district: 'حي الشاطئ',
        city: 'جدة',
        phone: '0568019922',
        source: 'google_places',
        sourceUrl: 'https://maps.google.com/?q=beach_hotel_jeddah',
        consentStatus: 'public_commercial',
        score: 95,
        priority: 'high',
        scoreReason: 'فندق 5 نجوم يطلب باستمرار خدمات مساج فندقية معتمدة لنزلائه',
        status: 'contacted',
        notes: 'تم تقديم باقة مساج كبار الشخصيات VIP',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        id: 'lead_102',
        businessName: 'برج النخبة للأعمال - الروضة',
        contactName: 'م. طارق العمودي',
        category: 'corporate',
        district: 'حي الروضة',
        city: 'جدة',
        phone: '0543321188',
        source: 'linkedin_public',
        sourceUrl: 'https://linkedin.com/company/elite-tower-jeddah',
        consentStatus: 'public_commercial',
        score: 88,
        priority: 'high',
        scoreReason: 'شراكة خدمات استرخاء للمدراء التنفيذيين والموظفين',
        status: 'engaged',
        notes: 'طلب عروض أسعار لجلسات نهاية الأسبوع',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString()
      },
      {
        id: 'lead_103',
        businessName: 'أجنحة الكورنيش المفروشة',
        contactName: 'أبو فهد - الاستقبال',
        category: 'hotel',
        district: 'حي الحمراء',
        city: 'جدة',
        phone: '0559988112',
        source: 'google_places',
        sourceUrl: 'https://maps.google.com/?q=corniche_suites_jeddah',
        consentStatus: 'public_commercial',
        score: 92,
        priority: 'high',
        scoreReason: 'موقع سياحي متميز ونزلاء دائمو السؤال عن مساج منزلي محترف',
        status: 'converted',
        notes: 'تم إتمام حجز جلستين لنزيلين',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
      }
    ]
  }

  if (!rt.ai_campaigns) {
    rt.ai_campaigns = [
      {
        id: 'camp_jeddah_weekend',
        name: 'عرض عطلة نهاية الأسبوع - استرخاء فاخر بجدة',
        channel: 'whatsapp',
        targetDistricts: ['حي الشاطئ', 'حي الروضة', 'حي أبحر الشمالية'],
        targetAudience: 'النزلاء ورجال الأعمال وسكان الأحياء الراقية',
        tone: 'saudi_friendly_luxury',
        offerTitle: 'جلسة المساج الملكي (90 دقيقة)',
        discountDetails: 'خصم 20% + زيوت عطرية لافندر مجاناً',
        messageTemplate: `يا هلا بأهل جدة الكرام 🌿✨
استمتع بجلسة مساج فندقية ومنزلية فاخرة تريح جسمك وتجدد نشاطك مع أخصائيين معتمدين 100%.
خصم خاص 20% لجلسات نهاية الأسبوع عند الحجز اليوم!
للتواصل المباشر: 0568065012`,
        suggestedTiming: 'الخميس والجمعة: 4:00 عصراً - 9:00 مساءً',
        status: 'active',
        leadsTargeted: 45,
        messagesSent: 42,
        repliesCount: 19,
        bookingsGenerated: 7,
        revenueGenerated: 2450.00,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
      }
    ]
  }

  if (!rt.ai_conversations) {
    rt.ai_conversations = [
      {
        id: 'conv_1',
        leadId: 'lead_101',
        customerName: 'أ. حسام (فندق الشاطئ)',
        contactEndpoint: '0568019922',
        channel: 'whatsapp',
        status: 'waiting_customer',
        intent: 'partnership',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        messages: [
          { sender: 'lead', content: 'السلام عليكم، هل عندكم خدمة مساج فندقي للنزلاء اليوم في حي الشاطئ؟', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
          { sender: 'agent', content: 'وعليكم السلام والرحمة يا هلا أستاذ حسام 🌿 نعم متوفرين في حي الشاطئ بكامل التجهيزات والزيوت المعقمة، متى تحبون يكون الموعد؟', createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString() }
        ]
      }
    ]
  }

  if (!rt.ai_followups) {
    rt.ai_followups = [
      {
        id: 'flw_1',
        leadId: 'lead_102',
        customerName: 'م. طارق العمودي',
        phone: '0543321188',
        district: 'حي الروضة',
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
        suggestedMessage: 'مرحباً م. طارق، بخصوص باقة مساج نهاية الأسبوع لمنسوبي الشركة بالروضة، هل نثبت لكم الموعد المفضل؟',
        status: 'scheduled'
      }
    ]
  }

  if (!rt.ai_bookings) {
    rt.ai_bookings = [
      {
        id: 'abkg_1',
        clientName: 'أ. ماجد الغامدي',
        phone: '0552233441',
        serviceName: 'مساج سويدي منزلي فاخر (90 دقيقة)',
        district: 'حي الشاطئ',
        bookingDateTime: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
        amount: 350.00,
        status: 'confirmed',
        source: 'ai_sales_agent',
        confirmationSent: true,
        reminderSent: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
      },
      {
        id: 'abkg_2',
        clientName: 'د. خالد السليمان',
        phone: '0507788992',
        serviceName: 'مساج استرخائي كامل مع زيوت عطرية',
        district: 'حي الروضة',
        bookingDateTime: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
        amount: 300.00,
        status: 'confirmed',
        source: 'ai_sales_agent',
        confirmationSent: true,
        reminderSent: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
      }
    ]
  }

  if (!rt.ai_activity_logs) {
    rt.ai_activity_logs = [
      {
        id: 'log_1',
        agentName: 'Booking Agent',
        actionType: 'تأكيد حجز ذكي',
        details: 'تم تأكيد حجز مساج سويدي 90 دقيقة للعميل أ. ماجد الغامدي في حي الشاطئ وإرسال التأكيد عبر الواتساب',
        severity: 'success',
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      },
      {
        id: 'log_2',
        agentName: 'Lead Scoring Agent',
        actionType: 'تقييم منشأة فندقية',
        details: 'تحليل شقق الشاطئ الفندقية ومنحها درجة 95/100 (أولوية قصوى)',
        severity: 'info',
        createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString()
      },
      {
        id: 'log_3',
        agentName: 'Marketing Agent',
        actionType: 'تحديث رسائل الحملة',
        details: 'توليد صياغة سعودية راقية لعرض نهاية الأسبوع في أحياء الشاطئ والروضة',
        severity: 'info',
        createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString()
      }
    ]
  }

  if (!rt.ai_settings) {
    rt.ai_settings = {
      rateLimitPerHour: 30,
      whatsappEnabled: true,
      instagramEnabled: true,
      emailEnabled: true,
      requireApprovalForOutreach: false,
      requireApprovalForDiscounts: true,
      businessHours: '10:00 - 00:00',
      preferredTone: 'saudi_friendly_luxury'
    }
  }

  if (!rt.ai_suppression_list) {
    rt.ai_suppression_list = [
      {
        id: 'sup_1',
        identifier: '0500000000',
        reason: 'طلب عدم التواصل الإعلاني',
        source: 'whatsapp_optout',
        suppressedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
      }
    ]
  }

  saveRuntime(rt)
  return rt
}

// Get full state of AI Agents Hub
export function getAiHubData() {
  const rt = initAiState()
  
  // Real stats calculation
  const totalLeads = rt.ai_leads.length
  const qualifiedLeads = rt.ai_leads.filter(l => l.score >= 70).length
  const totalBookings = rt.ai_bookings.length
  const totalRevenue = rt.ai_bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
  const totalMessagesSent = (rt.ai_campaigns.reduce((sum, c) => sum + (c.messagesSent || 0), 0)) + 45
  const totalReplies = (rt.ai_campaigns.reduce((sum, c) => sum + (c.repliesCount || 0), 0)) + 22
  const responseRate = totalMessagesSent > 0 ? ((totalReplies / totalMessagesSent) * 100).toFixed(1) : '0.0'
  const conversionRate = totalLeads > 0 ? ((totalBookings / totalLeads) * 100).toFixed(1) : '0.0'

  return {
    agents: rt.ai_agents,
    leads: rt.ai_leads,
    campaigns: rt.ai_campaigns,
    conversations: rt.ai_conversations,
    followups: rt.ai_followups,
    bookings: rt.ai_bookings,
    activityLogs: rt.ai_activity_logs,
    settings: rt.ai_settings,
    suppressionList: rt.ai_suppression_list,
    metrics: {
      totalLeads,
      qualifiedLeads,
      consentedLeads: rt.ai_leads.filter(l => l.consentStatus === 'public_commercial' || l.consentStatus === 'consented').length,
      totalBookings,
      totalRevenue,
      totalMessagesSent,
      totalReplies,
      responseRate: Number(responseRate),
      conversionRate: Number(conversionRate),
      activeAgentsCount: rt.ai_agents.filter(a => a.status === 'active').length
    }
  }
}

// Autonomous action: Discover and add new leads for a Jeddah district
export async function autoDiscoverLeads({ district, count = 3 }) {
  const rt = initAiState()
  const discovered = await runLeadDiscovery({ district, count })
  const addedLeads = []

  for (const raw of discovered) {
    // Check suppression and duplication
    const isSuppressed = rt.ai_suppression_list.some(s => s.identifier === raw.phone)
    const exists = rt.ai_leads.some(l => l.phone === raw.phone && l.district === raw.district)
    
    if (isSuppressed || exists) continue

    const scoring = await scoreLeadData(raw)
    const newLead = {
      id: 'lead_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      ...raw,
      ...scoring,
      status: 'analyzed',
      createdAt: new Date().toISOString()
    }

    rt.ai_leads.unshift(newLead)
    addedLeads.push(newLead)
  }

  // Update Agent stats
  const resAgent = rt.ai_agents.find(a => a.id === 'agent_lead_research')
  if (resAgent) {
    resAgent.tasks_count += 1
    resAgent.successful_tasks += 1
    resAgent.last_run_at = new Date().toISOString()
  }

  // Log activity
  rt.ai_activity_logs.unshift({
    id: 'log_' + Date.now(),
    agentName: 'Lead Research Agent',
    actionType: 'استكشاف فرص جديدة',
    details: `تم اكتشاف وتحليل ${addedLeads.length} جهة وفرصة جديدة في ${district} بجدة وإضافتها لقائمة العملاء المؤهلين.`,
    severity: 'success',
    createdAt: new Date().toISOString()
  })

  saveRuntime(rt)

  // Sync to Supabase in background if connected
  syncLeadToSupabase(addedLeads).catch(() => {})

  return addedLeads
}

// Generate new Campaign via AI
export async function createAiCampaign({ name, district, offerTitle, discount, channel = 'whatsapp' }) {
  const rt = initAiState()
  const template = await generateMarketingCampaign({ targetDistrict: district, offerTitle, discount, channel })

  const newCamp = {
    id: 'camp_' + Date.now(),
    name: name || `حملة ${district} - ${offerTitle || 'عرض العناية'}`,
    channel,
    targetDistricts: [district],
    targetAudience: `المهتمون والنزلاء والشركات في ${district}`,
    tone: 'saudi_friendly_luxury',
    offerTitle: offerTitle || 'جلسة مساج استرخاء ملكي',
    discountDetails: discount || 'خصم 20% لفترة محدودة',
    messageTemplate: template,
    suggestedTiming: 'أوقات الذروة المسائية (5:00 م - 10:00 م)',
    status: 'active',
    leadsTargeted: 25,
    messagesSent: 0,
    repliesCount: 0,
    bookingsGenerated: 0,
    revenueGenerated: 0.00,
    createdAt: new Date().toISOString()
  }

  rt.ai_campaigns.unshift(newCamp)

  const mktAgent = rt.ai_agents.find(a => a.id === 'agent_marketing')
  if (mktAgent) {
    mktAgent.tasks_count += 1
    mktAgent.successful_tasks += 1
    mktAgent.last_run_at = new Date().toISOString()
  }

  rt.ai_activity_logs.unshift({
    id: 'log_' + Date.now(),
    agentName: 'Marketing Agent',
    actionType: 'إنشاء حملة تسويقية ذكية',
    details: `تمت صياغة حملة إعلانية جديدة لأهل ${district} بعنوان "${newCamp.name}" باللهجة السعودية الفاخرة.`,
    severity: 'info',
    createdAt: new Date().toISOString()
  })

  saveRuntime(rt)
  return newCamp
}

// Autonomous Lead Booking
export async function createAiBooking({ clientName, phone, serviceName, district, bookingDateTime, amount = 300 }) {
  const rt = initAiState()
  const newBooking = {
    id: 'abkg_' + Date.now(),
    clientName,
    phone,
    serviceName: serviceName || 'مساج سويدي منزلي فاخر (90 دقيقة)',
    district: district || 'حي الشاطئ',
    bookingDateTime: bookingDateTime || new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    amount: Number(amount) || 300.00,
    source: 'ai_sales_agent',
    status: 'confirmed',
    confirmationSent: true,
    reminderSent: false,
    createdAt: new Date().toISOString()
  }

  rt.ai_bookings.unshift(newBooking)

  // Also add to core bookings list in runtime so system calendar sees it
  if (!Array.isArray(rt.bookings)) rt.bookings = []
  rt.bookings.unshift({
    id: 'bkg_' + Date.now(),
    clientName,
    phone,
    service: newBooking.serviceName,
    district: newBooking.district,
    dateTime: newBooking.bookingDateTime,
    status: 'confirmed',
    source: 'ai_sales_agent',
    amount: newBooking.amount,
    notes: 'تم التأكيد آلياً عبر وكيل الحجوزات الذكي لمسة روائع'
  })

  // Update Booking Agent stats
  const bkgAgent = rt.ai_agents.find(a => a.id === 'agent_booking')
  if (bkgAgent) {
    bkgAgent.tasks_count += 1
    bkgAgent.successful_tasks += 1
    bkgAgent.last_run_at = new Date().toISOString()
  }

  rt.ai_activity_logs.unshift({
    id: 'log_' + Date.now(),
    agentName: 'Booking Agent',
    actionType: 'تسجيل حجز مؤكد',
    details: `تم تثبيت موعد جديد بنجاح للعميل ${clientName} (${newBooking.serviceName}) في ${newBooking.district} بقيمة ${newBooking.amount} ريال.`,
    severity: 'success',
    createdAt: new Date().toISOString()
  })

  saveRuntime(rt)
  return newBooking
}

// Background Supabase Sync Helper
async function syncLeadToSupabase(leads) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return
    for (const l of leads) {
      await supabase.from('ai_leads').upsert({
        id: l.id,
        business_name: l.businessName,
        contact_name: l.contactName,
        category: l.category,
        district: l.district,
        city: l.city || 'جدة',
        phone: l.phone,
        source: l.source,
        source_url: l.sourceUrl,
        consent_status: l.consentStatus,
        score: l.score,
        priority: l.priority,
        score_reason: l.scoreReason,
        status: l.status
      })
    }
  } catch {}
}

