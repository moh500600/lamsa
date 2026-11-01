import React, { useState, useEffect } from 'react'
import { 
  Cloud, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  RefreshCw, 
  X, 
  Copy, 
  Check, 
  Server, 
  ShieldCheck, 
  ExternalLink, 
  Download, 
  FileCode, 
  Archive,
  Layers,
  ArrowRight
} from 'lucide-react'

interface SupabaseStatus {
  configured: boolean
  connected: boolean
  url: string | null
  hasServiceKey: boolean
  hasAnonKey: boolean
  ready: boolean
  message: string
  error?: string
}

interface MigrationResult {
  ok: boolean
  message: string
  timestamp: string
  backupFile?: string
  transferred?: {
    businesses: number
    serviceAreas: number
    visibilityScans: number
    seoKeywords: number
    seoCompetitors: number
    seoRecommendations: number
    seoLandingPages: number
    seoReviews: number
    bookings: number
    analyticsFunnel: number
    auditLogs: number
    systemSettings: number
  }
  totalTransferred?: number
  errors?: string[]
}

interface SupabaseModalProps {
  close: () => void
  notify: (text: string, type?: 'success' | 'error') => void
  refresh: () => void
}

export default function SupabaseModal({ close, notify, refresh }: SupabaseModalProps) {
  const [activeTab, setActiveTab] = useState<'migrate' | 'config' | 'schema' | 'backups'>('migrate')
  const [status, setStatus] = useState<SupabaseStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  
  // Config form state
  const [urlInput, setUrlInput] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  
  // Schema and Backups state
  const [schemaSql, setSchemaSql] = useState('')
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [copiedSchema, setCopiedSchema] = useState(false)
  const [backups, setBackups] = useState<any[]>([])
  const [loadingBackups, setLoadingBackups] = useState(false)

  const fetchStatus = async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch('/api/supabase/status')
      const data = await res.json()
      setStatus(data)
      if (data.url && !urlInput) {
        setUrlInput(data.url)
      }
    } catch (err: any) {
      notify('تعذر فحص حالة اتصال Supabase', 'error')
    } finally {
      setLoadingStatus(false)
    }
  }

  const fetchSchema = async () => {
    setLoadingSchema(true)
    try {
      const res = await fetch('/api/supabase/schema')
      const data = await res.json()
      if (data.sql) {
        setSchemaSql(data.sql)
      }
    } catch {
      notify('تعذر تحميل كود المخطط SQL', 'error')
    } finally {
      setLoadingSchema(false)
    }
  }

  const fetchBackups = async () => {
    setLoadingBackups(true)
    try {
      const res = await fetch('/api/supabase/backups')
      const data = await res.json()
      if (data.backups) {
        setBackups(data.backups)
      }
    } catch {
      notify('تعذر جلب سجل النسخ الاحتياطية', 'error')
    } finally {
      setLoadingBackups(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    if (activeTab === 'schema' && !schemaSql) {
      fetchSchema()
    } else if (activeTab === 'backups') {
      fetchBackups()
    }
  }, [activeTab])

  const handleMigrate = async () => {
    setMigrating(true)
    setMigrationResult(null)
    try {
      const res = await fetch('/api/supabase/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data: MigrationResult = await res.json()
      setMigrationResult(data)
      
      if (data.ok) {
        notify(data.message, 'success')
        refresh()
        fetchStatus()
      } else {
        notify(data.message || 'فشلت عملية النقل السحابي', 'error')
      }
    } catch (err: any) {
      notify(err.message || 'حدث خطأ في الاتصال بالخادم', 'error')
    } finally {
      setMigrating(false)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) {
      notify('يرجى إدخال Project URL الخاص بـ Supabase', 'error')
      return
    }
    setSavingConfig(true)
    try {
      const res = await fetch('/api/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput.trim(),
          serviceKey: keyInput.trim()
        })
      })
      const data = await res.json()
      if (data.ok) {
        notify(data.message, 'success')
        fetchStatus()
        setActiveTab('migrate')
      } else {
        notify(data.error?.message || 'تعذر حفظ الإعدادات', 'error')
      }
    } catch (err: any) {
      notify(err.message || 'تعذر حفظ البيانات', 'error')
    } finally {
      setSavingConfig(false)
    }
  }

  const copySchemaToClipboard = () => {
    if (!schemaSql) return
    navigator.clipboard.writeText(schemaSql)
    setCopiedSchema(true)
    notify('تم نسخ كود SQL بالكامل إلى الحافظة', 'success')
    setTimeout(() => setCopiedSchema(false), 3000)
  }

  const downloadSchemaFile = () => {
    if (!schemaSql) return
    const blob = new Blob([schemaSql], { type: 'text/sql;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'supabase_schema.sql'
    link.click()
  }

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="modal-card" style={{
        background: 'var(--surface, #ffffff)',
        color: 'var(--text, #0f172a)',
        borderRadius: '18px',
        maxWidth: '820px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid var(--line, #e2e8f0)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--line, #e2e8f0)',
          background: 'linear-gradient(135deg, rgba(62, 207, 142, 0.08) 0%, rgba(15, 118, 110, 0.03) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#3ecf8e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              boxShadow: '0 4px 12px rgba(62, 207, 142, 0.35)'
            }}>
              <Cloud size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>نقل وإدارة البيانات السحابية (Supabase)</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted, #64748b)' }}>
                نظام تخزين دائم ومزامنة سحابية مركزية لجميع بيانات منصة لمسة روائع
              </p>
            </div>
          </div>
          <button 
            onClick={close} 
            className="icon-button"
            style={{ borderRadius: '50%', padding: '8px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          borderBottom: '1px solid var(--line, #e2e8f0)',
          background: 'var(--bg-subtle, #f8fafc)',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('migrate')}
            className={`secondary-button ${activeTab === 'migrate' ? 'active' : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'migrate' ? 700 : 500,
              background: activeTab === 'migrate' ? '#3ecf8e' : 'transparent',
              color: activeTab === 'migrate' ? '#0f172a' : 'inherit',
              borderColor: activeTab === 'migrate' ? '#3ecf8e' : 'var(--line, #e2e8f0)'
            }}
          >
            <Database size={16} /> نقل للسيرفر بضغطة زر
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`secondary-button ${activeTab === 'config' ? 'active' : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'config' ? 700 : 500,
              background: activeTab === 'config' ? '#3ecf8e' : 'transparent',
              color: activeTab === 'config' ? '#0f172a' : 'inherit',
              borderColor: activeTab === 'config' ? '#3ecf8e' : 'var(--line, #e2e8f0)'
            }}
          >
            <Server size={16} /> إعدادات الاتصال
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`secondary-button ${activeTab === 'schema' ? 'active' : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'schema' ? 700 : 500,
              background: activeTab === 'schema' ? '#3ecf8e' : 'transparent',
              color: activeTab === 'schema' ? '#0f172a' : 'inherit',
              borderColor: activeTab === 'schema' ? '#3ecf8e' : 'var(--line, #e2e8f0)'
            }}
          >
            <FileCode size={16} /> كود المخطط (SQL DDL)
          </button>

          <button
            onClick={() => setActiveTab('backups')}
            className={`secondary-button ${activeTab === 'backups' ? 'active' : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'backups' ? 700 : 500,
              background: activeTab === 'backups' ? '#3ecf8e' : 'transparent',
              color: activeTab === 'backups' ? '#0f172a' : 'inherit',
              borderColor: activeTab === 'backups' ? '#3ecf8e' : 'var(--line, #e2e8f0)'
            }}
          >
            <Archive size={16} /> النسخ الاحتياطية
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          
          {/* Status Badge Line */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '20px',
            background: status?.connected 
              ? 'rgba(62, 207, 142, 0.12)' 
              : 'rgba(234, 179, 8, 0.12)',
            border: `1px solid ${status?.connected ? 'rgba(62, 207, 142, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {loadingStatus ? (
                <Loader2 className="spin" size={18} />
              ) : status?.connected ? (
                <CheckCircle2 size={20} style={{ color: '#10b981' }} />
              ) : (
                <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
              )}
              <div>
                <strong style={{ fontSize: '0.95rem' }}>
                  {loadingStatus ? 'جارٍ فحص الاتصال…' : status?.message}
                </strong>
                {status?.url && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted, #64748b)', direction: 'ltr', textAlign: 'right' }}>
                    {status.url}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={fetchStatus}
              className="icon-button"
              disabled={loadingStatus}
              title="إعادة فحص الاتصال"
            >
              <RefreshCw size={16} className={loadingStatus ? 'spin' : ''} />
            </button>
          </div>

          {/* TAB 1: ONE-CLICK MIGRATION */}
          {activeTab === 'migrate' && (
            <div>
              <div style={{
                background: 'var(--bg-subtle, #f8fafc)',
                padding: '20px',
                borderRadius: '14px',
                border: '1px solid var(--line, #e2e8f0)',
                marginBottom: '24px'
              }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} style={{ color: '#3ecf8e' }} />
                  نقل آمن وتلقائي دون فقدان أي بيانات
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--muted, #64748b)', lineHeight: '1.6' }}>
                  عند الضغط على الزر أدناه، يقوم النظام فوراً بـ:
                </p>
                <ul style={{ margin: 0, paddingRight: '20px', fontSize: '0.88rem', lineHeight: '1.8' }}>
                  <li><strong>إنشاء نسخة احتياطية محلية فورية</strong> وتخزينها في مجلد <code>data/backups/</code> بختم زمني.</li>
                  <li><strong>نقل جميع بيانات النظام الـ 13 قسماً</strong> (مناطق الخدمة، بيانات النشاط، كلمات SEO، الحجوزات، المراجعات، المنافسين، صفحات الهبوط، ومسح الخرائط).</li>
                  <li><strong>تنفيذ مطابقة آمنة (Upsert)</strong> تمنع التكرار وتسمح بإعادة النقل في أي وقت بأمان تام.</li>
                </ul>
              </div>

              {/* Big Action Button */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <button
                  onClick={handleMigrate}
                  disabled={migrating || !status?.connected}
                  className="primary-button"
                  style={{
                    padding: '14px 32px',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    background: status?.connected ? '#3ecf8e' : 'var(--line, #94a3b8)',
                    borderColor: status?.connected ? '#3ecf8e' : 'var(--line, #94a3b8)',
                    color: '#0f172a',
                    cursor: status?.connected && !migrating ? 'pointer' : 'not-allowed',
                    boxShadow: status?.connected ? '0 6px 20px rgba(62, 207, 142, 0.4)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  {migrating ? (
                    <>
                      <Loader2 className="spin" size={20} />
                      جارٍ نسخ البيانات ونقلها إلى Supabase…
                    </>
                  ) : (
                    <>
                      <Cloud size={20} />
                      نقل كل البيانات للسيرفر الآن (Supabase)
                    </>
                  )}
                </button>

                {!status?.connected && (
                  <div style={{ marginTop: '12px', fontSize: '0.88rem', color: '#ef4444' }}>
                    * يلزم ضبط رابط المشروع ومفتاح Supabase في تبويب «إعدادات الاتصال» أولاً للبدء بالنقل.
                  </div>
                )}
              </div>

              {/* Migration Result Report Card */}
              {migrationResult && (
                <div style={{
                  borderRadius: '14px',
                  padding: '20px',
                  background: migrationResult.ok ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${migrationResult.ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    {migrationResult.ok ? (
                      <CheckCircle2 size={22} style={{ color: '#10b981' }} />
                    ) : (
                      <AlertTriangle size={22} style={{ color: '#ef4444' }} />
                    )}
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                      {migrationResult.ok ? 'تم النقل السحابي بنجاح تام!' : 'تقرير عملية النقل'}
                    </h4>
                  </div>

                  <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>{migrationResult.message}</p>

                  {migrationResult.backupFile && (
                    <div style={{
                      fontSize: '0.85rem',
                      background: 'rgba(0,0,0,0.05)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      marginBottom: '14px'
                    }}>
                      📁 <strong>ملف النسخة الاحتياطية:</strong> <code>{migrationResult.backupFile}</code>
                    </div>
                  )}

                  {migrationResult.transferred && (
                    <div>
                      <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
                        إجمالي السجلات المنقولة ({migrationResult.totalTransferred} سجل):
                      </strong>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '8px',
                        fontSize: '0.85rem'
                      }}>
                        <div className="stat-mini">مناطق الخدمة: <strong>{migrationResult.transferred.serviceAreas}</strong></div>
                        <div className="stat-mini">الكلمات المفتاحية: <strong>{migrationResult.transferred.seoKeywords}</strong></div>
                        <div className="stat-mini">الحجوزات: <strong>{migrationResult.transferred.bookings}</strong></div>
                        <div className="stat-mini">المراجعات والتقييمات: <strong>{migrationResult.transferred.seoReviews}</strong></div>
                        <div className="stat-mini">مسح الظهور: <strong>{migrationResult.transferred.visibilityScans}</strong></div>
                        <div className="stat-mini">المنافسون: <strong>{migrationResult.transferred.seoCompetitors}</strong></div>
                        <div className="stat-mini">صفحات الهبوط: <strong>{migrationResult.transferred.seoLandingPages}</strong></div>
                        <div className="stat-mini">التوصيات الذكية: <strong>{migrationResult.transferred.seoRecommendations}</strong></div>
                        <div className="stat-mini">بيانات النشاط: <strong>{migrationResult.transferred.businesses}</strong></div>
                        <div className="stat-mini">إعدادات النظام: <strong>{migrationResult.transferred.systemSettings}</strong></div>
                      </div>
                    </div>
                  )}

                  {migrationResult.errors && migrationResult.errors.length > 0 && (
                    <div style={{ marginTop: '14px', color: '#ef4444', fontSize: '0.85rem' }}>
                      <strong>ملاحظات الترحيل:</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingRight: '20px' }}>
                        {migrationResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONFIG */}
          {activeTab === 'config' && (
            <div>
              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: 'var(--bg-subtle, #f8fafc)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--line, #e2e8f0)',
                  fontSize: '0.88rem',
                  lineHeight: '1.6'
                }}>
                  <strong>خطوات الحصول على بيانات الربط من Supabase:</strong>
                  <ol style={{ margin: '8px 0 0 0', paddingRight: '20px' }}>
                    <li>افتح مشروعك في <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{ color: '#10b981', fontWeight: 'bold' }}>لوحة تحكم Supabase</a>.</li>
                    <li>انتقل إلى <strong>Project Settings</strong> ➔ <strong>API</strong>.</li>
                    <li>انسخ <strong>Project URL</strong> و <strong>service_role (secret)</strong> أو <strong>anon (public)</strong>.</li>
                  </ol>
                </div>

                <label className="field full">
                  <span>Supabase Project URL <b>*</b></span>
                  <input
                    type="url"
                    placeholder="https://your-project.supabase.co"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    required
                    style={{ direction: 'ltr', textAlign: 'left' }}
                  />
                </label>

                <label className="field full">
                  <span>Supabase Secret / Anon Key <b>*</b></span>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    required
                    style={{ direction: 'ltr', textAlign: 'left' }}
                  />
                  <small style={{ color: 'var(--muted, #64748b)', marginTop: '4px' }}>
                    يتم تخزين المفتاح بأمان داخل ملف <code>.env</code> في الخادم ولا يتم إرساله إطلاقاً لمتصفح العميل.
                  </small>
                </label>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={savingConfig}
                    style={{ background: '#3ecf8e', borderColor: '#3ecf8e', color: '#0f172a', fontWeight: 'bold' }}
                  >
                    {savingConfig ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
                    حفظ واختبار الاتصال
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={fetchStatus}
                    disabled={loadingStatus}
                  >
                    فحص الاتصال فقط
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SQL SCHEMA */}
          {activeTab === 'schema' && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>مخطط الجداول وسياسات الأمان (PostgreSQL RLS)</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted, #64748b)' }}>
                    يحتوي على 13 جدولاً وفهارس متقدمة وسياسات حماية Row Level Security.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={copySchemaToClipboard}
                    className="secondary-button small"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedSchema ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                    {copiedSchema ? 'تم النسخ!' : 'نسخ الكود'}
                  </button>
                  <button
                    onClick={downloadSchemaFile}
                    className="secondary-button small"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> تحميل .sql
                  </button>
                </div>
              </div>

              {loadingSchema ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 className="spin" size={24} />
                  <p>جارٍ تحميل كود المخطط…</p>
                </div>
              ) : (
                <pre style={{
                  background: 'var(--code-bg, #0f172a)',
                  color: '#e2e8f0',
                  padding: '16px',
                  borderRadius: '12px',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  direction: 'ltr',
                  textAlign: 'left',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace'
                }}>
                  {schemaSql}
                </pre>
              )}
            </div>
          )}

          {/* TAB 4: BACKUPS */}
          {activeTab === 'backups' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>سجل النسخ الاحتياطية المحلية للمشروع</h4>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/supabase/backup-now', { method: 'POST' })
                      const data = await res.json()
                      if (data.ok) {
                        notify(data.message, 'success')
                        fetchBackups()
                      } else {
                        notify(data.error?.message || 'تعذر حفظ النسخة الاحتياطية', 'error')
                      }
                    } catch {
                      notify('خطأ في الاتصال بالخادم', 'error')
                    }
                  }}
                  className="secondary-button small"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Archive size={14} /> إنشاء نسخة احتياطية الآن
                </button>
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--muted, #64748b)' }}>
                يتم إنشاء نسخة احتياطية محلية تلقائية في كل مرة تضغط فيها على زر «نقل للسيرفر» لضمان أمان البيانات 100%.
              </p>

              {loadingBackups ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 className="spin" size={24} />
                  <p>جارٍ فحص ملفات النسخ الاحتياطية…</p>
                </div>
              ) : backups.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '30px',
                  background: 'var(--bg-subtle, #f8fafc)',
                  borderRadius: '12px'
                }}>
                  <Archive size={32} style={{ color: 'var(--muted, #64748b)', margin: '0 auto 8px auto' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>لا توجد نسخ احتياطية بعد. يمكنك الضغط على «إنشاء نسخة احتياطية الآن» أعلاه.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {backups.map((b, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'var(--bg-subtle, #f8fafc)',
                        border: '1px solid var(--line, #e2e8f0)',
                        borderRadius: '10px'
                      }}
                    >
                      <div>
                        <strong>{b.fileName || b.filename}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted, #64748b)' }}>
                          الحجم: {(b.sizeBytes / 1024).toFixed(1)} KB · التاريخ: {new Date(b.createdAt).toLocaleString('ar-SA')}
                        </div>
                      </div>
                      <span className="status-badge completed">محفوظ محلياً</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: '1px solid var(--line, #e2e8f0)',
          background: 'var(--bg-subtle, #f8fafc)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted, #64748b)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: '#10b981' }} />
            حماية كاملة: لا يتم حذف البيانات المحلية عند النقل للسيرفر.
          </div>
          <button className="secondary-button" onClick={close}>إغلاق</button>
        </div>
      </div>
    </div>
  )
}
