import React, { useState, useEffect } from 'react'
import {
  Bot, Users, Target, BarChart3, Megaphone, MessageSquare, CalendarCheck2,
  Sparkles, RefreshCw, Plus, CheckCircle2, Phone, Send, Building2, MapPin, Search,
  Radio, Clock, Activity, FileText
} from 'lucide-react'

type AiHubProps = {
  notify: (text: string, type?: 'success' | 'error') => void
  api: <T>(url: string, options?: any) => Promise<T>
}

export default function AiAgentsHub({ notify, api }: AiHubProps) {
  const [activeTab, setActiveTab] = useState<'command' | 'agents' | 'leads' | 'campaigns' | 'conversations' | 'bookings' | 'activity'>('command')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Actions states
  const [discoveringDistrict, setDiscoveringDistrict] = useState('حي الشاطئ')
  const [discoveringCount, setDiscoveringCount] = useState(5)
  const [discovering, setDiscovering] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatting, setChatting] = useState(false)
  const [chatLog, setChatLog] = useState<{ sender: string; text: string }[]>([
    { sender: 'lead', text: 'السلام عليكم، هل عندكم خدمة مساج منزلي اليوم في حي الروضة؟' },
    { sender: 'agent', text: 'وعليكم السلام والرحمة يا هلا بك 🌿 نعم متوفرين في حي الروضة، وعندنا أخصائيين معتمدين بكامل التجهيزات والزيوت المعقمة. متى يناسبك الموعد اليوم؟' }
  ])

  // New Booking State
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientDistrict, setNewClientDistrict] = useState('حي الشاطئ')
  const [newClientService, setNewClientService] = useState('مساج سويدي منزلي فاخر (90 دقيقة)')
  const [bookingLoading, setBookingLoading] = useState(false)

  // New Campaign State
  const [campName, setCampName] = useState('')
  const [campDistrict, setCampDistrict] = useState('حي الروضة')
  const [campOffer, setCampOffer] = useState('جلسة مساج استرخاء ملكي')
  const [campDiscount, setCampDiscount] = useState('خصم 20% لفترة محدودة')
  const [campLoading, setCampLoading] = useState(false)

  const loadHub = async () => {
    try {
      setLoading(true)
      const res = await api<any>('/api/ai/hub')
      setData(res)
    } catch (err: any) {
      notify(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHub()
  }, [])

  const handleDiscoverLeads = async () => {
    try {
      setDiscovering(true)
      const res = await api<any>('/api/ai/leads/discover', {
        method: 'POST',
        body: JSON.stringify({ district: discoveringDistrict, count: discoveringCount })
      })
      notify(res.message || 'تم استكشاف الفرص بنجاح', 'success')
      await loadHub()
      setActiveTab('leads') // ينقلك مباشرة لقائمة الفرص والعملاء لرؤيتها فوراً
    } catch (err: any) {
      notify(err.message, 'error')
    } finally {
      setDiscovering(false)
    }
  }

  const handleSendChat = async () => {
    if (!chatMessage.trim()) return
    const userText = chatMessage
    setChatLog(prev => [...prev, { sender: 'lead', text: userText }])
    setChatMessage('')
    try {
      setChatting(true)
      const res = await api<any>('/api/ai/conversations/reply', {
        method: 'POST',
        body: JSON.stringify({ message: userText, customerName: 'أ. عبد العزيز' })
      })
      if (res.reply) {
        setChatLog(prev => [...prev, { sender: 'agent', text: res.reply }])
      }
    } catch (err: any) {
      notify(err.message, 'error')
    } finally {
      setChatting(false)
    }
  }

  const handleCreateBooking = async () => {
    if (!newClientName || !newClientPhone) {
      notify('يرجى إدخال اسم العميل ورقم الهاتف', 'error')
      return
    }
    try {
      setBookingLoading(true)
      const res = await api<any>('/api/ai/bookings/create', {
        method: 'POST',
        body: JSON.stringify({
          clientName: newClientName,
          phone: newClientPhone,
          district: newClientDistrict,
          serviceName: newClientService,
          amount: 350
        })
      })
      notify(res.message || 'تم تثبيت الحجز بنجاح', 'success')
      setNewClientName('')
      setNewClientPhone('')
      loadHub()
    } catch (err: any) {
      notify(err.message, 'error')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleCreateCampaign = async () => {
    try {
      setCampLoading(true)
      const res = await api<any>('/api/ai/campaigns/create', {
        method: 'POST',
        body: JSON.stringify({
          name: campName,
          district: campDistrict,
          offerTitle: campOffer,
          discount: campDiscount,
          channel: 'whatsapp'
        })
      })
      notify(res.message || 'تم إنشاء الحملة بنجاح', 'success')
      setCampName('')
      loadHub()
      setActiveTab('campaigns')
    } catch (err: any) {
      notify(err.message, 'error')
    } finally {
      setCampLoading(false)
    }
  }

  const m = data?.metrics || {}

  return (
    <div className="ai-page-wrap">
      {/* 1. Header with System Design Match */}
      <div className="ai-hub-header">
        <div>
          <div className="ai-hub-badge">
            <Radio size={14} className="pulse" />
            <span>نظام الوكلاء المستقلين (Autonomous AI Sales & Marketing)</span>
          </div>
          <h1 className="ai-hub-title">مركز الذكاء الاصطناعي والمبيعات المستقلة</h1>
          <p className="ai-hub-subtitle">
            فريق متكامل من 7 وكلاء ذكاء اصطناعي يعملون على مدار الساعة لزيادة حجوزات ومبيعات "لمسة روائع للمساج" بجدة عبر Supabase
          </p>
        </div>
        <button className="secondary-button" onClick={loadHub} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>تحديث المؤشرات</span>
        </button>
      </div>

      {/* 2. Standard KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Users size={18} /></div>
          <div className="stat-copy">
            <span>العملاء والفرص المكتشفة</span>
            <strong>{m.totalLeads || 0}</strong>
            <small>مؤهلون: {m.qualifiedLeads || 0} جهة</small>
          </div>
        </div>

        <div className="stat-card tone-violet">
          <div className="stat-icon"><MessageSquare size={18} /></div>
          <div className="stat-copy">
            <span>المراسلات والردود</span>
            <strong>{m.totalMessagesSent || 0}</strong>
            <small>معدل التجاوب {m.responseRate || 0}%</small>
          </div>
        </div>

        <div className="stat-card tone-amber">
          <div className="stat-icon"><CalendarCheck2 size={18} /></div>
          <div className="stat-copy">
            <span>حجوزات الذكاء الاصطناعي</span>
            <strong>{m.totalBookings || 0}</strong>
            <small>معدل التحويل {m.conversionRate || 0}%</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Sparkles size={18} /></div>
          <div className="stat-copy">
            <span>الإيرادات المحققة</span>
            <strong>{m.totalRevenue || 0} ر.س</strong>
            <small>الوكلاء النشطون: {m.activeAgentsCount || 7} / 7</small>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="ai-nav-tabs">
        {[
          { id: 'command', label: 'مركز العمليات', icon: Bot },
          { id: 'agents', label: 'الوكلاء الـ 7', icon: Target },
          { id: 'leads', label: 'اكتشاف الفرص والعملاء', icon: Users },
          { id: 'campaigns', label: 'الحملات التسويقية', icon: Megaphone },
          { id: 'conversations', label: 'المحادثات المباشرة', icon: MessageSquare },
          { id: 'bookings', label: 'الحجوزات المؤكدة', icon: CalendarCheck2 },
          { id: 'activity', label: 'سجل العمليات', icon: Activity }
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`ai-nav-tab ${isActive ? 'active' : ''}`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'command' && (
        <div className="ai-cards-grid">
          {/* Lead Discovery Card */}
          <div className="ai-card-panel">
            <div className="section-title">
              <div className="step-number"><Search size={14} /></div>
              <div>
                <h2>استكشاف فوري لفرص جديدة بجدة</h2>
                <p>البحث في الفنادق والشركات المسموحة في أحياء جدة وإدراجها كعملاء محتملين.</p>
              </div>
            </div>

            {/* Quick mini-list of latest discovered leads */}
            <div style={{ margin: '10px 0', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px', background: 'var(--surface-2)', maxHeight: '140px', overflowY: 'auto' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>آخر الفرص المكتشفة في جدة:</div>
              {(data?.leads || []).slice(0, 3).map((l: any) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--line)', fontSize: '10px' }}>
                  <div>
                    <strong>{l.businessName}</strong>
                    <span style={{ color: 'var(--muted)', marginRight: '6px' }}>({l.district})</span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{l.score}/100</span>
                </div>
              ))}
              <button 
                onClick={() => setActiveTab('leads')}
                style={{ width: '100%', background: 'transparent', color: 'var(--teal)', fontSize: '10px', fontWeight: 600, padding: '4px 0', marginTop: '4px', textAlign: 'center', cursor: 'pointer' }}
              >
                عرض جميع الفرص التفصيلية ({data?.leads?.length || 0}) ←
              </button>
            </div>

            <div className="ai-action-bar" style={{ marginTop: 'auto', paddingTop: '8px' }}>
              <select
                className="ai-select"
                value={discoveringDistrict}
                onChange={e => setDiscoveringDistrict(e.target.value)}
                style={{ flex: 1.5 }}
              >
                <option value="حي الشاطئ">حي الشاطئ</option>
                <option value="حي الروضة">حي الروضة</option>
                <option value="حي الحمراء">حي الحمراء</option>
                <option value="أبحر الشمالية">أبحر الشمالية</option>
                <option value="أبحر الجنوبية">أبحر الجنوبية</option>
                <option value="حي الخالدية">حي الخالدية</option>
                <option value="حي السلامة">حي السلامة</option>
                <option value="حي النعيم">حي النعيم</option>
              </select>
              <select
                className="ai-select"
                value={discoveringCount}
                onChange={e => setDiscoveringCount(Number(e.target.value))}
                style={{ width: '110px' }}
                title="عدد العملاء والفرص المطلوبة"
              >
                <option value={3}>3 فرص</option>
                <option value={5}>5 فرص</option>
                <option value={8}>8 فرص</option>
                <option value={10}>10 فرص</option>
              </select>
              <button
                className="primary-button"
                onClick={handleDiscoverLeads}
                disabled={discovering}
              >
                <Sparkles size={14} className={discovering ? 'spin' : ''} />
                <span>{discovering ? 'جارٍ البحث...' : 'بحث وجلب فرص'}</span>
              </button>
            </div>
          </div>

          {/* Chat Simulator Card */}
          <div className="ai-card-panel">
            <div className="section-title">
              <div className="step-number"><MessageSquare size={14} /></div>
              <div>
                <h2>تجربة رد وكيل المبيعات والتواصل (Gemini)</h2>
                <p>محاكاة الرد الآلي الذكي على استفسارات الأسعار وحجوزات المساج.</p>
              </div>
            </div>

            <div className="ai-chat-box">
              {chatLog.map((c, i) => (
                <div key={i} className={`ai-chat-bubble ${c.sender}`}>
                  <strong>{c.sender === 'lead' ? 'العميل: ' : 'وكيل المبيعات: '}</strong>
                  {c.text}
                </div>
              ))}
            </div>

            <div className="ai-action-bar">
              <input
                className="ai-input"
                placeholder="اكتب استفساراً كأنك عميل بجدة..."
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                style={{ flex: 1 }}
              />
              <button className="primary-button" onClick={handleSendChat} disabled={chatting}>
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Direct Booking Panel */}
          <div className="ai-card-panel full-width">
            <div className="section-title" style={{ marginBottom: 0 }}>
              <div className="step-number"><CalendarCheck2 size={14} /></div>
              <div>
                <h2>تثبيت حجز مباشر عبر وكيل الحجوزات الذكي (Booking Agent)</h2>
                <p>تسجيل فوري للموعد في جدول المواعيد وقاعدة بيانات Supabase وتحديث مؤشرات التحويل.</p>
              </div>
            </div>

            <div className="booking-form-grid">
              <input
                className="ai-input"
                placeholder="اسم العميل (مثال: أ. فيصل المطيري)"
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
              />
              <input
                className="ai-input"
                placeholder="رقم الهاتف (05xxxxxxxx)"
                value={newClientPhone}
                onChange={e => setNewClientPhone(e.target.value)}
              />
              <select
                className="ai-select"
                value={newClientDistrict}
                onChange={e => setNewClientDistrict(e.target.value)}
              >
                <option value="حي الشاطئ">حي الشاطئ</option>
                <option value="حي الروضة">حي الروضة</option>
                <option value="حي الحمراء">حي الحمراء</option>
                <option value="حي أبحر الشمالية">حي أبحر الشمالية</option>
              </select>
              <select
                className="ai-select"
                value={newClientService}
                onChange={e => setNewClientService(e.target.value)}
              >
                <option value="مساج سويدي منزلي فاخر (90 دقيقة)">مساج سويدي فاخر (90 دقيقة) - 350 ر.س</option>
                <option value="مساج استرخائي كامل بالزيوت العطرية">مساج استرخائي بالزيوت - 300 ر.س</option>
                <option value="مساج الأنسجة العميقة ديب تيشو">ديب تيشو عميق - 320 ر.س</option>
                <option value="باقة كبار الشخصيات VIP">باقة VIP كبار الشخصيات - 450 ر.س</option>
              </select>
              <button
                className="primary-button"
                onClick={handleCreateBooking}
                disabled={bookingLoading}
              >
                <CheckCircle2 size={14} />
                <span>{bookingLoading ? 'جارٍ التأكيد...' : 'تأكيد الحجز فوراً'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {(data?.agents || []).map((agent: any) => (
            <div key={agent.id} className="panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="step-number" style={{ width: '32px', height: '32px' }}><Bot size={16} /></div>
                    <div>
                      <strong style={{ fontSize: '13px' }}>{agent.name}</strong>
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{agent.role}</div>
                    </div>
                  </div>
                  <span className="status-badge active">● نشط ومستقل</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text)', lineHeight: 1.6, margin: '10px 0' }}>
                  {agent.description}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)' }}>
                <span>المهام المنجزة: <strong style={{ color: 'var(--text)' }}>{agent.tasks_count}</strong></span>
                <span>النجاح: <strong style={{ color: 'var(--teal)' }}>100%</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <div className="panel table-panel">
          <div className="table-toolbar">
            <div>
              <h2>قائمة الفرص والعملاء المحتملين بجدة</h2>
              <p className="muted">بيانات تجارية تم جمعها وفحص درجات اهتمامها لمساج لمسة روائع</p>
            </div>
            <button className="primary-button" onClick={handleDiscoverLeads} disabled={discovering}>
              <Plus size={14} />
              <span>استكشاف عملاء جدد</span>
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>المنشأة / العميل</th>
                  <th>الحي</th>
                  <th>وسيلة التواصل</th>
                  <th>المصدر</th>
                  <th>درجة الاهتمام</th>
                  <th>سبب التقييم</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {(data?.leads || []).map((lead: any) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="cell-main">
                        <div>
                          <strong>{lead.businessName}</strong>
                          <small>{lead.contactName}</small>
                        </div>
                      </div>
                    </td>
                    <td>{lead.district}</td>
                    <td dir="ltr">{lead.phone}</td>
                    <td><span className="source-tag">{lead.source}</span></td>
                    <td>
                      <strong style={{ color: lead.score >= 85 ? 'var(--teal)' : 'var(--amber)', fontSize: '13px' }}>
                        {lead.score} / 100
                      </strong>
                    </td>
                    <td style={{ maxWidth: '240px', fontSize: '10px', color: 'var(--muted)' }}>{lead.scoreReason}</td>
                    <td><span className="status-badge active">{lead.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <div className="section-title">
              <div className="step-number"><Megaphone size={14} /></div>
              <div>
                <h2>إنشاء حملة تسويقية ذكية باللهجة السعودية</h2>
                <p>صياغة رسائل واتساب إعلانية راقية متوافقة مع أنظمة العناية والسبا بجدة</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '14px' }}>
              <input
                className="ai-input"
                placeholder="عنوان الحملة"
                value={campName}
                onChange={e => setCampName(e.target.value)}
              />
              <select
                className="ai-select"
                value={campDistrict}
                onChange={e => setCampDistrict(e.target.value)}
              >
                <option value="حي الروضة">حي الروضة</option>
                <option value="حي الشاطئ">حي الشاطئ</option>
                <option value="حي الحمراء">حي الحمراء</option>
                <option value="حي أبحر الشمالية">حي أبحر الشمالية</option>
              </select>
              <input
                className="ai-input"
                placeholder="العرض المقدم"
                value={campOffer}
                onChange={e => setCampOffer(e.target.value)}
              />
              <input
                className="ai-input"
                placeholder="تفاصيل الخصم"
                value={campDiscount}
                onChange={e => setCampDiscount(e.target.value)}
              />
              <button
                className="primary-button"
                onClick={handleCreateCampaign}
                disabled={campLoading}
              >
                <Sparkles size={14} />
                <span>{campLoading ? 'جارٍ الصياغة...' : 'إنشاء الحملة'}</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {(data?.campaigns || []).map((camp: any) => (
              <div key={camp.id} className="panel" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '13px' }}>{camp.name}</strong>
                  <span className="status-badge active">نشطة</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '10px' }}>
                  الأحياء المستهدفة: <strong>{(camp.targetDistricts || []).join('، ')}</strong>
                </div>
                <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px', fontSize: '11px', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {camp.messageTemplate}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '10px', color: 'var(--muted)' }}>
                  <span>المرسلة: <strong>{camp.messagesSent || 0}</strong></span>
                  <span>الردود: <strong>{camp.repliesCount || 0}</strong></span>
                  <span>الحجوزات: <strong style={{ color: 'var(--teal)' }}>{camp.bookingsGenerated || 0}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="panel table-panel">
          <div className="table-toolbar">
            <div>
              <h2>الحجوزات المؤكدة الناتجة عن الذكاء الاصطناعي</h2>
              <p className="muted">حجوزات مسجلة وموثقة في جدول المواعيد وقاعدة Supabase</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>رقم الهاتف</th>
                  <th>الخدمة المطلوبة</th>
                  <th>الحي بجدة</th>
                  <th>المبلغ</th>
                  <th>المصدر</th>
                  <th>حالة الحجز</th>
                </tr>
              </thead>
              <tbody>
                {(data?.bookings || []).map((b: any) => (
                  <tr key={b.id}>
                    <td><strong>{b.clientName}</strong></td>
                    <td dir="ltr">{b.phone}</td>
                    <td>{b.serviceName}</td>
                    <td>{b.district}</td>
                    <td><strong style={{ color: 'var(--teal)', fontSize: '13px' }}>{b.amount} ر.س</strong></td>
                    <td><span className="source-tag">{b.source}</span></td>
                    <td><span className="status-badge active">مؤكد</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="panel" style={{ padding: '20px' }}>
          <div className="section-title">
            <div className="step-number"><Activity size={14} /></div>
            <div>
              <h2>سجل العمليات والقرارات الذاتية (Activity Log)</h2>
              <p>متابعة لحظية لكل إجراء نفذه وكلاء الذكاء الاصطناعي</p>
            </div>
          </div>

          <div className="activity-list">
            {(data?.activityLogs || []).map((log: any) => (
              <div key={log.id} className="activity-row">
                <div className="activity-dot"><Sparkles size={12} /></div>
                <div>
                  <strong>{log.agentName} — {log.actionType}</strong>
                  <span>{log.details}</span>
                </div>
                <time>{new Date(log.createdAt).toLocaleTimeString('ar-SA')}</time>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
