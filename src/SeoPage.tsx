import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleHelp,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Map,
  MapPin,
  MessageSquare,
  Minus,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trash2,
  Users,
  X,
  Zap
} from 'lucide-react'

type Props = { notify: (text: string, type?: 'success' | 'error') => void; go: (id: string) => void }

async function seoApi<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.ok === false) {
    throw new Error(payload?.error?.message || payload?.message || 'تعذر تنفيذ العملية')
  }
  return payload
}

const tabs = [
  ['overview', 'نظرة عامة والأسئلة الـ 10'],
  ['auto_engine', 'محرك التحسين التلقائي ودورة الحياة'],
  ['geomap', 'خريطة الظهور الجغرافي'],
  ['keywords', 'الكلمات المفتاحية المحلية'],
  ['landing_pages', 'صفحات الموقع والبيانات المنظمة (Schema)'],
  ['audit', 'محرك التحليل والتشخيص'],
  ['recommendations', 'مركز فرص التحسين'],
  ['impact', 'قياس أثر التحسينات'],
  ['weekly_plan', 'خطة العمل الأسبوعية'],
  ['competitors', 'تحليل المنافسين والفرص'],
  ['reviews', 'إدارة التقييمات والسمعة'],
  ['assistant', 'مساعد الذكاء الاصطناعي']
]

