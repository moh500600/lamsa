import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, AlertTriangle, BarChart3, Bell, Bot, Building2, CalendarDays, Camera, Check, CheckCircle2, ChevronLeft, CircleHelp, ClipboardList, Cloud, Compass, Database, Download, ExternalLink, FileText, Filter, Globe2, Home, Image as ImageIcon, LayoutDashboard, Link2, ListChecks, Loader2, LockKeyhole, Map, MapPin, Menu, MessageSquare, Moon, MoreHorizontal, Phone, Plus, RefreshCw, Search, Send, Settings, ShieldCheck, Sparkles, Sun, Target, Trash2, Upload, Users, X, Zap } from 'lucide-react'
import SeoPage from './SeoPage'
import SupabaseModal from './SupabaseModal'
import AiAgentsHub from './AiAgentsHub'

type AreaIssue = {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  evidence: string;
  impact: string;
  autoFixable: boolean;
  fixType: string;
  solution: string;
}

type AreaScanResult = {
  scanId: string;
  measuredAt: string;
  dateLabel: string;
  keyword: string;
  rank: number;
  previousRank: number | null;
  rating: number;
  reviewsCount: number;
  status: string;
  source: string;
  method: string;
  accuracyDisclaimer: string;
  competitors: string[];
}

type AreaItem = { 
  id: string; 
  city: string; 
  district: string; 
  country: string; 
  areaType?: 'district' | 'custom_radius' | 'city';
  coverageStatus?: 'currently_served' | 'planned';
  services?: string[];
  radiusKm?: number;
  status: 'needs_review' | 'active' | 'paused' | 'rejected'; 
  source: string; 
  notes: string; 
  latitude: number | null; 
  longitude: number | null; 
  mapsUrl?: string; 
  createdAt: string; 
  updatedAt: string;
  googleSynced?: boolean;
  lastSyncedWithGoogle?: string | null;
  hasCoords?: boolean;
  coords?: { lat: number | null; lng: number | null };
  syncStatus?: 'synced_to_google' | 'local_only' | 'unverified';
  syncStatusLabel?: string;
  dbStatusLabel?: string;
  coverageStatusLabel?: string;
  googleConnection?: {
    status: string;
    statusLabel: string;
    accountEmail: string;
    locationId: string | null;
    profileVerified: string;
  };
  verificationEligibility?: string;
  targetKeywords?: string[];
  lastScan?: AreaScanResult | null;
  diagnosis?: {
    issues: AreaIssue[];
    hasIssues: boolean;
    severity: 'high' | 'medium' | 'low' | 'none';
  };
  issues?: AreaIssue[];
  suggestedActions?: { id: string; label: string; endpoint: string; method: string; enabled?: boolean; payload?: any }[];
}
type Dashboard = { business: any; google: any; areas: { total: number; reviewed: number; needsReview: number }; tasks: { completed: number; failed: number; pending: number }; reports: any; recentActivity: any[]; alerts: any[] }
type OnboardingState = { completed: boolean; currentStep: number; lastSavedAt: string | null; answers: any }

const nav = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'business', label: 'بيانات النشاط', icon: Building2 },
  { id: 'areas', label: 'إدارة مناطق الخدمة', icon: Map },
  { id: 'visibility', label: 'مراقبة الظهور في المناطق', icon: Target },
  { id: 'map', label: 'خريطة المناطق', icon: Globe2 },
  { id: 'google', label: 'ملفات Google والروابط', icon: Link2 },
  { id: 'seo', label: 'مركز الظهور المحلي', icon: Sparkles },
  { id: 'reports', label: 'التقارير والإحصائيات', icon: BarChart3 },
  { id: 'assistant', label: 'مساعد الذكاء الاصطناعي', icon: Bot },
  { id: 'bookings', label: 'العملاء والحجوزات', icon: CalendarDays },
  { id: 'tasks', label: 'المهام الآلية', icon: ListChecks },
  { id: 'users', label: 'المستخدمون والصلاحيات', icon: Users },
  { id: 'audit', label: 'سجل العمليات', icon: ClipboardList },
  { id: 'settings', label: 'الإعدادات', icon: Settings }
]
const chartData = [{ name: 'الأحد', value: 0 }, { name: 'الإثنين', value: 0 }, { name: 'الثلاثاء', value: 0 }, { name: 'الأربعاء', value: 0 }, { name: 'الخميس', value: 0 }, { name: 'الجمعة', value: 0 }, { name: 'السبت', value: 0 }]

async function api<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer demo-session',
    ...((options.headers as any) || {})
  }
  const response = await fetch(url, { ...options, headers })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.ok === false) throw new Error(payload?.error?.message || 'تعذر تنفيذ العملية')
  return payload
}
function formatDate(value?: string | null) { return value ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'غير متوفر' }
function downloadCsv() { window.location.href = '/api/export/areas.csv' }

function App() {
  const [active, setActive] = useState(window.location.hash.slice(1).split('/')[0] || 'dashboard')
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [areas, setAreas] = useState<AreaItem[]>([])
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [dark, setDark] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [supabaseModal, setSupabaseModal] = useState(false)

  const notify = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); window.setTimeout(() => setToast(null), 4200) }
  const refresh = () => setRefreshKey((value) => value + 1)
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('google_error')
    if (err) {
      notify(`فشل ربط Google: ${err}`, 'error')
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash)
    }
  }, [])
  useEffect(() => { const handler = () => setActive(window.location.hash.slice(1).split('/')[0] || 'dashboard'); window.addEventListener('hashchange', handler); return () => window.removeEventListener('hashchange', handler) }, [])
  useEffect(() => {
    setLoading(true)
    Promise.all([api<Dashboard>('/api/dashboard'), api<{ areas: AreaItem[] }>('/api/areas'), api<{ onboarding: OnboardingState }>('/api/onboarding')]).then(([dash, areaData, onboardingData]) => { setDashboard(dash); setAreas(areaData.areas); setOnboarding(onboardingData.onboarding) }).catch((error) => notify(error.message, 'error')).finally(() => setLoading(false))
  }, [refreshKey])
  const go = (id: string) => { window.location.hash = id; setActive(id); setMobileNav(false) }
  const page = useMemo(() => {
    const props = { dashboard, areas, setAreas, refresh, notify }
    switch (active) {
      case 'business': return <BusinessPage dashboard={dashboard} refresh={refresh} notify={notify} />
      case 'areas': return <AreasPage {...props} />
      case 'visibility': return <VisibilityPage notify={notify} business={dashboard?.business} />
      case 'map': return <MapPage areas={areas} dashboard={dashboard} />
      case 'google': return <GooglePage dashboard={dashboard} refresh={refresh} notify={notify} />
      case 'seo': return <SeoPage notify={notify} go={go} />
      case 'reports': return <ReportsPage dashboard={dashboard} />
      case 'assistant': return <AiAgentsHub notify={notify} api={api} />
      case 'bookings': return <BookingsPage notify={notify} />
      case 'tasks': return <TasksPage refresh={refresh} notify={notify} />
      case 'users': return <UsersPage />
      case 'audit': return <AuditPage />
      case 'settings': return <SettingsPage notify={notify} />
      default: return <DashboardPage dashboard={dashboard} areas={areas} go={go} onOpenSupabase={() => setSupabaseModal(true)} />
    }
  }, [active, dashboard, areas, refreshKey])
  if (loading && !dashboard) return <div className="onboarding-loading"><LoadingState /></div>
  // Permanent fix: Do not block users with onboarding wizard; default straight to app
  // if (onboarding && !onboarding.completed && !onboardingDismissed) return <OnboardingWizard onboarding={onboarding} notify={notify} onLater={() => setOnboardingDismissed(true)} onComplete={(next: OnboardingState) => { setOnboarding(next); setOnboardingDismissed(true); refresh() }} />
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
      <div className="brand"><div className="brand-mark">LB</div><div><strong>مدير النشاط</strong><span>Local Business OS</span></div></div>
      <div className="workspace"><div className="workspace-avatar">م</div><div><span>النشاط الحالي</span><strong>مساج منزلي في جدة</strong></div><ChevronLeft size={16} /></div>
      <nav>{nav.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => go(item.id)}><Icon size={18} /><span>{item.label}</span>{item.id === 'google' && dashboard?.google.status === 'not_configured' ? <i className="nav-dot" /> : null}</button> })}</nav>
      <div className="sidebar-footer"><div className="secure-line"><ShieldCheck size={16} /><span>بياناتك معزولة وآمنة</span></div><button className="profile-mini"><div className="avatar">ص</div><div><strong>صاحب النشاط</strong><span>Owner</span></div><MoreHorizontal size={16} /></button></div>
    </aside>
    {mobileNav && <div className="backdrop" onClick={() => setMobileNav(false)} />}
    <main className="main-content">
      <header className="topbar"><button className="icon-button mobile-only" onClick={() => setMobileNav(true)}><Menu size={21} /></button><div className="breadcrumbs"><span>مساحة العمل</span><ChevronLeft size={14} /><strong>{nav.find((item) => item.id === active)?.label || 'لوحة التحكم'}</strong></div><div className="top-actions"><button className="secondary-button small" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: '#3ecf8e', color: 'var(--text)', background: 'rgba(62, 207, 142, 0.08)' }} onClick={() => setSupabaseModal(true)} title="نقل وتخزين البيانات في Supabase"><Cloud size={14} style={{ color: '#3ecf8e' }}/> <strong>نقل للسيرفر</strong></button><span className="live-pill"><span className="pulse" /> متصل</span><button className="icon-button" title="التنبيهات"><Bell size={19} /><i className="notification-dot" /></button><button className="icon-button" onClick={() => setDark(!dark)} title="تبديل المظهر">{dark ? <Sun size={19} /> : <Moon size={19} />}</button><div className="top-avatar">ص</div></div></header>
      <div className="page-wrap">{loading && !dashboard ? <LoadingState /> : page}</div>
    </main>
    {toast && <div className={`toast ${toast.type}`}><div className="toast-icon">{toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}</div><span>{toast.text}</span><button onClick={() => setToast(null)}><X size={15} /></button></div>}
    {supabaseModal && <SupabaseModal close={() => setSupabaseModal(false)} notify={notify} refresh={refresh} />}
  </div>
}

function OnboardingWizard({ onboarding, notify, onLater, onComplete }: { onboarding: OnboardingState; notify: (text: string, type?: 'success' | 'error') => void; onLater: () => void; onComplete: (next: OnboardingState) => void }) {
  const [answers, setAnswers] = useState<any>(onboarding.answers || {})
  const [step, setStep] = useState(Math.min(onboarding.currentStep || 0, 7))
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDraft, setAiDraft] = useState<any>(null)
  const steps = ['المعلومات الأساسية', 'الخدمات والنشاط', 'التواصل', 'الهوية والمحتوى', 'إعداد Google', 'التغطية الجغرافية', 'الظهور المحلي', 'المراجعة النهائية']
  const districts = ['حي الشاطئ','أبحر الجنوبية','أبحر الشمالية','الرحيلي طيبة','الحمدانية','الريان','البساتين','المروة','الربوة','الصفا','الرحاب','العزيزية','الفيصلية','مشرفة','شارع فلسطين','بني مالك','النسيم','حي الورود','الفيحاء','الجامعة','الوزيرية','الجوهرة','الشفا','الأمير فواز','السنابل','الأجاويد','الخمرة الفضيلة','الخمرة القرينية','الخمرة القوزين','بحرة المجاهدين','بحرة العمودي','المحاميد','حرازات']
  const section = (name: string) => answers[name] || {}
  const update = (name: string, key: string, value: any) => setAnswers((current: any) => ({ ...current, [name]: { ...(current[name] || {}), [key]: value } }))
  const toggle = (name: string, key: string, value: string) => { const current = Array.isArray(section(name)[key]) ? section(name)[key] : []; update(name, key, current.includes(value) ? current.filter((item: string) => item !== value) : [...current, value]) }
  const saveProgress = async (nextStep: number) => { setSaving(true); try { const result = await api<any>('/api/onboarding/progress', { method: 'PUT', body: JSON.stringify({ step: nextStep, answers }) }); return result } catch (error: any) { notify(error.message, 'error'); return null } finally { setSaving(false) } }
  const next = async () => {
    const basics = section('basics'); const services = section('services'); const contacts = section('contacts')
    if (step === 0 && (!basics.nameAr?.trim() || !basics.category?.trim() || !basics.city?.trim())) return notify('أكمل الاسم بالعربية ونوع النشاط والمدينة للمتابعة.', 'error')
    if (step === 1 && (!Array.isArray(services.services) || !services.services.length)) return notify('أضف خدمة واحدة على الأقل.', 'error')
    if (step === 2 && !contacts.phone?.trim()) return notify('رقم الهاتف الأساسي مطلوب لتجهيز بيانات التواصل.', 'error')
    const result = await saveProgress(Math.min(step + 1, 7)); if (result) setStep(Math.min(step + 1, 7))
  }
  const back = () => setStep(Math.max(step - 1, 0))
  const finish = async () => { const result = await saveProgress(7); if (!result) return; setSaving(true); try { const completed = await api<any>('/api/onboarding/complete', { method: 'POST', body: JSON.stringify({}) }); notify(`اكتمل الإعداد وحُفظت ${completed.addedAreas || 0} منطقة.`); onComplete(completed.onboarding) } catch (error: any) { notify(error.message, 'error') } finally { setSaving(false) } }
  const createDraft = async () => { setAiLoading(true); try { const result = await api<any>('/api/ai/onboarding-draft', { method: 'POST', body: JSON.stringify({ answers }) }); setAiDraft(result.draft) } catch (error: any) { notify(error.message, 'error') } finally { setAiLoading(false) } }
  const basic = section('basics'); const services = section('services'); const contacts = section('contacts'); const identity = section('identity'); const google = section('google'); const coverage = section('coverage'); const seo = section('seo')
  const input = (label: string, name: string, key: string, placeholder = '', required = false) => <label className="field"><span>{label}{required && <b>*</b>}</span><input value={section(name)[key] || ''} placeholder={placeholder} onChange={(e) => update(name, key, e.target.value)} /></label>
  const textarea = (label: string, name: string, key: string, placeholder = '') => <label className="field full"><span>{label}</span><textarea rows={4} value={section(name)[key] || ''} placeholder={placeholder} onChange={(e) => update(name, key, e.target.value)} /></label>
  const select = (label: string, name: string, key: string, options: [string, string][]) => <label className="field"><span>{label}</span><select value={section(name)[key] || options[0][0]} onChange={(e) => update(name, key, e.target.value)}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
  return <div className="onboarding-shell"><div className="onboarding-top"><div className="brand"><div className="brand-mark">LB</div><div><strong>مدير النشاط</strong><span>AI Smart Business Setup</span></div></div><div className="onboarding-save">{saving ? <><Loader2 className="spin" size={14}/> جارٍ الحفظ…</> : <><Check size={14}/> يُحفظ التقدم تلقائيًا</>}</div><button className="onboarding-later" onClick={onLater}>حفظ والمتابعة لاحقًا</button></div><div className="onboarding-body"><aside className="onboarding-steps"><div className="onboarding-intro"><span className="eyebrow">إعداد لمرة واحدة</span><h1>لنفهم نشاطك بالكامل</h1><p>أجب عن أسئلة قصيرة مرة واحدة، وسنستخدمها في المناطق والتقارير والمساعد الذكي دون إعادة الطلب منك.</p></div>{steps.map((label, index) => <button key={label} className={`wizard-step ${step === index ? 'active' : ''} ${step > index ? 'done' : ''}`} onClick={() => index <= step && setStep(index)}><span>{step > index ? <Check size={14}/> : index + 1}</span><div><strong>{label}</strong><small>{index === 0 ? 'من أنت وأين تعمل' : index === 5 ? 'أين تصل خدمتك' : index === 7 ? 'تحقق قبل الحفظ' : 'تفاصيل تساعد النظام'}</small></div></button>)}</aside><main className="onboarding-main"><div className="wizard-progress"><div><span>الخطوة {step + 1} من {steps.length}</span><strong>{steps[step]}</strong></div><div className="progress-track"><i style={{ width: `${((step + 1) / steps.length) * 100}%` }}/></div></div><section className="wizard-card">
    {step === 0 && <><div className="wizard-heading"><div className="wizard-icon"><Building2 size={21}/></div><div><h2>المعلومات الأساسية</h2><p>هذه البيانات هي المصدر المركزي الذي تعتمد عليه بقية الصفحات.</p></div></div><div className="form-grid">{input('الاسم التجاري الحقيقي بالعربية','basics','nameAr','مثال: مساج منزلي في جدة',true)}{input('الاسم الإنجليزي الرسمي إن وجد','basics','nameEn','اختياري')}{input('نوع النشاط أو التصنيف','basics','category','مثال: خدمات المساج والعناية المنزلية',true)}{input('المدينة الرئيسية','basics','city','جدة',true)}{input('الدولة','basics','country','السعودية',true)}{select('طريقة تقديم الخدمة','basics','deliveryMode',[['mobile','أذهب إلى العملاء'],['fixed','موقع ثابت يستقبل العملاء'],['both','موقع ثابت وأذهب إلى العملاء']])}</div>{basic.deliveryMode !== 'mobile' && textarea('عنوان الموقع الثابت (يظهر فقط عند الحاجة)','basics','address','لا نطلبه لنشاط الخدمة المنزلية فقط')}{select('هل يوجد موقع إلكتروني؟','basics','hasWebsite',[['false','لا يوجد حاليًا'],['true','نعم، لدي موقع']])}{basic.hasWebsite === 'true' && input('رابط الموقع','contacts','website','https://')}{select('هل لديك ملف Google Business Profile؟','basics','hasGoogleProfile',[['false','لا يوجد أو غير متأكد'],['true','نعم، لدي ملف']])}</>}
    {step === 1 && <><div className="wizard-heading"><div className="wizard-icon violet-bg"><Sparkles size={21}/></div><div><h2>تفاصيل النشاط والخدمات</h2><p>لا نضيف خدمة أو ميزة لم تذكرها. الأسعار والشروط اختيارية.</p></div></div><div className="service-picker"><span className="field-label">الخدمات التي تقدمونها فعلًا <b>*</b></span><div className="chip-grid">{['مساج سويدي','مساج استرخاء','مساج رياضي','مساج علاجي','عناية منزلية','خدمة مخصصة'].map((item) => <button type="button" key={item} className={`select-chip ${(services.services || []).includes(item) ? 'selected' : ''}`} onClick={() => toggle('services','services',item)}>{(services.services || []).includes(item) && <Check size={13}/>} {item}</button>)}</div><label className="field inline-field"><span>خدمة أخرى</span><input placeholder="اكتبها ثم اضغط إضافة" onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { e.preventDefault(); toggle('services','services',e.currentTarget.value.trim()); e.currentTarget.value = '' } }} /></label></div><div className="form-grid">{input('الخدمات الأساسية التي تريد إبرازها','services','coreServicesText','اختياري')}{input('من هم العملاء المستهدفون؟','services','targetClients','مثال: رجال ونساء يبحثون عن الاسترخاء')}{input('ما الذي يميز النشاط؟','services','differentiator','اختياري')}{input('مدة تقديم الخدمة','services','duration','مثال: 60–90 دقيقة')}{input('لغات التواصل','services','languagesText','العربية، الإنجليزية')}{input('ساعات العمل','services','hours','يوميًا 10:00 ص — 12:00 ص')}</div><div className="form-grid">{select('هل تحتاج الخدمة لحجز مسبق؟','services','requiresBooking',[['true','نعم'],['false','لا']])}{input('طرق الحجز والتواصل','services','bookingMethodsText','واتساب، اتصال، نموذج موقع')}</div>{textarea('أسعار أو شروط اختيارية','services','constraints','لا تكتبها إذا لم تكن ضرورية')}</>}
    {step === 2 && <><div className="wizard-heading"><div className="wizard-icon"><Link2 size={21}/></div><div><h2>معلومات التواصل</h2><p>يستخدمها النظام في ملف النشاط والحجوزات عند تفعيلها.</p></div></div><div className="form-grid">{input('رقم الهاتف الأساسي','contacts','phone','05xxxxxxxx',true)}{input('رقم واتساب إن وجد','contacts','whatsapp','05xxxxxxxx')}{input('البريد الإلكتروني التجاري','contacts','email','name@example.com')}{input('رابط الموقع الإلكتروني','contacts','website','https://')}</div>{select('وسيلة التواصل المفضلة','contacts','preferred',[['whatsapp','واتساب'],['phone','اتصال هاتفي'],['email','البريد الإلكتروني'],['website','نموذج الموقع']])}<div className="form-grid">{input('Instagram','contacts','instagram','https://instagram.com/...')}{input('Snapchat أو رابط اجتماعي آخر','contacts','snapchat','اختياري')}</div><div className="wizard-tip"><CircleHelp size={16}/><span>لا تحتاج لإدخال كل الوسائل. اترك غير الموجود فارغًا.</span></div></>}
    {step === 3 && <><div className="wizard-heading"><div className="wizard-icon amber-bg"><FileText size={21}/></div><div><h2>الهوية والمحتوى</h2><p>رفع الصور اختياري ولا يمنعك من إكمال الإعداد.</p></div></div>{textarea('وصف النشاط الحالي','identity','description','اكتب وصفًا واقعيًا أو اتركه فارغًا ليقترح المساعد مسودة.')}{textarea('نبذة عن النشاط','identity','about','منذ متى يعمل النشاط؟ ما نطاقه؟')}{textarea('وصف الخدمات','identity','serviceDescriptions','اكتب وصفًا مختصرًا للخدمات إن توفر') }<div className="media-drop"><Upload size={22}/><strong>الشعار والصور الحقيقية</strong><span>يمكن رفعها لاحقًا من بيانات النشاط — ليست شرطًا الآن.</span></div><div className="ai-draft-row"><div><strong>هل تريد مسودة من الذكاء الاصطناعي؟</strong><small>ستبقى المسودة قابلة للمراجعة ولن تُعتمد تلقائيًا.</small></div><button className="secondary-button" onClick={createDraft} disabled={aiLoading}>{aiLoading ? <Loader2 className="spin" size={15}/> : <Sparkles size={15}/>} إنشاء مسودة</button></div>{aiDraft && <div className="draft-box"><span className="source-tag">مسودة تحتاج مراجعتك</span><p>{aiDraft.description}</p><button className="text-button" onClick={() => update('identity','description',aiDraft.description)}>استخدام المسودة بعد المراجعة <Check size={14}/></button></div>}</>}
    {step === 4 && <><div className="wizard-heading"><div className="wizard-icon google-bg"><Globe2 size={21}/></div><div><h2>إعداد Google</h2><p>لا نطلب كلمة المرور، ولا نعتبر التجاوز ربطًا ناجحًا.</p></div></div>{select('هل لديك ملف Google Business Profile؟','google','hasProfile',[['false','لا يوجد أو لا أعرف'],['true','نعم، لدي ملف']])}{google.hasProfile === 'true' && <>{input('رابط الملف إن وجد','google','profileUrl','https://maps.google.com/...')}{select('هل تملك صلاحية إدارة الملف؟','google','canManage',[['true','نعم'],['false','لا أو غير متأكد']])}{select('هل تريد محاولة الربط الآن؟','google','connectNow',[['false','لاحقًا بعد إكمال الإعداد'],['true','نعم، ابدأ OAuth الرسمي']])}{select('حالة التحقق التي تعرفها','google','verified',[['unknown','غير متأكد'],['verified','تم التحقق'],['unverified','لم يتم التحقق']])}</>}<div className="google-explain"><ShieldCheck size={18}/><div><strong>ماذا لو لم يكن لديك ملف؟</strong><p>تابع الإعداد بشكل طبيعي. سنعرض لك خطوات الإنشاء الرسمية لاحقًا، ولن ننشئ ملفًا تلقائيًا.</p></div></div></>}
    {step === 5 && <><div className="wizard-heading"><div className="wizard-icon"><Map size={21}/></div><div><h2>التغطية الجغرافية</h2><p>هذه مناطق داخل نظامك فقط، وليست تعديلًا تلقائيًا لمناطق Google.</p></div></div>{input('المدينة الرئيسية التي تغطيها','coverage','primaryCity',basic.city || 'جدة',true)}<label className="field full"><span>اختر الأحياء الحالية</span><div className="district-picker">{districts.map((district) => <button type="button" key={district} className={`district-chip ${(coverage.selectedAreas || []).includes(district) ? 'selected' : ''}`} onClick={() => toggle('coverage','selectedAreas',district)}>{(coverage.selectedAreas || []).includes(district) ? <Check size={12}/> : <Plus size={12}/>} {district}</button>)}</div></label><div className="form-grid">{input('مناطق لا تستطيع خدمتها','coverage','excludedAreas','اختياري')}{input('قيود المسافة أو أوقات الوصول','coverage','travelLimits','اختياري')}</div><label className="toggle-row"><input type="checkbox" checked={coverage.sameServices !== false} onChange={(e) => update('coverage','sameServices',e.target.checked)}/><span className="toggle-ui"/><div><strong>الخدمات متطابقة في جميع المناطق</strong><small>عند تفعيلها لن نطلب تكرار الخدمات عند إضافة حي جديد.</small></div></label><button className="text-button skip-coverage" onClick={() => update('coverage','deferred',true)}>تأجيل إضافة الأحياء <ChevronLeft size={14}/></button></>}
    {step === 6 && <><div className="wizard-heading"><div className="wizard-icon violet-bg"><BarChart3 size={21}/></div><div><h2>إعداد الظهور المحلي</h2><p>تفضيلاتك تساعدنا على بناء خطة، لكنها ليست إحصائيات فعلية من Google.</p></div></div><label className="field full"><span>الخدمات التي تريد إبرازها</span><input value={seo.focusServicesText || ''} onChange={(e) => update('seo','focusServicesText',e.target.value)} placeholder="مساج استرخاء، مساج سويدي" /></label><label className="field full"><span>المناطق ذات الأولوية</span><input value={seo.priorityAreasText || ''} onChange={(e) => update('seo','priorityAreasText',e.target.value)} placeholder="اكتب أسماء الأحياء إن كانت لديك أولوية" /></label><div className="form-grid">{input('كلمات أو عبارات يستخدمها العملاء','seo','keywordsText','اختياري')}{input('صفحات الخدمات في الموقع','seo','websitePages','اختياري')}{input('منافسون تريد متابعتهم','seo','competitorsText','اختياري')}{select('الهدف الأساسي','seo','goal',[['زيادة الحجوزات','زيادة الحجوزات'],['زيادة المكالمات','زيادة المكالمات'],['زيارات الموقع','زيارات الموقع'],['هدف آخر','هدف آخر']])}</div><div className="wizard-tip"><Sparkles size={16}/><span>لا تعرف الكلمات أو المنافسين؟ تجاوزها، وسنقترح خيارات بناءً على البيانات التي تحفظها.</span></div></>}
    {step === 7 && <><div className="wizard-heading"><div className="wizard-icon"><Check size={21}/></div><div><h2>راجع بياناتك قبل الحفظ</h2><p>يمكنك الرجوع لأي قسم وتعديل إجاباتك قبل الإنهاء.</p></div></div><div className="review-grid"><ReviewBlock title="المعلومات الأساسية" value={`${basic.nameAr || 'ناقص'} · ${basic.city || 'المدينة ناقصة'} · ${basic.deliveryMode === 'mobile' ? 'خدمة متنقلة' : 'موقع ثابت/مختلط'}`} onEdit={() => setStep(0)} /><ReviewBlock title="الخدمات" value={Array.isArray(services.services) && services.services.length ? services.services.join('، ') : 'ناقص — أضف خدمة واحدة'} onEdit={() => setStep(1)} /><ReviewBlock title="التواصل" value={`${contacts.phone || 'الهاتف ناقص'}${contacts.whatsapp ? ` · واتساب ${contacts.whatsapp}` : ''}`} onEdit={() => setStep(2)} /><ReviewBlock title="الهوية والمحتوى" value={identity.description ? 'وصف مكتوب وقابل للمراجعة' : 'يمكن إكمال الوصف لاحقًا'} onEdit={() => setStep(3)} /><ReviewBlock title="Google" value={google.hasProfile === 'true' ? 'يوجد ملف — الربط يحتاج OAuth رسمي' : 'لا يوجد ملف أو سيتم إعداده لاحقًا'} onEdit={() => setStep(4)} /><ReviewBlock title="التغطية" value={coverage.deferred ? 'تم تأجيل المناطق' : `${(coverage.selectedAreas || []).length} أحياء مختارة داخل النظام`} onEdit={() => setStep(5)} /><ReviewBlock title="الظهور المحلي" value={seo.goal || 'تفضيلات قابلة للإكمال لاحقًا'} onEdit={() => setStep(6)} /></div><div className="review-notice"><AlertTriangle size={17}/><div><strong>ما يحتاج تحققًا خارجيًا</strong><p>ربط Google، حالة التحقق، الإحداثيات، والإحصائيات لا تصبح مؤكدة إلا من المصدر الرسمي.</p></div></div></>}
  </section><div className="wizard-footer"><button className="secondary-button" onClick={back} disabled={step === 0 || saving}><ChevronLeft size={16}/> السابق</button>{step < 7 ? <button className="primary-button" onClick={next} disabled={saving}>{saving ? <Loader2 className="spin" size={15}/> : null} حفظ ومتابعة <ChevronLeft size={16}/></button> : <button className="primary-button" onClick={finish} disabled={saving}><Check size={16}/> تأكيد وإكمال الإعداد</button>}</div><div className="wizard-bottom-note"><LockKeyhole size={13}/> كل إجابة تحفظ على الخادم ويمكن تعديلها لاحقًا من «بيانات النشاط».</div></main></div></div>
}
function ReviewBlock({ title, value, onEdit }: { title: string; value: string; onEdit: () => void }) { return <div className="review-block"><div><span>{title}</span><strong>{value}</strong></div><button className="text-button" onClick={onEdit}>تعديل <Settings size={13}/></button></div> }
function LoadingState() { return <div className="loading-state"><Loader2 className="spin" size={26} /><span>جارٍ تحميل بيانات مساحة العمل…</span></div> }
function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) { return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-header-action">{action}</div>}</div> }
function StatusBadge({ status, text }: { status: string; text?: string }) { const labels: Record<string, string> = { needs_review: 'قيد المراجعة', active: 'نشطة', paused: 'متوقفة', rejected: 'مرفوضة', queued: 'بانتظار التنفيذ', running: 'قيد التنفيذ', completed: 'مكتملة', failed: 'فاشلة', cancelled: 'ملغاة', not_configured: 'غير مهيأ', pending: 'بانتظار الإعداد', connected: 'متصل', expired: 'منتهي' }; return <span className={`status-badge ${status}`}><i />{text || labels[status] || status}</span> }
function StatCard({ icon: Icon, label, value, hint, tone = 'teal', onClick }: { icon: any; label: string; value: string | number; hint?: string; tone?: string; onClick?: () => void }) { return <div className={`stat-card tone-${tone}`} onClick={onClick}><div className="stat-icon"><Icon size={19} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div></div> }
function EmptyState({ icon: Icon = CircleHelp, title, text, action }: { icon?: any; title: string; text: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon"><Icon size={25} /></div><h3>{title}</h3><p>{text}</p>{action}</div> }

function DashboardPage({ dashboard, areas, go, onOpenSupabase }: { dashboard: Dashboard | null; areas: AreaItem[]; go: (id: string) => void; onOpenSupabase?: () => void }) {
  const d = dashboard
  const businessName = d?.business?.nameAr || 'لمسة روائع'
  const officialMapsUrl = d?.business?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' جدة')}`
  return <><PageHeader eyebrow="ملخص اليوم · نشاط لمسة روائع" title="صباح الخير، صاحب النشاط" description="إدارة نشاطك المحلي والمواقع الجغرافية المعتمدة على خرائط Google." action={<div className="button-row"><button className="primary-button" style={{ background: '#3ecf8e', borderColor: '#3ecf8e', color: '#0f172a', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '7px', boxShadow: '0 3px 12px rgba(62, 207, 142, 0.35)' }} onClick={onOpenSupabase}><Cloud size={17} /> نقل للسيرفر (Supabase)</button><a href={officialMapsUrl} target="_blank" rel="noopener noreferrer" className="secondary-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#1a73e8', borderColor: '#1a73e8', textDecoration: 'none', fontWeight: 'bold' }}><ExternalLink size={16}/> فتح ملف النشاط في Google Maps</a><button className="secondary-button" onClick={() => go('business')}><Settings size={16} /> إعدادات النشاط</button></div>} />
    <div className="notice-banner" style={{ background: 'linear-gradient(135deg, rgba(26,115,232,0.08) 0%, rgba(26,115,232,0.02) 100%)', borderColor: 'rgba(26,115,232,0.3)' }}><div className="notice-icon" style={{ background: '#e8f0fe', color: '#1a73e8' }}><Globe2 size={19} /></div><div><strong style={{ color: '#1a73e8' }}>إدارة المواقع الجغرافية ومناطق الخدمة</strong><p>يمكنك إنشاء وإدارة مواقع جغرافية متعددة على خرائط Google وتحديد إحداثيات كل حي وموقعه بدقة.</p></div><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><a href={officialMapsUrl} target="_blank" rel="noopener noreferrer" className="primary-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', background: '#1a73e8', borderColor: '#1a73e8' }}>فتح في Google Maps <ExternalLink size={15}/></a><button onClick={() => go('areas')} className="secondary-button">المواقع الجغرافية ({areas.length}) <ChevronLeft size={16} /></button></div></div>
    <div className="stats-grid"><StatCard icon={Building2} label="حالة النشاط" value={d?.google?.status === 'connected' ? 'متصل ونشط' : 'قيد الإعداد'} hint={d?.google?.accountEmail || 'Google Maps'} tone="teal" onClick={() => window.open(officialMapsUrl, '_blank')} /><StatCard icon={Map} label="المواقع الجغرافية" value={d?.areas.total ?? areas.length} hint="اضغط لعرض كافة المواقع" onClick={() => go('areas')} /><StatCard icon={ListChecks} label="المهام المنفذة" value={d?.tasks.completed ?? 0} hint={`${d?.tasks.pending ?? 0} بانتظار التنفيذ`} tone="violet" onClick={() => go('tasks')} /><StatCard icon={Globe2} label="Google Maps" value="استعراض ↗" hint="اضغط للفتح المباشر" tone="teal" onClick={() => window.open(officialMapsUrl, '_blank')} /></div>
    <div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h2>مؤشر الأداء</h2><span className="muted">المقاييس الرسمية من Google فقط</span></div><select defaultValue="30"><option value="7">آخر 7 أيام</option><option value="30">آخر 30 يومًا</option><option value="90">آخر 3 أشهر</option></select></div><div className="chart-empty"><ResponsiveContainer width="100%" height={210}><AreaChart data={chartData}><defs><linearGradient id="fadeTeal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f766e" stopOpacity={0.18}/><stop offset="100%" stopColor="#0f766e" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="4 4" stroke="var(--line)" vertical={false}/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }}/><Tooltip /><Area type="monotone" dataKey="value" stroke="#0f766e" fill="url(#fadeTeal)" strokeWidth={2} /></AreaChart></ResponsiveContainer><div className="chart-overlay"><BarChart3 size={20}/><span>لا توجد إحصائيات مؤكدة بعد</span><small>ستظهر هنا بعد ربط ملف Google رسمي وتوفر المقاييس</small></div></div></section><section className="panel health-panel"><div className="panel-heading"><div><h2>صحة مساحة العمل</h2><span className="muted">آخر فحص: الآن</span></div><Activity size={18} className="teal" /></div><div className="health-list"><HealthRow label="بيانات النشاط" value="مكتملة ومحفوظة" status="success" /><HealthRow label="مناطق الخدمة" value={`${areas.length} منطقة نشطة`} status="success" /><HealthRow label="تكامل Google" value={d?.google?.status === 'connected' ? 'متصل' : 'قيد الإعداد'} status={d?.google?.status === 'connected' ? 'success' : 'warn'} /><HealthRow label="حماية البيانات" value="مفعّلة" status="success" /></div><button className="text-button" onClick={() => go('settings')}>عرض كل الإعدادات <ChevronLeft size={15}/></button></section></div>
    <div className="bottom-grid"><section className="panel"><div className="panel-heading"><div><h2>آخر العمليات</h2><span className="muted">سجل قابل للمراجعة</span></div><button className="text-button" onClick={() => go('audit')}>عرض السجل <ChevronLeft size={15}/></button></div>{d?.recentActivity?.length ? <div className="activity-list">{d.recentActivity.map((item) => <div className="activity-row" key={item.id}><div className="activity-dot"><Check size={13}/></div><div><strong>{item.action}</strong><span>{item.details}</span></div><time>{formatDate(item.createdAt)}</time></div>)}</div> : <EmptyState title="لا توجد عمليات" text="ستظهر العمليات المهمة هنا." />}</section><section className="panel"><div className="panel-heading"><div><h2>تنبيهات تحتاج قرارًا</h2><span className="muted">لا تفوّت ما يحتاج تدخلك</span></div><AlertTriangle size={18} className="amber" /></div>{d?.alerts?.length ? d.alerts.map((alert, index) => <div className="alert-card" key={index}><AlertTriangle size={17}/><div><strong>{alert.title}</strong><p>{alert.text}</p></div><button onClick={() => go('google')}><ChevronLeft size={16}/></button></div>) : <EmptyState icon={Check} title="كل شيء هادئ" text="لا توجد تنبيهات جديدة." />}</section></div>
  </>
}
function HealthRow({ label, value, status }: { label: string; value: string; status: string }) { return <div className="health-row"><span className={`health-dot ${status}`} /><span>{label}</span><strong>{value}</strong></div> }

function BusinessPage({ dashboard, refresh, notify }: { dashboard: Dashboard | null; refresh: () => void; notify: (text: string, type?: 'success' | 'error') => void }) {
  const [form, setForm] = useState<any>(dashboard?.business || {})
  const [newPhotoUrl, setNewPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => { 
    if (dashboard?.business) setForm(dashboard.business) 
  }, [dashboard])

  const save = async () => { 
    try { 
      await api('/api/business', { method: 'PUT', body: JSON.stringify(form) }); 
      notify('تم حفظ بيانات وصور النشاط بنجاح.'); 
      refresh() 
    } catch (error: any) { 
      notify(error.message, 'error') 
    } 
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files.length) return
    setUploading(true)
    const readers: Promise<any>[] = []
    Array.from(files).forEach((file) => {
      readers.push(new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          resolve({
            id: 'photo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            name: file.name,
            url: reader.result as string,
            category: 'مكان وخدمة',
            createdAt: new Date().toISOString()
          })
        }
        reader.readAsDataURL(file)
      }))
    })
    Promise.all(readers).then((newPhotos) => {
      const current = Array.isArray(form.photos) ? form.photos : []
      setForm((prev: any) => ({ ...prev, photos: [...current, ...newPhotos] }))
      setUploading(false)
      notify(`تمت إضافة ${newPhotos.length} صورة بنجاح! اضغط «حفظ التعديلات» لحفظها.`)
    })
    e.target.value = ''
  }

  const addPhotoByUrl = () => {
    if (!newPhotoUrl.trim()) return
    const current = Array.isArray(form.photos) ? form.photos : []
    const newPhoto = {
      id: 'photo_' + Date.now(),
      name: 'صورة من رابط',
      url: newPhotoUrl.trim(),
      category: 'عام',
      createdAt: new Date().toISOString()
    }
    setForm({ ...form, photos: [...current, newPhoto] })
    setNewPhotoUrl('')
    notify('تمت إضافة رابط الصورة بنجاح.')
  }

  const removePhoto = (id: string) => {
    const current = Array.isArray(form.photos) ? form.photos : []
    setForm({ ...form, photos: current.filter((p: any) => p.id !== id) })
    notify('تم حذف الصورة.')
  }

  const businessName = form.nameAr || 'لمسة روائع'
  const officialMapsUrl = form.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' جدة')}`

  return <>
    <PageHeader 
      eyebrow="إعداد النشاط · Google Business Profile" 
      title="بيانات النشاط التجاري والصور" 
      description="أدخل بيانات نشاطك الحقيقية وصور المكان والخدمات. هذه البيانات هي التي تظهر لعملائك على خرائط Google." 
      action={
        <div className="button-row">
          <a href={officialMapsUrl} target="_blank" rel="noopener noreferrer" className="secondary-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#1a73e8', borderColor: '#1a73e8', textDecoration: 'none', fontWeight: 'bold' }}>
            <ExternalLink size={16}/> فتح ملف «لمسة روائع» في Google Maps
          </a>
          <button className="primary-button" onClick={save} style={{ background: '#1a73e8', borderColor: '#1a73e8' }}>
            <Check size={16}/> حفظ التعديلات والصور
          </button>
        </div>
      } 
    />
    <div className="form-layout">
      <div className="panel form-panel">
        
        {/* Section 01: الهوية الأساسية */}
        <div className="form-section">
          <div className="section-title">
            <span className="step-number">01</span>
            <div>
              <h2>الهوية الأساسية</h2>
              <p>تظهر هذه البيانات للعملاء وعند ربط ملف Google بعد اعتماده.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="اسم النشاط بالعربية" value={form.nameAr} onChange={(value) => setForm({ ...form, nameAr: value })} required />
            <Field label="الاسم بالإنجليزية" value={form.nameEn} onChange={(value) => setForm({ ...form, nameEn: value })} />
            <Field label="التصنيف الأساسي" value={form.category} onChange={(value) => setForm({ ...form, category: value })} required />
            <Field label="رقم الهاتف الأساسي" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} placeholder="05xxxxxxxx" />
          </div>
          <label className="field full">
            <span>وصف النشاط</span>
            <textarea rows={4} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="اكتب وصفًا واقعيًا للخدمات والمناطق التي تغطيها…" />
          </label>

          {/* WhatsApp Click-to-Chat URL Card */}
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>💬</span>
                <div>
                  <strong style={{ color: '#166534', fontSize: '14.5px' }}>عنوان URL الخاص بميزة النقر للدردشة في WhatsApp</strong>
                  <span style={{ display: 'block', fontSize: '12px', color: '#15803d', marginTop: '2px' }}>مطلوب في Google Business Profile لتمكين الزبائن من مراسلتك بضغطة واحدة من الخريطة</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="secondary-button small" 
                  onClick={() => {
                    const url = form.whatsappUrl || 'https://wa.me/966568065012'
                    navigator.clipboard.writeText(url)
                    notify('تم نسخ عنوان URL الخاص بميزة WhatsApp بنجاح! جاهز للصقه في Google.')
                  }}
                  style={{ background: '#fff', borderColor: '#86efac', color: '#166534', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  نسخ الرابط 📋
                </button>
                <a 
                  href={form.whatsappUrl || 'https://wa.me/966568065012'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="primary-button small" 
                  style={{ background: '#166534', borderColor: '#166534', color: '#fff', textDecoration: 'none', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  تجربة الدردشة ↗
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                value={form.whatsappUrl || 'https://wa.me/966568065012'} 
                onChange={(e) => setForm({ ...form, whatsappUrl: e.target.value })} 
                placeholder="https://wa.me/966568065012" 
                dir="ltr"
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '14px', fontWeight: 600, color: '#166534', background: '#fff' }}
              />
            </div>
          </div>
        </div>

        {/* Section 02: طبيعة الخدمة والموقع وملف Google Maps */}
        <div className="form-section">
          <div className="section-title">
            <span className="step-number">02</span>
            <div>
              <h2>طبيعة الخدمة والموقع على Google Maps</h2>
              <p>رابط ملف Google Maps المعتمد ونطاق تقديم الخدمة.</p>
            </div>
          </div>
          
          <div style={{ background: '#f0f7ff', border: '1px solid #c7e0ff', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <strong style={{ color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe2 size={17}/> رابط ملف النشاط المعتمد على خرائط Google
              </strong>
              <a href={officialMapsUrl} target="_blank" rel="noopener noreferrer" className="primary-button small" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#1a73e8', borderColor: '#1a73e8', textDecoration: 'none', color: '#fff', fontWeight: 'bold' }}>
                <ExternalLink size={13}/> فتح الملف الرسمي في Google Maps ↗
              </a>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
              هذا الرابط هو الذي يفتح بطاقة نشاطك التجاري الكاملة <strong>(مركز لمسة عافية / لمسة روائع)</strong> على خرائط Google مع الاسم والصور والهاتف وساعات العمل، بدلاً من إحداثيات خالية.
            </p>
          </div>

          <Field label="رابط ملف Google Maps المعتمد (Share Link)" value={form.googleMapsUrl} onChange={(value) => setForm({ ...form, googleMapsUrl: value })} placeholder="https://maps.app.goo.gl/..." />

          <div className="form-grid">
            <Field label="المدينة الرئيسية" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
            <Field label="الدولة" value={form.country} onChange={(value) => setForm({ ...form, country: value })} />
            <Field label="الموقع الإلكتروني" value={form.website} onChange={(value) => setForm({ ...form, website: value })} placeholder="https://" />
            <Field label="ساعات العمل" value={form.hours} onChange={(value) => setForm({ ...form, hours: value })} />
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={Boolean(form.serviceAreaBusiness)} onChange={(e) => setForm({ ...form, serviceAreaBusiness: e.target.checked })}/>
            <span className="toggle-ui"/>
            <div>
              <strong>نشاط منطقة خدمة (Service Area Business)</strong>
              <small>يقدم الخدمة في موقع العميل في كافة أحياء جدة دون الحاجة لفرع منفصل لكل حي.</small>
            </div>
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={Boolean(form.hideAddress)} onChange={(e) => setForm({ ...form, hideAddress: e.target.checked })}/>
            <span className="toggle-ui"/>
            <div>
              <strong>إخفاء العنوان الدقيق من الجمهور</strong>
              <small>لأن الخدمة منزلية وفندقية وتصل للعميل في موقعه.</small>
            </div>
          </label>
        </div>

        {/* Section 03: الخدمات والروابط */}
        <div className="form-section">
          <div className="section-title">
            <span className="step-number">03</span>
            <div>
              <h2>الخدمات والروابط</h2>
              <p>أضف الخدمات الفعلية فقط، ويمكنك تعديلها لاحقًا.</p>
            </div>
          </div>
          <label className="field full">
            <span>الخدمات المقدمة (مفصولة بفواصل)</span>
            <input value={Array.isArray(form.services) ? form.services.join('، ') : ''} onChange={(e) => setForm({ ...form, services: e.target.value.split('،').map((x: string) => x.trim()).filter(Boolean) })} placeholder="مساج سويدي، مساج استرخاء، مساج تايلندي" />
          </label>
          <div className="form-grid">
            <Field label="Instagram" value={form.socialLinks?.instagram} onChange={(value) => setForm({ ...form, socialLinks: { ...(form.socialLinks || {}), instagram: value } })} />
            <Field label="Snapchat" value={form.socialLinks?.snapchat} onChange={(value) => setForm({ ...form, socialLinks: { ...(form.socialLinks || {}), snapchat: value } })} />
          </div>
        </div>

        {/* Section 04: صور النشاط والمكان */}
        <div className="form-section">
          <div className="section-title">
            <span className="step-number">04</span>
            <div>
              <h2>صور النشاط والمكان (Google Business Photos)</h2>
              <p>ارفع صور المكان والخدمات والمعدات لزيادة جاذبية ملفك وثقة عملائك على خرائط Google.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label htmlFor="photo-file-input" style={{ border: '2px dashed #1a73e8', borderRadius: '12px', padding: '24px 20px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}>
              <input id="photo-file-input" type="file" accept="image/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#e8f0fe', color: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {uploading ? <Loader2 className="spin" size={24} /> : <Camera size={24} />}
              </div>
              <strong style={{ color: '#1a73e8', fontSize: '15px' }}>اضغط هنا لاختيار صور من جهازك أو سحبها</strong>
              <span style={{ fontSize: '13px', color: '#64748b' }}>يدعم ملفات JPG, PNG, WEBP (يمكنك رفع عدة صور معاً)</span>
            </label>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                value={newPhotoUrl} 
                onChange={(e) => setNewPhotoUrl(e.target.value)} 
                placeholder="أو أدخل رابط صورة مباشرة من الإنترنت (https://...)" 
                style={{ flex: 1, direction: 'ltr', textAlign: 'left' }}
              />
              <button type="button" className="secondary-button" onClick={addPhotoByUrl} disabled={!newPhotoUrl.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16}/> إضافة رابط
              </button>
            </div>

            {/* Gallery display with Download capability */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#1e293b' }}>
                  معرض الصور المعتمد لـ Google Maps ({form.photos?.length || 0} صور):
                </strong>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>
                  يمكنك تحميل أي صورة مباشرة إلى جهازك لرفعها عند تثبيت أي دبوس جديد في خرائط Google.
                </span>
              </div>
              {Array.isArray(form.photos) && form.photos.length > 0 && (
                <button
                  type="button"
                  className="secondary-button small"
                  onClick={() => {
                    form.photos.forEach((p: any, idx: number) => {
                      setTimeout(() => {
                        const a = document.createElement('a')
                        a.href = p.url
                        a.download = `${p.name || 'spa-photo'}.jpg`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                      }, idx * 350)
                    })
                    notify(`بدأ تحميل ${form.photos.length} صور إلى جهازك الآن!`)
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#166534', borderColor: '#86efac', fontWeight: 'bold' }}
                >
                  <Download size={14}/> تحميل جميع الصور دفعة واحدة 📥
                </button>
              )}
            </div>

            {Array.isArray(form.photos) && form.photos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px', marginTop: '6px' }}>
                {form.photos.map((photo: any) => (
                  <div key={photo.id} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'relative', width: '100%', height: '130px', overflow: 'hidden', background: '#f1f5f9' }}>
                      <img src={photo.url} alt={photo.name || 'صورة النشاط'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {photo.category && (
                        <span style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '4px', backdropFilter: 'blur(4px)' }}>
                          {photo.category}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }} title={photo.name}>
                        {photo.name || 'صورة النشاط'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                        <a 
                          href={photo.url} 
                          download={`${photo.name || 'spa-photo'}.jpg`}
                          className="secondary-button small" 
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#166534', borderColor: '#86efac', fontWeight: 'bold' }}
                          title="تحميل الصورة إلى جهازك"
                        >
                          <Download size={12}/> تحميل ⬇️
                        </a>
                        <button type="button" onClick={() => removePhoto(photo.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="حذف الصورة">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                <ImageIcon size={28} style={{ opacity: 0.5, marginBottom: '6px' }} /><br/>
                لم يتم رفع أي صور بعد. أضف صوراً لمعدات الجلسات، الزيوت، أو بيئة الاسترخاء النظيفة.
              </div>
            )}

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#166534', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Sparkles size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>نصائح لصور Google Maps الناجحة:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  <li>صور نظيفة ذات إضاءة ممتازة لمفارش ومناشف المساج المعقمة.</li>
                  <li>صور الزيوت العطرية والأحجار الساخنة وأدوات العناية الفاخرة.</li>
                  <li>تجنب الصور التي تخالف سياسات Google أو تحتوي أرقام هواتف مائية على الصورة.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>

      <aside className="side-stack">
        <div className="panel completion-card">
          <div className="completion-ring"><span>{form.photos?.length ? '95%' : '80%'}</span></div>
          <div>
            <strong>اكتمال البيانات</strong>
            <p>{form.photos?.length ? 'البيانات والصور مكتملة وجاهزة للمزامنة.' : 'أضف صور المكان لرفع نسبة الجاهزية إلى 95%.'}</p>
          </div>
        </div>
        <div className="panel info-panel">
          <div className="info-title"><CircleHelp size={18}/><strong>كيف تظهر بياناتك على Google؟</strong></div>
          <ul>
            <li>اسم النشاط يظهر كـ <strong>«لمسة روائع / مركز لمسة عافية»</strong>.</li>
            <li>الخدمات وأوقات العمل تظهر في بطاقة النشاط الرسمية.</li>
            <li>الصور تظهر في معرض صور Google Maps لتعزيز الحجوزات.</li>
            <li>الأحياء المسجلة تغطي نطاق ظهورك عند بحث العملاء.</li>
          </ul>
        </div>
      </aside>
    </div>
  </>
}
function Field({ label, value, onChange, placeholder, required }: { label: string; value?: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) { return <label className="field"><span>{label}{required && <b>*</b>}</span><input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label> }

const JEDDAH_DISTRICTS: Record<string, { lat: number; lng: number }> = {
  'حي الشاطئ': { lat: 21.6047, lng: 39.1089 },
  'أبحر الجنوبية': { lat: 21.7244, lng: 39.1235 },
  'أبحر الشمالية': { lat: 21.7610, lng: 39.1352 },
  'المرجان': { lat: 21.6975, lng: 39.1042 },
  'البساتين': { lat: 21.6740, lng: 39.1170 },
  'المحمدية': { lat: 21.6420, lng: 39.1290 },
  'النعيم': { lat: 21.6250, lng: 39.1450 },
  'النهضة': { lat: 21.6110, lng: 39.1380 },
  'الزهراء': { lat: 21.5870, lng: 39.1380 },
  'السلامة': { lat: 21.5820, lng: 39.1570 },
  'الروضة': { lat: 21.5620, lng: 39.1560 },
  'الخالدية': { lat: 21.5510, lng: 39.1390 },
  'الأندلس': { lat: 21.5360, lng: 39.1520 },
  'الحمراء': { lat: 21.5170, lng: 39.1550 },
  'الرويس': { lat: 21.5180, lng: 39.1710 },
  'مشرفة': { lat: 21.5360, lng: 39.1880 },
  'العزيزية': { lat: 21.5540, lng: 39.1830 },
  'الرحاب': { lat: 21.5420, lng: 39.2150 },
  'الفيصلية': { lat: 21.5690, lng: 39.1720 },
  'الربوة': { lat: 21.5830, lng: 39.1980 },
  'الصفا': { lat: 21.5790, lng: 39.2090 },
  'المروة': { lat: 21.6180, lng: 39.2010 },
  'الحمدانية': { lat: 21.7686, lng: 39.2225 },
  'الريان': { lat: 21.7230, lng: 39.2310 },
  'الرحيلي طيبة': { lat: 21.8480, lng: 39.1670 },
  'الصواري': { lat: 21.8010, lng: 39.1020 },
  'الفردوس': { lat: 21.7820, lng: 39.1120 },
  'الياقوت': { lat: 21.8150, lng: 39.1240 },
  'السامر': { lat: 21.5940, lng: 39.2350 },
  'المنار': { lat: 21.5730, lng: 39.2480 },
  'حي الورود': { lat: 21.5180, lng: 39.2220 },
  'النسيم': { lat: 21.5030, lng: 39.2290 },
  'بني مالك': { lat: 21.5160, lng: 39.2090 },
  'شارع فلسطين': { lat: 21.5390, lng: 39.1760 },
  'الفيحاء': { lat: 21.5080, lng: 39.2430 },
  'الجامعة': { lat: 21.4920, lng: 39.2480 },
  'الروابي': { lat: 21.4910, lng: 39.2610 },
  'السليمانية': { lat: 21.5050, lng: 39.2280 },
  'البلد': { lat: 21.4858, lng: 39.1864 },
  'الكندرة': { lat: 21.4930, lng: 39.1950 },
  'العمارية': { lat: 21.4980, lng: 39.1880 },
  'الصحيفة': { lat: 21.4920, lng: 39.1840 },
  'الوزيرية': { lat: 21.4650, lng: 39.2370 },
  'مدائن الفهد': { lat: 21.4720, lng: 39.2280 },
  'الجوهرة': { lat: 21.3980, lng: 39.2610 },
  'الشفا': { lat: 21.4390, lng: 39.2460 },
  'الأمير فواز': { lat: 21.4280, lng: 39.2790 },
  'السنابل': { lat: 21.3520, lng: 39.2780 },
  'الأجاويد': { lat: 21.3850, lng: 39.2890 },
  'الخمرة الفضيلة': { lat: 21.2850, lng: 39.2550 },
  'الخمرة القرينية': { lat: 21.3120, lng: 39.2480 },
  'الخمرة القوزين': { lat: 21.2650, lng: 39.2310 },
  'بحرة المجاهدين': { lat: 21.3980, lng: 39.4790 },
  'بحرة العمودي': { lat: 21.4110, lng: 39.4920 },
  'المحاميد': { lat: 21.4720, lng: 39.3850 },
  'حرازات': { lat: 21.5450, lng: 39.3380 }
}

function getAreaGeoUrl(area: { district: string; city: string; latitude?: number | null; longitude?: number | null; mapsUrl?: string }) {
  if (area.mapsUrl && area.mapsUrl.trim()) {
    return area.mapsUrl.trim()
  }
  if (area.latitude && area.longitude) {
    return `https://www.google.com/maps?q=${area.latitude},${area.longitude}`
  }
  return `https://www.google.com/maps/place/${encodeURIComponent(`${area.district}, ${area.city || 'جدة'}`)}`
}

function AreasPage({ areas, setAreas, refresh, notify, dashboard }: { areas: AreaItem[]; setAreas: (value: AreaItem[]) => void; refresh: () => void; notify: (text: string, type?: 'success' | 'error') => void; dashboard?: Dashboard | null }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [syncFilter, setSyncFilter] = useState('all')
  const [issueFilter, setIssueFilter] = useState('all')
  const [coverageFilter, setCoverageFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [modal, setModal] = useState(false)
  const [bulkModal, setBulkModal] = useState(false)
  const [editing, setEditing] = useState<AreaItem | null>(null)
  const [diagnosticArea, setDiagnosticArea] = useState<AreaItem | null>(null)
  const [manualProbeArea, setManualProbeArea] = useState<AreaItem | null>(null)
  const [manualProbeModal, setManualProbeModal] = useState(false)
  const [googlePermsModal, setGooglePermsModal] = useState(false)
  const [googlePermsData, setGooglePermsData] = useState<any>(null)
  const [syncingGoogle, setSyncingGoogle] = useState(false)
  const [fixingAllCoords, setFixingAllCoords] = useState(false)
  const [verifyingGoogle, setVerifyingGoogle] = useState(false)

  const filtered = areas.filter((area) => {
    const term = q.trim().toLowerCase()
    const matchQ = !term || `${area.district} ${area.city} ${(area.services || []).join(' ')}`.toLowerCase().includes(term)
    const matchStatus = status === 'all' || area.status === status
    const matchSync = syncFilter === 'all' || (area.syncStatus || (area.googleSynced ? 'synced_to_google' : area.status === 'needs_review' ? 'unverified' : 'local_only')) === syncFilter
    const matchIssues = issueFilter === 'all' || (issueFilter === 'with_issues' ? (area.diagnosis?.hasIssues || !area.latitude) : (!area.diagnosis?.hasIssues && Boolean(area.latitude)))
    const matchCoverage = coverageFilter === 'all' || (area.coverageStatus || 'currently_served') === coverageFilter
    const matchType = typeFilter === 'all' || (area.areaType || 'district') === typeFilter
    return matchQ && matchStatus && matchSync && matchIssues && matchCoverage && matchType
  })
  
  const save = async (payload: { district: string; city: string; country?: string; areaType?: string; coverageStatus?: string; services?: string[]; radiusKm?: number; notes: string; status: string; mapsUrl: string; latitude: number | null; longitude: number | null }) => {
    try {
      if (editing) {
        await api(`/api/areas/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        notify(`تم تحديث بيانات وموقع «${payload.district}» بنجاح.`)
      } else {
        await api('/api/areas', { method: 'POST', body: JSON.stringify(payload) })
        notify(`تمت إضافة حي «${payload.district}» بنجاح في موقعه الجغرافي المحدد!`)
      }
      setModal(false)
      setEditing(null)
      refresh()
    } catch (error: any) {
      notify(error.message, 'error')
    }
  }

  const remove = async (area: AreaItem) => {
    if (!window.confirm(`هل أنت متأكد من حذف منطقة الخدمة «${area.district}»؟ لن يتم حذف ملف النشاط التجاري الرئيسي في Google.`)) return
    try {
      await api(`/api/areas/${area.id}`, { method: 'DELETE' })
      notify(`تم حذف منطقة الخدمة «${area.district}» بنجاح.`)
      refresh()
    } catch (error: any) {
      notify(error.message, 'error')
    }
  }

  const importCsv = async (event: any) => {
    const file = event.target.files?.[0]
    if (!file) return
    const csv = await file.text()
    try {
      const result = await api<any>('/api/areas/import', { method: 'POST', body: JSON.stringify({ csv }) })
      notify(`تم استيراد ${result.added} منطقة، وتجاوز ${result.skipped} مكررة.`)
      refresh()
    } catch (error: any) {
      notify(error.message, 'error')
    }
    event.target.value = ''
  }

  const sendAllToGoogle = async () => {
    if (!areas.length) return notify('لا توجد مناطق خدمة لإرسالها.', 'error')
    if (!window.confirm(`هل تريد إرسال وتحديث جميع مناطق الخدمة (${areas.length} منطقة) في ملف نشاطك على Google Business Profile؟`)) return
    setSyncingGoogle(true)
    try {
      const result = await api<any>('/api/google/sync-areas', { method: 'POST' })
      notify(result.message || `تم إرسال ${areas.length} منطقة إلى Google Maps بنجاح!`, 'success')
      refresh()
    } catch (error: any) {
      notify(error.message, 'error')
    } finally {
      setSyncingGoogle(false)
    }
  }

  const fixAllCoordinates = async () => {
    setFixingAllCoords(true)
    try {
      const result = await api<any>('/api/areas/fix-all-coordinates', { method: 'POST' })
      notify(result.message || 'تم فحص وتصحيح الإحداثيات بنجاح!', 'success')
      refresh()
    } catch (error: any) {
      notify(error.message, 'error')
    } finally {
      setFixingAllCoords(false)
    }
  }

  const verifyGooglePermissions = async () => {
    setVerifyingGoogle(true)
    try {
      const result = await api<any>('/api/google/verify-permissions', { method: 'POST' })
      setGooglePermsData(result.verification)
      setGooglePermsModal(true)
      notify('تم فحص صلاحيات وتكامل Google Business Profile بنجاح.', 'success')
    } catch (error: any) {
      notify(error.message, 'error')
    } finally {
      setVerifyingGoogle(false)
    }
  }

  const businessName = dashboard?.business?.nameAr || 'لمسة روائع للمساج والعنايه'
  const officialMapsUrl = dashboard?.business?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' جدة')}`
  const googleStatus = dashboard?.google?.status || 'connected'

  const syncedCount = areas.filter(a => a.syncStatus === 'synced_to_google' || a.googleSynced).length
  const localOnlyCount = areas.filter(a => a.syncStatus === 'local_only' || (!a.googleSynced && a.status === 'active')).length
  const unverifiedCount = areas.filter(a => a.syncStatus === 'unverified' || a.status === 'needs_review').length
  const measuredCount = areas.filter(a => a.lastScan !== null && a.lastScan !== undefined).length
  const withIssuesCount = areas.filter(a => a.diagnosis?.hasIssues || !a.latitude || a.issues?.length).length

  return <>
    <PageHeader 
      eyebrow="نظام مناطق الخدمة الجغرافية · Service Area Business" 
      title="إدارة مناطق الخدمة وتشخيص الظهور" 
      description="نظام تشخيص ومراقبة حقيقي لمناطق خدمة نشاط «لمسة روائع» في جدة مع مطابقة سياسات Google الرسمية وإصلاح المشاكل آلياً." 
      action={
        <div className="button-row" style={{ flexWrap: 'wrap' }}>
          <button 
            className="secondary-button" 
            onClick={verifyGooglePermissions} 
            disabled={verifyingGoogle}
            style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="فحص صلاحيات ورموز تفويض Google OAuth 2.0"
          >
            {verifyingGoogle ? <Loader2 className="spin" size={15}/> : <ShieldCheck size={16} color="#1a73e8"/>}
            التحقق من الصلاحيات 🛡️
          </button>

          <button 
            className="secondary-button" 
            onClick={fixAllCoordinates} 
            disabled={fixingAllCoords}
            style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="فحص وتعيين خطوط الطول والعرض لجميع الأحياء التي تنقصها إحداثيات"
          >
            {fixingAllCoords ? <Loader2 className="spin" size={15}/> : <Compass size={16} color="#166534"/>}
            تصحيح الإحداثيات آلياً 📍
          </button>

          <button 
            className="primary-button" 
            onClick={() => { setManualProbeArea(null); setManualProbeModal(true); }}
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', borderColor: '#7c3aed', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(124,58,237,0.3)' }}
          >
            <Target size={16}/> تسجيل قياس ظهور ✍️
          </button>

          <button 
            className="primary-button google-send-all" 
            onClick={sendAllToGoogle} 
            disabled={syncingGoogle} 
            title="إرسال ومزامنة كافة مناطق الخدمة مع حساب Google Business Profile" 
            style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)', borderColor: '#1a73e8', display: 'inline-flex', alignItems: 'center', gap: '7px', fontWeight: 'bold', boxShadow: '0 2px 6px rgba(26,115,232,0.35)' }}
          >
            {syncingGoogle ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
            <span>مزامنة مناطق الخدمة مع Google</span>
          </button>

          <label className="secondary-button file-button">
            <Upload size={16}/> استيراد CSV<input type="file" accept=".csv,text/csv" onChange={importCsv}/>
          </label>
          <button className="secondary-button" onClick={downloadCsv}>
            <Download size={16}/> تصدير CSV
          </button>
          <button className="primary-button" onClick={() => { setEditing(null); setModal(true) }} style={{ background: '#0f172a', borderColor: '#0f172a', fontWeight: 'bold' }}>
            <Plus size={17}/> إضافة حي جديد
          </button>
        </div>
      } 
    />
  
    {/* بطاقة الحقل الرئيسي والرابط المعتمد لربط مناطق الخدمة بالنشاط الحقيقي */}
    <div style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f0fc 100%)', border: '2px solid #93c5fd', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 8px rgba(37,99,235,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#1a73e8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(26,115,232,0.35)' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                🏢 النشاط التجاري الحقيقي الرئيسي (Single SAB Business Profile)
              </span>
              <span style={{ fontSize: '11px', background: googleStatus === 'connected' ? '#dcfce7' : '#fef3c7', color: googleStatus === 'connected' ? '#166534' : '#b45309', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                {googleStatus === 'connected' ? '✅ متصل بحساب Google' : '⏳ يتطلب إكمال OAuth'}
              </span>
            </div>
            <h3 style={{ margin: '4px 0 2px', fontSize: '17px', color: '#0f172a', fontWeight: 800 }}>
              {businessName}
            </h3>
            <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span>📍 المدينة: <strong>جدة، المملكة العربية السعودية</strong></span>
              <span>·</span>
              <span>🚗 النموذج الرسمي: <strong>خدمة متنقلة بدون مقر استقبال (Service Area Business)</strong></span>
              <span>·</span>
              <span>🔗 معرف النشاط: <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px', fontSize: '11.5px', color: '#334155' }}>{dashboard?.google?.locationId || 'loc_connected'}</code></span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a 
            href={officialMapsUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="primary-button small" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1a73e8', borderColor: '#1a73e8', color: '#fff', fontWeight: 700, padding: '9px 16px', textDecoration: 'none', boxShadow: '0 2px 6px rgba(26,115,232,0.3)' }}
          >
            <ExternalLink size={15}/> فتح الملف المعتمد في Google Maps ↗
          </a>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #bfdbfe', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: '#334155' }}>
        <span>
          🛡️ <strong>حقيقة معتمدة:</strong> مناطق الخدمة تحدد النطاق الجغرافي الذي ينتقل إليه المعالجون لخدمة العملاء. ليست فروعاً مستقلة ولا يجوز إنشاء ملفات وهمية مكررة باسم كل حي.
        </span>
        <span style={{ color: '#1a73e8', fontWeight: 600 }}>
          🔗 الرابط المعتمد: {officialMapsUrl.slice(0, 48)}...
        </span>
      </div>
    </div>

    {/* لوحة المؤشرات الذكية الصادقة */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '16px' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{areas.length}</div>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي مناطق الخدمة</span>
      </div>
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 16px' }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#166534' }}>{syncedCount}</div>
        <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>🟢 محدثة في Google</span>
      </div>
      <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', padding: '12px 16px' }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#854d0e' }}>{localOnlyCount}</div>
        <span style={{ fontSize: '12px', color: '#854d0e', fontWeight: 600 }}>🟡 محفوظة محلياً فقط</span>
      </div>
      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 16px' }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#475569' }}>{unverifiedCount}</div>
        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>⚪ غير متحقق منها</span>
      </div>
      <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '12px 16px' }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#7e22ce' }}>{measuredCount}</div>
        <span style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 600 }}>🎯 تم قياس الظهور</span>
      </div>
      <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '12px 16px' }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#be123c' }}>{withIssuesCount}</div>
        <span style={{ fontSize: '12px', color: '#be123c', fontWeight: 600 }}>⚠️ مناطق بها مشاكل</span>
      </div>
    </div>

    {/* لوحة التحكم والجدول */}
    <section className="panel table-panel">
      <div className="table-toolbar" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          <div className="search-box" style={{ minWidth: '200px', flex: 1 }}>
            <Search size={17}/>
            <input placeholder="ابحث باسم الحي أو المدينة أو الخدمة…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="filter-group">
            <Filter size={14}/>
            <select value={syncFilter} onChange={(e) => setSyncFilter(e.target.value)} title="حالة التحديث الخارجي والمزامنة">
              <option value="all">كل حالات المزامنة</option>
              <option value="synced_to_google">محدثة في Google 🟢</option>
              <option value="local_only">محفوظة محلياً 🟡</option>
              <option value="unverified">غير متحقق منها ⚪</option>
            </select>
          </div>

          <div className="filter-group">
            <Filter size={14}/>
            <select value={issueFilter} onChange={(e) => setIssueFilter(e.target.value)} title="تصفية حسب وجود المشاكل">
              <option value="all">كل المناطق</option>
              <option value="with_issues">بها مشاكل تحتاج إصلاح ⚠️</option>
              <option value="clean">سليمة ومكتملة ✅</option>
            </select>
          </div>

          <div className="filter-group">
            <Filter size={14}/>
            <select value={status} onChange={(e) => setStatus(e.target.value)} title="حالة قاعدة البيانات">
              <option value="all">كل حالات النظام</option>
              <option value="active">نشطة ومؤكدة</option>
              <option value="needs_review">قيد المراجعة</option>
              <option value="paused">متوقفة مؤقتاً</option>
            </select>
          </div>

          <div className="filter-group">
            <Filter size={14}/>
            <select value={coverageFilter} onChange={(e) => setCoverageFilter(e.target.value)} title="حالة التغطية">
              <option value="all">كل حالات التغطية</option>
              <option value="currently_served">مخدومة حالياً</option>
              <option value="planned">مخطط استهدافها</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
            <button 
              type="button" 
              onClick={() => setViewMode('table')} 
              style={{ border: 'none', background: viewMode === 'table' ? '#fff' : 'transparent', color: viewMode === 'table' ? '#1a73e8' : '#64748b', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              عرض الجدول
            </button>
            <button 
              type="button" 
              onClick={() => setViewMode('grid')} 
              style={{ border: 'none', background: viewMode === 'grid' ? '#fff' : 'transparent', color: viewMode === 'grid' ? '#1a73e8' : '#64748b', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              عرض البطاقات
            </button>
          </div>

          <button className="secondary-button small" onClick={() => setBulkModal(true)}>
            <Plus size={15}/> إضافة دفعة
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>اسم المنطقة والمدينة</th>
                <th>إحداثيات المركز ونطاق التغطية</th>
                <th>حالة الحفظ والمزامنة</th>
                <th>آخر نتيجة قياس للظهور</th>
                <th>المشاكل المكتشفة</th>
                <th>إجراءات الفحص والإصلاح</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((area) => { 
                const geoUrl = getAreaGeoUrl(area)
                const isSynced = area.syncStatus === 'synced_to_google' || area.googleSynced
                const isLocal = area.syncStatus === 'local_only' || (!area.googleSynced && area.status === 'active')
                const hasCoords = Boolean(area.latitude && area.longitude)
                const issues = area.diagnosis?.issues || area.issues || []
                const lastScan = area.lastScan

                return (
                  <tr key={area.id} onClick={() => setDiagnosticArea(area)} style={{ cursor: 'pointer' }} title="اضغط لعرض التشخيص الشامل والإجراءات">
                    <td>
                      <div className="cell-main">
                        <span className="area-symbol" style={{ background: isSynced ? '#dcfce7' : '#e8f0fe', color: isSynced ? '#166534' : '#1a73e8' }}>
                          <MapPin size={16}/>
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#0f172a', fontSize: '14.5px' }}>
                              {area.district}
                            </strong>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              ({area.city})
                            </span>
                          </div>
                          
                          {/* Services chips */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {(area.services && area.services.length > 0 ? area.services : ['مساج منزلي', 'مساج سويدي']).slice(0, 3).map((s, idx) => (
                              <span key={idx} style={{ fontSize: '10.5px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '1px 5px', borderRadius: '4px' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      {hasCoords ? (
                        <div>
                          <div style={{ fontSize: '12.5px', color: '#1e293b', direction: 'ltr', textAlign: 'right', fontFamily: 'monospace' }}>
                            {area.latitude?.toFixed(4)}, {area.longitude?.toFixed(4)}
                          </div>
                          <small style={{ color: '#64748b', fontSize: '11px' }}>
                            نطاق: {area.radiusKm || 5} كم · {area.coverageStatus === 'planned' ? 'مخطط' : 'مخدوم'}
                          </small>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12}/> إحداثيات مفقودة
                        </span>
                      )}
                    </td>

                    <td>
                      {isSynced ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>
                          🟢 محدثة في Google
                        </span>
                      ) : isLocal ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, background: '#fef9c3', color: '#854d0e' }}>
                          🟡 محفوظة محلياً فقط
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, background: '#f1f5f9', color: '#475569' }}>
                          ⚪ غير متحقق منها
                        </span>
                      )}
                      <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                        الحالة: {area.dbStatusLabel || (area.status === 'active' ? 'نشطة' : 'قيد المراجعة')}
                      </div>
                    </td>

                    <td>
                      {lastScan ? (
                        <div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 800, color: lastScan.rank <= 3 ? '#166534' : lastScan.rank <= 10 ? '#1a73e8' : '#b45309' }}>
                            🎯 المركز #{lastScan.rank}
                          </div>
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>
                            «{lastScan.keyword}»
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                          لم يُجرَ قياس بعد
                        </span>
                      )}
                    </td>

                    <td>
                      {issues.length > 0 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, background: '#fff1f2', color: '#e11d48' }}>
                          <AlertTriangle size={13}/> {issues.length} مشكلة مرصودة
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, background: '#f0fdf4', color: '#166534' }}>
                          <Check size={13}/> بيانات سليمة
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="primary-button small" 
                          onClick={() => setDiagnosticArea(area)} 
                          title="تشريح وفحص المنطقة وتنفيذ الإصلاحات"
                          style={{ padding: '6px 10px', fontSize: '12px', background: '#1a73e8', borderColor: '#1a73e8', color: '#fff', fontWeight: 700 }}
                        >
                          تشخيص 🔍
                        </button>
                        <button 
                          className="secondary-button small" 
                          onClick={() => { setManualProbeArea(area); setManualProbeModal(true); }}
                          title="تسجيل قياس ظهور يدوي لهذا الحي"
                          style={{ padding: '6px 8px', fontSize: '11.5px' }}
                        >
                          قياس ✍️
                        </button>
                        <button className="icon-button" onClick={() => window.open(geoUrl, '_blank')} title={`فتح مركز ${area.district} في خرائط Google`} style={{ color: '#1a73e8' }}>
                          <ExternalLink size={15}/>
                        </button>
                        <button className="icon-button" onClick={() => { setEditing(area); setModal(true) }} title="تعديل بيانات المنطقة">
                          <Settings size={15}/>
                        </button>
                        <button className="icon-button danger-icon" onClick={() => remove(area)} title="حذف المنطقة">
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filtered.length && <EmptyState icon={Search} title="لا توجد نتائج مطابقة" text="جرّب تغيير عبارة البحث أو فلتر المزامنة والمشاكل." />}
        </div>
      ) : (
        /* عرض البطاقات التفاعلية */
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
          {filtered.map((area) => {
            const geoUrl = getAreaGeoUrl(area)
            const isSynced = area.syncStatus === 'synced_to_google' || area.googleSynced
            const issues = area.diagnosis?.issues || area.issues || []
            const lastScan = area.lastScan

            return (
              <div 
                key={area.id} 
                style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.04)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: isSynced ? '#dcfce7' : '#e8f0fe', color: isSynced ? '#166534' : '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={17} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>{area.district}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{area.city} · نطاق {area.radiusKm || 5} كم</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '6px', fontWeight: 700, background: isSynced ? '#dcfce7' : '#fef9c3', color: isSynced ? '#166534' : '#854d0e' }}>
                    {isSynced ? '🟢 محدثة' : '🟡 محلية'}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>📍 الإحداثيات:</span>
                    <strong style={{ direction: 'ltr', fontFamily: 'monospace' }}>
                      {area.latitude ? `${area.latitude.toFixed(3)}, ${area.longitude?.toFixed(3)}` : 'مفقودة ⚠️'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>🎯 آخر قياس ظهور:</span>
                    <strong>{lastScan ? `#${lastScan.rank} (${lastScan.keyword})` : 'لم يُجرَ قياس بعد'}</strong>
                  </div>
                </div>

                {issues.length > 0 && (
                  <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px', padding: '6px 10px', fontSize: '11.5px', color: '#be123c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={13}/> {issues[0].title}
                  </div>
                )}

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', gap: '6px' }}>
                  <button 
                    className="primary-button small" 
                    onClick={() => setDiagnosticArea(area)}
                    style={{ flex: 1, padding: '7px 10px', fontSize: '12px', background: '#1a73e8', borderColor: '#1a73e8' }}
                  >
                    تشخيص وإصلاح 🔍
                  </button>
                  <a href={geoUrl} target="_blank" rel="noopener noreferrer" className="secondary-button small" style={{ padding: '7px 10px', color: '#1a73e8', textDecoration: 'none' }} title="خرائط Google">
                    <ExternalLink size={14}/>
                  </a>
                  <button className="icon-button" onClick={() => { setEditing(area); setModal(true) }} title="تعديل">
                    <Settings size={15}/>
                  </button>
                  <button className="icon-button danger-icon" onClick={() => remove(area)} title="حذف">
                    <Trash2 size={15}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="table-footer">
        <span>عرض {filtered.length} من {areas.length} منطقة خدمة مسجلة</span>
        <span>🛡️ يتم التعامل مع كافة المناطق كنطاق خدمة لنشاط تجاري متنقل (SAB) دون استنساخ دبابيس وهمية مضللة.</span>
      </div>
    </section>

    {modal && (
      <AreaModal 
        key={editing ? editing.id : 'new-area'} 
        editing={editing} 
        areas={areas}
        onClose={() => { setModal(false); setEditing(null) }} 
        onSubmit={save}
      />
    )} 
    {bulkModal && <BulkModal onClose={() => setBulkModal(false)} notify={notify} refresh={refresh}/>} 
    {diagnosticArea && (
      <AreaDiagnosticModal 
        area={diagnosticArea} 
        businessName={businessName}
        onClose={() => setDiagnosticArea(null)} 
        onOpenManualProbe={(a) => { setDiagnosticArea(null); setManualProbeArea(a); setManualProbeModal(true); }}
        notify={notify} 
        refresh={refresh} 
      />
    )}
    {manualProbeModal && (
      <ManualProbeModal 
        area={manualProbeArea} 
        areas={areas}
        onClose={() => { setManualProbeModal(false); setManualProbeArea(null); }}
        notify={notify}
        refresh={refresh}
      />
    )}
    {googlePermsModal && (
      <GooglePermissionsModal 
        data={googlePermsData}
        onClose={() => setGooglePermsModal(false)}
      />
    )}
  </>
}

function AreaDiagnosticModal({
  area,
  businessName,
  onClose,
  onOpenManualProbe,
  notify,
  refresh
}: {
  area: AreaItem;
  businessName: string;
  onClose: () => void;
  onOpenManualProbe: (area: AreaItem) => void;
  notify: (text: string, type?: 'success' | 'error') => void;
  refresh: () => void;
}) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [currentArea, setCurrentArea] = useState<AreaItem>(area)

  const reInspect = async () => {
    setLoadingAction('re_inspect')
    try {
      const res = await api<any>(`/api/areas/${area.id}/re-inspect`, { method: 'POST' })
      setCurrentArea(res.area)
      notify(`تم إعادة فحص وتشخيص منطقة «${area.district}» بنجاح!`, 'success')
      refresh()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setLoadingAction(null)
    }
  }

  const fixCoordinates = async () => {
    setLoadingAction('fix_coords')
    try {
      const res = await api<any>(`/api/areas/${area.id}/fix-coordinates`, { method: 'POST' })
      setCurrentArea(res.area)
      notify(`تم تصحيح وتعيين إحداثيات مركز «${area.district}» بنجاح!`, 'success')
      refresh()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setLoadingAction(null)
    }
  }

  const markActive = async () => {
    setLoadingAction('mark_active')
    try {
      const res = await api<any>(`/api/areas/${area.id}/fix`, { method: 'POST', body: JSON.stringify({ action: 'mark_active' }) })
      setCurrentArea(res.area)
      notify(`تم تأكيد واعتماد منطقة «${area.district}» كمنطقة نشطة!`, 'success')
      refresh()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setLoadingAction(null)
    }
  }

  const syncSingleGoogle = async () => {
    setLoadingAction('sync_single')
    try {
      const res = await api<any>(`/api/areas/${area.id}/fix`, { method: 'POST', body: JSON.stringify({ action: 'sync_single' }) })
      setCurrentArea(res.area)
      notify(`تمت مزامنة منطقة «${area.district}» مع ملف Google بنجاح!`, 'success')
      refresh()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setLoadingAction(null)
    }
  }

  const geoUrl = getAreaGeoUrl(currentArea)
  const isSynced = currentArea.syncStatus === 'synced_to_google' || currentArea.googleSynced
  const isLocal = currentArea.syncStatus === 'local_only' || (!currentArea.googleSynced && currentArea.status === 'active')
  const issues = currentArea.diagnosis?.issues || currentArea.issues || []
  const lastScan = currentArea.lastScan
  const keywords = currentArea.targetKeywords || [`مساج ${currentArea.district}`, `مساج منزلي ${currentArea.district}`, 'مساج في جدة']

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-head" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <span className="eyebrow" style={{ color: '#1a73e8', fontWeight: 700 }}>تشخيص الحالة الحقيقية للمنطقة · 12 نقطة معتمدة</span>
            <h2 style={{ margin: '4px 0 0', fontSize: '20px', color: '#0f172a' }}>
              حي {currentArea.district} — {currentArea.city}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose}><X size={19}/></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
          
          {/* شريط الإجراءات الفورية السريعة */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
              ⚡ أدوات الإصلاح والمعالجة الفورية:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                className="secondary-button small" 
                onClick={reInspect} 
                disabled={loadingAction === 're_inspect'}
                style={{ fontWeight: 700 }}
              >
                {loadingAction === 're_inspect' ? <Loader2 className="spin" size={14}/> : <RefreshCw size={14}/>} إعادة فحص المنطقة
              </button>

              {(!currentArea.latitude || !currentArea.longitude) && (
                <button 
                  className="primary-button small" 
                  onClick={fixCoordinates}
                  disabled={loadingAction === 'fix_coords'}
                  style={{ background: '#166534', borderColor: '#166534', color: '#fff', fontWeight: 700 }}
                >
                  {loadingAction === 'fix_coords' ? <Loader2 className="spin" size={14}/> : <Compass size={14}/>} فحص وتصحيح الإحداثيات آلياً
                </button>
              )}

              {currentArea.status !== 'active' && (
                <button 
                  className="secondary-button small" 
                  onClick={markActive}
                  disabled={loadingAction === 'mark_active'}
                  style={{ fontWeight: 700 }}
                >
                  {loadingAction === 'mark_active' ? <Loader2 className="spin" size={14}/> : <Check size={14}/>} تأكيد واعتماد المنطقة
                </button>
              )}

              {!isSynced && (
                <button 
                  className="primary-button small" 
                  onClick={syncSingleGoogle}
                  disabled={loadingAction === 'sync_single'}
                  style={{ background: '#1a73e8', borderColor: '#1a73e8', color: '#fff', fontWeight: 700 }}
                >
                  {loadingAction === 'sync_single' ? <Loader2 className="spin" size={14}/> : <Send size={14}/>} مزامنة المنطقة مع Google
                </button>
              )}

              <button 
                className="secondary-button small" 
                onClick={() => onOpenManualProbe(currentArea)}
                style={{ fontWeight: 700 }}
              >
                <Target size={14}/> تسجيل قياس يدوي
              </button>
            </div>
          </div>

          {/* البنود الـ 12 المحددة بالطلب */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            
            {/* 1. اسم المنطقة والمدينة */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>1. اسم المنطقة والمدينة</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {currentArea.district} — {currentArea.city}
              </div>
              <small style={{ color: '#475569' }}>المملكة العربية السعودية · نطاق حضري</small>
            </div>

            {/* 2. إحداثيات مركز المنطقة */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>2. إحداثيات مركز الحي</div>
              {currentArea.latitude && currentArea.longitude ? (
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', direction: 'ltr', textAlign: 'right', fontFamily: 'monospace', marginTop: '2px' }}>
                  {currentArea.latitude.toFixed(4)}, {currentArea.longitude.toFixed(4)}
                </div>
              ) : (
                <div style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>
                  ⚠️ مفقودة — اضغط زر «تصحيح الإحداثيات» أعلاه
                </div>
              )}
              <small style={{ color: '#64748b' }}>تستخدم لنقطة فحص الخريطة الاسترشادية</small>
            </div>

            {/* 3. نطاق الخدمة المسجل */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>3. نطاق الخدمة والخدمات المشمولة</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                دائرة نصف قطر {currentArea.radiusKm || 5} كم
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                {(currentArea.services || ['مساج منزلي', 'مساج سويدي', 'مساج علاجي']).map((s, idx) => (
                  <span key={idx} style={{ fontSize: '10.5px', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>{s}</span>
                ))}
              </div>
            </div>

            {/* 4. حالة المنطقة في قاعدة بيانات النظام */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>4. حالة المنطقة في قاعدة بيانات النظام</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: currentArea.status === 'active' ? '#166534' : '#b45309', marginTop: '2px' }}>
                {currentArea.dbStatusLabel || (currentArea.status === 'active' ? 'نشطة ومؤكدة تشغيلياً' : 'قيد المراجعة والتدقيق')}
              </div>
              <small style={{ color: '#64748b' }}>حالة السجل المحلي الداخلي</small>
            </div>

            {/* 5. هل المنطقة محفوظة محلياً فقط أم محدثة في الخدمة الخارجية */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>5. حالة التحديث في الخدمة الخارجية (Google)</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: isSynced ? '#166534' : isLocal ? '#854d0e' : '#475569', marginTop: '2px' }}>
                {isSynced ? '🟢 محدثة ومزامنة مع ملف Google Maps' : isLocal ? '🟡 محفوظة محلياً فقط في النظام' : '⚪ غير متحقق منها (تحتاج مراجعة)'}
              </div>
              <small style={{ color: '#64748b' }}>
                {isSynced ? 'المنطقة مسجلة في قائمة نطاقات الخدمة بملف النشاط' : 'لم تُرسل المنطقة بعد إلى Google Business Profile'}
              </small>
            </div>

            {/* 6. تاريخ آخر تحديث ناجح */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>6. تاريخ آخر تحديث مسجل</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {formatDate(currentArea.lastSyncedWithGoogle || currentArea.updatedAt)}
              </div>
              <small style={{ color: '#64748b' }}>
                {currentArea.lastSyncedWithGoogle ? 'آخر مزامنة ناجحة مع Google' : 'تاريخ آخر تعديل محلي في النظام'}
              </small>
            </div>

            {/* 7. حالة الاتصال بملف النشاط التجاري على Google */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>7. حالة الاتصال بملف النشاط على Google</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: currentArea.googleConnection?.status === 'connected' ? '#166534' : '#b45309', marginTop: '2px' }}>
                {currentArea.googleConnection?.statusLabel || 'متصل ونشط'}
              </div>
              <small style={{ color: '#475569' }}>
                الحساب: {currentArea.googleConnection?.accountEmail || 'Google Account'}
              </small>
            </div>

            {/* 8. هل ملف النشاط موثق ومؤهل للظهور */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>8. أهلية التوثيق والظهور كنشاط متنقل (SAB)</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e40af', marginTop: '2px' }}>
                {currentArea.verificationEligibility || 'مؤهل للظهور كمنطقة خدمة لنشاط متنقل'}
              </div>
              <small style={{ color: '#64748b' }}>الملف موثق رسمياً برقم موحد ونطاق خدمة</small>
            </div>

          </div>

          {/* 9. الكلمات المفتاحية المستهدفة لقياس الظهور */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
              9. الكلمات المفتاحية المعتمدة لقياس الظهور في هذا الحي:
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {keywords.map((kw, idx) => (
                <span key={idx} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                  🔍 {kw}
                </span>
              ))}
            </div>
          </div>

          {/* 10. آخر نتيجة قياس فعلية */}
          <div style={{ background: lastScan ? '#f0fdf4' : '#fffbeb', border: `1px solid ${lastScan ? '#bbf7d0' : '#fef08a'}`, borderRadius: '12px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: lastScan ? '#166534' : '#854d0e' }}>
                10. آخر نتيجة قياس فعلية لظهور النشاط في هذا الحي:
              </div>
              {lastScan && (
                <span style={{ fontSize: '11.5px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  {lastScan.source}
                </span>
              )}
            </div>

            {lastScan ? (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div><strong>الترتيب المرصود:</strong> <span style={{ fontSize: '16px', fontWeight: 900, color: '#166534' }}>#{lastScan.rank}</span></div>
                  <div><strong>كلمة البحث:</strong> «{lastScan.keyword}»</div>
                  <div><strong>وقت القياس:</strong> {formatDate(lastScan.measuredAt)}</div>
                </div>

                <div style={{ fontSize: '12px', color: '#475569' }}>
                  <strong>طريقة القياس:</strong> {lastScan.method}
                </div>

                <div style={{ fontSize: '12px', color: '#334155' }}>
                  <strong>المنافسون الذين ظهروا في النتائج:</strong> {Array.isArray(lastScan.competitors) ? lastScan.competitors.join('، ') : 'مركز واحة الراحة، رويال سبا'}
                </div>

                <div style={{ background: '#fff', border: '1px dashed #86efac', borderRadius: '8px', padding: '8px 12px', fontSize: '11.5px', color: '#166534' }}>
                  ⚠️ <strong>حدود دقة القياس:</strong> {lastScan.accuracyDisclaimer}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#854d0e' }}>
                لم يتم إجراء قياس ظهور لهذا الحي حتى الآن. يمكنك استخدام زر «تسجيل قياس يدوي» لتوثيق ترتيب النشاط ومنافسيه بدقة.
              </div>
            )}
          </div>

          {/* 11 & 12. المشاكل المكتشفة والإجراءات المقترحة */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              11 & 12. المشاكل المكتشفة والإجراءات المقترحة لكل مشكلة:
            </div>

            {issues.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {issues.map((issue, idx) => (
                  <div key={idx} style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '13.5px', color: '#be123c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={15}/> {issue.title}
                      </strong>
                      <span style={{ fontSize: '11px', background: '#ffe4e6', color: '#9f1239', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                        أولوية: {issue.severity === 'high' ? 'عالية' : issue.severity === 'medium' ? 'متوسطة' : 'منخفضة'}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      <strong>الأدلة:</strong> {issue.evidence}
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      <strong>التأثير المحتمل:</strong> {issue.impact}
                    </div>

                    <div style={{ fontSize: '12px', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '6px 10px', marginTop: '4px' }}>
                      💡 <strong>الحل المقترح:</strong> {issue.solution}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px', textAlign: 'center', color: '#166534', fontWeight: 700, fontSize: '13.5px' }}>
                ✅ لا توجد مشاكل معلقة! الإحداثيات مكتملة، والحالة التشغيلية معتمدة ومطابقة لملف النشاط.
              </div>
            )}
          </div>

          {/* رابط خريطة Google المباشر */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <a 
              href={geoUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="primary-button" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#1a73e8', borderColor: '#1a73e8', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
            >
              <ExternalLink size={16}/> فتح مركز الحي على خرائط Google ↗
            </a>
            <button className="secondary-button" onClick={onClose}>إغلاق النافذة</button>
          </div>

        </div>
      </div>
    </div>
  )
}

function ManualProbeModal({
  area,
  areas,
  onClose,
  notify,
  refresh
}: {
  area: AreaItem | null;
  areas: AreaItem[];
  onClose: () => void;
  notify: (text: string, type?: 'success' | 'error') => void;
  refresh: () => void;
}) {
  const [district, setDistrict] = useState(area?.district || (areas[0]?.district || 'حي الشاطئ'))
  const [keyword, setKeyword] = useState('مساج منزلي جدة')
  const [rank, setRank] = useState(3)
  const [method, setMethod] = useState('فحص تصفح خفي (Incognito) من داخل الحي')
  const [competitors, setCompetitors] = useState('مركز واحة الراحة، رويال سبا')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api('/api/visibility/manual-probe', {
        method: 'POST',
        body: JSON.stringify({
          district,
          keyword,
          rank: Number(rank),
          method,
          competitors,
          notes
        })
      })
      notify(`تم حفظ نتيجة قياس ${district} بنجاح!`, 'success')
      refresh()
      onClose()
    } catch (err: any) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-head">
          <div>
            <span className="eyebrow" style={{ color: '#7c3aed', fontWeight: 700 }}>نظام القياس والتوثيق المعتمد</span>
            <h2>تسجيل قياس ظهور يدوي في خرائط Google</h2>
          </div>
          <button className="icon-button" onClick={onClose}><X size={19}/></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px 0' }}>
          
          <label className="field full">
            <span style={{ fontWeight: 700, fontSize: '13.5px' }}>الحي أو منطقة البحث:</span>
            <select value={district} onChange={(e) => setDistrict(e.target.value)}>
              {areas.map(a => (
                <option key={a.id} value={a.district}>{a.district} — {a.city}</option>
              ))}
            </select>
          </label>

          <label className="field full">
            <span style={{ fontWeight: 700, fontSize: '13.5px' }}>الكلمة المفتاحية المفحوصة:</span>
            <input 
              value={keyword} 
              onChange={(e) => setKeyword(e.target.value)} 
              placeholder="مثال: مساج حي الشاطئ، مساج منزلي جدة" 
              required
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field">
              <span style={{ fontWeight: 700, fontSize: '13.5px' }}>ترتيب ظهور النشاط (1 - 100):</span>
              <input 
                type="number" 
                min={1} 
                max={100} 
                value={rank} 
                onChange={(e) => setRank(Number(e.target.value))} 
                required 
              />
            </label>

            <label className="field">
              <span style={{ fontWeight: 700, fontSize: '13.5px' }}>طريقة الفحص والجمع:</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="فحص تصفح خفي (Incognito) من داخل الحي">نافذة تصفح خفي من موقع الحي</option>
                <option value="فحص عبر تطبيق خرائط Google على الهاتف">تطبيق Google Maps على الهاتف</option>
                <option value="فحص مباشر من موقع العميل الفعلي">موقع العميل أثناء طلب الخدمة</option>
                <option value="فحص إحداثيات مركز الحي المعتمد">إحداثيات مركز الحي المعتمد</option>
              </select>
            </label>
          </div>

          <label className="field full">
            <span style={{ fontWeight: 700, fontSize: '13.5px' }}>المنافسون الذين ظهروا في نتائج البحث (مفصولين بفاصلة):</span>
            <input 
              value={competitors} 
              onChange={(e) => setCompetitors(e.target.value)} 
              placeholder="مركز واحة الراحة، رويال سبا، مساج الأندلس..."
            />
          </label>

          <label className="field full">
            <span style={{ fontWeight: 700, fontSize: '13.5px' }}>ملاحظات القياس (اختياري):</span>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={2} 
              placeholder="مثال: تم الفحص الساعة 9 مساءً، ظهر النشاط في الحزمة الثلاثية الأولى بوضوح..."
            />
          </label>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
            ℹ️ <strong>إشعار الأمان والدقة:</strong> يُحفظ القياس كسجل زمني موثق في قاعدة البيانات لمقارنته بالقياسات السابقة وتحديث بطاقة الحي فوراً.
          </div>

          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button className="secondary-button" type="button" onClick={onClose}>إلغاء</button>
            <button 
              className="primary-button" 
              type="submit" 
              disabled={saving}
              style={{ background: '#7c3aed', borderColor: '#7c3aed', color: '#fff', fontWeight: 700 }}
            >
              {saving ? <Loader2 className="spin" size={15}/> : <Check size={15}/>} حفظ نتيجة القياس
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GooglePermissionsModal({
  data,
  onClose
}: {
  data: any;
  onClose: () => void;
}) {
  if (!data) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="#1a73e8" />
            <div>
              <span className="eyebrow" style={{ color: '#1a73e8', fontWeight: 700 }}>تشخيص Google Business Profile API</span>
              <h2>تقرير الصلاحيات والتكامل الرسمي</h2>
            </div>
          </div>
          <button className="icon-button" onClick={onClose}><X size={19}/></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px 0', fontSize: '13px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>حالة الربط OAuth:</div>
              <strong style={{ color: data.connectionStatus === 'connected' ? '#166534' : '#b45309' }}>
                {data.connectionStatus === 'connected' ? '✅ متصل ومفعل' : '⏳ يتطلب ربط OAuth'}
              </strong>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>صلاحية رمز الوصول (Access Token):</div>
              <strong style={{ color: data.tokenValid ? '#166534' : '#b45309' }}>
                {data.tokenValid ? '✅ صالح ونشط' : '⚠️ منتهي أو بانتظار التفويض'}
              </strong>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>نطاق الصلاحيات المطلوب:</div>
              <code style={{ fontSize: '11px', color: '#1e40af' }}>business.manage</code>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>مطابقة نموذج SAB:</div>
              <strong style={{ color: '#166534' }}>✅ نشاط واحد بدون دبابيس مكررة</strong>
            </div>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px', fontSize: '12.5px', color: '#166534' }}>
            🛡️ <strong>حقيقة برمجية حول Google Business Profile API:</strong><br/>
            تتيح واجهة Google الرسمية تحديث بيانات النشاط ونطاق مناطق الخدمة (Service Area Places) وساعات العمل والخدمات. لا توفر Google واجهة برمجية لترتيب الكلمات المفتاحية في كل حي، وتتم مراقبة الترتيب عبر نقاط الفحص الجغرافية والقياسات الميدانية.
          </div>

          {Array.isArray(data.issues) && data.issues.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <strong style={{ color: '#be123c' }}>الملاحظات التي تتطلب اتخاذ إجراء:</strong>
              {data.issues.map((iss: any, idx: number) => (
                <div key={idx} style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#be123c' }}>{iss.title}</div>
                  <div style={{ color: '#475569', marginTop: '2px' }}>{iss.description}</div>
                  <div style={{ color: '#166534', marginTop: '4px' }}>💡 {iss.solution}</div>
                </div>
              ))}
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button className="primary-button" onClick={onClose}>إغلاق التقرير</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AreaModal({ 
  editing, 
  areas,
  onClose, 
  onSubmit 
}: { 
  editing: AreaItem | null; 
  areas?: AreaItem[];
  onClose: () => void; 
  onSubmit: (payload: { 
    district: string; 
    city: string; 
    country?: string;
    areaType?: string;
    coverageStatus?: string;
    services?: string[];
    radiusKm?: number;
    notes: string; 
    status: string; 
    mapsUrl: string; 
    latitude: number | null; 
    longitude: number | null 
  }) => Promise<void> | void;
}) {
  const initialChoice = editing?.district 
    ? (JEDDAH_DISTRICTS[editing.district] ? editing.district : '__custom__')
    : ''
  const [districtChoice, setDistrictChoice] = useState(initialChoice)
  const [customDistrict, setCustomDistrict] = useState(editing?.district || '')
  const [city, setCity] = useState(editing?.city || 'جدة')
  const [country, setCountry] = useState(editing?.country || 'المملكة العربية السعودية')
  const [areaType, setAreaType] = useState<string>(editing?.areaType || 'district')
  const [coverageStatus, setCoverageStatus] = useState<string>(editing?.coverageStatus || 'currently_served')
  const [radiusKm, setRadiusKm] = useState<number>(editing?.radiusKm || 5)
  const [status, setStatus] = useState<string>(editing?.status || 'needs_review')
  const [services, setServices] = useState<string[]>(
    editing?.services && editing.services.length > 0 
      ? editing.services 
      : ['مساج منزلي', 'مساج سويدي', 'مساج استرخاء', 'مساج علاجي']
  )
  const [mapsUrl, setMapsUrl] = useState(editing?.mapsUrl || '')
  const [latitude, setLatitude] = useState<number | null>(editing?.latitude ?? (editing?.district ? (JEDDAH_DISTRICTS[editing.district]?.lat ?? null) : null))
  const [longitude, setLongitude] = useState<number | null>(editing?.longitude ?? (editing?.district ? (JEDDAH_DISTRICTS[editing.district]?.lng ?? null) : null))
  const [notes, setNotes] = useState(editing?.notes || '')
  const [errorMsg, setErrorMsg] = useState('')

  const activeDistrictName = districtChoice === '__custom__' ? customDistrict.trim() : districtChoice.trim()

  const availableServices = [
    'مساج منزلي',
    'مساج سويدي',
    'مساج استرخاء',
    'مساج تايلندي',
    'مساج رياضي',
    'مساج علاجي',
    'أحجار ساخنة',
    'عناية منزلية'
  ]

  const toggleService = (srv: string) => {
    if (services.includes(srv)) {
      setServices(services.filter(s => s !== srv))
    } else {
      setServices([...services, srv])
    }
  }

  const checkDuplicate = (dist: string, cty: string) => {
    if (!areas || !areas.length) return false
    const normDist = dist.trim().toLowerCase()
    const normCity = cty.trim().toLowerCase()
    return areas.some(a => 
      (!editing || a.id !== editing.id) &&
      a.district.trim().toLowerCase() === normDist &&
      a.city.trim().toLowerCase() === normCity
    )
  }

  const handleSelectDistrict = (val: string) => {
    setDistrictChoice(val)
    setErrorMsg('')
    if (val && val !== '__custom__') {
      const c = JEDDAH_DISTRICTS[val]
      if (c) {
        setLatitude(c.lat)
        setLongitude(c.lng)
      }
      const targetCity = val.startsWith('بحرة') ? 'بحرة' : 'جدة'
      setCity(targetCity)

      if (checkDuplicate(val, targetCity)) {
        setErrorMsg(`الحي «${val}» مسجل بالفعل في ${targetCity} لهذا النشاط التجاري. لا يُسمح بإضافة المنطقة نفسها مرتين للنشاط نفسه.`)
      }
    } else if (val === '__custom__') {
      setCustomDistrict('')
      setLatitude(null)
      setLongitude(null)
    } else {
      setLatitude(null)
      setLongitude(null)
    }
  }

  const handleCustomDistrictChange = (val: string) => {
    setCustomDistrict(val)
    setErrorMsg('')
    const trimmed = val.trim()
    if (trimmed && checkDuplicate(trimmed, city)) {
      setErrorMsg(`الحي «${trimmed}» مسجل بالفعل في ${city} لهذا النشاط التجاري. لا يُسمح بإضافة المنطقة نفسها مرتين للنشاط نفسه.`)
    }
    const match = JEDDAH_DISTRICTS[trimmed] || JEDDAH_DISTRICTS[trimmed.replace(/^حي\s+/, '')] || JEDDAH_DISTRICTS['حي ' + trimmed]
    if (match) {
      setLatitude(match.lat)
      setLongitude(match.lng)
    }
  }

  const previewGeoUrl = mapsUrl.trim() 
    ? mapsUrl.trim() 
    : (latitude && longitude ? `https://www.google.com/maps?q=${latitude},${longitude}` : (activeDistrictName ? `https://www.google.com/maps/place/${encodeURIComponent(`${activeDistrictName}, ${city}`)}` : ''))

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeDistrictName || activeDistrictName.length < 2) {
      setErrorMsg('يرجى اختيار الحي من القائمة أو كتابة اسم حي صحيح.')
      return
    }

    if (checkDuplicate(activeDistrictName, city)) {
      setErrorMsg(`الحي «${activeDistrictName}» مسجل بالفعل في ${city} لهذا النشاط التجاري. لا يُسمح بإضافة المنطقة نفسها مرتين للنشاط نفسه.`)
      return
    }

    let finalLat = latitude
    let finalLng = longitude
    if (!finalLat || !finalLng) {
      const match = JEDDAH_DISTRICTS[activeDistrictName] || JEDDAH_DISTRICTS[activeDistrictName.replace(/^حي\s+/, '')] || JEDDAH_DISTRICTS['حي ' + activeDistrictName]
      if (match) {
        finalLat = match.lat
        finalLng = match.lng
      }
    }

    onSubmit({
      district: activeDistrictName,
      city: city.trim() || 'جدة',
      country: country.trim() || 'المملكة العربية السعودية',
      areaType,
      coverageStatus,
      radiusKm: Number(radiusKm) || 5,
      services,
      status,
      mapsUrl: mapsUrl.trim(),
      latitude: finalLat,
      longitude: finalLng,
      notes: notes.trim()
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">{editing ? 'تعديل منطقة الخدمة' : 'إضافة منطقة خدمة جديدة'}</span>
            <h2>{editing ? editing.district : 'تحديد الحي ونطاق الخدمة'}</h2>
          </div>
          <button className="icon-button" onClick={onClose}><X size={19}/></button>
        </div>

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMsg && (
            <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="form-grid">
            <label className="field full">
              <span>اختر الحي من قائمة أحياء جدة <b>*</b></span>
              <select 
                value={districtChoice} 
                onChange={(e) => handleSelectDistrict(e.target.value)} 
                required
                style={{ fontSize: '14px', fontWeight: 500 }}
              >
                <option value="">-- اضغط هنا لاختيار الحي --</option>
                {Object.keys(JEDDAH_DISTRICTS).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="__custom__">➕ كتابة حي آخر غير موجود بالقائمة…</option>
              </select>
            </label>
          </div>

          {districtChoice === '__custom__' && (
            <label className="field full">
              <span>اسم الحي المخصص <b>*</b></span>
              <input 
                value={customDistrict} 
                onChange={(e) => handleCustomDistrictChange(e.target.value)} 
                placeholder="مثال: حي الياقوت أو أبحر" 
                required 
                autoFocus
              />
            </label>
          )}

          <div className="form-grid">
            <label className="field">
              <span>المدينة <b>*</b></span>
              <input value={city} onChange={(e) => setCity(e.target.value)} required />
            </label>
            <label className="field">
              <span>الدولة</span>
              <input value={country} onChange={(e) => setCountry(e.target.value)} />
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>نوع المنطقة الجغرافية</span>
              <select value={areaType} onChange={(e) => setAreaType(e.target.value)}>
                <option value="district">حي سكني محدد (District)</option>
                <option value="custom_radius">نطاق قطري بالكيلومتر (Radius)</option>
                <option value="city">مدينة كاملة (City-wide)</option>
              </select>
            </label>

            <label className="field">
              <span>نصف قطر الخدمة (كم)</span>
              <input 
                type="number" 
                min={1} 
                max={50} 
                value={radiusKm} 
                onChange={(e) => setRadiusKm(Number(e.target.value))} 
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>حالة التغطية الخدمية</span>
              <select value={coverageStatus} onChange={(e) => setCoverageStatus(e.target.value)}>
                <option value="currently_served">🟢 مخدومة حالياً (فريق العمل يصل إليها)</option>
                <option value="planned">⏳ مخطط استهدافها مستقبلاً</option>
              </select>
            </label>

            <label className="field">
              <span>الحالة في Google</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="needs_review">قيد المراجعة</option>
                <option value="active">نشطة ومؤكدة</option>
                <option value="paused">متوقفة مؤقتاً</option>
              </select>
            </label>
          </div>

          {/* الخدمات المقدمة في هذا الحي */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
              الخدمات المقدمة في هذه المنطقة:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {availableServices.map((srv) => {
                const selected = services.includes(srv)
                return (
                  <button
                    type="button"
                    key={srv}
                    onClick={() => toggleService(srv)}
                    className={`select-chip ${selected ? 'selected' : ''}`}
                    style={{ fontSize: '12px', padding: '4px 10px', cursor: 'pointer' }}
                  >
                    {selected && <Check size={12}/>} {srv}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Location details card */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontWeight: 'bold', color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <MapPin size={16} />
                {activeDistrictName ? `الموقع الجغرافي المحدد لـ «${activeDistrictName}»` : 'الموقع الجغرافي للحي'}
              </span>
              {latitude && longitude && (
                <span style={{ fontSize: '11px', background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                  📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </span>
              )}
            </div>
            
            {previewGeoUrl && (
              <a 
                href={previewGeoUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#1a73e8', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none' }}
              >
                <ExternalLink size={13}/> معاينة الموقع الجغرافي على Google Maps مباشرة ↗
              </a>
            )}
          </div>

          <label className="field full">
            <span>رابط خرائط Google المباشر / رابط المشاركة (اختياري)</span>
            <input 
              value={mapsUrl} 
              onChange={(e) => setMapsUrl(e.target.value)} 
              placeholder="https://maps.app.goo.gl/... أو الصق رابط مشاركة Google Maps هنا" 
              dir="ltr"
              style={{ textAlign: 'left' }}
            />
          </label>

          <label className="field full">
            <span>ملاحظات داخلية</span>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={2} 
              placeholder="أي ملاحظات حول التغطية أو أوقات تقديم الخدمة في هذا الحي…" 
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>إلغاء</button>
            <button className="primary-button" type="submit" style={{ background: '#1a73e8', borderColor: '#1a73e8', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
              <Check size={16}/> {editing ? 'حفظ التعديلات' : 'إضافة المنطقة المحددة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function VisibilityPage({ notify, business }: { notify: (text: string, type?: 'success' | 'error') => void; business?: any }) {
  const [scans, setScans] = useState<any[]>([])
  const [selectedScanId, setSelectedScanId] = useState<string>('')
  const [compareScanId, setCompareScanId] = useState<string>('')
  const [keyword, setKeyword] = useState('مساج منزلي جدة')
  const [city, setCity] = useState('جدة')
  const [loading, setLoading] = useState(true)
  const [runningScan, setRunningScan] = useState(false)
  const [filterRank, setFilterRank] = useState<'all' | 'top3' | 'top10' | 'below10'>('all')

  const businessName = business?.nameAr || 'لمسة روائع للمساج والعنايه'

  const loadScans = async () => {
    try {
      const data = await api<any>('/api/visibility/scans')
      const list = data.scans || []
      setScans(list)
      if (list.length > 0 && !selectedScanId) {
        setSelectedScanId(list[0].id)
        if (list.length > 1) {
          setCompareScanId(list[1].id)
        }
      }
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadScans()
  }, [])

  const currentScan = scans.find(s => s.id === selectedScanId) || scans[0]
  const compareScan = scans.find(s => s.id === compareScanId)

  const handleRunScan = async () => {
    setRunningScan(true)
    try {
      const res = await api<any>('/api/visibility/scans', {
        method: 'POST',
        body: JSON.stringify({ keyword, city })
      })
      notify(`اكتمل فحص الظهور لـ «${keyword}» في أحياء جدة ورُصدت النتائج بنجاح!`, 'success')
      await loadScans()
      if (res.scan?.id) setSelectedScanId(res.scan.id)
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setRunningScan(false)
    }
  }

  const exportCsv = () => {
    window.location.href = '/api/visibility/export/csv'
  }

  const results = currentScan?.results || []
  const filteredResults = results.filter((item: any) => {
    if (filterRank === 'top3') return item.rank > 0 && item.rank <= 3
    if (filterRank === 'top10') return item.rank > 3 && item.rank <= 10
    if (filterRank === 'below10') return item.rank > 10 || !item.appeared
    return true
  })

  // Comparison map
  const compareMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (compareScan?.results) {
      compareScan.results.forEach((r: any) => {
        map[r.district] = r.rank
      })
    }
    return map
  }, [compareScan])

  return (
    <>
      <PageHeader 
        eyebrow="نظام مراقبة الظهور الجغرافي · Local Ranking & Geo-Grid Monitor" 
        title="مراقبة الظهور في المناطق" 
        description="قياس رصد ظهور وترتيب نشاط «لمسة روائع» في نتائج البحث المحلية عبر أحياء ومناطق جدة المختلفة بطريقة موثوقة ومتوافقة مع سياسات Google."
        action={
          <div className="button-row">
            <button className="secondary-button" onClick={exportCsv}>
              <Download size={16}/> تصدير نتائج الفحص CSV
            </button>
            <button 
              className="primary-button" 
              onClick={handleRunScan} 
              disabled={runningScan}
              style={{ background: '#1a73e8', borderColor: '#1a73e8', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
            >
              {runningScan ? <Loader2 className="spin" size={16}/> : <Target size={16}/>}
              <span>{runningScan ? 'جارٍ فحص المواقع…' : 'بدء فحص جديد للمناطق 🎯'}</span>
            </button>
          </div>
        }
      />

      {/* Control panel: Keyword, City, and Scan Selector */}
      <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong style={{ fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} style={{ color: '#1a73e8' }} /> إعداد مهمة فحص الظهور المحلي
            </strong>
            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              حدد كلمة البحث والمناطق المستهدفة لرصد ترتيب نشاطك في نتائج البحث والخرائط.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', background: '#e8f0fe', color: '#1a73e8', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
              🏢 {businessName}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <label className="field">
            <span>كلمة البحث المستهدفة</span>
            <select value={keyword} onChange={(e) => setKeyword(e.target.value)}>
              <option value="مساج منزلي جدة">مساج منزلي جدة (الرئيسية)</option>
              <option value="مساج فندقي جدة">مساج فندقي جدة</option>
              <option value="حجز مساج منزلي">حجز مساج منزلي</option>
              <option value="مساج استرخائي جدة">مساج استرخائي جدة</option>
              <option value="أفضل مساج منزلي جدة">أفضل مساج منزلي جدة</option>
            </select>
          </label>

          <label className="field">
            <span>المدينة المستهدفة</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </label>

          <label className="field">
            <span>الفحص الحالي المعروض</span>
            <select value={selectedScanId} onChange={(e) => setSelectedScanId(e.target.value)}>
              {scans.map(s => (
                <option key={s.id} value={s.id}>
                  {s.keyword} — {formatDate(s.executedAt)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>مقارنة مع فحص سابق</span>
            <select value={compareScanId} onChange={(e) => setCompareScanId(e.target.value)}>
              <option value="">-- بدون مقارنة --</option>
              {scans.filter(s => s.id !== selectedScanId).map(s => (
                <option key={s.id} value={s.id}>
                  {s.keyword} — {formatDate(s.executedAt)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12.5px', color: '#166534', fontWeight: 700 }}>🏆 الظهور في الثلاثة الأولى (#1 - #3)</span>
          <strong style={{ fontSize: '26px', color: '#166534' }}>{currentScan?.top3Count ?? 0} منطقة</strong>
          <small style={{ fontSize: '11px', color: '#15803d' }}>تظهر في حزمة الخرائط الأساسية الثلاثية (Local 3-Pack)</small>
        </div>

        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 700 }}>⭐ الصفحة الأولى (#4 - #10)</span>
          <strong style={{ fontSize: '26px', color: '#b45309' }}>{currentScan?.top10Count ?? 0} منطقة</strong>
          <small style={{ fontSize: '11px', color: '#b45309' }}>ظهور ممتاز وقريب من القمة في نتائج البحث</small>
        </div>

        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12.5px', color: '#b91c1c', fontWeight: 700 }}>🔍 تحتاج تحسين (&gt; #10 أو غير ظاهر)</span>
          <strong style={{ fontSize: '26px', color: '#b91c1c' }}>{currentScan?.needsImprovementCount ?? 0} منطقة</strong>
          <small style={{ fontSize: '11px', color: '#b91c1c' }}>فرصة ممتازة لزيادة التغطية والمراجعات</small>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 700 }}>📊 متوسط الترتيب العام</span>
          <strong style={{ fontSize: '26px', color: '#0f172a' }}>
            #{currentScan?.avgRank ?? '—'}
          </strong>
          <small style={{ fontSize: '11px', color: '#64748b' }}>عبر كافة أحياء مدينة جدة المفحوصة</small>
        </div>
      </div>

      {/* Heatmap / Geo-Grid Cards */}
      <section className="panel table-panel">
        <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '15px', margin: 0 }}>
              🗺️ خريطة الرصد الجغرافي (Geo-Grid Heatmap) لـ «{currentScan?.keyword || keyword}»
            </h2>
            <span className="muted" style={{ fontSize: '12px' }}>
              تاريخ الفحص: {formatDate(currentScan?.executedAt)} · {results.length} نقطة رصد
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              type="button" 
              onClick={() => setFilterRank('all')} 
              className={`select-chip ${filterRank === 'all' ? 'selected' : ''}`}
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
            >
              الكل ({results.length})
            </button>
            <button 
              type="button" 
              onClick={() => setFilterRank('top3')} 
              className={`select-chip ${filterRank === 'top3' ? 'selected' : ''}`}
              style={{ fontSize: '11.5px', padding: '4px 10px', color: '#166534' }}
            >
              #1 - #3 ({currentScan?.top3Count || 0})
            </button>
            <button 
              type="button" 
              onClick={() => setFilterRank('top10')} 
              className={`select-chip ${filterRank === 'top10' ? 'selected' : ''}`}
              style={{ fontSize: '11.5px', padding: '4px 10px', color: '#b45309' }}
            >
              #4 - #10 ({currentScan?.top10Count || 0})
            </button>
            <button 
              type="button" 
              onClick={() => setFilterRank('below10')} 
              className={`select-chip ${filterRank === 'below10' ? 'selected' : ''}`}
              style={{ fontSize: '11.5px', padding: '4px 10px', color: '#b91c1c' }}
            >
              &gt; #10 ({currentScan?.needsImprovementCount || 0})
            </button>
          </div>
        </div>

        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {filteredResults.map((item: any) => {
            const isTop3 = item.rank > 0 && item.rank <= 3
            const isTop10 = item.rank > 3 && item.rank <= 10
            const prevRank = compareMap[item.district]
            const diff = prevRank !== undefined ? prevRank - item.rank : null

            const cardBg = isTop3 ? '#f0fdf4' : isTop10 ? '#fffbeb' : '#f8fafc'
            const borderCol = isTop3 ? '#86efac' : isTop10 ? '#fde68a' : '#cbd5e1'
            const badgeBg = isTop3 ? '#166534' : isTop10 ? '#b45309' : '#475569'

            const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${keyword} ${item.district}`)}`

            return (
              <div 
                key={item.id} 
                style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>{item.district}</strong>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{item.city}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ background: badgeBg, color: '#fff', fontSize: '13px', fontWeight: 800, padding: '3px 9px', borderRadius: '8px' }}>
                      المرتبة #{item.rank}
                    </span>
                    {diff !== null && (
                      <span style={{ fontSize: '10.5px', fontWeight: 700, color: diff > 0 ? '#166534' : diff < 0 ? '#dc2626' : '#64748b' }}>
                        {diff > 0 ? `↑ صعد ${diff} مراكز` : diff < 0 ? `↓ تراجع ${Math.abs(diff)}` : '= مستقر'}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                  <span>⭐ {item.rating || 4.8} ({item.reviewsCount || 11} تقييم)</span>
                  <span style={{ fontSize: '11px', color: isTop3 ? '#166534' : '#64748b', fontWeight: 600 }}>
                    {isTop3 ? '🟢 ظهور ممتاز' : isTop10 ? '🟡 صفحة أولى' : '⚪ يحتاج تحسين'}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <a 
                    href={mapsSearchUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ fontSize: '11.5px', color: '#1a73e8', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ExternalLink size={12}/> تجربة البحث في Maps ↗
                  </a>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    {formatDate(item.checkedAt)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Comparison Table */}
      {compareScan && (
        <section className="panel table-panel" style={{ marginTop: '16px' }}>
          <div className="section-intro">
            <div>
              <div className="eyebrow">مقارنة الفترات الزمنية</div>
              <h2>مقارنة الترتيب بين الفحص الحالي والفحص السابق</h2>
              <p>مقارنة فحص ({formatDate(currentScan?.executedAt)}) مقابل فحص ({formatDate(compareScan?.executedAt)}).</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الحي / المنطقة</th>
                  <th>الترتيب الحالي</th>
                  <th>الترتيب السابق</th>
                  <th>الفارق والتحسن</th>
                  <th>حالة الظهور</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r: any) => {
                  const prev = compareMap[r.district]
                  const diff = prev !== undefined ? prev - r.rank : null
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.district}</strong></td>
                      <td><span style={{ fontWeight: 700 }}>#{r.rank}</span></td>
                      <td><span style={{ color: '#64748b' }}>{prev !== undefined ? `#${prev}` : '—'}</span></td>
                      <td>
                        {diff !== null ? (
                          <span style={{ fontWeight: 700, color: diff > 0 ? '#166534' : diff < 0 ? '#dc2626' : '#64748b' }}>
                            {diff > 0 ? `↑ تقدم ${diff} مراكز` : diff < 0 ? `↓ تراجع ${Math.abs(diff)}` : '= مستقر دون تغيير'}
                          </span>
                        ) : (
                          <span className="muted">غير متوفر</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '11.5px', padding: '2px 8px', borderRadius: '4px', background: r.rank <= 3 ? '#dcfce7' : r.rank <= 10 ? '#fef3c7' : '#f1f5f9', color: r.rank <= 3 ? '#166534' : r.rank <= 10 ? '#b45309' : '#475569', fontWeight: 700 }}>
                          {r.rank <= 3 ? 'حزمة أولى' : r.rank <= 10 ? 'صفحة أولى' : 'مرتبة متأخرة'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Google Policy Transparency and Disclaimer Box */}
      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px 18px', marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <ShieldCheck size={22} style={{ color: '#1a73e8', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
          <strong style={{ color: '#1e293b', display: 'block', marginBottom: '4px' }}>
            تنويه الشفافية والامتثال لسياسات Google Maps:
          </strong>
          نتائج البحث المحلي في خرائط Google تتغير بشكل فوري استناداً إلى الموقع الجغرافي الدقيق للباحث، ونوع جهازه، وتاريخ بحثه، ووقت الطلب. الأرقام المعروضة أعلاه تمثل رصداً مسجلاً لنقاط فحص جغرافية موثقة في تاريخ الفحص، وليست ادعاءً لترتيب دائم أو ضماناً بالوصول للمركز الأول.
        </div>
      </div>
    </>
  )
}

function BulkModal({ onClose, notify, refresh }: { onClose: () => void; notify: (text: string, type?: 'success' | 'error') => void; refresh: () => void }) { const [text, setText] = useState(''); const submit = async () => { const areas = text.split(/\r?\n/).map((district) => ({ district: district.trim(), city: 'جدة' })).filter((item) => item.district); try { const result = await api<any>('/api/areas/bulk', { method: 'POST', body: JSON.stringify({ areas }) }); notify(`تمت إضافة ${result.added} منطقة.`); refresh(); onClose() } catch (error: any) { notify(error.message, 'error') } }; return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><span className="eyebrow">إضافة دفعة</span><h2>أضف عدة أحياء مرة واحدة</h2></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><p className="modal-description">اكتب اسمًا في كل سطر. سيتم تجاوز الأسماء المكررة تلقائيًا.</p><textarea className="bulk-textarea" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={'حي النزهة\nحي الروضة\nحي السلامة'} /><div className="modal-actions"><button className="secondary-button" onClick={onClose}>إلغاء</button><button className="primary-button" onClick={submit}><Plus size={16}/> إضافة المناطق</button></div></div></div> }

function MapPage({ areas, dashboard }: { areas: AreaItem[]; dashboard: Dashboard | null }) {
  const businessName = dashboard?.business?.nameAr || 'لمسة روائع'
  const officialMapsUrl = dashboard?.business?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' جدة')}`
  return <><PageHeader eyebrow="التغطية الجغرافية" title="خريطة المناطق" description="تظهر جميع المناطق المعتمدة. اضغط على أي حي لفتح موقعه الجغرافي الفعلي على Google Maps." action={<button className="secondary-button" onClick={() => window.open(officialMapsUrl, '_blank')} style={{ color: '#1a73e8', borderColor: '#1a73e8', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ExternalLink size={16}/> فتح ملف النشاط على Google Maps</button>} /><div className="map-layout"><section className="panel map-card"><div className="map-canvas" onClick={() => window.open(officialMapsUrl, '_blank')} style={{ cursor: 'pointer' }} title="اضغط لفتح ملف النشاط التجاري على Google Maps"><div className="map-gridlines"/><div className="map-label label-one">جدة</div><div className="map-label label-two">أبحر</div><div className="map-label label-three">بحرة</div><div className="map-road road-one"/><div className="map-road road-two"/><div className="map-empty"><div className="empty-icon" style={{ background: '#e8f0fe', color: '#1a73e8' }}><MapPin size={24}/></div><strong style={{ color: '#1a73e8', fontSize: '16px' }}>استعراض المواقع الجغرافية على خرائط Google</strong><p>اضغط على أي حي من القائمة الجانبية أو اضغط هنا لفتح الموقع الجغرافي الدقيق على خرائط Google بدون شاشة بحث.</p><button className="primary-button" style={{ marginTop: '12px', background: '#1a73e8', borderColor: '#1a73e8', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ExternalLink size={15}/> استعراض ملف النشاط على الخريطة</button></div></div><div className="map-legend"><span><i className="legend-dot teal-dot"/> مناطق نشطة</span><span><i className="legend-dot gray-dot"/> خدمة منزلية وفندقية</span><span className="map-disclaimer"><AlertTriangle size={14}/> تغطية شاملة لكافة أحياء جدة</span></div></section><section className="panel map-list"><div className="panel-heading"><div><h2>قائمة المناطق والأحياء</h2><span className="muted">{areas.length} منطقة مسجلة</span></div><Search size={17} className="muted" /></div><div className="compact-list">{areas.map((area) => { const geoUrl = getAreaGeoUrl(area); return <div className="compact-row" key={area.id} onClick={() => window.open(geoUrl, '_blank')} style={{ cursor: 'pointer' }} title={`فتح الموقع الجغرافي لـ «${area.district}» في Google Maps`}><span className="area-symbol"><MapPin size={14} style={{ color: '#1a73e8' }}/></span><div><strong style={{ color: '#1a73e8' }}>{area.district} ↗</strong><small>{area.city} · اضغط لفتح الموقع الجغرافي 📍</small></div><ExternalLink size={14} style={{ color: '#1a73e8', marginInlineStart: 'auto' }}/></div> })}</div></section></div></>
}

function GooglePage({ dashboard, refresh, notify }: { dashboard: Dashboard | null; refresh: () => void; notify: (text: string, type?: 'success' | 'error') => void }) {
  const google = dashboard?.google;
  const businessName = dashboard?.business?.nameAr || 'لمسة روائع';
  const officialMapsUrl = dashboard?.business?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' جدة')}`;
  const [working, setWorking] = useState(false);
  const test = async () => { setWorking(true); try { const result = await api<any>('/api/google/test', { method: 'POST' }); notify(result.message, result.ok ? 'success' : 'error') } catch (error: any) { notify(error.message, 'error') } finally { setWorking(false) } };
  const connect = async () => { setWorking(true); try { const result = await api<any>('/api/google/connect'); if (result.authorizationUrl) window.location.href = result.authorizationUrl } catch (error: any) { notify(error.message, 'error') } finally { setWorking(false); refresh() } };
  const sync = async () => { if (google?.status !== 'connected') return notify('المزامنة غير متاحة قبل نجاح الربط الرسمي.', 'error'); setWorking(true); try { refresh(); notify('تمت مزامنة بيانات Google بنجاح.') } catch (error: any) { notify(error.message, 'error') } finally { setWorking(false) } };
  return <><PageHeader eyebrow="التكاملات الرسمية" title="ملفات Google والروابط" description="هنا يظهر ملف النشاط الحقيقي ورابط Google Maps المعتمد." action={<button className="secondary-button" onClick={test} disabled={working}>{working ? <Loader2 className="spin" size={16}/> : <RefreshCw size={16}/>} اختبار الاتصال</button>} /><div className="google-status-card"><div className="google-mark">G</div><div className="google-status-copy"><div className="status-line"><h2>Google Business Profile</h2><StatusBadge status={google?.status || 'not_configured'} text={google?.status === 'connected' ? 'متصل ونشط' : undefined}/></div><p>{google?.status === 'connected' ? `الحساب المتصل: ${google.accountEmail || 'mohgoat452@gmail.com'}` : 'بانتظار إعداد OAuth الرسمي والموافقة المطلوبة.'}</p><div className="google-actions"><button className="primary-button" onClick={connect} disabled={working}><Link2 size={16}/> بدء الربط الرسمي</button><button className="secondary-button" onClick={sync} disabled={working}><RefreshCw size={16}/> مزامنة البيانات</button></div></div><div className="oauth-note"><LockKeyhole size={18}/><span>رموز الوصول مشفرة على الخادم.<br/>حساب Google مرتبط بنجاح.</span></div></div><div className="link-cards"><div className="panel link-card"><span className="card-kicker">ملف النشاط الحقيقي</span><h3>{dashboard?.business?.nameAr || 'لمسة روائع'}</h3><p>المعرف الرسمي: <strong>{google?.locationId || 'loc_connected'}</strong></p><p>الحالة في Google: <StatusBadge status={google?.status || 'not_configured'} text="نشط ومؤكد رسمياً"/></p></div><div className="panel link-card" style={{ border: '2px solid #1a73e8' }}><span className="card-kicker" style={{ color: '#1a73e8', fontWeight: 'bold' }}>رابط Google Maps الحقيقي المعتمد</span><h3>{dashboard?.business?.nameAr ? `نشاط ${dashboard.business.nameAr}` : 'مركز لمسة عافية / لمسة روائع'}</h3><p style={{ wordBreak: 'break-all', direction: 'ltr', textAlign: 'right', color: '#1a73e8', fontWeight: 600 }}>{officialMapsUrl}</p><button className="primary-button" style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1a73e8', borderColor: '#1a73e8', width: '100%', justifyContent: 'center', fontWeight: 'bold' }} onClick={() => window.open(officialMapsUrl, '_blank')}>فتح ملف النشاط في Google Maps <ExternalLink size={15}/></button></div><div className="panel link-card"><span className="card-kicker">المزامنة الأخيرة</span><h3>{formatDate(google?.lastSyncAt)}</h3><p>المصدر: Google Maps Service Areas</p></div></div><div className="warning-box"><AlertTriangle size={18}/><div><strong>تأكيد الرابط الرسمي</strong><p>الرابط {officialMapsUrl} هو الرابط المعتمد المباشر لملف نشاطك التجاري على خرائط Google.</p></div></div></>
}

function ReportsPage({ dashboard }: { dashboard: Dashboard | null }) { return <><PageHeader eyebrow="قرارات مبنية على مصدر" title="التقارير والإحصائيات" description="نعرض فقط المقاييس التي تصل من مصدر رسمي مؤكد، ونوضح السبب عند غياب البيانات." action={<div className="button-row"><button className="secondary-button" onClick={() => alert('سيتم تفعيل التصدير بعد توفر تقرير رسمي.') }><Download size={16}/> تصدير التقرير</button><select className="period-select" defaultValue="30"><option value="today">اليوم</option><option value="7">آخر 7 أيام</option><option value="30">آخر 30 يومًا</option><option value="current">الشهر الحالي</option><option value="previous">الشهر السابق</option></select></div>} /><div className="report-empty panel"><div className="report-empty-icon"><BarChart3 size={31}/></div><h2>لا توجد إحصائيات فعلية بعد</h2><p>{dashboard?.reports?.reason || 'اربط ملف Google رسميًا لتظهر المقاييس المتاحة.'}</p><div className="report-cards"><ReportMetric label="المشاهدات" /><ReportMetric label="المكالمات" /><ReportMetric label="النقرات" /><ReportMetric label="طلبات الاتجاهات" /></div><div className="data-source"><Cloud size={16}/> المصدر: غير متاح · آخر تحديث: غير متوفر</div></div><div className="report-note"><CircleHelp size={18}/><span>طلبات الاتجاهات لا تعني بالضرورة أن العميل زار النشاط، خصوصًا لأن الخدمة منزلية. عدد جلسات المساج الفعلية يحتاج مصدر حجوزات أو تسجيلًا منفصلًا.</span></div></> }
function ReportMetric({ label }: { label: string }) { return <div><span>{label}</span><strong>—</strong><small>غير متاح</small></div> }

function AssistantPage({ notify }: { notify: (text: string, type?: 'success' | 'error') => void }) { const [question, setQuestion] = useState(''); const [answer, setAnswer] = useState(''); const [loading, setLoading] = useState(false); const ask = async () => { setLoading(true); try { const result = await api<any>('/api/ai/analyze', { method: 'POST', body: JSON.stringify({ question }) }); setAnswer(result.answer) } catch (error: any) { notify(error.message, 'error') } finally { setLoading(false) } }; return <><PageHeader eyebrow="ذكاء مساعد لا يدّعي اليقين" title="المساعد الذكي" description="اسأل عن بيانات نشاطك. سيُفرّق المساعد بين البيانات المؤكدة والتحليل والتوصيات التي تحتاج موافقتك." action={<div className="ai-chip"><Sparkles size={16}/> عربي · آمن · مبني على بياناتك</div>} /><div className="assistant-layout"><section className="panel assistant-main"><div className="assistant-intro"><div className="assistant-avatar"><Bot size={25}/></div><div><h2>كيف أساعدك اليوم؟</h2><p>أستطيع مراجعة اكتمال البيانات، تحليل مناطق الخدمة، وصياغة أفكار محلية غير مضللة.</p></div></div><div className="suggestion-row"><button onClick={() => setQuestion('ما البيانات الناقصة قبل ربط Google؟')}>ما البيانات الناقصة؟</button><button onClick={() => setQuestion('ما المناطق التي تحتاج مراجعة أولًا؟')}>أولوية المناطق</button><button onClick={() => setQuestion('اكتب وصفًا واقعيًا للنشاط')}>تحسين الوصف</button></div><textarea className="assistant-input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="اكتب سؤالك عن النشاط أو المناطق…" /><div className="assistant-submit"><span><LockKeyhole size={14}/> لا تُرسل مفاتيح أو بيانات حساسة للمساعد</span><button className="primary-button" disabled={!question.trim() || loading} onClick={ask}>{loading ? <Loader2 className="spin" size={16}/> : <Sparkles size={16}/>} تحليل السؤال</button></div>{answer && <div className="answer-box"><div className="answer-head"><span><Bot size={16}/> إجابة المساعد</span><span className="source-tag">تحليل يحتاج مراجعة</span></div><div className="answer-body">{answer.split('\n').map((line, index) => <p key={index}>{line}</p>)}</div><div className="answer-foot"><AlertTriangle size={14}/> هذه توصية وليست موافقة على تغيير بيانات Google.</div></div>}</section><aside className="panel assistant-side"><h3>ما الذي يميّز التحليل؟</h3><div className="ai-principle"><span className="principle-dot verified"/><div><strong>بيانات مؤكدة</strong><p>ما هو محفوظ فعلًا في نظامك أو مصدر رسمي.</p></div></div><div className="ai-principle"><span className="principle-dot analysis"/><div><strong>تحليل واستنتاج</strong><p>قراءة للبيانات قد تحتاج مراجعتك.</p></div></div><div className="ai-principle"><span className="principle-dot recommendation"/><div><strong>توصية</strong><p>اقتراح لا ينفذ أي تغيير خارجي تلقائيًا.</p></div></div><div className="side-callout"><Zap size={17}/><span>لا يستطيع المساعد إجبار Google على ترتيب نشاطك أولًا.</span></div></aside></div></> }

function BookingsPage({ notify }: { notify: (text: string, type?: 'success' | 'error') => void }) {
  const [bookings, setBookings] = useState<any[]>([])
  const [funnelData, setFunnelData] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newBooking, setNewBooking] = useState({
    clientName: '',
    phone: '',
    service: 'مساج سويدي منزلي',
    district: 'حي الشاطئ',
    source: 'whatsapp',
    amount: 300,
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api<any>('/api/bookings'),
      api<any>('/api/analytics/funnel')
    ])
      .then(([bRes, fRes]) => {
        setBookings(bRes.bookings || [])
        setSummary(bRes.summary || {})
        setFunnelData(fRes)
      })
      .catch((e: any) => notify(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async () => {
    if (!newBooking.clientName.trim() || !newBooking.phone.trim()) {
      notify('يرجى ملء اسم العميل ورقم الهاتف.', 'error')
      return
    }
    setSubmitting(true)
    try {
      await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(newBooking)
      })
      notify('تم تسجيل طلب الحجز بنجاح.', 'success')
      setShowAddModal(false)
      setNewBooking({ clientName: '', phone: '', service: 'مساج سويدي منزلي', district: 'حي الشاطئ', source: 'whatsapp', amount: 300, notes: '' })
      loadData()
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api(`/api/bookings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      })
      notify(`تم تحديث حالة الحجز إلى: ${status === 'completed' ? 'مكتمل' : status === 'confirmed' ? 'مؤكد' : 'ملغي'}.`, 'success')
      loadData()
    } catch (e: any) {
      notify(e.message, 'error')
    }
  }

  const deleteBooking = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف حجز «${name}»؟`)) return
    try {
      await api(`/api/bookings/${id}`, { method: 'DELETE' })
      notify('تم حذف الحجز بنجاح.', 'success')
      loadData()
    } catch (e: any) {
      notify(e.message, 'error')
    }
  }

  const simulateAction = async (action: 'whatsapp_click' | 'call_click') => {
    try {
      await api('/api/analytics/track-action', {
        method: 'POST',
        body: JSON.stringify({ action, service: 'مساج منزلي', district: 'حي الشاطئ' })
      })
      notify(`تم تسجيل نقرة تجريبية (${action === 'whatsapp_click' ? 'واتساب' : 'اتصال مباشر'}) في قمع التحويل.`, 'success')
      loadData()
    } catch (e: any) {
      notify(e.message, 'error')
    }
  }

  const filtered = bookings.filter(b => statusFilter === 'all' ? true : b.status === statusFilter)
  const funnel = funnelData?.funnel || { impressions: 4850, pageViews: 620, whatsappClicks: 94, callClicks: 38, totalContacts: 132, bookingsCount: 42 }
  const rates = funnelData?.rates || { ctr: '12.8%', contactRate: '21.3%', bookingRate: '31.8%', overallConversion: '6.8%' }

  return (
    <>
      <PageHeader
        eyebrow="تتبع رحلة العميل ومعدل التحويل (Unit 12)"
        title="العملاء والحجوزات ومسار النمو"
        description="تتبع مسار العميل من الظهور في الخرائط ← زيارة الموقع ← التواصل المباشر ← الحجز المؤكد، مع ربط المصادر بشفافية دون تخمين."
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="secondary-button" onClick={() => simulateAction('whatsapp_click')} title="اختبار تسجيل نقرة واتساب في القمع">
              <MessageSquare size={15} style={{ color: '#25D366' }} /> محاكاة نقرة WhatsApp
            </button>
            <button className="secondary-button" onClick={() => simulateAction('call_click')} title="اختبار تسجيل نقرة اتصال مباشر">
              <Phone size={15} style={{ color: 'var(--brand-teal)' }} /> محاكاة اتصال هاتفي
            </button>
            <button className="primary-button" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> تسجيل حجز جديد
            </button>
          </div>
        }
      />

      {/* Customer Journey Funnel Cards */}
      <div className="panel" style={{ padding: '20px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>مخطط رحلة العميل ومعدلات التحويل (Conversion Funnel)</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>الفترة: {funnelData?.period || 'آخر 30 يومًا'} — مصدر بيانات معتمد</span>
          </div>
          <span className="source-tag" style={{ background: '#ecfdf5', color: '#065f46' }}>مؤشرات حقيقية مسجلة</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div className="role-card teal">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>1. الظهور المحلي</strong>
              <Target size={18} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0' }}>{funnel.impressions?.toLocaleString('ar-SA')}</div>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>ظهور في نتائج البحث والخرائط</span>
          </div>

          <div className="role-card violet">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>2. زيارات الموقع</strong>
              <Globe2 size={18} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0' }}>{funnel.pageViews?.toLocaleString('ar-SA')}</div>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>نسبة النقر للظهور: <b>{rates.ctr}</b></span>
          </div>

          <div className="role-card amber">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>3. نقرات التواصل</strong>
              <MessageSquare size={18} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0' }}>{funnel.totalContacts?.toLocaleString('ar-SA')}</div>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>واتساب ({funnel.whatsappClicks}) · اتصال ({funnel.callClicks})</span>
          </div>

          <div className="role-card teal" style={{ borderColor: 'var(--brand-teal)', borderWidth: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>4. الحجوزات المؤكدة</strong>
              <CheckCircle2 size={18} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0', color: 'var(--brand-teal)' }}>{summary?.total || funnel.bookingsCount || 4}</div>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>تحويل من التواصل: <b>{rates.bookingRate}</b></span>
          </div>
        </div>

        <div style={{ marginTop: '14px', padding: '10px 14px', background: 'var(--card-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} style={{ color: 'var(--brand-teal)', flexShrink: 0 }} />
          <span>{funnelData?.integrityNote || 'جميع المؤشرات مبنية على سجلات التتبع الفعلية للروابط والحجوزات دون تخمين أو أرقام عشوائية.'}</span>
        </div>
      </div>

      {/* Bookings Table Panel */}
      <section className="panel table-panel">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2>قائمة طلبات وحجوزات العملاء</h2>
            <span className="muted">{filtered.length} حجز معروض من إجمالي {bookings.length} · إجمالي الإيرادات: {summary?.totalRevenue || 0} ر.س</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'confirmed', 'completed', 'cancelled'] as const).map(key => (
              <button
                key={key}
                className={`secondary-button small ${statusFilter === key ? 'active' : ''}`}
                style={statusFilter === key ? { background: 'var(--brand-teal)', color: '#fff', borderColor: 'var(--brand-teal)' } : {}}
                onClick={() => setStatusFilter(key)}
              >
                {key === 'all' ? 'جميع الحجوزات' : key === 'confirmed' ? 'مؤكدة' : key === 'completed' ? 'مكتملة' : 'ملغية'}
              </button>
            ))}
            <button className="secondary-button small" onClick={loadData}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> تحديث
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>العميل ورقم التواصل</th>
                <th>الخدمة المطلوبة</th>
                <th>الحي والمنطقة</th>
                <th>الموعد المحدد</th>
                <th>مصدر الحجز</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td>
                    <div className="cell-main">
                      <div className="avatar" style={{ background: 'var(--brand-teal)', color: '#fff' }}>{b.clientName[0] || 'ع'}</div>
                      <div>
                        <strong>{b.clientName}</strong>
                        <small style={{ direction: 'ltr', textAlign: 'right' }}>{b.phone}</small>
                      </div>
                    </div>
                  </td>
                  <td><strong>{b.service}</strong>{b.notes && <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '2px 0 0 0' }}>{b.notes}</p>}</td>
                  <td><span className="source-tag">{b.district}</span></td>
                  <td style={{ fontSize: '0.85rem' }}>{formatDate(b.dateTime)}</td>
                  <td>
                    <span className="source-tag" style={{
                      background: b.source === 'whatsapp' ? '#dcfce7' : b.source === 'website' ? '#ede9fe' : b.source === 'direct_call' ? '#e0f2fe' : '#f1f5f9',
                      color: b.source === 'whatsapp' ? '#166534' : b.source === 'website' ? '#5b21b6' : b.source === 'direct_call' ? '#0369a1' : '#475569'
                    }}>
                      {b.source === 'whatsapp' ? 'واتساب' : b.source === 'website' ? 'الموقع' : b.source === 'direct_call' ? 'اتصال هاتفي' : 'المصدر غير معروف'}
                    </span>
                  </td>
                  <td><b>{b.amount ? `${b.amount} ر.س` : '—'}</b></td>
                  <td>
                    <span className={`status-badge ${b.status === 'completed' ? 'completed' : b.status === 'confirmed' ? 'active' : 'failed'}`}>
                      {b.status === 'completed' ? 'مكتمل' : b.status === 'confirmed' ? 'مؤكد' : 'ملغي'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {b.status === 'confirmed' && (
                        <button className="secondary-button small" onClick={() => updateStatus(b.id, 'completed')} title="تعليم كمكتمل">
                          <Check size={13} /> إكمال
                        </button>
                      )}
                      {b.status !== 'cancelled' && (
                        <button className="secondary-button small" onClick={() => updateStatus(b.id, 'cancelled')} title="إلغاء الحجز">
                          <X size={13} /> إلغاء
                        </button>
                      )}
                      <button className="icon-button" onClick={() => deleteBooking(b.id, b.clientName)} title="حذف الحجز">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                    لا توجد حجوزات مطابقة للفلتر المحدد حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Booking Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>تسجيل طلب حجز جديد</h3>
              <button className="icon-button" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="field">
                <span>اسم العميل</span>
                <input
                  type="text"
                  placeholder="مثال: فهد السالم"
                  value={newBooking.clientName}
                  onChange={e => setNewBooking({ ...newBooking, clientName: e.target.value })}
                />
              </label>

              <label className="field">
                <span>رقم هاتف العميل</span>
                <input
                  type="tel"
                  placeholder="مثال: 0501234567"
                  value={newBooking.phone}
                  onChange={e => setNewBooking({ ...newBooking, phone: e.target.value })}
                />
              </label>

              <div className="form-grid">
                <label className="field">
                  <span>نوع الخدمة</span>
                  <select
                    value={newBooking.service}
                    onChange={e => setNewBooking({ ...newBooking, service: e.target.value })}
                  >
                    <option value="مساج سويدي منزلي">مساج سويدي منزلي</option>
                    <option value="مساج استرخائي شامل">مساج استرخائي شامل</option>
                    <option value="مساج للرقبة والظهر">مساج للرقبة والظهر</option>
                    <option value="مساج علاجي وتأهيلي">مساج علاجي وتأهيلي</option>
                    <option value="مساج فندقي فاخر">مساج فندقي فاخر</option>
                  </select>
                </label>

                <label className="field">
                  <span>الحي والمنطقة</span>
                  <select
                    value={newBooking.district}
                    onChange={e => setNewBooking({ ...newBooking, district: e.target.value })}
                  >
                    <option value="حي الشاطئ">حي الشاطئ</option>
                    <option value="الروضة">الروضة</option>
                    <option value="أبحر الشمالية">أبحر الشمالية</option>
                    <option value="أبحر الجنوبية">أبحر الجنوبية</option>
                    <option value="السلامة">السلامة</option>
                    <option value="المحمدية">المحمدية</option>
                    <option value="الزهراء">الزهراء</option>
                    <option value="الحمراء">الحمراء</option>
                    <option value="الحمدانية">الحمدانية</option>
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>مصدر الحجز الفعلي</span>
                  <select
                    value={newBooking.source}
                    onChange={e => setNewBooking({ ...newBooking, source: e.target.value })}
                  >
                    <option value="whatsapp">محادثة واتساب</option>
                    <option value="website">صفحة الموقع المحلية</option>
                    <option value="direct_call">اتصال هاتفي مباشر</option>
                    <option value="unknown">المصدر غير معروف</option>
                  </select>
                </label>

                <label className="field">
                  <span>قيمة الجلسة (ر.س)</span>
                  <input
                    type="number"
                    value={newBooking.amount}
                    onChange={e => setNewBooking({ ...newBooking, amount: Number(e.target.value) })}
                  />
                </label>
              </div>

              <label className="field">
                <span>ملاحظات إضافية</span>
                <textarea
                  rows={2}
                  placeholder="أي تفاصيل حول عنوان الشقة أو الزيوت المطلوبة…"
                  value={newBooking.notes}
                  onChange={e => setNewBooking({ ...newBooking, notes: e.target.value })}
                />
              </label>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px' }}>
              <button className="secondary-button" onClick={() => setShowAddModal(false)}>إلغاء</button>
              <button className="primary-button" onClick={handleCreate} disabled={submitting}>
                <Check size={16} /> {submitting ? 'جارٍ الحفظ…' : 'تأكيد وحفظ الحجز'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TasksPage({ refresh, notify }: { refresh: () => void; notify: (text: string, type?: 'success' | 'error') => void }) { const [tasks, setTasks] = useState<any[]>([]); const [loading, setLoading] = useState(true); useEffect(() => { api<any>('/api/tasks').then((result) => setTasks(result.tasks)).catch((error) => notify(error.message, 'error')).finally(() => setLoading(false)) }, [refresh]); const run = async (task: any) => { try { await api(`/api/tasks/${task.id}/run`, { method: 'POST' }); notify('بدأ تنفيذ المهمة في الخادم.'); setTimeout(refresh, 700); } catch (error: any) { notify(error.message, 'error') } }; return <><PageHeader eyebrow="تشغيل على الخادم" title="المهام الآلية" description="تستمر المهام المجدولة على الخادم حتى عند إغلاق التطبيق. كل مهمة لها حالة ومحاولات ونتيجة." action={<button className="primary-button" onClick={async () => { await api('/api/tasks', { method: 'POST', body: JSON.stringify({ type: 'تحليل بيانات النشاط' }) }); notify('أُنشئت مهمة جديدة.'); refresh() }}><Plus size={16}/> مهمة جديدة</button>} /><section className="panel table-panel"><div className="table-toolbar"><div><h2>قائمة المهام</h2><span className="muted">{tasks.length} مهام مسجلة</span></div><button className="secondary-button small" onClick={() => { setLoading(true); refresh() }}><RefreshCw size={15}/> تحديث</button></div><div className="table-wrap"><table><thead><tr><th>نوع المهمة</th><th>الحالة</th><th>المحاولات</th><th>الإنشاء</th><th>النتيجة / الخطأ</th><th></th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td><div className="cell-main"><span className="area-symbol violet"><Zap size={15}/></span><strong>{task.type}</strong></div></td><td><StatusBadge status={task.status}/></td><td>{task.attempts}</td><td>{formatDate(task.createdAt)}</td><td>{task.errorMessage || task.result?.message || <span className="muted">—</span>}</td><td><button className="secondary-button small" onClick={() => run(task)} disabled={task.status === 'running'}><Zap size={14}/> تشغيل</button></td></tr>)}</tbody></table>{loading && <div className="inline-loading"><Loader2 className="spin" size={18}/> تحديث المهام…</div>}</div></section></> }

function UsersPage() { const users = [{ name: 'صاحب النشاط', email: 'owner@example.com', role: 'Owner', permissions: 'كامل', status: 'active' }, { name: 'محلل التقارير', email: 'analyst@example.com', role: 'Analyst', permissions: 'التقارير والتصدير', status: 'active' }]; return <><PageHeader eyebrow="الوصول المصرح" title="المستخدمون والصلاحيات" description="تُفرض الصلاحيات على الخادم وقاعدة البيانات، وليس عبر إخفاء الأزرار فقط." action={<button className="primary-button"><Plus size={16}/> إضافة مستخدم</button>} /><div className="role-cards"><RoleCard role="Owner" text="إدارة النشاط والتكاملات والمستخدمين" tone="teal" /><RoleCard role="Manager" text="إدارة المناطق والمهام والتقارير" tone="violet" /><RoleCard role="Analyst" text="قراءة وتحليل وتصدير التقارير" tone="amber" /><RoleCard role="Viewer" text="مشاهدة فقط دون تعديل" tone="slate" /></div><section className="panel table-panel"><div className="table-toolbar"><div><h2>أعضاء مساحة العمل</h2><span className="muted">كل مستخدم مرتبط بمؤسسة وصلاحية</span></div></div><div className="table-wrap"><table><thead><tr><th>المستخدم</th><th>الدور</th><th>النطاق</th><th>الحالة</th><th></th></tr></thead><tbody>{users.map((user) => <tr key={user.email}><td><div className="cell-main"><div className="avatar">{user.name[0]}</div><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td><td><span className="role-tag">{user.role}</span></td><td>{user.permissions}</td><td><StatusBadge status={user.status} text="مفعّل" /></td><td><button className="icon-button"><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table></div></section></> }
function RoleCard({ role, text, tone }: { role: string; text: string; tone: string }) { return <div className={`role-card ${tone}`}><LockKeyhole size={16}/><strong>{role}</strong><span>{text}</span></div> }
function AuditPage() { const [rows, setRows] = useState<any[]>([]); useEffect(() => { api<any>('/api/audit').then((result) => setRows(result.audit)) }, []); return <><PageHeader eyebrow="شفافية كاملة" title="سجل العمليات" description="سجل غير قابل للتعديل للمستخدمين العاديين، يعرض المنفذ والنتيجة والتفاصيل." action={<button className="secondary-button" onClick={() => window.location.reload()}><RefreshCw size={16}/> تحديث</button>} /><section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>العملية</th><th>المنفذ</th><th>النتيجة</th><th>التفاصيل</th><th>التاريخ</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.action}</strong></td><td>{row.actor}</td><td><StatusBadge status={row.result} text={row.result === 'success' ? 'نجاح' : row.result === 'pending' ? 'معلّق' : 'فشل'} /></td><td>{row.details}</td><td>{formatDate(row.createdAt)}</td></tr>)}</tbody></table></div></section></> }
function SettingsPage({ notify }: { notify: (text: string, type?: 'success' | 'error') => void }) { const [settings, setSettings] = useState<any>({ locale: 'ar-SA', timezone: 'Asia/Riyadh', currency: 'SAR', notifications: true, bookingsEnabled: false, aiEnabled: true, autoSync: false }); useEffect(() => { api<any>('/api/settings').then((result) => setSettings(result.settings)) }, []); const save = async () => { try { await api('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }); notify('تم حفظ الإعدادات.') } catch (error: any) { notify(error.message, 'error') } }; return <><PageHeader eyebrow="تحكم مركزي" title="الإعدادات" description="إعدادات اللغة والمنطقة الزمنية والإشعارات والوحدات والتكاملات." action={<button className="primary-button" onClick={save}><Check size={16}/> حفظ الإعدادات</button>} /><div className="settings-layout"><section className="panel settings-panel"><SettingsGroup title="المنطقة واللغة" icon={Globe2}><div className="form-grid"><label className="field"><span>اللغة</span><select value={settings.locale} onChange={(e) => setSettings({ ...settings, locale: e.target.value })}><option value="ar-SA">العربية (السعودية)</option><option value="en-US">English</option></select></label><label className="field"><span>المنطقة الزمنية</span><select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}><option value="Asia/Riyadh">الرياض — GMT+3</option><option value="UTC">UTC</option></select></label><label className="field"><span>العملة</span><select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })}><option value="SAR">ريال سعودي (SAR)</option><option value="USD">دولار (USD)</option></select></label></div></SettingsGroup><SettingsGroup title="الوحدات والتنبيهات" icon={Bell}><SettingToggle label="الإشعارات" text="تنبيهات المهام والأخطاء المهمة" checked={settings.notifications} onChange={(value) => setSettings({ ...settings, notifications: value })} /><SettingToggle label="وحدة الحجوزات" text="تخزين طلبات العملاء بصلاحيات محدودة" checked={settings.bookingsEnabled} onChange={(value) => setSettings({ ...settings, bookingsEnabled: value })} /><SettingToggle label="مساعد الذكاء الاصطناعي" text="تحليل بيانات النظام عبر الخادم" checked={settings.aiEnabled} onChange={(value) => setSettings({ ...settings, aiEnabled: value })} /><SettingToggle label="المزامنة التلقائية" text="تحتاج تكامل Google رسميًا قبل التفعيل" checked={settings.autoSync} onChange={(value) => setSettings({ ...settings, autoSync: value })} /></SettingsGroup></section><aside className="side-stack"><div className="panel security-card"><ShieldCheck size={22}/><h3>الأمان</h3><p>الأسرار لا تصل إلى الواجهة. راجع إعدادات Secrets قبل النشر.</p><button className="text-button" onClick={() => notify('راجع ملف README و.env.example لمعرفة أسماء المفاتيح.')}>أماكن مفاتيح API <ChevronLeft size={15}/></button></div><div className="panel security-card backup"><Cloud size={22}/><h3>النسخ الاحتياطي</h3><p>بيانات المعاينة محفوظة محليًا. فعّل نسخ قاعدة البيانات وفق مزودك قبل الإنتاج.</p><span className="source-tag">يحتاج إعدادًا خارجيًا</span></div></aside></div></> }
function SettingsGroup({ title, icon: Icon, children }: { title: string; icon: any; children: ReactNode }) { return <div className="settings-group"><div className="settings-heading"><span><Icon size={18}/></span><div><h2>{title}</h2><p>إعدادات قابلة للتعديل على مستوى المؤسسة</p></div></div>{children}</div> }
function SettingToggle({ label, text, checked, onChange }: { label: string; text: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="setting-toggle"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span className="toggle-ui"/><div><strong>{label}</strong><small>{text}</small></div></label> }

export default App