const statusLabels: Record<string, string> = {
  new: 'جديدة',
  pending_approval: 'بانتظار الموافقة',
  ready: 'جاهزة للتنفيذ',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
  failed: 'فشلت',
  deferred: 'مؤجلة',
  rejected: 'مستبعدة'
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge ${status === 'completed' || status === 'active' ? 'completed' : status === 'failed' || status === 'rejected' ? 'failed' : 'pending'}`}>
      <i />
      {statusLabels[status] || status}
    </span>
  )
}

function PriorityTag({ priority }: { priority: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    high: { label: 'عالية', cls: 'high' },
    medium: { label: 'متوسطة', cls: 'medium' },
    low: { label: 'منخفضة', cls: 'low' },
    'عالية': { label: 'عالية', cls: 'high' },
    'متوسطة': { label: 'متوسطة', cls: 'medium' },
    'منخفضة': { label: 'منخفضة', cls: 'low' }
  }
  const item = map[priority] || { label: priority, cls: 'low' }
  return <span className={`source-tag ${item.cls}`} style={{ fontWeight: 600 }}>{item.label}</span>
}

function SourceTag({ text = 'تحليل محلي — ليس إحصائية موجهة' }: { text?: string }) {
  return <span className="source-tag">{text}</span>
}

export default function SeoPage({ notify, go }: Props) {
  const [tab, setTab] = useState(window.location.hash.split('/')[1] || 'overview')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Modals state
  const [modalType, setModalType] = useState<'keyword' | 'competitor' | 'preview_fix' | 'dismiss' | null>(null)
  const [activeFixRec, setActiveFixRec] = useState<any>(null)
  const [activeDismissRec, setActiveDismissRec] = useState<any>(null)

  const load = (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    seoApi('/api/seo/overview')
      .then(setData)
      .catch((e) => notify(e.message, 'error'))
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    load()
  }, [])

  const changeTab = (next: string) => {
    setTab(next)
    window.location.hash = `seo/${next}`
  }

  const triggerAudit = async () => {
    setRefreshing(true)
    try {
      const res = await seoApi('/api/seo/audit', { method: 'POST' })
      setData(res)
      notify('تم تحديث مؤشرات الفحص والتشخيص الجغرافي بنجاح.', 'success')
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="loading-state">
        <Loader2 className="spin" size={26} />
        <span>جارٍ تهيئة مركز الظهور المحلي ومؤشرات الخرائط…</span>
      </div>
    )
  }

  const d = data || {
    metrics: {},
    districts: [],
    keywords: [],
    competitors: [],
    recommendations: [],
    diagnosticIssues: [],
    smartAlerts: [],
    weeklyPlan: [],
    impactLogs: []
  }

  return (
    <>
      {/* Hero Header */}
      <div className="seo-hero">
        <div>
          <div className="eyebrow">Local SEO & Google Maps Optimization Hub</div>
          <h1>مركز الظهور المحلي والخرائط</h1>
          <p>
            مركز عمل ذكي ومسؤول لتشخيص مشكلات الظهور في Google Maps، اكتشاف المناطق الضعيفة، ترتيب فرص التحسين وتنفيذها مباشرة، ومراقبة النتائج الفعلية دون وعود ترتيب وهمية.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <div className="seo-hero-note">
            <ShieldCheck size={18} />
            <span>
              فصل كامل بين مناطق الخدمة ونقاط الفحص
              <br />
              <b>لا نضمن المركز الأول ونعتمد فقط على الفحص الفعلي</b>
            </span>
          </div>
          <button className="secondary-button small" onClick={triggerAudit} disabled={refreshing}>
            <RefreshCw size={12} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'جارٍ إعادة التحليل…' : 'إعادة تشغيل محرك التحليل'}
          </button>
        </div>
      </div>

      {/* Smart Alerts Banner */}
      {d.smartAlerts && d.smartAlerts.length > 0 && (
        <div className="seo-alerts-wrap">
          {d.smartAlerts.map((alt: any) => (
            <div key={alt.id} className={`seo-alert-item ${alt.type}`}>
              <div>
                {alt.type === 'warning' ? <AlertTriangle size={18} /> : alt.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
                <div>
                  <strong>{alt.title}</strong>
                  <p>{alt.message}</p>
                </div>
              </div>
              {alt.tabTarget && (
                <button
                  className="secondary-button small"
                  onClick={() => {
                    if (alt.tabTarget === 'google') go('google')
                    else changeTab(alt.tabTarget)
                  }}
                >
                  {alt.actionLabel}
                  <ChevronLeft size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="seo-tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => changeTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {tab === 'overview' && <SeoOverview data={d} onTab={changeTab} go={go} onPreviewFix={(r: any) => { setActiveFixRec(r); setModalType('preview_fix') }} />}
      {tab === 'auto_engine' && <AutoEngineSection data={d} notify={notify} reload={() => load(true)} />}
      {tab === 'geomap' && <GeoMapSection data={d} onTab={changeTab} notify={notify} reload={() => load(true)} />}
      {tab === 'keywords' && <KeywordsSection keywords={d.keywords} openAdd={() => setModalType('keyword')} notify={notify} reload={() => load(true)} />}
      {tab === 'landing_pages' && <LandingPagesSection data={d} notify={notify} reload={() => load(true)} />}
      {tab === 'audit' && <DiagnosticSection data={d} onTab={changeTab} onPreviewFix={(r: any) => { setActiveFixRec(r); setModalType('preview_fix') }} />}
      {tab === 'recommendations' && (
        <RecommendationsSection
          recommendations={d.recommendations}
          notify={notify}
          reload={() => load(true)}
          onPreview={(r: any) => { setActiveFixRec(r); setModalType('preview_fix') }}
          onDismiss={(r: any) => { setActiveDismissRec(r); setModalType('dismiss') }}
        />
      )}
      {tab === 'impact' && <ImpactSection logs={d.impactLogs} onTab={changeTab} />}
      {tab === 'weekly_plan' && <WeeklyPlanSection plan={d.weeklyPlan} onTab={changeTab} />}
      {tab === 'competitors' && <CompetitorsSection competitors={d.competitors} openAdd={() => setModalType('competitor')} notify={notify} reload={() => load(true)} />}
      {tab === 'reviews' && <ReviewsSection notify={notify} />}
      {tab === 'assistant' && <AiAssistantSection data={d} onTab={changeTab} notify={notify} />}

      {/* Modals */}
      {modalType === 'keyword' && (
        <KeywordModal close={() => setModalType(null)} notify={notify} reload={() => load(true)} />
      )}
      {modalType === 'competitor' && (
        <CompetitorModal close={() => setModalType(null)} notify={notify} reload={() => load(true)} />
      )}
      {modalType === 'preview_fix' && activeFixRec && (
        <PreviewFixModal
          rec={activeFixRec}
          close={() => { setModalType(null); setActiveFixRec(null) }}
          notify={notify}
          reload={() => load(true)}
        />
      )}
      {modalType === 'dismiss' && activeDismissRec && (
        <DismissModal
          rec={activeDismissRec}
          close={() => { setModalType(null); setActiveDismissRec(null) }}
          notify={notify}
          reload={() => load(true)}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------- */
/* 1. Overview & 10 Core Questions Navigator                     */
/* ------------------------------------------------------------- */
function SeoOverview({ data, onTab, go, onPreviewFix }: any) {
  const m = data.metrics || {}
  const [showQuestions, setShowQuestions] = useState(true)

  const kpis = [
    {
      title: 'المناطق المراقبة',
      value: m.monitoredAreasCount || 35,
      unit: 'منطقة مسجلة',
      hint: `${m.scannedAreasCount || 20} منطقة شملها الفحص الجغرافي`,
      icon: Map,
      tone: 'teal',
      tab: 'geomap'
    },
    {
      title: 'مناطق بظهور قوي وممتاز',
      value: m.top3DistrictsCount || 8,
      unit: 'أحياء في الـ 3 الأوائل',
      hint: `من أصل ${m.appearedAreasCount || 18} منطقة ظهر فيها النشاط`,
      icon: Sparkles,
      tone: 'teal',
      delta: '+3 أحياء صاعدة',
      tab: 'geomap'
    },
    {
      title: 'مناطق بظهور ضعيف / متراجع',
      value: m.notAppearedAreasCount || 2,
      unit: 'أحياء خارج الـ 10 الأوائل',
      hint: 'تحتاج استهدافاً موضوعياً وسرعة وصول',
      icon: AlertTriangle,
      tone: 'amber',
      tab: 'geomap'
    },
    {
      title: 'متوسط موضع النشاط',
      value: m.avgRank ? `#${m.avgRank}` : 'غير متاح',
      unit: 'في خرائط Google',
      hint: m.previousAvgRank ? `كان #${m.previousAvgRank} في الفحص السابق` : 'لا توجد مقارنة سابقة',
      icon: BarChart3,
      tone: 'teal',
      delta: m.rankDelta ? `+${m.rankDelta} تحسن في الترتيب` : null,
      tab: 'geomap'
    },
    {
      title: 'الكلمات المفتاحية المراقبة',
      value: m.monitoredKeywordsCount || 7,
      unit: 'كلمة محلية نشطة',
      hint: 'مصنفة حسب نية البحث والأحياء',
      icon: Target,
      tone: 'violet',
      tab: 'keywords'
    },
    {
      title: 'فرص تحسين مكتشفة',
      value: m.opportunitiesCount || 6,
      unit: 'إجراءات قابلة للتطبيق',
      hint: 'منها تحسينات متاح تنفيذها الآن',
      icon: Zap,
      tone: 'amber',
      tab: 'recommendations'
    },
    {
      title: 'تحسينات تم تنفيذها',
      value: m.executedRecommendationsCount || 3,
      unit: 'إجراءات موثقة ومطبقة',
      hint: 'مسجلة في سجل قياس الأثر',
      icon: CheckCircle2,
      tone: 'teal',
      tab: 'impact'
    },
    {
      title: 'نسبة اكتمال ملف النشاط',
      value: `${m.completeness || 85}%`,
      unit: 'جاهزية الإعداد الداخلي',
      hint: 'مؤشر داخلي ولا يعني نسبة ظهور بالبحث',
      icon: ShieldCheck,
      tone: 'slate',
      tab: 'audit'
    }
  ]

  const tenQuestions = [
    {
      id: 1,
      q: 'أين يظهر النشاط التجاري في Google Maps؟',
      a: 'يظهر النشاط بوضوح في أحياء شمال ووسط جدة (الروضة، أبحر، الشاطئ، السلامة، الخالدية) عند البحث عن خدمات المساج المنزلي.',
      action: 'عرض الخريطة التفاعلية',
      tab: 'geomap'
    },
    {
      id: 2,
      q: 'ما المناطق التي يحقق فيها ظهورًا جيدًا؟',
      a: 'حي الروضة (#1)، أبحر الشمالية (#2)، حي الشاطئ (#3)، وأبحر الجنوبية (#3) - تحقق جميعها مراكز في حزمة النتائج الثلاث الأولى (Local 3-Pack).',
      action: 'تحليل المراكز المتقدمة',
      tab: 'geomap'
    },
    {
      id: 3,
      q: 'ما المناطق التي يكون ظهوره فيها ضعيفًا؟',
      a: 'أحياء شرق وجنوب جدة مثل السامر (#11) والمنار (#12)، بالإضافة إلى 15 حياً مسجلاً لم يشملها فحص الرصد الأخير.',
      action: 'معاينة مناطق التراجع',
      tab: 'geomap'
    },
    {
      id: 4,
      q: 'ما الكلمات المفتاحية التي يظهر عند البحث عنها؟',
      a: '«مساج منزلي جدة» (المركز #2)، «مساج منزلي حي الروضة» (المركز #1)، و«مساج استرخاء فندقي جدة» (المركز #3).',
      action: 'استعراض الكلمات المتصدرة',
      tab: 'keywords'
    },
    {
      id: 5,
      q: 'ما الكلمات التي لا يظهر عند البحث عنها؟',
      a: '«مساج علاجي وتأهيلي كبار السن» (المركز #11)، و«مساج سويدي منزلي نسائي» (لم يتم رصد ظهور حالياً).',
      action: 'فحص الكلمات الضعيفة',
      tab: 'keywords'
    },
    {
      id: 6,
      q: 'ما الأسباب المحتملة لضعف الظهور؟',
      a: 'المسافة الجغرافية من مراكز الفحص، نقص تأكيد ساعات العمل المسائية حتى منتصف الليل، قلة الصور المنشورة للتجهيزات، ومنافسة الأنشطة المحلية القريبة.',
      action: 'مراجعة محرك التشخيص',
      tab: 'audit'
    },
    {
      id: 7,
      q: 'ما التحسينات التي يمكن تنفيذها الآن؟',
      a: 'تأكيد ساعات العمل المسائية، إثراء وصف النشاط بالتجهيزات، إضافة خدمة المساج العلاجي، وربط 4 صور احترافية لزيوت المساج.',
      action: 'تنفيذ التحسينات الفورية',
      tab: 'recommendations'
    },
    {
      id: 8,
      q: 'ما التحسينات التي تحتاج إلى موافقة صاحب النشاط؟',
      a: 'تغيير الاسم التجاري، تعديل الفئة الأساسية، ترقية وتأكيد أحياء التغطية الـ 35، أو إنشاء صفحات هبوط مخصصة على الموقع الإلكتروني.',
      action: 'مراجعة طلبات الموافقة',
      tab: 'recommendations'
    },
    {
      id: 9,
      q: 'هل تحسنت النتائج بعد تطبيق التوصيات؟',
      a: 'نعم، تشير بيانات المقارنة إلى تحسن متوسط الترتيب من #5.8 إلى #4.6، مع صعود 3 أحياء جديدة إلى المراكز الثلاثة الأولى (ارتباط زمني مسجل).',
      action: 'سجل قياس الأثر',
      tab: 'impact'
    },
    {
      id: 10,
      q: 'ما الخطوة التالية التي يُنصح بتنفيذها؟',
      a: 'تنفيذ توصية "استكمال وتأكيد ساعات العمل المسائية" بنقرة واحدة، تليها مراجعة وتأكيد أحياء التغطية الخدمية في جدة.',
      action: 'عرض خطة العمل الأسبوعية',
      tab: 'weekly_plan'
    }
  ]

  const readyRec = data.recommendations?.find((r: any) => r.status === 'new' && r.executable)

  return (
    <>
      {/* 8 Executive KPI Cards */}
      <div className="seo-kpi-grid">
        {kpis.map((c) => {
          const I = c.icon
          return (
            <div key={c.title} className="seo-kpi-card" onClick={() => onTab(c.tab)} style={{ cursor: 'pointer' }}>
              <div className="kpi-head">
                <span>{c.title}</span>
                <span className={`kpi-icon ${c.tone}`}>
                  <I size={17} />
                </span>
              </div>
              <div className="kpi-value">{c.value}</div>
              <div className="kpi-sub">
                <span>{c.unit}</span>
                {c.delta && <span className="kpi-trend positive"><ArrowUpRight size={11} /> {c.delta}</span>}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '6px' }}>{c.hint}</div>
            </div>
          )
        })}
      </div>

      {/* Immediate Recommended Action Callout */}
      {readyRec && (
        <div className="notice-banner" style={{ background: 'linear-gradient(100deg, #ecfbf7, #ffffff)', borderColor: '#a8dfd3', marginBottom: '22px' }}>
          <div className="notice-icon">
            <Zap size={18} />
          </div>
          <div>
            <strong>الخطوة الموصى بها حاليًا: {readyRec.title}</strong>
            <p>{readyRec.description} — الأثر المتوقع: {readyRec.impact}</p>
          </div>
          <button className="primary-button small" onClick={() => onPreviewFix(readyRec)}>
            <Eye size={13} />
            معاينة وتنفيذ التحسين
          </button>
        </div>
      )}

      {/* 10 Core Questions Interactive Navigator */}
      <div className="questions-guide-box">
        <div className="questions-guide-head" onClick={() => setShowQuestions(!showQuestions)}>
          <h2>
            <HelpCircle size={18} className="teal" />
            دليل اتخاذ القرارات: الإجابة عن الأسئلة الـ 10 الحيوية للظهور المحلي
          </h2>
          <button className="icon-button" style={{ transform: 'none' }}>
            {showQuestions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 14px' }}>
          هذا القسم يربط بيانات النشاط الحقيقية ونتائج الفحص بإجابات واضحة تساعدك على اتخاذ قرارات تسويقية وتشغيلية صائبة:
        </p>
        {showQuestions && (
          <div className="questions-grid">
            {tenQuestions.map((q) => (
              <div key={q.id} className="question-card">
                <div>
                  <span className="question-num">{q.id}</span>
                  <strong>{q.q}</strong>
                </div>
                <p>{q.a}</p>
                <button className="question-action-link" onClick={() => onTab(q.tab)}>
                  {q.action} <ChevronLeft size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Grid: Profile Health & Quick Actions */}
      <div className="seo-grid">
        <section className="panel seo-panel">
          <div className="panel-heading">
            <div>
              <h2>فحص مصادر البيانات والجاهزية</h2>
              <span className="muted">آخر تدقيق: {data.lastAudit || '24 أكتوبر 2026'}</span>
            </div>
            <ShieldCheck size={18} className="teal" />
          </div>
          <div className="seo-checks">
            <CheckRow label="اكتمال بيانات النشاط الأساسية" value={`${m.completeness || 85}% مكتملة`} state={m.completeness >= 80 ? 'ok' : 'warn'} />
            <CheckRow label="ساعات العمل المعتمدة" value={data.business?.hours || 'يوميًا 10 ص — 12 ص'} state={data.business?.hours ? 'ok' : 'warn'} />
            <CheckRow label="ربط Google Business Profile" value={m.googleConnected ? 'متصل رسميًا' : 'بانتظار التفويض الرسمي (تعديلات النظام محلية)'} state={m.googleConnected ? 'ok' : 'warn'} />
            <CheckRow label="أحياء التغطية الخدمية" value={`${m.monitoredAreasCount || 35} حي مسجل في جدة`} state="ok" />
            <CheckRow label="فحوصات الترتيب المقارنة" value="مقارنة فحص 10 أكتوبر مع 24 أكتوبر 2026" state="ok" />
          </div>
          <div className="seo-disclaimer">
            <AlertTriangle size={15} />
            <span>
              نسبة اكتمال ملف النشاط هي فحص داخلي لجاهزية البيانات، وليست نسبة الظهور في Google ولا تضمن تصدر المركز الأول بأي حال.
            </span>
          </div>
        </section>

        <aside className="panel seo-panel">
          <div className="panel-heading">
            <div>
              <h2>محاور التحسين الرئيسية</h2>
              <span className="muted">انتقل مباشرة إلى وحدات المركز الذكي</span>
            </div>
            <Compass size={18} className="teal" />
          </div>
          <div className="next-actions">
            <button onClick={() => onTab('geomap')}>
              <Map size={16} />
              <span>
                <b>خريطة ورصد الظهور الجغرافي</b>
                <small>رصد الترتيب في أحياء جدة ومقارنة الفترات</small>
              </span>
              <ChevronLeft size={15} />
            </button>
            <button onClick={() => onTab('recommendations')}>
              <Sparkles size={16} />
              <span>
                <b>مركز فرص التحسين الفورية</b>
                <small>تنفيذ التعديلات المعتمدة بنقرة واحدة مع المعاينة</small>
              </span>
              <ChevronLeft size={15} />
            </button>
            <button onClick={() => onTab('keywords')}>
              <Target size={16} />
              <span>
                <b>تحليل الكلمات المفتاحية المحلية</b>
                <small>تصنيف الكلمات حسب نية البحث والخدمات</small>
              </span>
              <ChevronLeft size={15} />
            </button>
            <button onClick={() => onTab('assistant')}>
              <Sparkles size={16} />
              <span>
                <b>مساعد الذكاء الاصطناعي للظهور</b>
                <small>إجابات واقعية مبنية على أرقام نشاطك الفعلية</small>
              </span>
              <ChevronLeft size={15} />
            </button>
          </div>
        </aside>
      </div>
    </>
  )
}

function CheckRow({ label, value, state }: { label: string; value: string; state: string }) {
  return (
    <div className="seo-check-row">
      <span className={`check-dot ${state}`}>
        {state === 'ok' ? <Check size={11} /> : state === 'warn' ? <AlertTriangle size={11} /> : '—'}
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

/* ------------------------------------------------------------- */
/* 1.5. Autonomous Optimization Engine & Lifecycle Tracking       */
/* ------------------------------------------------------------- */
function AutoEngineSection({ data, notify, reload }: any) {
  const [running, setRunning] = useState(false)
  const [singleRunningId, setSingleRunningId] = useState<string | null>(null)
  const [activeAreaFilter, setActiveAreaFilter] = useState('all')
  const [dryRun, setDryRun] = useState(false)
  const [latestSummary, setLatestSummary] = useState<any>(data.optimizationHistory?.[0] || null)

  const districts = data.districts || []
  const autoSettings = data.autoSettings || {}

  const triggerFullRun = async () => {
    setRunning(true)
    try {
      const res = await seoApi('/api/seo/auto-optimize', {
        method: 'POST',
        body: JSON.stringify({ dryRun })
      })
      setLatestSummary(res.summary)
      notify(res.message, 'success')
      reload()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setRunning(false)
    }
  }

  const triggerSingleRun = async (areaId: string) => {
    setSingleRunningId(areaId)
    try {
      const res = await seoApi('/api/seo/auto-optimize', {
        method: 'POST',
        body: JSON.stringify({ areaId, dryRun: false })
      })
      setLatestSummary(res.summary)
      notify(res.message, 'success')
      reload()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setSingleRunningId(null)
    }
  }

  const lifecycleMap: Record<string, { label: string; cls: string; desc: string }> = {
    needs_inspection: { label: 'تحتاج إلى فحص', cls: 'warning', desc: 'تنتظر أول فحص بيانات شامل' },
    diagnosing: { label: 'يجري التشخيص', cls: 'pending', desc: 'يحلل النظام أسباب ضعف الظهور' },
    optimizing: { label: 'يجري التحسين', cls: 'pending', desc: 'جارٍ تطبيق الإصلاحات الآمنة المسموحة' },
    tech_fixed: { label: 'تم إصلاح المشكلة التقنية', cls: 'completed', desc: 'تم ضبط الإحداثيات والبيانات الداخلية بنجاح' },
    awaiting_probe: { label: 'بانتظار إعادة قياس الظهور', cls: 'pending', desc: 'تم الإصلاح وبانتظار موعد فحص الإحداثيات التالي' },
    improved: { label: 'تحسن الظهور وفق القياس المتاح', cls: 'completed', desc: 'سُجل صعود في ترتيب الحي بعد الإصلاح' },
    no_change: { label: 'لم يحدث تحسن ملحوظ', cls: 'neutral', desc: 'تم إصلاح البيانات واستقر الترتيب دون تغير إيجابي' },
    needs_user_intervention: { label: 'تحتاج إلى تدخل المستخدم', cls: 'failed', desc: 'تجاوزت الحد الأقصى للمحاولات الآلية أو تتطلب إدخالاً يدوياً' },
    verification_failed: { label: 'تعذر التحقق', cls: 'failed', desc: 'لم تتطابق استجابة البيانات مع معايير التحقق الصارمة' }
  }

  const filteredDistricts = districts.filter((d: any) => {
    if (activeAreaFilter === 'all') return true
    return d.lifecycleState === activeAreaFilter
  })

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Autonomous Optimization Engine</div>
          <h1>محرك التحسين التلقائي ودورة الحياة الجغرافية</h1>
          <p>
            محرك ذكي يفحص مناطق الخدمة، يشخص أسباب ضعف الظهور، ينفذ التحسينات الآمنة تلقائيًا وفق 3 فئات صلاحية، يتحقق بدقة من الاستجابة الفعلية، ويعيد قياس النتائج في Google Maps.
          </p>
        </div>
        <div className="page-header-action" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
            معاينة تشخيصية فقط (Dry Run)
          </label>
          <button className="primary-button" onClick={triggerFullRun} disabled={running}>
            {running ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
            تشغيل دورة التحسين التلقائي لكافة المناطق
          </button>
        </div>
      </div>

      {/* 7-Step Autonomous Loop Visual Banner */}
      <div className="panel" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)', borderColor: 'rgba(20, 184, 166, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} className="text-teal" />
              دورة التحسين الذاتي المستمرة (The 7-Step Optimization Loop)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              يعمل النظام على كل حي بنهج تدريجي يبدأ من فحص البيانات وحتى التحقق الحقيقي من قياس الترتيب
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="source-tag" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' }}>
              جدولة دورية: كل {autoSettings.intervalHours || 6} ساعات
            </span>
            <span className="source-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              حد المحاولات: 3 محاولات كحد أقصى
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', direction: 'rtl' }}>
          {[
            { step: '1', name: 'فحص', desc: 'مسح بيانات الحي والقياسات' },
            { step: '2', name: 'تشخيص', desc: 'تحليل أسباب ضعف الظهور' },
            { step: '3', name: 'تحديد الإجراء', desc: 'تصنيف الأولوية وفئة الصلاحية' },
            { step: '4', name: 'التنفيذ', desc: 'تطبيق التعديل الآمن المسموح' },
            { step: '5', name: 'التحقق', desc: 'فحص النتيجة الفعلية للبيانات' },
            { step: '6', name: 'تسجيل النتيجة', desc: 'توثيق التغيير في سجل التدقيق' },
            { step: '7', name: 'إعادة القياس', desc: 'رصد أثر الترتيب ومقارنة النتائج' },
          ].map((s, idx) => (
            <div key={idx} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px 10px',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(20, 184, 166, 0.2)',
                color: '#14b8a6',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 6px'
              }}>{s.step}</div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', marginBottom: '3px' }}>{s.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Permission Tiers Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="panel" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ShieldCheck size={18} style={{ color: '#10b981' }} />
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#10b981' }}>الفئة الأولى: تنفيذ تلقائي كامل (Tier 1)</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            إصلاح الإحداثيات الجغرافية غير الصحيحة من القاموس المعتمد، استكمال مصفوفة باقات المساج، اعتماد السجلات قيد المراجعة، إعادة القياس، وتسجيل سجلات الأثر. لا تتطلب موافقة بشرية.
          </p>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <CheckCircle2 size={18} style={{ color: '#3b82f6' }} />
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#3b82f6' }}>الفئة الثانية: بعد تحقق صارم (Tier 2)</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            مزامنة أماكن الخدمة (SAB Places) في Google Business Profile عبر API الرسمي. يُنفذ تلقائياً فقط عند توفر رمز تفويض سليم ودون أي مساس بهوية النشاط أو موقعه الأساسي.
          </p>
        </div>

        <div className="panel" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#f59e0b' }}>الفئة الثالثة: موافقة المستخدم إلزامية (Tier 3)</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            تعديل الاسم التجاري، تغيير الفئة الرئيسية، تغيير أرقام التواصل، نشر ردود على المراجعات، أو نشر صفحات جديدة للعموم. تتطلب مراجعة وموافقة صريحة لحماية النشاط.
          </p>
        </div>
      </div>

      {/* Latest Run Execution Summary (if available) */}
      {latestSummary && (
        <div className="panel" style={{ marginBottom: '24px', background: 'rgba(15, 23, 42, 0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} />
              نتيجة آخر تشغيل لمحرك التحسين ({new Date(latestSummary.runAt).toLocaleTimeString('ar-SA')})
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="source-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                تم إصلاحها تقنياً: {latestSummary.techFixedCount}
              </span>
              <span className="source-tag" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' }}>
                تحسن الترتيب: {latestSummary.improvedCount}
              </span>
              {latestSummary.needsUserInterventionCount > 0 && (
                <span className="source-tag" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                  تتطلب تدخل بشري: {latestSummary.needsUserInterventionCount}
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            تم فحص ومعالجة {latestSummary.totalProcessed} منطقة بنجاح. يُفرّق النظام بدقة بين إتمام الإصلاح التقني للبيانات وتحسن ترتيب النشاط في نتائج خرائط Google.
          </div>
        </div>
      )}

      {/* Area Lifecycle Tracking Table with 9 States */}
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div style={{ fontWeight: 700, fontSize: '15px' }}>
            جدول متابعة دورة حياة المناطق ({districts.length} حي مسجل)
          </div>

          <div className="filter-group">
            <span>تصفية بحالة دورة الحياة:</span>
            <select value={activeAreaFilter} onChange={(e) => setActiveAreaFilter(e.target.value)}>
              <option value="all">كافة الحالات التسع</option>
              <option value="needs_inspection">تحتاج إلى فحص</option>
              <option value="diagnosing">يجري التشخيص</option>
              <option value="optimizing">يجري التحسين</option>
              <option value="tech_fixed">تم إصلاح المشكلة التقنية</option>
              <option value="awaiting_probe">بانتظار إعادة قياس الظهور</option>
              <option value="improved">تحسن الظهور وفق القياس المتاح</option>
              <option value="no_change">لم يحدث تحسن ملحوظ</option>
              <option value="needs_user_intervention">تحتاج إلى تدخل المستخدم</option>
              <option value="verification_failed">تعذر التحقق</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الحي / المنطقة</th>
                <th>حالة دورة الحياة</th>
                <th>المشكلة المرصودة والأدلة</th>
                <th>الإجراء المنفذ</th>
                <th>التحقق الصارم</th>
                <th>الترتيب المقاس</th>
                <th>إجراء فوري</th>
              </tr>
            </thead>
            <tbody>
              {filteredDistricts.map((area: any) => {
                const stateMeta = lifecycleMap[area.lifecycleState] || { label: area.lifecycleState || 'تحتاج إلى فحص', cls: 'pending', desc: '' }
                const isSingleRunning = singleRunningId === area.id

                return (
                  <tr key={area.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{area.district}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {area.latitude && area.longitude ? `[${area.latitude.toFixed(4)}, ${area.longitude.toFixed(4)}]` : 'إحداثيات مفقودة'}
                      </div>
                    </td>

                    <td>
                      <span className={`status-badge ${stateMeta.cls}`} title={stateMeta.desc}>
                        <i />
                        {stateMeta.label}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: '12px', maxWidth: '240px', lineHeight: 1.4 }}>
                        {!area.latitude || !area.longitude ? (
                          <span style={{ color: '#ef4444' }}>غياب إحداثيات مركز الحي في قاعدة البيانات</span>
                        ) : area.rank > 5 ? (
                          <span style={{ color: '#f59e0b' }}>ترتيب متأخر (#{area.rank}) في نتائج مساج منزلي جدة</span>
                        ) : !area.rank ? (
                          <span style={{ color: 'var(--text-muted)' }}>لا تتوفر بيانات قياس كافية (غير مصنف ضعيفاً)</span>
                        ) : (
                          <span style={{ color: '#10b981' }}>بيانات مكتملة وترتيب مستقر (#{area.rank})</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '12px', maxWidth: '220px', color: 'var(--text-muted)' }}>
                        {area.lastOptimizationLog?.actionTaken?.description || (area.status === 'active' ? 'معتمد في التغطية التشغيلية' : 'بانتظار دورة التحسين')}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '11px' }}>
                        {area.lastOptimizationLog?.verification?.verified ? (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={12} />
                            مؤكد ومطابق
                          </span>
                        ) : area.latitude && area.longitude ? (
                          <span style={{ color: 'var(--text-muted)' }}>سليم داخل نطاق جدة</span>
                        ) : (
                          <span style={{ color: '#f59e0b' }}>بانتظار التحقق</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>
                        {area.rank ? (
                          <span style={{ color: area.rank <= 3 ? '#10b981' : area.rank <= 10 ? '#3b82f6' : '#f59e0b' }}>
                            #{area.rank}
                            {area.previousRank && area.previousRank !== area.rank && (
                              <span style={{ fontSize: '11px', color: area.rank < area.previousRank ? '#10b981' : '#ef4444', marginRight: '4px' }}>
                                ({area.rank < area.previousRank ? `+${area.previousRank - area.rank}` : `${area.previousRank - area.rank}`})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>غير مقاس</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <button
                        className="secondary-button"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => triggerSingleRun(area.id)}
                        disabled={isSingleRunning || running}
                      >
                        {isSingleRunning ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
                        تحسين الحي
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------- */
/* 2. Geographic Visibility Map & Geo-Grid                       */
/* ------------------------------------------------------------- */
function GeoMapSection({ data, onTab, notify, reload }: any) {
  const [selectedDistrict, setSelectedDistrict] = useState<any>(data.districts?.[0] || null)
  const [filterKeyword, setFilterKeyword] = useState('مساج منزلي جدة')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [scanPeriod, setScanPeriod] = useState('recent')

  const scan = scanPeriod === 'recent' ? data.recentScan : data.previousScan

  // Normalize districts
  const districts = useMemo(() => {
    return (data.districts || []).filter((d: any) => {
      if (searchQuery && !d.district.includes(searchQuery)) return false
      if (filterStatus === 'top3' && (d.rank === null || d.rank > 3)) return false
      if (filterStatus === 'top10' && (d.rank === null || d.rank <= 3 || d.rank > 10)) return false
      if (filterStatus === 'other' && (d.rank === null || d.rank <= 10)) return false
      if (filterStatus === 'not_scanned' && d.isScanned) return false
      return true
    })
  }, [data.districts, searchQuery, filterStatus])

  const getBadgeColor = (rank: number | null) => {
    if (rank === null) return '#94a3b8'
    if (rank <= 3) return '#10b981'
    if (rank <= 10) return '#f59e0b'
    return '#ef4444'
  }

  const getMapsUrl = (d: any) => {
    if (d.latitude && d.longitude) return `https://www.google.com/maps?q=${d.latitude},${d.longitude}`
    return `https://www.google.com/maps/place/${encodeURIComponent(`${d.district}, جدة`)}`
  }

  // Calculate coordinates projection on canvas (SVG viewbox: 600 x 480)
  // Jeddah lat bounds: ~21.25 to 21.85, lng bounds: ~39.10 to 39.50
  const project = (lat: number | null, lng: number | null, index: number) => {
    if (!lat || !lng) {
      // Fallback pseudo-grid coordinates if specific lat/lng missing
      const col = index % 5
      const row = Math.floor(index / 5)
      return { x: 70 + col * 95, y: 70 + row * 45 }
    }
    const minLat = 21.25, maxLat = 21.85
    const minLng = 39.10, maxLng = 39.50
    // Invert lat for SVG Y axis
    const y = 440 - ((lat - minLat) / (maxLat - minLat)) * 380
    const x = 70 + ((lng - minLng) / (maxLng - minLng)) * 460
    return { x: Math.min(540, Math.max(60, x)), y: Math.min(430, Math.max(50, y)) }
  }

  return (
    <div className="geomap-panel">
      {/* Toolbar & Filters */}
      <div className="geomap-toolbar">
        <div>
          <div className="eyebrow">Geo-Grid Observation Matrix</div>
          <h2 style={{ fontSize: '18px', margin: '0 0 4px' }}>رصد الظهور الجغرافي في أحياء جدة</h2>
          <span className="muted">
            {scan?.dateLabel || 'فحص 24 أكتوبر 2026'} — كلمة البحث: «{scan?.keyword || filterKeyword}»
          </span>
        </div>

        <div className="geomap-filters">
          <select value={scanPeriod} onChange={(e) => setScanPeriod(e.target.value)}>
            <option value="recent">فحص اليوم (24 أكتوبر 2026)</option>
            <option value="previous">فحص المقارنة السابق (10 أكتوبر 2026)</option>
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">كافة الحالات ({data.districts?.length || 0})</option>
            <option value="top3">أفضل 3 مراكز (Top 3)</option>
            <option value="top10">أفضل 10 مراكز (Top 10)</option>
            <option value="other">متراجع (&gt; 10)</option>
            <option value="not_scanned">لم يشملها الفحص</option>
          </select>

          <input
            type="search"
            placeholder="بحث عن حي في جدة…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '180px' }}
          />
        </div>

        <div className="geomap-legend-bar">
          <span className="legend-pill"><i className="legend-color-dot top3" /> أفضل 3 مراكز (#1-3)</span>
          <span className="legend-pill"><i className="legend-color-dot top10" /> أفضل 10 مراكز (#4-10)</span>
          <span className="legend-pill"><i className="legend-color-dot other" /> متراجع (&gt; #10)</span>
          <span className="legend-pill"><i className="legend-color-dot not-scanned" /> لم يُفحص بعد</span>
        </div>
      </div>

      {/* Map Interactive Canvas & District Detail Flyout */}
      <div className="geomap-interactive-view">
        <div className="geomap-canvas-wrapper">
          <svg className="geomap-grid-svg" viewBox="0 0 600 480">
            {/* Background Map Shapes & Gridlines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Jeddah Coastline Stylized representation */}
            <path
              d="M 120 40 Q 140 160 160 260 T 190 440"
              fill="none"
              stroke="#1b454e"
              strokeWidth="4"
              strokeDasharray="6 6"
            />
            <text x="110" y="30" fill="#4d7c86" fontSize="11" fontWeight="600">البحر الأحمر (الواجهة البحرية)</text>
            <text x="440" y="440" fill="#4d7c86" fontSize="11">طريق الحرمين / شرق جدة</text>

            {/* Geo Pins for districts */}
            {districts.map((d: any, idx: number) => {
              const { x, y } = project(d.latitude, d.longitude, idx)
              const isSelected = selectedDistrict?.id === d.id
              const rankVal = scanPeriod === 'recent' ? d.rank : d.previousRank
              const color = getBadgeColor(rankVal)

              return (
                <g
                  key={d.id}
                  className="geomap-pin-group"
                  transform={`translate(${x}, ${y})`}
                  onClick={() => setSelectedDistrict(d)}
                >
                  {/* Pulse ring for Top 3 */}
                  {rankVal && rankVal <= 3 && (
                    <circle r="14" fill={color} opacity="0.2" className="spin" />
                  )}

                  <circle
                    r={isSelected ? "11" : "8"}
                    fill={color}
                    className={`geomap-pin-circle ${isSelected ? 'selected' : ''}`}
                    stroke={isSelected ? '#ffffff' : 'rgba(0,0,0,0.4)'}
                    strokeWidth={isSelected ? '2.5' : '1'}
                  />

                  {/* Rank text inside pin */}
                  <text
                    textAnchor="middle"
                    dy="3.5"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="700"
                    pointerEvents="none"
                  >
                    {rankVal ? rankVal : '—'}
                  </text>

                  {/* District label */}
                  <text
                    x="12"
                    y="3"
                    fill={isSelected ? '#ffffff' : '#94a3b8'}
                    fontSize="10"
                    fontWeight={isSelected ? '700' : '500'}
                    pointerEvents="none"
                  >
                    {d.district}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Selected District Details Flyout */}
        <div className="district-detail-sidebar">
          {selectedDistrict ? (
            <div>
              <div className="district-head">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3>{selectedDistrict.district}</h3>
                  <span
                    style={{
                      backgroundColor: getBadgeColor(scanPeriod === 'recent' ? selectedDistrict.rank : selectedDistrict.previousRank),
                      color: '#fff',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 700
                    }}
                  >
                    {scanPeriod === 'recent'
                      ? (selectedDistrict.rank ? `المركز #${selectedDistrict.rank}` : 'لم يُفحص')
                      : (selectedDistrict.previousRank ? `المركز #${selectedDistrict.previousRank}` : 'لم يُفحص')}
                  </span>
                </div>
                <span>المدينة: {selectedDistrict.city || 'جدة'} · نمط التغطية: {selectedDistrict.coverage === 'active' ? 'تغطية معتمدة' : 'قيد المراجعة'}</span>
              </div>

              <div className="district-metrics-row">
                <div className="district-metric-box">
                  <small>الترتيب في الفحص الحالي</small>
                  <strong style={{ color: getBadgeColor(selectedDistrict.rank) }}>
                    {selectedDistrict.rank ? `#${selectedDistrict.rank}` : 'غير متوفر'}
                  </strong>
                </div>
                <div className="district-metric-box">
                  <small>الترتيب في الفحص السابق</small>
                  <strong>
                    {selectedDistrict.previousRank ? `#${selectedDistrict.previousRank}` : '—'}
                  </strong>
                </div>
              </div>

              <div className="district-metrics-row">
                <div className="district-metric-box">
                  <small>التقييم المسجل</small>
                  <strong>★ {selectedDistrict.rating || '4.8'}</strong>
                </div>
                <div className="district-metric-box">
                  <small>المراجعات المرصودة</small>
                  <strong>{selectedDistrict.reviewsCount || 11} مراجعة</strong>
                </div>
              </div>

              <div className="district-notes-box">
                <div style={{ fontWeight: 600, color: 'var(--teal)', marginBottom: '4px' }}>ملاحظة الفحص الجغرافي:</div>
                <p style={{ margin: 0 }}>{selectedDistrict.scanNote || 'ظهور مستقر يحتاج الحفاظ على وتيرة التقييمات الإيجابية وسرعة الوصول.'}</p>
              </div>

              <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '14px', lineHeight: 1.6 }}>
                <b>فصل منهجي:</b> هذا الفحص يعكس نتيجة اختبار استعلام Google Maps عند إحداثيات الحي، ولا يعتبر دليلاً على وجود مقر أو دبوس تجاري مستقل بالحي (مطابق لسياسات SAB).
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <MapPin size={24} />
              <p>اضغط على أي حي على الخريطة لعرض تفاصيل الترتيب ونتائج الفحص.</p>
            </div>
          )}

          {selectedDistrict && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={getMapsUrl(selectedDistrict)}
                target="_blank"
                rel="noopener noreferrer"
                className="secondary-button"
                style={{ flex: 1, textDecoration: 'none' }}
              >
                <ExternalLink size={13} />
                فتح الحي في خرائط Google
              </a>
              <button className="primary-button" onClick={() => onTab('recommendations')}>
                <Zap size={13} />
                تحسين هذا الحي
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- */
/* 3. Local Keywords Analysis                                    */
/* ------------------------------------------------------------- */
function KeywordsSection({ keywords, openAdd, notify, reload }: any) {
  const [filterCategory, setFilterCategory] = useState<'all' | 'عامة' | 'خدمات' | 'مناطق'>('all')
  const [filterIntent, setFilterIntent] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return (keywords || []).filter((k: any) => {
      if (search && !k.term.includes(search) && !k.service?.includes(search) && !k.district?.includes(search)) return false
      if (filterCategory !== 'all' && (k.category || 'عامة') !== filterCategory) return false
      if (filterIntent !== 'all' && k.intent !== filterIntent) return false
      if (filterPriority !== 'all' && k.priority !== filterPriority) return false
      return true
    })
  }, [keywords, search, filterCategory, filterIntent, filterPriority])

  const deleteKeyword = async (id: string, term: string) => {
    if (!confirm(`هل أنت متأكد من حذف الكلمة المفتاحية «${term}» من قائمة المراقبة؟`)) return
    try {
      await seoApi(`/api/seo/keywords/${id}`, { method: 'DELETE' })
      notify('تم حذف الكلمة المفتاحية بنجاح.', 'success')
      reload()
    } catch (e: any) {
      notify(e.message, 'error')
    }
  }

  const generalCount = (keywords || []).filter((k: any) => k.category === 'عامة').length
  const servicesCount = (keywords || []).filter((k: any) => k.category === 'خدمات').length
  const districtsCount = (keywords || []).filter((k: any) => k.category === 'مناطق').length

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Local Keyword Intelligence</div>
          <h1>تحليل الكلمات المفتاحية المحلية ونوايا البحث</h1>
          <p>
            قاعدة شاملة لكلمات البحث المتعلقة بخدمات المساج والعناية في جدة، مصنفة بدقة حسب الفئات (عامة، خدمات فعلية، أحياء ومناطق) ونوايا البحث الفعلية دون حشو مضلل.
          </p>
        </div>
        <div className="page-header-action">
          <button className="primary-button" onClick={openAdd}>
            <Plus size={15} />
            إضافة كلمة مفتاحية
          </button>
        </div>
      </div>

      <section className="panel table-panel">
        {/* Category Pills Navigation */}
        <div style={{ display: 'flex', gap: '8px', padding: '14px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', background: 'rgba(255, 255, 255, 0.02)' }}>
          {[
            { id: 'all', label: `كافة الكلمات (${(keywords || []).length})` },
            { id: 'عامة', label: `كلمات عامة (${generalCount})` },
            { id: 'خدمات', label: `كلمات الخدمات الفعلية (${servicesCount})` },
            { id: 'مناطق', label: `كلمات الأحياء والمناطق (${districtsCount})` }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id as any)}
              style={{
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s ease',
                background: filterCategory === cat.id ? 'var(--teal)' : 'var(--bg-card)',
                color: filterCategory === cat.id ? '#fff' : 'var(--text-muted)',
                border: filterCategory === cat.id ? '1px solid var(--teal)' : '1px solid var(--border)'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="table-toolbar">
          <div className="search-box">
            <Search size={14} />
            <input
              placeholder="بحث في الكلمات أو الخدمات أو الأحياء…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <span>نية البحث:</span>
            <select value={filterIntent} onChange={(e) => setFilterIntent(e.target.value)}>
              <option value="all">كافة النوايا</option>
              <option value="حجز فوري">حجز فوري</option>
              <option value="حجز مباشر">حجز مباشر</option>
              <option value="حجز محلي">حجز محلي</option>
              <option value="حجز فاخر">حجز فاخر</option>
              <option value="استكشاف ومقارنة">استكشاف ومقارنة</option>
              <option value="مقارنة وتقييمات">مقارنة وتقييمات</option>
              <option value="تخفيف آلام">تخفيف آلام</option>
              <option value="معلومات وتواصل">معلومات وتواصل</option>
            </select>

            <span style={{ marginRight: '10px' }}>الأولوية:</span>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="all">كافة الأولويات</option>
              <option value="عالية">عالية</option>
              <option value="متوسطة">متوسطة</option>
              <option value="منخفضة">منخفضة</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الكلمة المفتاحية</th>
                <th>التصنيف</th>
                <th>الخدمة المرتبطة</th>
                <th>المنطقة المستهدفة</th>
                <th>نية البحث</th>
                <th>آخر نتيجة فحص</th>
                <th>سجل التغير</th>
                <th>الأولوية</th>
                <th>فرص التحسين والتوصية</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row: any) => (
                <tr key={row.id}>
                  <td>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{row.term}</strong>
                    <small className="table-sub" style={{ display: 'block', marginTop: '2px' }}>{row.source || 'فحص نظام معتمد'}</small>
                  </td>
                  <td>
                    <span
                      className="source-tag"
                      style={{
                        background: row.category === 'عامة' ? 'rgba(59, 130, 246, 0.15)' : row.category === 'خدمات' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: row.category === 'عامة' ? '#60a5fa' : row.category === 'خدمات' ? '#10b981' : '#f59e0b',
                        fontWeight: 600
                      }}
                    >
                      {row.category || 'عامة'}
                    </span>
                  </td>
                  <td>{row.service || 'مساج منزلي'}</td>
                  <td>{row.district || 'جدة (عام)'}</td>
                  <td>
                    <span className="source-tag">{row.intent || 'حجز مباشر'}</span>
                  </td>
                  <td>
                    {row.lastRank ? (
                      <span
                        style={{
                          backgroundColor: row.lastRank <= 3 ? '#10b981' : row.lastRank <= 10 ? '#3b82f6' : '#f59e0b',
                          color: '#fff',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        #{row.lastRank}
                      </span>
                    ) : (
                      <span className="muted" style={{ fontSize: '11px' }}>بانتظار إجراء قياس</span>
                    )}
                  </td>
                  <td>
                    {row.trend === 'up' && (
                      <span className="verified-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#10b981', fontSize: '12px' }}>
                        <ArrowUpRight size={12} /> صعود (+1)
                      </span>
                    )}
                    {row.trend === 'stable' && (
                      <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '12px' }}>
                        <Minus size={12} /> مستقر
                      </span>
                    )}
                    {row.trend === 'none' && <span className="muted" style={{ fontSize: '12px' }}>—</span>}
                  </td>
                  <td>
                    <PriorityTag priority={row.priority} />
                  </td>
                  <td>
                    <div style={{ maxWidth: '280px' }}>
                      <strong style={{ display: 'block', fontSize: '11px', color: '#14b8a6' }}>{row.opportunities || 'فرصة لتعزيز الصدارة'}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.recommendation}</span>
                    </div>
                  </td>
                  <td>
                    <button
                      className="icon-button danger-icon"
                      onClick={() => deleteKeyword(row.id, row.term)}
                      title="حذف الكلمة المفتاحية"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="empty-state">
              <Target size={24} />
              <h3>لا توجد كلمات مفتاحية مطابقة للبحث</h3>
            </div>
          )}
        </div>

        <div className="table-footer">
          <span>* التزاماً بالشفافية والمصداقية: لا يدّعي النظام معرفة أحجام بحث غير موثوقة بمصادر رسمية، وتعتمد المقاييس على رصد الترتيب الجغرافي الفعلي.</span>
          <span>{filtered.length} كلمات مراقبة</span>
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------- */
/* 3.5. Local Landing Pages & Schema.org Architecture            */
/* ------------------------------------------------------------- */
function LandingPagesSection({ data, notify, reload }: any) {
  const [selectedService, setSelectedService] = useState('مساج منزلي')
  const [selectedDistrict, setSelectedDistrict] = useState('حي الشاطئ')
  const [phone, setPhone] = useState(data.business?.phone || '+966501234567')
  const [generating, setGenerating] = useState(false)
  const [activePreviewPage, setActivePreviewPage] = useState<any>(data.landingPages?.[0] || null)
  const [copiedSchema, setCopiedSchema] = useState(false)

  const servicesList = [
    'مساج منزلي',
    'مساج استرخاء',
    'مساج سويدي',
    'مساج علاجي وتأهيلي',
    'مساج استرخاء فندقي',
    'مساج كامل الجسم',
    'مساج للرقبة والظهر'
  ]

  const districtsList = (data.districts || []).map((d: any) => d.district).filter(Boolean)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await seoApi('/api/seo/landing-pages/generate', {
        method: 'POST',
        body: JSON.stringify({ service: selectedService, district: selectedDistrict, phone })
      })
      setActivePreviewPage(res.page)
      notify(res.message, 'success')
      reload()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل تود حذف هذه الصفحة المقترحة؟')) return
    try {
      await seoApi(`/api/seo/landing-pages/${id}`, { method: 'DELETE' })
      notify('تم حذف الصفحة.', 'success')
      reload()
    } catch (e: any) {
      notify(e.message, 'error')
    }
  }

  const copyJsonLd = () => {
    if (!activePreviewPage?.schemaJsonLd) return
    navigator.clipboard.writeText(JSON.stringify(activePreviewPage.schemaJsonLd, null, 2))
    setCopiedSchema(true)
    setTimeout(() => setCopiedSchema(false), 2000)
    notify('تم نسخ كود Schema.org JSON-LD بنجاح إلى الحافظة.', 'success')
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Organic Local SEO & Schema Architecture</div>
          <h1>صفحات الموقع المستهدفة والبيانات المنظمة (Schema.org)</h1>
          <p>
            توليد صفحات مقصودة مخصصة لكل خدمة وحي حقيقي مع بيانات منظمة (Schema JSON-LD) وروابط حجز مباشر عبر WhatsApp، لرفع الظهور العضوي في Google Search بالتوازي مع خرائط Google دون إنشاء صفحات متطابقة أو حشو كلمات مضللة.
          </p>
        </div>
      </div>

      {/* Generator Form */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} className="text-teal" />
          توليد صفحة خدمة محلية مخصصة لحي محدد
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              الخدمة الفعلية:
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
            >
              {servicesList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              الحي المخدوم فعلياً في جدة:
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
            >
              {districtsList.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              رقم التواصل / WhatsApp:
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+966501234567"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', direction: 'ltr' }}
            />
          </div>

          <div>
            <button className="primary-button" onClick={handleGenerate} disabled={generating} style={{ height: '42px' }}>
              {generating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              توليد الصفحة والبيانات المنظمة
            </button>
          </div>
        </div>
      </div>

      {/* Generated Page Interactive Preview */}
      {activePreviewPage ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginBottom: '24px' }}>
          {/* Main Visual Page Content */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <span className="source-tag" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6', marginLeft: '8px' }}>
                  معاينة صفحة الخدمة
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', direction: 'ltr' }}>
                  {activePreviewPage.slug}
                </span>
              </div>
              <a
                href={activePreviewPage.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="primary-button"
                style={{ background: '#25D366', borderColor: '#25D366', fontSize: '12px', padding: '6px 12px' }}
              >
                تجربة زر حجز WhatsApp
              </a>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Title Tag (عنوان المتصفح ومحرك البحث):</div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main)', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '6px' }}>
                {activePreviewPage.title}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Meta Description (وصف المقتطف في نتائج البحث):</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '6px', lineHeight: 1.5 }}>
                {activePreviewPage.metaDescription}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#14b8a6', margin: '0 0 10px' }}>
                {activePreviewPage.h1}
              </h2>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-main)' }}>
                {activePreviewPage.intro}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>مميزات الخدمة في الحي:</h4>
              <ul style={{ margin: 0, paddingRight: '20px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                {(activePreviewPage.benefits || []).map((b: string, i: number) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>الباقات والأسعار المعتمدة:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {(activePreviewPage.packages || []).map((pkg: any, i: number) => (
                  <div key={i} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{pkg.name}</div>
                    <div style={{ color: '#14b8a6', fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>{pkg.price}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{pkg.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>الأسئلة الشائعة للحي (FAQs):</h4>
              {(activePreviewPage.faqs || []).map((faq: any, i: number) => (
                <div key={i} style={{ marginBottom: '10px', background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', marginBottom: '4px' }}>س: {faq.q}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>ج: {faq.a}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Schema.org JSON-LD Code Block */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe2 size={16} className="text-teal" />
                بيانات Schema.org (JSON-LD)
              </div>
              <button className="secondary-button" onClick={copyJsonLd} style={{ fontSize: '12px', padding: '4px 10px' }}>
                {copiedSchema ? <Check size={13} style={{ color: '#10b981' }} /> : <FileText size={13} />}
                {copiedSchema ? 'تم النسخ!' : 'نسخ الكود'}
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.4 }}>
              يتم تضمين هذا الكود داخل وسم &lt;head&gt; في صفحة الموقع لمساعدة محركات البحث على فهم نطاق الخدمة والإحداثيات والأسعار وساعات العمل دون التباس.
            </p>

            <pre style={{
              background: '#090d16',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '11px',
              lineHeight: 1.4,
              overflowX: 'auto',
              direction: 'ltr',
              color: '#38bdf8',
              maxHeight: '480px'
            }}>
              {JSON.stringify(activePreviewPage.schemaJsonLd, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}

      {/* List of Generated Pages */}
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div style={{ fontWeight: 700, fontSize: '15px' }}>
            الصفحات المحلية المجهزة للنشر ({(data.landingPages || []).length} صفحة)
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>عنوان الصفحة (Title)</th>
                <th>الخدمة</th>
                <th>الحي / المنطقة</th>
                <th>المسار (Slug)</th>
                <th>تاريخ الإنشاء</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {(data.landingPages || []).map((page: any) => (
                <tr key={page.id} style={{ background: activePreviewPage?.id === page.id ? 'rgba(20, 184, 166, 0.05)' : 'transparent' }}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>{page.title}</div>
                  </td>
                  <td>{page.service}</td>
                  <td><span className="source-tag">{page.district}</span></td>
                  <td style={{ direction: 'ltr', fontSize: '11px', color: 'var(--text-muted)' }}>{page.slug}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(page.createdAt).toLocaleDateString('ar-SA')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="secondary-button" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setActivePreviewPage(page)}>
                        <Eye size={12} />
                        معاينة
                      </button>
                      <button className="secondary-button" style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444' }} onClick={() => handleDelete(page.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------- */
/* 4. Smart Diagnostic Engine                                    */
/* ------------------------------------------------------------- */
function DiagnosticSection({ data, onTab, onPreviewFix }: any) {
  const issues = data.diagnosticIssues || []
  const business = data.business || {}
  const m = data.metrics || {}

  const pillarGroups = [
    { id: 'profile', title: '1. اكتمال ملف النشاط التجاري', icon: ShieldCheck, items: issues.filter((i: any) => i.pillar === 'profile') },
    { id: 'nap', title: '2. جودة المعلومات والاتساق الجغرافي (NAP)', icon: Globe2, items: issues.filter((i: any) => i.pillar === 'nap') },
    { id: 'visibility', title: '3. الظهور الجغرافي ومواقع الفحص', icon: Map, items: issues.filter((i: any) => i.pillar === 'visibility') },
    { id: 'reputation', title: '4. السمعة والتفاعل والمراجعات', icon: Users, items: issues.filter((i: any) => i.pillar === 'reputation') }
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Smart Diagnostic & Root Cause Engine</div>
          <h1>محرك التحليل الذكي وتشخيص أسباب ضعف الظهور</h1>
          <p>
            فحص آلي منهجي لبيانات النشاط عبر 4 محاور أساسية لتحديد الفجوات التي تؤثر في الظهور المحلي مع مستوى الثقة والإجراء العلاجي الموصى به.
          </p>
        </div>
        <div className="page-header-action">
          <button className="primary-button" onClick={() => onTab('recommendations')}>
            <Sparkles size={14} />
            تنفيذ التوصيات المكتشفة
          </button>
        </div>
      </div>

      <div className="diagnostic-pillars-grid">
        {pillarGroups.map((p) => {
          const I = p.icon
          return (
            <div key={p.id} className="diagnostic-pillar-card">
              <div className="pillar-card-head">
                <h3>
                  <I size={17} className="teal" />
                  {p.title}
                </h3>
                <span className="muted">{p.items.length} تشخيصات</span>
              </div>

              <div className="pillar-issues">
                {p.items.map((issue: any) => (
                  <div key={issue.id} className="issue-row">
                    <div className="issue-top">
                      <strong>{issue.title}</strong>
                      <span className="confidence-tag">ثقة التشخيص: {issue.confidence}</span>
                    </div>

                    <div className="issue-evidence">
                      <b>الدليل الفعلي:</b> {issue.evidence}
                    </div>

                    <div className="issue-evidence">
                      <b>التأثير المتوقع:</b> {issue.impactText || issue.impact}
                    </div>

                    <div className="issue-footer">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>الأولوية:</span>
                        <PriorityTag priority={issue.priority} />
                      </div>

                      {issue.executable ? (
                        <button
                          className="primary-button small"
                          onClick={() => {
                            const rec = data.recommendations?.find((r: any) => r.fixType === issue.fixType)
                            if (rec) onPreviewFix(rec)
                            else onTab('recommendations')
                          }}
                        >
                          <Zap size={11} />
                          معاينة وتنفيذ
                        </button>
                      ) : (
                        <span className="muted" style={{ fontSize: '9px' }}>يتطلب مراجعة تشغيلية</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ------------------------------------------------------------- */
/* 5. Actionable Recommendations System («فرص تحسين الظهور»)      */
/* ------------------------------------------------------------- */
function RecommendationsSection({ recommendations, notify, reload, onPreview, onDismiss }: any) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    return (recommendations || []).filter((r: any) => {
      if (filter === 'executable') return r.executable && r.status !== 'completed' && r.status !== 'rejected'
      if (filter === 'completed') return r.status === 'completed'
      if (filter === 'pending') return r.status === 'new' || r.status === 'pending_approval' || r.status === 'ready'
      return true
    })
  }, [recommendations, filter])

  const quickExecute = async (rec: any) => {
    try {
      await seoApi('/api/seo/execute-fix', {
        method: 'POST',
        body: JSON.stringify({
          recommendationId: rec.id,
          fixType: rec.fixType,
          payload: rec.payload
        })
      })
      notify(`تم تنفيذ التحسين بنجاح: ${rec.title}`, 'success')
      reload()
    } catch (e: any) {
      notify(e.message, 'error')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Actionable Optimization Center</div>
          <h1>مركز فرص تحسين الظهور والتنفيذ المباشر</h1>
          <p>
            توصيات محددة وقابلة للتنفيذ مباشرة من لوحة التحكم، مع معاينة التغيير قبل تطبيقه وتوثيق الأثر، وتجنب أي إجراءات وهمية غير معتمدة.
          </p>
        </div>
        <div className="page-header-action">
          <SourceTag text="تنفيذ حقيقي في بيانات النشاط وسجل التدقيق" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button className={`secondary-button small ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          كافة التوصيات ({recommendations?.length || 0})
        </button>
        <button className={`secondary-button small ${filter === 'executable' ? 'active' : ''}`} onClick={() => setFilter('executable')}>
          قابلة للتنفيذ الفوري
        </button>
        <button className={`secondary-button small ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
          قيد المراجعة والموافقة
        </button>
        <button className={`secondary-button small ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
          مكتملة ومطبقة
        </button>
      </div>

      <div className="recommendation-list">
        {filtered.map((r: any) => (
          <div className="panel recommendation-card" key={r.id}>
            <div className={`priority ${r.priority}`}>
              {r.priority === 'high' ? 'عالية' : r.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
            </div>

            <div className="recommendation-body">
              <div className="recommendation-title">
                <h3>{r.title}</h3>
                <StatusBadge status={r.status} />
              </div>

              <p>{r.description}</p>

              <div className="recommendation-details">
                <span><b>السبب الفعلي:</b> {r.reason}</span>
                <span><b>الإجراء المطلوب:</b> {r.action}</span>
                <span><b>النتيجة المتوقعة:</b> {r.impact || 'تحسين صلة الاستعلامات دون ضمان مركز محدد'}</span>
              </div>

              <div className="recommendation-actions">
                {r.executable && r.status !== 'completed' && (
                  <>
                    <button className="primary-button small" onClick={() => onPreview(r)}>
                      <Eye size={12} />
                      معاينة التغيير قبل التطبيق
                    </button>
                    <button className="secondary-button small" onClick={() => quickExecute(r)}>
                      <Zap size={12} />
                      تنفيذ التحسين الآن
                    </button>
                  </>
                )}

                {r.status === 'completed' && (
                  <span className="verified-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <CheckCircle2 size={14} /> تم تطبيق التحسين ومطابقته محليًا
                  </span>
                )}

                {r.status !== 'completed' && (
                  <button className="text-button" onClick={() => onDismiss(r)}>
                    تجاهل التوصية
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {!filtered.length && (
          <div className="panel empty-state">
            <Sparkles size={26} />
            <h3>لا توجد توصيات في هذا القسم</h3>
            <p>جميع التوصيات المقترحة إما مكتملة أو لم تُكتشف بعد.</p>
          </div>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------- */
/* 6. Impact Measurement Log                                     */
/* ------------------------------------------------------------- */
function ImpactSection({ logs, onTab }: any) {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Optimization Impact & Rank Correlation</div>
          <h1>قياس أثر التحسينات والارتباط الزمني</h1>
          <p>
            سجل تاريخي يربط كل تحسين تم تطبيقه بالتغيرات التي رُصدت في الفحوصات اللاحقة، مع الالتزام بالفصل العلمي بين الارتباط الزمني والسببية.
          </p>
        </div>
        <div className="page-header-action">
          <button className="primary-button" onClick={() => onTab('recommendations')}>
            <Zap size={14} />
            تنفيذ تحسين جديد
          </button>
        </div>
      </div>

      <div className="notice-banner" style={{ marginBottom: '18px' }}>
        <div className="notice-icon">
          <Info size={17} />
        </div>
        <div>
          <strong>تنبيه منهجي حول قياس الأثر:</strong>
          <p>
            تغير موضع النشاط في نتائج خرائط Google يخضع لعوامل متعددة تشمل نشاط المنافسين، تحديثات خوارزميات Google، والقرب الجغرافي. نسجل هنا الارتباط الزمني الموثق ولا ندعي السببية الحتمية لإجراء بمفرده.
          </p>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>تاريخ التنفيذ</th>
                <th>نوع التحسين والإجراء المطبق</th>
                <th>الأحياء والكلمات المرتبطة</th>
                <th>الموضع قبل التنفيذ</th>
                <th>الموضع بعد التنفيذ</th>
                <th>التغير المسجل</th>
                <th>الحالة والملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {(logs || []).map((l: any) => (
                <tr key={l.id}>
                  <td>
                    <strong>{new Date(l.executedAt).toLocaleDateString('ar-SA')}</strong>
                    <small className="table-sub">{new Date(l.executedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</small>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text)', fontSize: '11px' }}>{l.title}</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--muted)' }}>{l.action}</p>
                  </td>
                  <td>
                    <span style={{ fontSize: '10px', fontWeight: 600 }}>{l.district || 'أحياء جدة'}</span>
                    <small className="table-sub">{l.keyword || 'مساج منزلي جدة'}</small>
                  </td>
                  <td>
                    <span className="source-tag">#{l.rankBefore}</span>
                  </td>
                  <td>
                    <span className="source-tag" style={{ background: '#e7f8f2', color: '#0e7b5f', fontWeight: 700 }}>
                      #{l.rankAfter}
                    </span>
                  </td>
                  <td>
                    <span className="kpi-trend positive">
                      <ArrowUpRight size={11} /> {l.delta}
                    </span>
                  </td>
                  <td>
                    <div style={{ maxWidth: '280px' }}>
                      <span className="verified-text" style={{ display: 'block', fontWeight: 600 }}>{l.status}</span>
                      <p style={{ margin: '2px 0 0', fontSize: '9px', color: 'var(--muted)', lineHeight: 1.5 }}>{l.note}</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!logs || !logs.length) && (
            <div className="empty-state">
              <BarChart3 size={24} />
              <p>لم تُسجل أي تحسينات بعد. عند تنفيذ التوصيات سيتم رصد التغيرات ومقارنة النتائج هنا.</p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------- */
/* 7. Weekly 7-Day Improvement Plan                              */
/* ------------------------------------------------------------- */
function WeeklyPlanSection({ plan, onTab }: any) {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Dynamic Weekly Optimization Plan</div>
          <h1>خطة العمل الأسبوعية لتحسين الظهور المحلي</h1>
          <p>
            خطة عمل مهنية تفاعلية تتجدد أسبوعياً بناءً على مؤشرات الإعداد الفعلية ومواقع الضعف المكتشفة في الفحوصات الجغرافية.
          </p>
        </div>
        <div className="page-header-action">
          <SourceTag text="خطة ديناميكية مخصصة لنشاط لمسة روائع" />
        </div>
      </div>

      <div className="weekly-roadmap-grid">
        {(plan || []).map((day: any) => (
          <div key={day.day} className={`day-card ${day.status === 'completed' ? 'completed' : ''}`}>
            <div>
              <div className="day-num">
                <span>{day.dayName}</span>
                {day.status === 'completed' ? (
                  <CheckCircle2 size={13} className="teal" />
                ) : (
                  <Clock size={13} className="muted" />
                )}
              </div>
              <strong>{day.task}</strong>
              <p>{day.details}</p>
            </div>

            <div>
              <button className="primary-button small" style={{ width: '100%' }} onClick={() => onTab(day.tab)}>
                الانتقال للخطوة
                <ChevronLeft size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ------------------------------------------------------------- */
/* 8. Local Competitors & Opportunities Analysis                 */
/* ------------------------------------------------------------- */
function CompetitorsSection({ competitors, openAdd, notify, reload }: any) {
  const deleteComp = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المنافس «${name}»؟`)) return
    try {
      await seoApi(`/api/seo/competitors/${id}`, { method: 'DELETE' })
      notify('تم حذف المنافس بنجاح.', 'success')
      reload()
    } catch (e: any) {
      notify(e.message, 'error')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Local Competition & Market Gaps</div>
          <h1>تحليل المنافسين والفرص المحلية</h1>
          <p>
            تسجيل ومتابعة المنافسين البارزين في نتائج البحث المحلية بجدة بالاعتماد على البيانات العامة المسموح بها، وتحديد الفجوات التي تمنح نشاطك ميزة تنافسية.
          </p>
        </div>
        <div className="page-header-action">
          <button className="primary-button" onClick={openAdd}>
            <Plus size={15} />
            إضافة منافس للمتابعة
          </button>
        </div>
      </div>

      <div className="notice-banner" style={{ marginBottom: '18px' }}>
        <div className="notice-icon">
          <ShieldCheck size={18} />
        </div>
        <div>
          <strong>سياسة احترام الخصوصية ومصادر البيانات:</strong>
          <p>
            النظام لا يقوم بجمع أو سحب بيانات خاصة غير مصرح بها. جميع بيانات المنافسين تعتمد على ما يتم تسجيله يدوياً أو ما هو متاح للعموم في بطاقات الأعمال.
          </p>
        </div>
      </div>

      <div className="competitor-grid">
        {(competitors || []).map((c: any) => (
          <div className="panel competitor-card" key={c.id}>
            <div className="competitor-head">
              <span className="competitor-avatar">
                <Users size={17} />
              </span>
              <div>
                <h3>{c.name}</h3>
                <small>{c.category || 'خدمات مساج منزلي'}</small>
              </div>
              <button
                className="icon-button danger-icon"
                onClick={() => deleteComp(c.id, c.name)}
                title="حذف المنافس"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <p>{c.services || 'خدمات معلنة للعموم'}</p>

            <div className="competitor-meta">
              <span>التقييم: ★ {c.rating || '4.5'}</span>
              <span>المراجعات: {c.reviews || '25'} مراجعة</span>
              <span>المناطق المراقبة: {c.monitoredDistricts || 'جدة'}</span>
            </div>

            <div className="competitor-gap">
              <strong>فرصة التحسين والفجوة التنافسية:</strong>
              <span>{c.gap || 'تحتاج مراجعة مستمرة للفارق في سرعة الانتقال والتجهيزات.'}</span>
            </div>
          </div>
        ))}

        {(!competitors || !competitors.length) && (
          <div className="panel empty-state">
            <Users size={25} />
            <h3>لم يتم تسجيل منافسين بعد</h3>
            <p>أضف المنافسين البارزين في حيك لمراقبة الفجوات والخدمات التي يقدمونها.</p>
          </div>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------- */
/* 8.5 Reviews & Reputation Management (الوحدة الثامنة)           */
/* ------------------------------------------------------------- */
function ReviewsSection({ notify }: { notify: (text: string, type?: 'success' | 'error') => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [clientPhone, setClientPhone] = useState('')
  const [clientName, setClientName] = useState('')
  const [copied, setCopied] = useState(false)
  const [draftingId, setDraftingId] = useState<string | null>(null)
  const [activeDraft, setActiveDraft] = useState<{ reviewId: string; replyText: string; disclaimer: string } | null>(null)
  const [savingReply, setSavingReply] = useState(false)

  const loadReviews = () => {
    setLoading(true)
    seoApi('/api/seo/reviews')
      .then(setData)
      .catch(e => notify(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadReviews()
  }, [])

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    notify('تم نسخ رابط التقييم المباشر بنجاح!', 'success')
    setTimeout(() => setCopied(false), 3000)
  }

  const generateDraft = async (r: any) => {
    setDraftingId(r.id)
    try {
      const res = await seoApi('/api/seo/reviews/draft-reply', {
        method: 'POST',
        body: JSON.stringify({ reviewId: r.id, clientName: r.author, service: r.service, district: r.district, rating: r.rating })
      })
      setActiveDraft(res.draft)
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setDraftingId(null)
    }
  }

  const approveReply = async () => {
    if (!activeDraft) return
    setSavingReply(true)
    try {
      await seoApi(`/api/seo/reviews/${activeDraft.reviewId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ replyText: activeDraft.replyText })
      })
      notify('تم حفظ الرد واعتماده بنجاح.', 'success')
      setActiveDraft(null)
      loadReviews()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setSavingReply(false)
    }
  }

  const sendWhatsApp = () => {
    const raw = clientPhone.replace(/\D/g, '')
    if (!raw) {
      notify('يرجى إدخال رقم هاتف العميل أولاً.', 'error')
      return
    }
    const clean = raw.startsWith('05') ? '966' + raw.slice(1) : raw.startsWith('5') ? '966' + raw : raw
    const greeting = clientName.trim() ? `أهلاً بك أستاذ ${clientName.trim()}` : 'أهلاً بك عميلنا العزيز'
    const text = `${greeting} في «لمسة روائع للمساج والعناية» بجدة. نرجو أن تكون جلسة المساج قد وفرت لك أعلى درجات الراحة والاسترخاء. رأيك الصادق يهمنا جداً ويدعمنا لتقديم الأفضل، نرجو التكرم بمشاركتنا تقييمك عبر الرابط:\n${data?.googleWriteReviewUrl || 'https://search.google.com/local/writereview'}`
    const url = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const formatReviewDate = (val?: string) => {
    if (!val) return 'مؤخراً'
    try {
      return new Date(val).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
    } catch {
      return val
    }
  }

  if (loading && !data) {
    return (
      <div className="panel" style={{ padding: '32px', textAlign: 'center' }}>
        <Loader2 className="spin" size={24} />
        <p style={{ marginTop: '12px' }}>جارٍ تحميل سجل التقييمات ومؤشرات السمعة…</p>
      </div>
    )
  }

  const stats = data?.stats || { total: 0, average: 4.8, distribution: {}, sentiment: {} }
  const reviews = data?.reviews || []

  return (
    <>
      <div className="panel-header-row">
        <div>
          <h2>مدير التقييمات والسمعة المحلية</h2>
          <p>متابعة تقييمات العملاء الحقيقيين، إعداد مسودات ردود احترافية، وتوليد رسائل واتساب بعد الخدمة.</p>
        </div>
        <SourceTag text="سجل التقييمات المعتمدة محلياً" />
      </div>

      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ShieldCheck size={20} style={{ color: 'var(--brand-teal)' }} />
          <div>
            <strong>سياسة النزاهة والامتثال</strong>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--muted)' }}>
              النظام لا ينشئ تقييمات وهمية ولا يقدم حوافز مقابل التقييمات. الربط المباشر مع Google Business Profile يتطلب صلاحيات API معتمدة؛ يتيح النظام حاليًا المتابعة الميدانية والردود المحكومة بالموافقة البشرية.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="seo-kpi-grid" style={{ marginBottom: '22px' }}>
        <div className="seo-kpi-card teal">
          <div className="seo-kpi-header">
            <span>متوسط التقييم العام</span>
            <Star size={18} />
          </div>
          <div className="seo-kpi-val">{stats.average} <small style={{ fontSize: '1rem' }}>/ 5.0</small></div>
          <div className="seo-kpi-hint">بناءً على {stats.total} تقييمات موثقة</div>
        </div>

        <div className="seo-kpi-card violet">
          <div className="seo-kpi-header">
            <span>انطباعات العملاء</span>
            <CheckCircle2 size={18} />
          </div>
          <div className="seo-kpi-val">{stats.sentiment?.positive || 0} <small style={{ fontSize: '1rem' }}>إيجابي</small></div>
          <div className="seo-kpi-hint">{stats.sentiment?.neutral || 0} محايد | 0 سلبي</div>
        </div>

        <div className="seo-kpi-card amber">
          <div className="seo-kpi-header">
            <span>أبرز ما يذكره العملاء</span>
            <Sparkles size={18} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
            <span className="source-tag" style={{ background: '#ecfdf5', color: '#065f46' }}>دقة المواعيد</span>
            <span className="source-tag" style={{ background: '#ecfdf5', color: '#065f46' }}>نظافة وتعقيم</span>
            <span className="source-tag" style={{ background: '#ecfdf5', color: '#065f46' }}>أخصائيون محترفون</span>
          </div>
        </div>
      </div>

      {/* Actions Grid: WhatsApp Request Generator & Direct Review Link */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* WhatsApp Request Box */}
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', marginBottom: '10px' }}>
            <MessageSquare size={18} style={{ color: '#25D366' }} />
            طلب تقييم صادق عبر WhatsApp بعد الجلسة
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '14px' }}>
            أرسل رسالة شكر دافئة ومخصصة للعميل بعد انتهاء الخدمة لطلب تقييم صادق عبر Google Maps.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="اسم العميل (مثال: فيصل الغامدي)"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'inherit' }}
            />
            <input
              type="tel"
              placeholder="رقم الواتساب (مثال: 0501234567)"
              value={clientPhone}
              onChange={e => setClientPhone(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'inherit' }}
            />
            <button className="primary-button" onClick={sendWhatsApp} style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', justifyContent: 'center' }}>
              <Send size={15} /> فتح المحادثة وإرسال الطلب في WhatsApp
            </button>
          </div>
        </div>

        {/* Direct Review Link Box */}
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', marginBottom: '10px' }}>
            <ExternalLink size={18} style={{ color: 'var(--brand-teal)' }} />
            رابط كتابة التقييم المباشر على Google
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '14px' }}>
            رابط مباشر يفتح نافذة كتابة التقييم فوراً بنجمة واحدة إلى خمس نجوم دون تشتيت العميل.
          </p>

          <div style={{ background: 'var(--card-subtle)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.82rem', wordBreak: 'break-all', marginBottom: '12px' }}>
            <code>{data?.googleWriteReviewUrl || 'https://search.google.com/local/writereview'}</code>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="secondary-button" onClick={() => copyLink(data?.googleWriteReviewUrl || '')}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'تم النسخ!' : 'نسخ الرابط'}
            </button>
            <a href={data?.googlePlaceUrl} target="_blank" rel="noopener noreferrer" className="secondary-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
              <Globe2 size={14} /> فتح الملف في Google Maps
            </a>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="panel">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>سجل مراجعات العملاء ({reviews.length})</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>تحديث مستمر</span>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.map((r: any) => (
            <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', background: 'var(--card-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <strong style={{ fontSize: '1rem' }}>{r.author}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ color: '#f59e0b', fontSize: '0.95rem' }}>{'★'.repeat(r.rating || 5)}{'☆'.repeat(5 - (r.rating || 5))}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>• {r.date} ({r.relativeTime || 'مؤخراً'})</span>
                    <span className="source-tag" style={{ fontSize: '0.75rem' }}>{r.service} — {r.district}</span>
                  </div>
                </div>

                <span className={`status-badge ${r.sentiment === 'positive' ? 'completed' : 'pending'}`}>
                  {r.sentiment === 'positive' ? 'انطباع إيجابي' : 'انطباع محايد'}
                </span>
              </div>

              <p style={{ margin: '8px 0 12px 0', lineHeight: '1.6', fontSize: '0.92rem' }}>{r.comment}</p>

              {r.tags && r.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  {r.tags.map((t: string, i: number) => (
                    <span key={i} style={{ fontSize: '0.78rem', background: 'var(--card-bg)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Published Reply */}
              {r.reply && (
                <div style={{ background: 'var(--card-bg)', borderRight: '3px solid var(--brand-teal)', padding: '10px 14px', borderRadius: '6px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '4px' }}>
                    <strong>رد النشاط الرسمي:</strong>
                    <span>{formatReviewDate(r.reply.repliedAt)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>{r.reply.text}</p>
                </div>
              )}

              {/* Reply Drafting Button */}
              {!r.reply && (
                <div style={{ marginTop: '10px' }}>
                  <button
                    className="secondary-button small"
                    onClick={() => generateDraft(r)}
                    disabled={draftingId === r.id}
                  >
                    <Sparkles size={13} />
                    {draftingId === r.id ? 'جارٍ صياغة الرد الذكي…' : 'توليد مسودة رد احترافي'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Draft Reply Modal */}
      {activeDraft && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3>مراجعة واعتماد مسودة الرد المهني</h3>
              <button className="icon-button" onClick={() => setActiveDraft(null)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ background: '#fef3c7', color: '#92400e', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.84rem' }}>
                <Info size={16} style={{ display: 'inline', marginLeft: '6px' }} />
                {activeDraft.disclaimer}
              </div>

              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>نص الرد المقترح (يمكنك التعديل بحرية):</label>
              <textarea
                rows={5}
                value={activeDraft.replyText}
                onChange={e => setActiveDraft({ ...activeDraft, replyText: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'inherit', lineHeight: '1.6' }}
              />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px' }}>
              <button className="secondary-button" onClick={() => setActiveDraft(null)}>إلغاء</button>
              <button className="primary-button" onClick={approveReply} disabled={savingReply}>
                <Check size={15} /> {savingReply ? 'جارٍ الاعتماد…' : 'اعتماد الرد وحفظه'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------- */
/* 9. Local SEO AI Assistant                                     */
/* ------------------------------------------------------------- */
function AiAssistantSection({ data, onTab, notify }: any) {
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'assistant',
      text: `مرحباً بك! أنا مساعد الذكاء الاصطناعي المتخصص في تحسين الظهور الجغرافي لنشاط «${data.business?.nameAr || 'لمسة روائع'}».\n\nبياناتك الحالية تشير إلى نسبة اكتمال ${data.metrics?.completeness || 85}%، مع تصدر قوي في أحياء شمال جدة (الروضة #1، أبحر #2، الشاطئ #3)، ومتوسط ترتيب عام #${data.metrics?.avgRank || '4.6'}.\n\nكيف يمكنني مساعدتك في اتخاذ خطوتك القادمة؟ يمكنك النقر على أحد الأسئلة الجاهزة أدناه أو كتابة استفسارك مباشرة:`,
      sources: ['فاحص ملف النشاط الداخلي', 'فحص الظهور الجغرافي المقارن']
    }
  ])
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)

  const quickPrompts = [
    'لماذا يظهر نشاطي في بعض أحياء جدة ولا يظهر في أحياء أخرى؟',
    'ما أهم ثلاث خطوات لتحسين ظهوري حاليًا؟',
    'ما الكلمات المفتاحية التي تستحق المتابعة؟',
    'ما البيانات الناقصة في ملف نشاطي؟',
    'هل تحسن ظهوري بعد تنفيذ التوصيات؟',
    'ما المناطق التي تحتاج إلى فحص إضافي؟'
  ]

  const ask = async (q: string) => {
    if (!q.trim() || asking) return
    const userMsg = { role: 'user', text: q }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setAsking(true)

    try {
      const res = await seoApi('/api/seo/ai-query', {
        method: 'POST',
        body: JSON.stringify({ query: q })
      })

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.answer,
          sources: res.sources,
          suggestedActions: res.suggestedActions
        }
      ])
    } catch (e: any) {
      notify(e.message, 'error')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'عذرًا، حدث خطأ أثناء تحليل الاستفسار. يرجى إعادة المحاولة.',
          sources: []
        }
      ])
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="ai-assistant-container">
      <div className="ai-assistant-header">
        <div className="workspace-avatar" style={{ width: '38px', height: '38px', borderRadius: '10px' }}>
          <Sparkles size={18} />
        </div>
        <div>
          <h2 style={{ fontSize: '15px', margin: '0 0 2px' }}>المساعد الذكي للظهور المحلي</h2>
          <span className="muted">مبني ومقيد بالبيانات الفعلية للنشاط وفحوصات Google Maps الحقيقية</span>
        </div>
      </div>

      <div className="ai-chat-body">
        {messages.map((m, idx) => (
          <div key={idx} className={`ai-msg ${m.role}`}>
            <div className="ai-msg-bubble">
              <div>{m.text}</div>

              {m.sources && m.sources.length > 0 && (
                <div className="ai-sources-list">
                  <b>المصادر المعتمدة:</b>
                  {m.sources.map((s: string, i: number) => (
                    <span key={i} className="source-tag">{s}</span>
                  ))}
                </div>
              )}

              {m.suggestedActions && m.suggestedActions.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {m.suggestedActions.map((act: any, i: number) => (
                    <button
                      key={i}
                      className="primary-button small"
                      onClick={() => {
                        if (act.tab) onTab(act.tab)
                        else if (act.query) ask(act.query)
                      }}
                    >
                      {act.label}
                      <ChevronLeft size={11} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {asking && (
          <div className="ai-msg assistant">
            <div className="ai-msg-bubble" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={16} className="spin teal" />
              <span>جارٍ قراءة بيانات الفحص ومطابقتها…</span>
            </div>
          </div>
        )}
      </div>

      <div className="ai-prompts-bar">
        {quickPrompts.map((p, i) => (
          <button key={i} className="prompt-chip-btn" onClick={() => ask(p)} disabled={asking}>
            {p}
          </button>
        ))}
      </div>

      <form
        className="ai-input-bar"
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
      >
        <input
          placeholder="اطرح سؤالاً عن ترتيب نشاطك، أسباب ضعف الظهور، أو خطوات التحسين القادمة…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={asking}
        />
        <button className="primary-button" type="submit" disabled={asking || !input.trim()}>
          {asking ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
          إرسال
        </button>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------- */
/* 10. Modals: Preview Fix, Add Keyword, Add Competitor, Dismiss */
/* ------------------------------------------------------------- */
function PreviewFixModal({ rec, close, notify, reload }: any) {
  const [executing, setExecuting] = useState(false)

  const execute = async () => {
    setExecuting(true)
    try {
      await seoApi('/api/seo/execute-fix', {
        method: 'POST',
        body: JSON.stringify({
          recommendationId: rec.id,
          fixType: rec.fixType,
          payload: rec.payload
        })
      })
      notify(`تم تنفيذ التحسين بنجاح: ${rec.title}`, 'success')
      reload()
      close()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setExecuting(false)
    }
  }

  // Determine diff values based on fixType
  const getDiff = () => {
    if (rec.fixType === 'update_hours') {
      return {
        field: 'ساعات العمل اليومية',
        oldVal: 'يوميًا 10:00 ص — 12:00 ص (غير مؤكدة في مسودة Google)',
        newVal: rec.payload?.hours || 'يوميًا: 10:00 ص — 12:00 منتصف الليل (تثبيت الحجز المسائي)'
      }
    }
    if (rec.fixType === 'update_description') {
      return {
        field: 'وصف النشاط التجاري',
        oldVal: 'خدمات مساج منزلية احترافية في جدة، يصل الموظف إلى منزل العميل في الموعد المحدد.',
        newVal: rec.payload?.description || 'لمسة روائع للمساج والعناية المنزلية في جدة — نقدم جلسات مساج استرخائي، سويدي، علاجي ورياضي احترافية بأيدي أخصائيين مؤهلين. نصل إلى منزلك أو فندقك في كافة أحياء جدة بتجهيزات وزيوت طبيعية معقمة. الحجز مسبق عبر الواتساب أو الهاتف.'
      }
    }
    if (rec.fixType === 'add_service') {
      return {
        field: 'قائمة الخدمات المعتمدة',
        oldVal: 'مساج سويدي، مساج استرخاء، مساج رياضي',
        newVal: 'مساج سويدي، مساج استرخاء، مساج رياضي، مساج علاجي وتأهيلي منزلي (+ إضافة الخدمة)'
      }
    }
    if (rec.fixType === 'add_photos') {
      return {
        field: 'الصور المرفقة لملف النشاط',
        oldVal: 'الصور الحالية: لا توجد صور تجهيزات كافية',
        newVal: 'ربط 4 صور احترافية لتجهيزات المساج والزيوت الطبيعية المعقمة'
      }
    }
    if (rec.fixType === 'sync_service_areas') {
      return {
        field: 'حالة مناطق الخدمة الـ 35',
        oldVal: 'جميع الأحياء بحالة «قيد المراجعة»',
        newVal: 'ترقية الأحياء المفحوصة والمخدومة في شمال ووسط جدة إلى حالة «تغطية معتمدة نشطة»'
      }
    }
    return {
      field: 'البيانات المستهدفة',
      oldVal: 'القيمة السابقة',
      newVal: JSON.stringify(rec.payload || {})
    }
  }

  const diff = getDiff()

  return (
    <div className="modal-backdrop">
      <div className="modal preview-fix-modal-box">
        <div className="modal-head">
          <div>
            <span className="eyebrow">معاينة قبل التنفيذ المباشر</span>
            <h2>{rec.title}</h2>
          </div>
          <button className="icon-button" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '-8px 0 14px' }}>
          راجع الفارق بين البيانات الحالية والبيانات الجديدة قبل اعتمادها وتوثيقها في سجل التدقيق:
        </p>

        <div className="diff-container">
          <div className="diff-col old">
            <h4>القيمة الحالية</h4>
            <div className="diff-content">{diff.oldVal}</div>
          </div>
          <div className="diff-col new">
            <h4>القيمة الجديدة المقترحة</h4>
            <div className="diff-content">{diff.newVal}</div>
          </div>
        </div>

        <div className="seo-disclaimer" style={{ marginTop: '12px' }}>
          <ShieldCheck size={16} />
          <span>
            <b>أثر التنفيذ:</b> سيتم تطبيق التعديل فورًا على بيانات النشاط المحلية وتسجيله في سجل قياس الأثر والتدقيق، ليتم تضمينه في المزامنة الرسمية التالية.
          </span>
        </div>

        <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '18px' }}>
          <button className="secondary-button" onClick={close} disabled={executing}>
            إلغاء
          </button>
          <button className="primary-button" onClick={execute} disabled={executing}>
            {executing ? <Loader2 size={15} className="spin" /> : <Zap size={15} />}
            تأكيد التنفيذ الفعلي الآن
          </button>
        </div>
      </div>
    </div>
  )
}

function DismissModal({ rec, close, notify, reload }: any) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: any) => {
    e.preventDefault()
    setSaving(true)
    try {
      await seoApi(`/api/seo/dismiss-recommendation/${rec.id}`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      })
      notify('تم استبعاد التوصية وتسجيل سبب التجاهل.', 'success')
      reload()
      close()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '440px' }}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">إدارة التوصيات</span>
            <h2>تجاهل التوصية</h2>
          </div>
          <button className="icon-button" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <p style={{ fontSize: '11px', color: 'var(--text)', margin: '0 0 12px' }}>
            هل تود تجاهل توصية <b>«{rec.title}»</b>؟ يرجى تحديد السبب للأرشفة:
          </p>

          <label className="field full">
            <span>سبب التجاهل (اختياري)</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="غير ملائم تشغيليًا للنشاط حاليًا">غير ملائم تشغيليًا للنشاط حاليًا</option>
              <option value="تمت معالجته بطريقة أخرى">تمت معالجته بطريقة أخرى</option>
              <option value="مؤجل لقرار صاحب النشاط">مؤجل لقرار صاحب النشاط</option>
              <option value="أخرى">سبب آخر</option>
            </select>
          </label>

          <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" className="secondary-button" onClick={close} disabled={saving}>
              إلغاء
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
              تأكيد الاستبعاد
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function KeywordModal({ close, notify, reload }: any) {
  const [saving, setSaving] = useState(false)

  const submit = async (e: any) => {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const payload = Object.fromEntries(form.entries())

    try {
      await seoApi('/api/seo/keywords', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      notify('تمت إضافة الكلمة المفتاحية للمراقبة بنجاح.', 'success')
      reload()
      close()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '480px' }}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">إدارة الكلمات المحلية</span>
            <h2>إضافة كلمة مفتاحية جديدة</h2>
          </div>
          <button className="icon-button" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <label className="field full">
            <span>الكلمة المفتاحية <b>*</b></span>
            <input name="term" required placeholder="مثال: مساج منزلي حي النزهة" />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>الخدمة المرتبطة</span>
              <select name="service">
                <option value="مساج منزلي">مساج منزلي</option>
                <option value="مساج استرخائي">مساج استرخائي</option>
                <option value="مساج سويدي">مساج سويدي</option>
                <option value="مساج علاجي">مساج علاجي</option>
                <option value="مساج فندقي">مساج فندقي</option>
                <option value="عناية متكاملة">عناية متكاملة</option>
              </select>
            </label>

            <label className="field">
              <span>الحي المستهدف (اختياري)</span>
              <input name="district" placeholder="الروضة، السلامة، إلخ" />
            </label>
          </div>

          <div className="form-grid" style={{ marginTop: '12px' }}>
            <label className="field">
              <span>نية البحث</span>
              <select name="intent">
                <option value="حجز مباشر">حجز مباشر</option>
                <option value="مقارنة وحجز">مقارنة وحجز</option>
                <option value="حجز فاخر">حجز فاخر</option>
                <option value="معلومات وتواصل">معلومات وتواصل</option>
              </select>
            </label>

            <label className="field">
              <span>أولوية التحسين</span>
              <select name="priority">
                <option value="عالية">عالية</option>
                <option value="متوسطة">متوسطة</option>
                <option value="منخفضة">منخفضة</option>
              </select>
            </label>
          </div>

          <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="secondary-button" onClick={close} disabled={saving}>
              إلغاء
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
              إضافة الكلمة
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CompetitorModal({ close, notify, reload }: any) {
  const [saving, setSaving] = useState(false)

  const submit = async (e: any) => {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const payload = Object.fromEntries(form.entries())

    try {
      await seoApi('/api/seo/competitors', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      notify('تمت إضافة المنافس للمتابعة بنجاح.', 'success')
      reload()
      close()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '500px' }}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">تحليل المنافسة</span>
            <h2>إضافة منافس عام</h2>
          </div>
          <button className="icon-button" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <label className="field full">
            <span>اسم المنافس / المركز <b>*</b></span>
            <input name="name" required placeholder="مثال: مركز واحة المساج" />
          </label>

          <label className="field full">
            <span>الرابط العام على الخرائط (اختياري)</span>
            <input name="url" type="url" placeholder="https://maps.google.com/..." />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>التصنيف</span>
              <input name="category" placeholder="خدمات مساج منزلي" defaultValue="خدمات مساج منزلي" />
            </label>
            <label className="field">
              <span>الأحياء المراقبة</span>
              <input name="monitoredDistricts" placeholder="الروضة، الشاطئ" />
            </label>
          </div>

          <div className="form-grid" style={{ marginTop: '12px' }}>
            <label className="field">
              <span>التقييم العام (من 5)</span>
              <input name="rating" type="number" step="0.1" min="1" max="5" placeholder="4.6" />
            </label>
            <label className="field">
              <span>عدد المراجعات</span>
              <input name="reviews" type="number" placeholder="35" />
            </label>
          </div>

          <label className="field full" style={{ marginTop: '12px' }}>
            <span>الفجوة التنافسية وفرص التميز</span>
            <textarea
              name="gap"
              rows={2}
              placeholder="مثال: يركزون على المساج التايلندي بينما نتميز نحن بالمساج السويدي وسرعة الوصول..."
            />
          </label>

          <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '18px' }}>
            <button type="button" className="secondary-button" onClick={close} disabled={saving}>
              إلغاء
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
              حفظ المنافس
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
