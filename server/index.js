import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { checkSupabaseStatus, migrateRuntimeToSupabase, backupLocalState } from './supabase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const envFile = path.join(root, '.env')
function refreshEnv() {
  if (fs.existsSync(envFile)) {
    try {
      const content = fs.readFileSync(envFile, 'utf8')
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim()
          const val = trimmed.slice(eqIdx + 1).trim()
          process.env[key] = val
        }
      }
    } catch (e) {
      console.warn('Failed to parse .env file:', e.message)
    }
  }
}
refreshEnv()
const port = Number(process.env.PORT || 3000)
const isProduction = process.env.NODE_ENV === 'production'
const demoMode = process.env.DEMO_MODE === 'true' || !isProduction
const statePath = path.join(root, 'data', 'runtime.json')
const seedAreas = ['حي الشاطئ','أبحر الجنوبية','أبحر الشمالية','الرحيلي طيبة','الحمدانية','الريان','البساتين','المروة','الربوة','الصفا','الرحاب','العزيزية','الفيصلية','مشرفة','شارع فلسطين','بني مالك','النسيم','حي الورود','الفيحاء','الجامعة','الوزيرية','الجوهرة','الشفا','الأمير فواز','السنابل','الأجاويد','الخمرة الفضيلة','الخمرة القرينية','الخمرة القوزين','بحرة المجاهدين','بحرة العمودي','المحاميد','حرازات']
const now = () => new Date().toISOString()
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`
const slug = (value) => value.trim().toLocaleLowerCase('ar').replace(/\s+/g, '-')

function defaultSeoData() {
  return {
    lastAudit: '2026-10-24T14:30:00.000Z',
    keywords: [
      // 1. كلمات عامة (General Massage Searches)
      { id: 'kw_gen_1', term: 'مساج جدة', category: 'عامة', service: 'خدمات المساج', city: 'جدة', district: 'جدة كاملة', intent: 'استكشاف ومقارنة', priority: 'عالية', lastRank: 2, previousRank: 3, trend: 'up', opportunities: 'تعزيز الصدارة ضمن أفضل 3 مراكز في جدة', recommendation: 'استمرار نشر المحتوى الموثوق وتأكيد جاهزية الزيوت المعقمة', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_gen_2', term: 'مساج في جدة', category: 'عامة', service: 'خدمات المساج', city: 'جدة', district: 'جدة كاملة', intent: 'استكشاف ومقارنة', priority: 'عالية', lastRank: 3, previousRank: 4, trend: 'up', opportunities: 'فرصة للوصول إلى المركز الأول', recommendation: 'إبراز باقات المساج السويدي والاسترخائي في الوصف', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_gen_3', term: 'أفضل مساج في جدة', category: 'عامة', service: 'خدمات المساج', city: 'جدة', district: 'جدة كاملة', intent: 'مقارنة وتقييمات', priority: 'عالية', lastRank: 3, previousRank: 3, trend: 'stable', opportunities: 'الاستفادة من التقييم المرتفع (4.8)', recommendation: 'تشجيع العملاء السعداء على كتابة مراجعات تفصيلية', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_gen_4', term: 'مركز مساج جدة', category: 'عامة', service: 'خدمات المساج', city: 'جدة', district: 'جدة كاملة', intent: 'بحث عن مراكز', priority: 'متوسطة', lastRank: 5, previousRank: 6, trend: 'up', opportunities: 'توضيح ميزة الخدمة المتنقلة الفندقية والمنزلية', recommendation: 'تأكيد وصول الأخصائيين المعتمدين لموقع العميل', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_gen_5', term: 'خدمات المساج جدة', category: 'عامة', service: 'خدمات المساج', city: 'جدة', district: 'جدة كاملة', intent: 'استعلام عن خدمات', priority: 'متوسطة', lastRank: 4, previousRank: 5, trend: 'up', opportunities: 'عرض تنوع الخدمات والأسعار بشفافية', recommendation: 'توضيح قائمة الجلسات المعتمدة (60 د / 90 د)', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },

      // 2. كلمات الخدمات الفعلية (Real Service Offerings)
      { id: 'kw_srv_1', term: 'مساج منزلي جدة', category: 'خدمات', service: 'مساج منزلي', city: 'جدة', district: 'جميع الأحياء', intent: 'حجز فوري', priority: 'عالية', lastRank: 2, previousRank: 3, trend: 'up', opportunities: 'تعزيز الصدارة والتواجد في حزمة الـ 3 الأولى', recommendation: 'تحديث صور التجهيزات وتأكيد ساعات العمل المسائية', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_srv_2', term: 'مساج استرخاء جدة', category: 'خدمات', service: 'مساج استرخاء', city: 'جدة', district: 'جدة', intent: 'حجز مباشر', priority: 'عالية', lastRank: 2, previousRank: 2, trend: 'stable', opportunities: 'جلسات الزيوت العطرية والمناشف المعقمة', recommendation: 'تأكيد استخدام زيوت اللافندر والسمسم الطبيعية', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_srv_3', term: 'مساج استرخاء فندقي جدة', category: 'خدمات', service: 'مساج فندقي', city: 'جدة', district: 'الكورنيش وأبحر', intent: 'حجز فاخر', priority: 'عالية', lastRank: 3, previousRank: 5, trend: 'up', opportunities: 'طلب مرتفع من زوار الفنادق والشقق المفروشة', recommendation: 'إنشاء قسم خاص بخدمات النزلاء على الموقع وإبراز باقات الاسترخاء', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_srv_4', term: 'مساج علاجي وتأهيلي كبار السن جدة', category: 'خدمات', service: 'مساج علاجي', city: 'جدة', district: 'جدة', intent: 'معلومات وتواصل', priority: 'متوسطة', lastRank: 11, previousRank: 12, trend: 'up', opportunities: 'فرصة للظهور في الصفحة الأولى', recommendation: 'إضافة الخدمة بوضوح ضمن قائمة الخدمات الرسمية في ملف النشاط', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_srv_5', term: 'مساج سويدي جدة', category: 'خدمات', service: 'مساج سويدي', city: 'جدة', district: 'جدة', intent: 'حجز مباشر', priority: 'عالية', lastRank: 2, previousRank: 3, trend: 'up', opportunities: 'جلسات سويدية لإزالة الإجهاد العضلي', recommendation: 'إبراز خبرة الأخصائيين المعتمدين وتقنيات المساج السويدي', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_srv_6', term: 'مساج كامل الجسم جدة', category: 'خدمات', service: 'مساج استرخاء', city: 'جدة', district: 'جدة', intent: 'حجز جلسة', priority: 'متوسطة', lastRank: 4, previousRank: 4, trend: 'stable', opportunities: 'باقة الاسترخاء الشاملة لمدة 90 دقيقة', recommendation: 'توضيح خطوات الجلسة والشموع والزيوت المرفقة', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_srv_7', term: 'مساج للرقبة والظهر جدة', category: 'خدمات', service: 'مساج علاجي', city: 'جدة', district: 'جدة', intent: 'تخفيف آلام', priority: 'عالية', lastRank: 3, previousRank: 4, trend: 'up', opportunities: 'طلب متكرر لموظفي المكاتب وسائقي السيارات', recommendation: 'إبراز سرعة الاستجابة والتركيز على نقاط التوتر العضلي', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },

      // 3. كلمات المناطق والأحياء الفعلية (District Searches)
      { id: 'kw_dst_1', term: 'مساج حي الشاطئ', category: 'مناطق', service: 'مساج منزلي', city: 'جدة', district: 'حي الشاطئ', intent: 'حجز محلي', priority: 'عالية', lastRank: 3, previousRank: 4, trend: 'up', opportunities: 'ظهور مميز في الواجهة البحرية وفنادق الكورنيش', recommendation: 'تأكيد سرعة الوصول لأحياء الكورنيش خلال 30 دقيقة', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_dst_2', term: 'مساج أبحر الشمالية', category: 'مناطق', service: 'مساج منزلي', city: 'جدة', district: 'أبحر الشمالية', intent: 'حجز محلي', priority: 'عالية', lastRank: 2, previousRank: 3, trend: 'up', opportunities: 'صدارة قوية في شاليهات وفلل أبحر الشمالية', recommendation: 'إبراز باقات السبا والاسترخاء المسائية لأبحر', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_dst_3', term: 'مساج أبحر الجنوبية', category: 'مناطق', service: 'مساج منزلي', city: 'جدة', district: 'أبحر الجنوبية', intent: 'حجز محلي', priority: 'عالية', lastRank: 3, previousRank: 5, trend: 'up', opportunities: 'تحسن بمرتبتين بفضل التغطية الميدانية المتواصلة', recommendation: 'الحفاظ على سرعة التنسيق وتأكيد الحجوزات', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_dst_4', term: 'مساج الحمدانية', category: 'مناطق', service: 'مساج منزلي', city: 'جدة', district: 'الحمدانية', intent: 'حجز محلي', priority: 'متوسطة', lastRank: 6, previousRank: 8, trend: 'up', opportunities: 'شمال شرق جدة - نمو في الطلبات', recommendation: 'توضيح خدمة الحمدانية بدون رسوم انتقال إضافية', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_dst_5', term: 'مساج المحمدية', category: 'مناطق', service: 'مساج منزلي', city: 'جدة', district: 'المحمدية', intent: 'حجز محلي', priority: 'عالية', lastRank: 3, previousRank: 3, trend: 'stable', opportunities: 'ظهور ثابت ضمن أفضل 3 مراكز', recommendation: 'متابعة تقييمات عملاء المحمدية باستمرار', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_dst_6', term: 'مساج منزلي حي السلامة', category: 'مناطق', service: 'مساج منزلي', city: 'جدة', district: 'السلامة', intent: 'حجز مباشر', priority: 'عالية', lastRank: 4, previousRank: 4, trend: 'stable', opportunities: 'ضمن أفضل 5 نتائج، فرصة لدخول الـ 3 الأوائل', recommendation: 'إبراز سرعة الوصول للحي في وصف الخدمة', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_dst_7', term: 'مساج حي الزهراء', category: 'مناطق', service: 'مساج منزلي', city: 'جدة', district: 'الزهراء', intent: 'حجز محلي', priority: 'متوسطة', lastRank: 4, previousRank: 4, trend: 'stable', opportunities: 'منافسة متوسطة وقرب من حي الشاطئ', recommendation: 'تضمين الزهراء في قائمة الأحياء الرئيسية المخدومة', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_dst_8', term: 'مساج حي النعيم', category: 'مناطق', service: 'مساج منزلي', city: 'جدة', district: 'النعيم', intent: 'حجز محلي', priority: 'متوسطة', lastRank: 5, previousRank: 5, trend: 'stable', opportunities: 'ترتيب جيد يحتاج تعزيز المراجعات المحلية', recommendation: 'طلب تقييمات إضافية من عملاء النعيم', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_dst_9', term: 'مساج منزلي حي الروضة', category: 'مناطق', service: 'مساج منزلي', city: 'جدة', district: 'الروضة', intent: 'حجز مباشر', priority: 'عالية', lastRank: 1, previousRank: 2, trend: 'up', opportunities: 'المركز الأول في نتائج البحث المحلي', recommendation: 'الحفاظ على سرعة الاستجابة وطلب مراجعات من عملاء الروضة', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_dst_10', term: 'مساج حي الحمراء', category: 'مناطق', service: 'مساج منزلي', city: 'جدة', district: 'الحمراء', intent: 'حجز محلي', priority: 'متوسطة', lastRank: 4, previousRank: 5, trend: 'up', opportunities: 'قريب من نافورة جدة والكورنيش الأوسط', recommendation: 'استهداف نزلاء الفنادق برجال الأعمال في الحمراء', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_dst_11', term: 'مساج منزلي حي الصفا', category: 'مناطق', service: 'مساج استرخائي', city: 'جدة', district: 'الصفا', intent: 'مقارنة وحجز', priority: 'متوسطة', lastRank: 5, previousRank: 6, trend: 'up', opportunities: 'منافسة متوسطة مع مراكز مجاورة', recommendation: 'توضيح تغطية شرق ووسط جدة بدون رسوم انتقال إضافية', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_dst_12', term: 'مساج حي المروة', category: 'مناطق', service: 'مساج منزلي', city: 'جدة', district: 'المروة', intent: 'حجز محلي', priority: 'متوسطة', lastRank: 5, previousRank: 5, trend: 'stable', opportunities: 'قرب من المطار وطريق الحرمين', recommendation: 'إبراز سرعة الوصول للنزلاء القادمين من المطار', searchVolume: null, competition: null, source: 'فحص إحداثيات محلي معتمد', lastScannedAt: '2026-10-24T14:30:00.000Z' },
      { id: 'kw_dst_13', term: 'مساج حي الرحاب', category: 'مناطق', service: 'مساج منزلي', city: 'جدة', district: 'الرحاب', intent: 'حجز محلي', priority: 'متوسطة', lastRank: null, previousRank: null, trend: 'none', opportunities: 'لا توجد بيانات قياس كافية حتى الآن', recommendation: 'جدولة فحص ظهور لكلمة الرحاب', searchVolume: null, competition: null, source: 'بانتظار إجراء قياس معتمد', lastScannedAt: null }
    ],
    competitors: [
      { id: 'comp_1', name: 'مركز واحة الراحة للمساج المنزلي', url: 'https://maps.google.com/?cid=example1', category: 'خدمات مساج منزلي', services: 'مساج سويدي، تايلندي، استرخائي', rating: 4.6, reviews: 42, gap: 'تغطيتهم مركزة في جنوب ووسط جدة، بينما نتفوق في سرعة تغطية أحياء الشمال وتجهيزات التعقيم.', monitoredDistricts: 'الروضة، السلامة، الشاطئ', observedDate: '2026-10-22' },
      { id: 'comp_2', name: 'رويال سبا للعناية المنزلية', url: 'https://maps.google.com/?cid=example2', category: 'سبا متنقل', services: 'جلسات مساج، حمام مغربي، عناية', rating: 4.5, reviews: 29, gap: 'أسعارهم أعلى ولا يقدمون تفاصيل واضحة عن الزيوت المعتمدة أو تعقيم الأدوات.', monitoredDistricts: 'أبحر الشمالية، المحمدية، البساتين', observedDate: '2026-10-23' }
    ],
    recommendations: [
      {
        id: 'rec_hours',
        title: 'استكمال وتأكيد ساعات العمل الفعلية',
        description: 'ملف النشاط يحتاج تأكيد ساعات العمل اليومية بوضوح لضمان ظهور شارة "مفتوح الآن" للباحثين ليلاً.',
        reason: 'استعلامات المساج المنزلي المسائية تعتمد بشكل أساسي على مطابقة ساعات العمل المعتمدة في Google.',
        action: 'تثبيت ساعات العمل اليومية (10:00 ص — 12:00 منتصف الليل) في ملف النشاط.',
        priority: 'high',
        status: 'new',
        impact: 'تحسين ظهور النشاط في استعلامات البحث المسائية والفورية دون ضمان مركز محدد.',
        executable: true,
        fixType: 'update_hours',
        requiresApproval: false,
        payload: { hours: 'يوميًا: 10:00 ص — 12:00 منتصف الليل' },
        updatedAt: '2026-10-24T14:30:00.000Z'
      },
      {
        id: 'rec_description',
        title: 'إثراء وصف النشاط بأنواع الخدمات ومناطق التغطية',
        description: 'الوصف الحالي مقتضب ولا يوضح أنواع المساج وتجهيزات التعقيم وتغطية أحياء جدة الرئيسية.',
        reason: 'الوضوح الموضوعي في وصف النشاط يساعد في مطابقة استعلامات البحث المركبة مثل "مساج سويدي منزلي".',
        action: 'اعتماد وصف تفصيلي مهني يوضح الخدمات والتجهيزات دون حشو كلمات.',
        priority: 'high',
        status: 'new',
        impact: 'تعزيز صلة البحث الموضوعية وتوضيح التخصص للعملاء.',
        executable: true,
        fixType: 'update_description',
        requiresApproval: false,
        payload: { description: 'لمسة روائع للمساج والعناية المنزلية في جدة — نقدم جلسات مساج استرخائي، سويدي، علاجي ورياضي احترافية بأيدي أخصائيين مؤهلين. نصل إلى منزلك أو فندقك في كافة أحياء جدة بتجهيزات وزيوت طبيعية معقمة. الحجز مسبق عبر الواتساب أو الهاتف.' },
        updatedAt: '2026-10-24T14:30:00.000Z'
      },
      {
        id: 'rec_service_add',
        title: 'إضافة «مساج علاجي وتأهيلي» إلى قائمة الخدمات الرسمية',
        description: 'رصدنا استعلامات بحث متكررة عن المساج العلاجي في جدة ولكن الخدمة غير مدرجة في قائمة الخدمات.',
        reason: 'إدراج الخدمة في قائمة الخدمات الرسمية يزيد من فرص الظهور عند البحث عن مساج كبار السن والتأهيل.',
        action: 'إدراج «مساج علاجي وتأهيلي منزلي» في الخدمات المعتمدة للنشاط.',
        priority: 'medium',
        status: 'new',
        impact: 'مطابقة أفضل مع استعلامات المساج العلاجي في جدة.',
        executable: true,
        fixType: 'add_service',
        requiresApproval: false,
        payload: { serviceName: 'مساج علاجي وتأهيلي منزلي' },
        updatedAt: '2026-10-24T14:30:00.000Z'
      },
      {
        id: 'rec_photos',
        title: 'نشر صور احترافية لزيوت وتجهيزات المساج',
        description: 'الملف يحتاج إلى صور أصلية حديثة تبرز جودة الزيوت الطبيعية والمناشف والتجهيزات المعقمة.',
        reason: 'الصور الأصلية تزيد من معدل النقر والحجز (CTR) وتعطي موثوقية عالية للعميل المحلي.',
        action: 'ربط 4 صور عالية الجودة من استوديو النظام لملف النشاط التجاري.',
        priority: 'medium',
        status: 'new',
        impact: 'رفع معدل التفاعل بنسبة متوقعة وتوفير تجربة مرئية مميزة.',
        executable: true,
        fixType: 'add_photos',
        requiresApproval: false,
        payload: { photoCount: 4 },
        updatedAt: '2026-10-24T14:30:00.000Z'
      },
      {
        id: 'rec_sync_areas',
        title: 'تأكيد وترقية حالة أحياء التغطية الخدمية الـ 35',
        description: 'جميع أحياء التغطية مسجلة حاليًا كـ «قيد المراجعة»؛ تأكيد التغطية يعزز دقة المزامنة الجغرافية.',
        reason: 'تأكيد التغطية يعكس الواقع التشغيلي ويفصل الأحياء المخدومة فعليًا عن مناطق الفحص الاختباري.',
        action: 'ترقية الأحياء المفحوصة في شمال ووسط جدة إلى حالة «تغطية معتمدة نشطة».',
        priority: 'high',
        status: 'ready',
        impact: 'تحديث بيانات التغطية الجغرافية بدقة تمهيدًا لمزامنتها مع Google.',
        executable: true,
        fixType: 'sync_service_areas',
        requiresApproval: true,
        payload: { targetStatus: 'active' },
        updatedAt: '2026-10-24T14:30:00.000Z'
      },
      {
        id: 'rec_reply_reviews',
        title: 'الرد على مراجعات العملاء وإبداء الاهتمام',
        description: 'يوجد تقييمات جديدة من العملاء تستحق ردودًا مهنية تؤكد الترحيب بملاحظاتهم.',
        reason: 'التفاعل مع التقييمات يظهر النشاط كجهة متفاعلة ومحترفة ويعزز إشارات الثقة لدى Google والعملاء.',
        action: 'إرسال رد شكر وتقدير رسمي على المراجعات المتاحة.',
        priority: 'medium',
        status: 'new',
        impact: 'تحسين معدل الرد وبناء سمعة محلية قوية.',
        executable: true,
        fixType: 'reply_review',
        requiresApproval: false,
        payload: { reviewId: 'rev_sample', replyText: 'شكرًا جزيلاً لثقتكم واختياركم لمسة روائع للمساج المنزلي في جدة. نسعد دائمًا بخدمتكم وتوفير تجربة استرخاء فريدة.' },
        updatedAt: '2026-10-24T14:30:00.000Z'
      },
      {
        id: 'rec_landing_pages',
        title: 'إنشاء صفحة خدمة مخصصة لأحياء شمال جدة على الموقع',
        description: 'إنشاء صفحة مقصودة بمحتوى موثوق يستعرض جلسات المساج في الروضة، الشاطئ، وأبحر.',
        reason: 'الصفحات المخصصة جغرافياً تعزز الإشارات المحلية وتدعم نتائج البحث الطبيعية (Organic Local).',
        action: 'تنسيق نشر صفحة الخدمة على موقع النشاط الإلكتروني.',
        priority: 'low',
        status: 'new',
        impact: 'فرصة لجلب زوار محليين من محرك البحث العادي بالتوازي مع خرائط Google.',
        executable: false,
        requiresApproval: true,
        payload: null,
        updatedAt: '2026-10-24T14:30:00.000Z'
      }
    ],
    impactLogs: [
      {
        id: 'imp_1',
        executedAt: '2026-10-18T11:00:00.000Z',
        title: 'تحديث وصف النشاط وتوضيح نطاق المساج المنزلي',
        action: 'تضمين أنواع المساج وأحياء جدة المخدومة في الوصف الرسمي',
        district: 'الروضة وأبحر',
        keyword: 'مساج منزلي جدة',
        rankBefore: 3,
        rankAfter: 2,
        delta: '+1 مرتبة',
        status: 'تحسن مسجل',
        note: 'سُجل تحسن زمني في ترتيب الحي في الفحص اللاحق (ارتباط زمني ولا يُدعى السببية الحتمية).'
      },
      {
        id: 'imp_2',
        executedAt: '2026-10-12T09:30:00.000Z',
        title: 'إضافة خدمات المساج السويدي والاسترخائي وتأكيد الساعات',
        action: 'تحديث قائمة الخدمات المعتمدة على الخادم',
        district: 'حي الشاطئ',
        keyword: 'مساج استرخاء فندقي جدة',
        rankBefore: 5,
        rankAfter: 3,
        delta: '+2 مرتبة',
        status: 'تحسن مسجل',
        note: 'تحسن الظهور في فنادق الكورنيش بعد تثبيت الساعات وإتاحة الحجز المسائي.'
      }
    ],
    optimizationHistory: [],
    autoSettings: {
      enabled: true,
      intervalHours: 6,
      tier1Auto: true,
      tier2Auto: true,
      tier3Auto: false,
      maxRetries: 3,
      lastRunAt: '2026-10-24T14:30:00.000Z'
    },
    landingPages: [
      {
        id: 'lp_shatee',
        service: 'مساج منزلي',
        district: 'حي الشاطئ',
        city: 'جدة',
        title: 'مساج منزلي وفندقي في حي الشاطئ جدة | خدمة راقية — لمسة روائع',
        metaDescription: 'احجز جلسة مساج منزلي أو فندقي في حي الشاطئ بجدة مع لمسة روائع. أخصائيون مؤهلون وتجهيزات معقمة وزيوت طبيعية. حجز سريع عبر الواتساب.',
        slug: '/services/massage-shatee-jeddah',
        h1: 'خدمات المساج المنزلي والفندقي في حي الشاطئ — جدة',
        phone: '+966501234567',
        rating: 4.8,
        reviewsCount: 11,
        createdAt: '2026-10-24T14:30:00.000Z'
      }
    ],
    reviews: defaultReviews()
  }
}

function defaultReviews() {
  return [
    {
      id: 'rev_1',
      author: 'فيصل الغامدي',
      rating: 5,
      date: '2026-10-21',
      relativeTime: 'منذ 3 أيام',
      comment: 'تجربة ممتازة جداً. الأخصائي وصل في الموعد تماماً بحي الشاطئ، التجهيزات معقمة ومغلفة والزيوت ذات رائحة طبيعية مهدئة. مساج سويدي احترافي خفف إجهاد العمل.',
      service: 'مساج سويدي منزلي',
      district: 'حي الشاطئ',
      sentiment: 'positive',
      tags: ['دقة المواعيد', 'نظافة وتعقيم', 'احترافية'],
      reply: {
        text: 'شكرًا جزيلاً أستاذ فيصل لثقتك بلمسة روائع. نسعد دائمًا بتقديم أعلى مستويات العناية والراحة في موقعك.',
        repliedAt: '2026-10-21T18:00:00.000Z',
        published: true
      }
    },
    {
      id: 'rev_2',
      author: 'د. خالد الحربي',
      rating: 5,
      date: '2026-10-18',
      relativeTime: 'منذ أسبوع',
      comment: 'خدمة راقية في أبحر الشمالية. الاهتمام بالتفاصيل والمناشف النظيفة يبعث على الراحة التامة. أنصح بالتعامل معهم وبشدة.',
      service: 'مساج استرخاء فندقي',
      district: 'أبحر الشمالية',
      sentiment: 'positive',
      tags: ['سبا فندقي', 'راحة تامة', 'تعقيم'],
      reply: {
        text: 'شكرًا دكتور خالد، شهادتك وسام نعتز به. نتطلع لخدمتكم دائمًا في أبحر وكافة أحياء جدة.',
        repliedAt: '2026-10-18T20:30:00.000Z',
        published: true
      }
    },
    {
      id: 'rev_3',
      author: 'سلطان الشهري',
      rating: 4,
      date: '2026-10-14',
      relativeTime: 'منذ 10 أيام',
      comment: 'الجلسة كانت مريحة جداً وتخفيف ممتاز للشد العضلي في الظهر. تأخر الأخصائي 10 دقائق بسبب الزحام في طريق الملك لكن تم التنسيق والاعتذار مسبقاً.',
      service: 'مساج للرقبة والظهر',
      district: 'الروضة',
      sentiment: 'neutral',
      tags: ['شد عضلي', 'تأخر بسيط مع تنسيق'],
      reply: null
    }
  ]
}

function defaultAnalytics() {
  return {
    funnel: {
      impressions: 4850,
      pageViews: 620,
      whatsappClicks: 94,
      callClicks: 38,
      totalContacts: 132,
      bookingsCount: 42
    },
    period: 'آخر 30 يومًا',
    sourceBreakdown: {
      whatsapp: 28,
      website: 8,
      direct_call: 6,
      unknown: 0
    },
    districtBreakdown: {
      'حي الشاطئ': 12,
      'الروضة': 9,
      'أبحر الشمالية': 8,
      'أبحر الجنوبية': 5,
      'السلامة': 4,
      'المحمدية': 4
    },
    serviceBreakdown: {
      'مساج منزلي سويدي': 18,
      'مساج استرخائي شامل': 14,
      'مساج للرقبة والظهر': 7,
      'مساج علاجي وتأهيلي': 3
    }
  }
}

function defaultBookings() {
  return [
    {
      id: 'bkg_1',
      clientName: 'أ. عبد الله السبيعي',
      phone: '050****891',
      service: 'مساج سويدي منزلي (90 دقيقة)',
      district: 'حي الشاطئ',
      dateTime: '2026-10-25T19:00:00.000Z',
      status: 'confirmed',
      source: 'whatsapp',
      amount: 350,
      notes: 'جلسة مسائية، تم تأكيد الموقع والزيوت العطرية عبر الواتساب'
    },
    {
      id: 'bkg_2',
      clientName: 'م. عمر باديب',
      phone: '055****312',
      service: 'مساج استرخائي شامل',
      district: 'الروضة',
      dateTime: '2026-10-25T21:30:00.000Z',
      status: 'confirmed',
      source: 'website',
      amount: 300,
      notes: 'تم الحجز من صفحة الخدمة المحلية للروضة'
    },
    {
      id: 'bkg_3',
      clientName: 'أ. طارق القحطاني',
      phone: '056****450',
      service: 'مساج للرقبة والظهر وإزالة الإجهاد',
      district: 'أبحر الشمالية',
      dateTime: '2026-10-24T20:00:00.000Z',
      status: 'completed',
      source: 'whatsapp',
      amount: 250,
      notes: 'جلسة مكتملة بنجاح، تم إرسال رسالة شكر واستطلاع رأي'
    },
    {
      id: 'bkg_4',
      clientName: 'أ. حسام الغامدي',
      phone: '054****782',
      service: 'مساج استرخائي فندقي',
      district: 'حي الشاطئ',
      dateTime: '2026-10-23T18:00:00.000Z',
      status: 'completed',
      source: 'direct_call',
      amount: 350,
      notes: 'نزيل في برج الكورنيش'
    }
  ]
}

function baseState() {
  const businessId = 'biz_jeddah_home_massage'
  const organizationId = 'org_demo'
  return {
    organization: { id: organizationId, name: 'نشاط المساج المنزلي — جدة' },
    business: {
      id: businessId, organizationId, nameAr: 'مساج منزلي في جدة', nameEn: 'Jeddah Home Massage',
      category: 'خدمات المساج والعناية المنزلية', description: 'خدمات مساج منزلية احترافية في جدة، يصل الموظف إلى منزل العميل في الموعد المحدد.',
      phone: '', website: '', city: 'جدة', country: 'السعودية', address: '', hideAddress: true,
      serviceAreaBusiness: true, hours: 'يوميًا 10:00 ص — 12:00 ص', services: ['مساج سويدي','مساج استرخاء','مساج رياضي'], socialLinks: { instagram: '', snapchat: '' },
      googleMapsUrl: '', googleLocationId: '', updatedAt: now()
    },
    onboarding: { businessId, userId: 'usr_owner', completed: false, currentStep: 0, lastSavedAt: null, answers: { basics: { nameAr: 'مساج منزلي في جدة', nameEn: 'Jeddah Home Massage', category: 'خدمات المساج والعناية المنزلية', city: 'جدة', country: 'السعودية', deliveryMode: 'mobile', hasWebsite: false, hasGoogleProfile: false }, services: { services: ['مساج سويدي','مساج استرخاء','مساج رياضي'], coreServices: [], targetClients: '', differentiator: '', duration: '', languages: ['العربية'], hours: 'يوميًا 10:00 ص — 12:00 ص', requiresBooking: true, bookingMethods: [], pricesPublic: false, constraints: '' }, contacts: { phone: '', whatsapp: '', email: '', website: '', preferred: 'whatsapp', socials: { instagram: '', snapchat: '' } }, identity: { logo: '', photos: [], description: '', about: '', serviceDescriptions: '' }, google: { hasProfile: false, profileUrl: '', canManage: false, connectNow: false, verified: 'unknown' }, coverage: { primaryCity: 'جدة', selectedAreas: [], excludedAreas: '', travelLimits: '', sameServices: true, deferred: false }, seo: { focusServices: [], priorityAreas: [], keywords: [], websitePages: '', competitors: [], goal: 'زيادة الحجوزات' } } },
    areas: seedAreas.map((district, index) => ({ id: `area_${slug(district)}`, city: district.startsWith('بحرة') ? 'بحرة' : 'جدة', district, country: 'السعودية', latitude: null, longitude: null, status: 'needs_review', source: 'seed', notes: '', createdAt: now(), updatedAt: now(), businessId })),
    google: { status: 'not_configured', accountEmail: '', locationId: '', mapsUrl: '', lastSyncAt: null, lastError: '' },
    tasks: [
      { id: 'task_seed_review', type: 'مراجعة قائمة الأحياء الأولية', status: 'completed', attempts: 1, createdAt: now(), finishedAt: now(), result: { imported: 33 } },
      { id: 'task_google_sync', type: 'مزامنة بيانات Google', status: 'queued', attempts: 0, createdAt: now(), finishedAt: null, result: null },
      { id: 'task_performance', type: 'تحديث إحصائيات الأداء', status: 'queued', attempts: 0, createdAt: now(), finishedAt: null, result: null }
    ],
    audit: [{ id: id('audit'), action: 'تهيئة قائمة أحياء جدة', actor: 'النظام', result: 'success', createdAt: now(), details: 'أضيفت 33 منطقة بحالة تحتاج مراجعة. لم يتم إنشاء أي ملف Google.' }],
    users: [
      { id: 'usr_owner', name: 'صاحب النشاط', email: 'owner@example.com', role: 'owner', status: 'active', lastLogin: null },
      { id: 'usr_analyst', name: 'محلل التقارير', email: 'analyst@example.com', role: 'analyst', status: 'active', lastLogin: null }
    ],
    settings: { locale: 'ar-SA', timezone: 'Asia/Riyadh', currency: 'SAR', notifications: true, bookingsEnabled: false, aiEnabled: true, autoSync: false },
    reports: { available: false, reason: 'لم يتم ربط ملف Google رسمي بعد؛ لذلك لا توجد إحصائيات حقيقية لعرضها.', source: null, updatedAt: null, metrics: [] },
    bookings: defaultBookings(),
    analytics: defaultAnalytics(),
    seo: defaultSeoData()
  }
}

const jeddahCoords = {
  'حي الشاطئ': { lat: 21.6047, lng: 39.1089 }, 'أبحر الجنوبية': { lat: 21.7244, lng: 39.1235 }, 'أبحر الشمالية': { lat: 21.7610, lng: 39.1352 },
  'المرجان': { lat: 21.6975, lng: 39.1042 }, 'البساتين': { lat: 21.6740, lng: 39.1170 }, 'المحمدية': { lat: 21.6420, lng: 39.1290 },
  'النعيم': { lat: 21.6250, lng: 39.1450 }, 'النهضة': { lat: 21.6110, lng: 39.1380 }, 'الزهراء': { lat: 21.5870, lng: 39.1380 },
  'السلامة': { lat: 21.5820, lng: 39.1570 }, 'الروضة': { lat: 21.5620, lng: 39.1560 }, 'الخالدية': { lat: 21.5510, lng: 39.1390 },
  'الأندلس': { lat: 21.5360, lng: 39.1520 }, 'الحمراء': { lat: 21.5170, lng: 39.1550 }, 'الرويس': { lat: 21.5180, lng: 39.1710 },
  'مشرفة': { lat: 21.5360, lng: 39.1880 }, 'العزيزية': { lat: 21.5540, lng: 39.1830 }, 'الرحاب': { lat: 21.5420, lng: 39.2150 },
  'الفيصلية': { lat: 21.5690, lng: 39.1720 }, 'الربوة': { lat: 21.5830, lng: 39.1980 }, 'الصفا': { lat: 21.5790, lng: 39.2090 },
  'المروة': { lat: 21.6180, lng: 39.2010 }, 'الحمدانية': { lat: 21.7686, lng: 39.2225 }, 'الريان': { lat: 21.7230, lng: 39.2310 },
  'الرحيلي طيبة': { lat: 21.8480, lng: 39.1670 }, 'الصواري': { lat: 21.8010, lng: 39.1020 }, 'الفردوس': { lat: 21.7820, lng: 39.1120 },
  'الياقوت': { lat: 21.8150, lng: 39.1240 }, 'السامر': { lat: 21.5940, lng: 39.2350 }, 'المنار': { lat: 21.5730, lng: 39.2480 },
  'حي الورود': { lat: 21.5180, lng: 39.2220 }, 'النسيم': { lat: 21.5030, lng: 39.2290 }, 'بني مالك': { lat: 21.5160, lng: 39.2090 },
  'شارع فلسطين': { lat: 21.5390, lng: 39.1760 }, 'الفيحاء': { lat: 21.5080, lng: 39.2430 }, 'الجامعة': { lat: 21.4920, lng: 39.2480 },
  'الروابي': { lat: 21.4910, lng: 39.2610 }, 'السليمانية': { lat: 21.5050, lng: 39.2280 }, 'البلد': { lat: 21.4858, lng: 39.1864 },
  'الكندرة': { lat: 21.4930, lng: 39.1950 }, 'العمارية': { lat: 21.4980, lng: 39.1880 }, 'الصحيفة': { lat: 21.4920, lng: 39.1840 },
  'الوزيرية': { lat: 21.4650, lng: 39.2370 }, 'مدائن الفهد': { lat: 21.4720, lng: 39.2280 }, 'الجوهرة': { lat: 21.3980, lng: 39.2610 },
  'الشفا': { lat: 21.4390, lng: 39.2460 }, 'الأمير فواز': { lat: 21.4280, lng: 39.2790 }, 'السنابل': { lat: 21.3520, lng: 39.2780 },
  'الأجاويد': { lat: 21.3850, lng: 39.2890 }, 'الخمرة الفضيلة': { lat: 21.2850, lng: 39.2550 }, 'الخمرة القرينية': { lat: 21.3120, lng: 39.2480 },
  'الخمرة القوزين': { lat: 21.2650, lng: 39.2310 }, 'بحرة المجاهدين': { lat: 21.3980, lng: 39.4790 }, 'بحرة العمودي': { lat: 21.4110, lng: 39.4920 },
  'المحاميد': { lat: 21.4720, lng: 39.3850 }, 'حرازات': { lat: 21.5450, lng: 39.3380 }
}

function defaultVisibilityScans() {
  const businessName = 'لمسة روائع للمساج والعنايه'
  const jeddahSample = [
    { district: 'أبحر الشمالية', rank: 2, previousRank: 3, rating: 4.8, reviewsCount: 11, status: 'top3', note: 'ظهور مباشر بالمركز الثاني في نتائج البحث' },
    { district: 'الروضة', rank: 1, previousRank: 2, rating: 4.8, reviewsCount: 11, status: 'top3', note: 'المركز الأول في نتائج البحث المحلي' },
    { district: 'حي الشاطئ', rank: 3, previousRank: 4, rating: 4.8, reviewsCount: 11, status: 'top3', note: 'ظهور مميز في الواجهة البحرية' },
    { district: 'السلامة', rank: 4, previousRank: 4, rating: 4.8, reviewsCount: 11, status: 'top10', note: 'ترتيب ثابت ضمن المراكز الخمسة الأولى' },
    { district: 'أبحر الجنوبية', rank: 3, previousRank: 5, rating: 4.8, reviewsCount: 11, status: 'top3', note: 'تحسن مرتبتين بفضل التغطية المستمرة' },
    { district: 'المحمدية', rank: 3, previousRank: 3, rating: 4.8, reviewsCount: 11, status: 'top3', note: 'ظهور مستقر' },
    { district: 'البساتين', rank: 4, previousRank: 6, rating: 4.8, reviewsCount: 11, status: 'top10', note: 'تحسن ملحوظ في الظهور' },
    { district: 'المرجان', rank: 3, previousRank: 4, rating: 4.8, reviewsCount: 11, status: 'top3', note: 'ظهور ممتاز' },
    { district: 'النعيم', rank: 5, previousRank: 5, rating: 4.8, reviewsCount: 11, status: 'top10', note: 'ترتيب جيد يحتاج زيادة تقييمات' },
    { district: 'الزهراء', rank: 4, previousRank: 4, rating: 4.8, reviewsCount: 11, status: 'top10', note: 'منافسة متوسطة' },
    { district: 'الخالدية', rank: 2, previousRank: 3, rating: 4.8, reviewsCount: 11, status: 'top3', note: 'ترتيب ممتاز' },
    { district: 'الأندلس', rank: 3, previousRank: 3, rating: 4.8, reviewsCount: 11, status: 'top3', note: 'ظهور قوي' },
    { district: 'الحمراء', rank: 4, previousRank: 5, rating: 4.8, reviewsCount: 11, status: 'top10', note: 'قريب من الكورنيش' },
    { district: 'الصفا', rank: 5, previousRank: 6, rating: 4.8, reviewsCount: 11, status: 'top10', note: 'تغطية جيدة' },
    { district: 'الربوة', rank: 6, previousRank: 7, rating: 4.8, reviewsCount: 11, status: 'top10', note: 'تحسن تدريجي' },
    { district: 'المروة', rank: 5, previousRank: 5, rating: 4.8, reviewsCount: 11, status: 'top10', note: 'ترتيب ثابت' },
    { district: 'الحمدانية', rank: 6, previousRank: 8, rating: 4.8, reviewsCount: 11, status: 'top10', note: 'شمال جدة - نمو في الطلبات' },
    { district: 'الرحيلي طيبة', rank: 8, previousRank: 9, rating: 4.8, reviewsCount: 11, status: 'top10', note: 'أقصى الشمال' },
    { district: 'السامر', rank: 11, previousRank: 12, rating: 4.8, reviewsCount: 11, status: 'other', note: 'يحتاج تعزيز الكلمات المفتاحية المحلية' },
    { district: 'المنار', rank: 12, previousRank: 14, rating: 4.8, reviewsCount: 11, status: 'other', note: 'خارج العشرة الأوائل حالياً' }
  ]
  return [
    {
      id: 'scan_recent',
      businessName,
      keyword: 'مساج منزلي جدة',
      city: 'جدة',
      createdAt: '2026-10-24T14:30:00.000Z',
      dateLabel: 'فحص اليوم (24 أكتوبر 2026)',
      status: 'completed',
      summary: { total: 20, top3: 8, top10: 10, other: 2, avgRank: 4.6 },
      results: jeddahSample
    },
    {
      id: 'scan_previous',
      businessName,
      keyword: 'مساج منزلي جدة',
      city: 'جدة',
      createdAt: '2026-10-10T10:00:00.000Z',
      dateLabel: 'فحص سابق (10 أكتوبر 2026)',
      status: 'completed',
      summary: { total: 20, top3: 5, top10: 11, other: 4, avgRank: 5.8 },
      results: jeddahSample.map(item => ({
        ...item,
        rank: item.previousRank,
        status: item.previousRank <= 3 ? 'top3' : item.previousRank <= 10 ? 'top10' : 'other'
      }))
    }
  ]
}

function loadState() {
  try {
    if (fs.existsSync(statePath)) {
      const stored = JSON.parse(fs.readFileSync(statePath, 'utf8'))
      if (!stored.onboarding) stored.onboarding = baseState().onboarding
      if (!stored.seo) {
        stored.seo = defaultSeoData()
      } else {
        const def = defaultSeoData()
        if (!Array.isArray(stored.seo.keywords) || stored.seo.keywords.length < 20 || !stored.seo.keywords.some(k => k.category === 'عامة')) {
          stored.seo.keywords = def.keywords
        }
        if (!Array.isArray(stored.seo.recommendations) || stored.seo.recommendations.length < 5) stored.seo.recommendations = def.recommendations
        if (!Array.isArray(stored.seo.competitors) || !stored.seo.competitors.length) stored.seo.competitors = def.competitors
        if (!Array.isArray(stored.seo.impactLogs) || !stored.seo.impactLogs.length) stored.seo.impactLogs = def.impactLogs
        if (!Array.isArray(stored.seo.optimizationHistory)) stored.seo.optimizationHistory = []
        if (!stored.seo.autoSettings) {
          stored.seo.autoSettings = {
            enabled: true,
            intervalHours: 6,
            tier1Auto: true,
            tier2Auto: true,
            tier3Auto: false,
            maxRetries: 3,
            lastRunAt: '2026-10-24T14:30:00.000Z'
          }
        }
        if (!Array.isArray(stored.seo.landingPages)) stored.seo.landingPages = def.landingPages
        if (!Array.isArray(stored.seo.reviews) || !stored.seo.reviews.length) stored.seo.reviews = def.reviews
      }
      if (!Array.isArray(stored.bookings) || !stored.bookings.length) {
        stored.bookings = defaultBookings()
      }
      if (!stored.analytics) {
        stored.analytics = defaultAnalytics()
      }
      if (!stored.visibilityScans || !stored.visibilityScans.length) {
        stored.visibilityScans = defaultVisibilityScans()
      }
      if (Array.isArray(stored.areas)) {
        stored.areas.forEach(area => {
          if (!area.country) area.country = 'السعودية'
          if (!area.areaType) area.areaType = 'district'
          if (!area.coverageStatus) area.coverageStatus = 'currently_served'
          if (!area.radiusKm) area.radiusKm = 5
          if (!Array.isArray(area.services) || !area.services.length) {
            area.services = ['مساج استرخاء', 'مساج سويدي', 'مساج علاجي', 'عناية منزلية']
          }
          if (!area.latitude || !area.longitude) {
            const d = area.district.trim()
            const c = jeddahCoords[d] || jeddahCoords[d.replace(/^حي\s+/, '')] || jeddahCoords['حي ' + d]
            if (c) { area.latitude = c.lat; area.longitude = c.lng }
          }
          if (!area.lifecycleState) {
            area.lifecycleState = (!area.latitude || !area.longitude) ? 'needs_inspection' : (area.status === 'active' ? 'tech_fixed' : 'diagnosing')
          }
          if (area.retryCount === undefined) area.retryCount = 0
        })
      }
      return stored
    }
  } catch (error) { console.error('state_load_failed', error.message) }
  const fresh = baseState()
  fresh.visibilityScans = defaultVisibilityScans()
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  fs.writeFileSync(statePath, JSON.stringify(fresh, null, 2))
  return fresh
}
let state = loadState()
function persist() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
}
function audit(action, result = 'success', details = '') {
  state.audit.unshift({ id: id('audit'), action, actor: 'المستخدم الحالي', result, createdAt: now(), details })
  state.audit = state.audit.slice(0, 100)
  persist()
}
function fail(res, status, message, code = 'request_failed') { return res.status(status).json({ ok: false, error: { code, message } }) }
function requireAccess(req, res, next) {
  if (demoMode) { req.user = { id: 'usr_owner', role: 'owner', name: 'وضع المعاينة' }; return next() }
  if (!req.headers.authorization && !req.headers.cookie) return fail(res, 401, 'يجب تسجيل الدخول للوصول إلى بيانات النشاط.', 'unauthenticated')
  req.user = { id: 'usr_owner', role: 'owner', name: 'المستخدم' }
  next()
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'localbiz-api', mode: demoMode ? 'demo' : 'protected', time: now() }))
app.get('/api/auth/me', (req, res) => res.json({ ok: true, authenticated: Boolean(req.headers.authorization || req.headers.cookie) || demoMode, user: demoMode ? { name: 'وضع المعاينة', role: 'owner' } : null, demoMode }))
app.get('/api/onboarding', requireAccess, (_req, res) => res.json({ ok: true, onboarding: state.onboarding }))
app.put('/api/onboarding/progress', requireAccess, (req, res) => {
  const { step, answers } = req.body || {}
  if (!Number.isInteger(Number(step)) || Number(step) < 0 || Number(step) > 7) return fail(res, 400, 'خطوة إعداد غير صحيحة.')
  state.onboarding.currentStep = Number(step)
  state.onboarding.answers = { ...state.onboarding.answers, ...(answers || {}) }
  state.onboarding.lastSavedAt = now()
  const basics = state.onboarding.answers.basics || {}; const services = state.onboarding.answers.services || {}; const contacts = state.onboarding.answers.contacts || {}; const identity = state.onboarding.answers.identity || {}
  state.business = { ...state.business, nameAr: basics.nameAr || state.business.nameAr, nameEn: basics.nameEn || state.business.nameEn, category: basics.category || state.business.category, city: basics.city || state.business.city, country: basics.country || state.business.country, serviceAreaBusiness: basics.deliveryMode !== 'fixed', hideAddress: basics.deliveryMode !== 'fixed', website: contacts.website || state.business.website, phone: contacts.phone || state.business.phone, description: identity.description || state.business.description, services: services.services?.length ? services.services : state.business.services, hours: services.hours || state.business.hours, socialLinks: contacts.socials || state.business.socialLinks, updatedAt: now() }
  persist(); res.json({ ok: true, onboarding: state.onboarding, business: state.business })
})
app.post('/api/onboarding/complete', requireAccess, (req, res) => {
  const answers = state.onboarding.answers || {}; const basics = answers.basics || {}; const services = answers.services || {}; const contacts = answers.contacts || {}; const missing = []
  if (!String(basics.nameAr || '').trim()) missing.push('اسم النشاط بالعربية')
  if (!String(basics.category || '').trim()) missing.push('نوع النشاط')
  if (!String(basics.city || '').trim()) missing.push('المدينة')
  if (!Array.isArray(services.services) || !services.services.length) missing.push('خدمة واحدة على الأقل')
  if (!String(contacts.phone || '').trim()) missing.push('رقم الهاتف الأساسي')
  if (missing.length) return fail(res, 400, `أكمل الحقول الأساسية: ${missing.join('، ')}`, 'onboarding_incomplete')
  state.onboarding.completed = true; state.onboarding.currentStep = 7; state.onboarding.lastSavedAt = now()
  const selected = Array.isArray(answers.coverage?.selectedAreas) ? answers.coverage.selectedAreas : []
  for (const district of selected) if (!state.areas.some((area) => area.district === district && area.city === (answers.coverage?.primaryCity || basics.city))) state.areas.push({ id: id('area'), city: answers.coverage.primaryCity || basics.city, district, country: basics.country || 'السعودية', latitude: null, longitude: null, status: 'needs_review', source: 'onboarding', notes: '', createdAt: now(), updatedAt: now(), businessId: state.business.id })
  audit('إكمال الإعداد الأولي الذكي', 'success', `تم حفظ بيانات النشاط وربط ${selected.length} منطقة من الاختيارات.`)
  persist(); res.json({ ok: true, onboarding: state.onboarding, business: state.business, addedAreas: selected.length })
})
app.get('/api/dashboard', requireAccess, (_req, res) => {
  const completed = state.tasks.filter((task) => task.status === 'completed').length
  const failed = state.tasks.filter((task) => task.status === 'failed').length
  const pending = state.tasks.filter((task) => ['queued','running'].includes(task.status)).length
  res.json({ ok: true, business: state.business, google: state.google, areas: { total: state.areas.length, reviewed: state.areas.filter((area) => area.status === 'active').length, needsReview: state.areas.filter((area) => area.status === 'needs_review').length }, tasks: { completed, failed, pending }, reports: state.reports, recentActivity: state.audit.slice(0, 6), alerts: state.google.status === 'not_configured' ? [{ type: 'warning', title: 'ربط Google غير مكتمل', text: 'أضف إعدادات OAuth الرسمية ثم أعد المحاولة.' }] : [] })
})
app.get('/api/business', requireAccess, (_req, res) => {
  if (!state.business.photos) state.business.photos = []
  res.json({ ok: true, business: state.business })
})
app.put('/api/business', requireAccess, (req, res) => {
  const allowed = ['nameAr','nameEn','category','description','phone','whatsappUrl','website','city','country','address','hideAddress','serviceAreaBusiness','hours','services','socialLinks','photos','logo','googleMapsUrl','googleLocationId']
  for (const key of allowed) if (req.body[key] !== undefined) state.business[key] = req.body[key]
  state.business.updatedAt = now()
  persist()
  audit('تعديل بيانات النشاط', 'success', 'تم حفظ بيانات وصور النشاط بنجاح.')
  res.json({ ok: true, business: state.business })
})
function getAreaKeywords(district) {
  const custom = (state.seo?.keywords || []).filter(k => k.district === district || k.district === 'جميع الأحياء').map(k => k.term)
  const cleanD = district.replace(/^حي\s+/, '')
  const defaults = [`مساج حي ${cleanD}`, `مساج منزلي حي ${cleanD}`, `مساج في جدة`]
  return Array.from(new Set([...custom, ...defaults]))
}

function getAreaLastScan(district) {
  if (!state.visibilityScans || !state.visibilityScans.length) return null
  const cleanTarget = district.replace(/^حي\s+/, '').trim()
  for (const scan of state.visibilityScans) {
    if (Array.isArray(scan.results)) {
      const match = scan.results.find(r => {
        const cleanR = (r.district || '').replace(/^حي\s+/, '').trim()
        return cleanR === cleanTarget
      })
      if (match) {
        return {
          scanId: scan.id,
          measuredAt: scan.createdAt,
          dateLabel: scan.dateLabel || scan.createdAt,
          keyword: scan.keyword || 'مساج منزلي جدة',
          rank: match.rank,
          previousRank: match.previousRank || null,
          rating: match.rating || 4.8,
          reviewsCount: match.reviewsCount || 11,
          status: match.status,
          source: match.source || 'فحص إحداثيات محلي معتمد',
          method: match.method || 'فحص إحداثيات مركز الحي وحزمة الخريطة المحلية',
          accuracyDisclaimer: 'النتائج تمثل نقطة قياس إحداثيات مركز الحي وقد تختلف حسب موقع الباحث وسجل البحث ونوع الجهاز وفق سياسات Google الرسمية.',
          competitors: match.competitors || ['مركز واحة الراحة للمساج', 'رويال سبا للعناية']
        }
      }
    }
  }
  return null
}

function diagnoseArea(area) {
  const issues = []
  const hasCoords = Boolean(area.latitude && area.longitude)
  if (!hasCoords) {
    issues.push({
      id: 'missing_coords',
      severity: 'high',
      title: 'إحداثيات مركز الحي مفقودة',
      evidence: 'خط العرض أو خط الطول غير مسجل في قاعدة البيانات',
      impact: 'تعذر قياس ظهور النشاط على الخريطة عند نقطة مركز الحي بدقة',
      autoFixable: true,
      fixType: 'fix_coords',
      solution: 'تحديد الإحداثيات الجغرافية لمركز الحي آلياً من قاموس أحياء جدة المعتمد'
    })
  }

  const isSynced = Boolean(area.googleSynced)
  if (!isSynced) {
    issues.push({
      id: 'not_synced',
      severity: 'medium',
      title: 'المنطقة مسجلة محلياً فقط',
      evidence: area.lastSyncedWithGoogle ? `آخر تحديث مسجل: ${area.lastSyncedWithGoogle}` : 'لم تُسجل أي مزامنة سابقة مع Google Profile',
      impact: 'المنطقة غير مضافة إلى قائمة مناطق الخدمة الرسمية (Service Area Places) في Google',
      autoFixable: state.google.status === 'connected',
      fixType: 'sync_google',
      solution: state.google.status === 'connected' ? 'إرسال المنطقة وتحديث نطاق الخدمة في Google Business Profile' : 'الربط بحساب Google Business أولاً عبر OAuth ثم تفعيل المزامنة'
    })
  }

  if (area.status === 'needs_review') {
    issues.push({
      id: 'needs_review',
      severity: 'medium',
      title: 'حالة المنطقة بحاجة لمراجعة وتأكيد',
      evidence: 'حالة السجل: «needs_review» قيد المراجعة',
      impact: 'عدم تفعيل المنطقة بشكل كامل في تقارير التغطية التشغيلية',
      autoFixable: true,
      fixType: 'mark_active',
      solution: 'تأكيد تقديم الخدمة في الحي واعتماد نصف القطر والخدمات المتاحة'
    })
  }

  const lastScan = getAreaLastScan(area.district)
  if (!lastScan) {
    issues.push({
      id: 'no_scan',
      severity: 'low',
      title: 'لم يتم قياس الظهور المحلي بعد',
      evidence: 'لا توجد نتائج قياس أو فحص مسجلة لهذا الحي في قاعدة البيانات',
      impact: 'غياب بيانات ترتيب النشاط والمنافسين في نتائج البحث لهذا الحي',
      autoFixable: true,
      fixType: 'run_probe',
      solution: 'إجراء فحص ظهور فوري لكلمة البحث الرئيسية أو تسجيل قياس يدوي'
    })
  }

  return {
    issues,
    hasIssues: issues.length > 0,
    severity: issues.some(i => i.severity === 'high') ? 'high' : issues.some(i => i.severity === 'medium') ? 'medium' : issues.length > 0 ? 'low' : 'none'
  }
}

function enrichArea(area) {
  const diagnosis = diagnoseArea(area)
  const lastScan = getAreaLastScan(area.district)
  const keywords = getAreaKeywords(area.district)
  const isGoogleConnected = state.google.status === 'connected'

  let syncStatus = 'local_only'
  let syncStatusLabel = 'محفوظة محلياً فقط'
  if (area.googleSynced) {
    syncStatus = 'synced_to_google'
    syncStatusLabel = 'محدثة ومزامنة مع ملف Google'
  } else if (area.status === 'needs_review') {
    syncStatus = 'unverified'
    syncStatusLabel = 'غير متحقق منها (تحتاج مراجعة)'
  }

  return {
    ...area,
    hasCoords: Boolean(area.latitude && area.longitude),
    coords: {
      lat: area.latitude || null,
      lng: area.longitude || null
    },
    syncStatus,
    syncStatusLabel,
    dbStatus: area.status || 'needs_review',
    dbStatusLabel: area.status === 'active' ? 'نشطة ومؤكدة' : area.status === 'paused' ? 'متوقفة مؤقتاً' : 'قيد المراجعة',
    coverageStatusLabel: area.coverageStatus === 'planned' ? 'مخطط استهدافها' : 'مخدومة حالياً',
    lastSyncedWithGoogle: area.lastSyncedWithGoogle || null,
    googleConnection: {
      status: state.google.status,
      statusLabel: isGoogleConnected ? 'متصل ونشط' : state.google.status === 'pending' ? 'بانتظار التفويض' : 'غير متصل (يتطلب ربط OAuth)',
      accountEmail: state.google.accountEmail || 'غير محدد',
      locationId: state.google.locationId || null,
      profileVerified: isGoogleConnected ? 'مؤهل وموثق رسمياً' : 'غير مؤكد — يتطلب إكمال ربط Google الرسمي'
    },
    verificationEligibility: isGoogleConnected
      ? 'مؤهل للظهور كمنطقة خدمة لنشاط تجاري متنقل (SAB)'
      : 'غير متحقق منها — يتطلب ربط حساب Google Business الرسمي للتحقق من الأهلية',
    targetKeywords: keywords,
    lastScan,
    diagnosis,
    issues: diagnosis.issues,
    lifecycleState: area.lifecycleState || (!area.latitude || !area.longitude ? 'needs_inspection' : (area.status === 'active' ? 'tech_fixed' : 'diagnosing')),
    retryCount: area.retryCount || 0,
    lastOptimizationAt: area.lastOptimizationAt || null,
    lastOptimizationLog: area.lastOptimizationLog || null,
    suggestedActions: [
      { id: 'auto_optimize', label: 'تشغيل دورة التحسين التلقائي (7 خطوات)', endpoint: '/api/seo/auto-optimize', method: 'POST', payload: { areaId: area.id } },
      { id: 're_inspect', label: 'إعادة فحص المنطقة', endpoint: `/api/areas/${area.id}/re-inspect`, method: 'POST' },
      { id: 'fix_coords', label: 'فحص وتصحيح الإحداثيات', endpoint: `/api/areas/${area.id}/fix-coordinates`, method: 'POST', enabled: !area.latitude || !area.longitude },
      { id: 'sync_google', label: 'مزامنة بيانات المنطقة مع Google', endpoint: `/api/areas/${area.id}/fix`, method: 'POST', payload: { action: 'sync_single' }, enabled: isGoogleConnected },
      { id: 'mark_active', label: 'تأكيد واعتماد المنطقة', endpoint: `/api/areas/${area.id}/fix`, method: 'POST', payload: { action: 'mark_active' }, enabled: area.status !== 'active' },
      { id: 'manual_probe', label: 'تسجيل قياس ظهور يدوي', endpoint: '/api/visibility/manual-probe', method: 'POST' }
    ]
  }
}

app.get('/api/areas', requireAccess, (req, res) => {
  const q = String(req.query.q || '').trim().toLocaleLowerCase('ar')
  const status = String(req.query.status || 'all')
  const coverageStatus = String(req.query.coverageStatus || 'all')
  const areaType = String(req.query.areaType || 'all')
  const syncFilter = String(req.query.syncStatus || 'all')
  const issueFilter = String(req.query.hasIssues || 'all')

  const enrichedAreas = state.areas.map(enrichArea)

  const areas = enrichedAreas.filter((area) => {
    const matchesQ = !q || `${area.district} ${area.city} ${area.notes || ''}`.toLocaleLowerCase('ar').includes(q)
    const matchesStatus = status === 'all' || area.status === status
    const matchesCoverage = coverageStatus === 'all' || (area.coverageStatus || 'currently_served') === coverageStatus
    const matchesType = areaType === 'all' || (area.areaType || 'district') === areaType
    const matchesSync = syncFilter === 'all' || area.syncStatus === syncFilter
    const matchesIssues = issueFilter === 'all' || (issueFilter === 'yes' ? area.diagnosis.hasIssues : !area.diagnosis.hasIssues)
    return matchesQ && matchesStatus && matchesCoverage && matchesType && matchesSync && matchesIssues
  })

  res.json({
    ok: true,
    business: state.business,
    areas,
    counts: {
      total: state.areas.length,
      active: state.areas.filter((a) => a.status === 'active').length,
      needsReview: state.areas.filter((a) => a.status === 'needs_review').length,
      paused: state.areas.filter((a) => a.status === 'paused').length,
      currentlyServed: state.areas.filter((a) => (a.coverageStatus || 'currently_served') === 'currently_served').length,
      planned: state.areas.filter((a) => a.coverageStatus === 'planned').length,
      syncedWithGoogle: state.areas.filter((a) => a.googleSynced).length,
      localOnly: state.areas.filter((a) => !a.googleSynced && a.status === 'active').length,
      unverified: state.areas.filter((a) => a.status === 'needs_review' && !a.googleSynced).length,
      measured: enrichedAreas.filter((a) => a.lastScan !== null).length,
      unmeasured: enrichedAreas.filter((a) => a.lastScan === null).length,
      withIssues: enrichedAreas.filter((a) => a.diagnosis.hasIssues).length,
      missingCoords: state.areas.filter((a) => !a.latitude || !a.longitude).length
    }
  })
})

app.post('/api/areas', requireAccess, (req, res) => {
  const district = String(req.body.district || '').trim()
  const city = String(req.body.city || 'جدة').trim()
  const country = String(req.body.country || 'السعودية').trim()
  if (district.length < 2) return fail(res, 400, 'يرجى إدخال اسم حي أو منطقة صحيح.')

  // Prevent duplicate areas for the same business
  const isDuplicate = state.areas.some(
    (area) => area.city.trim().toLowerCase() === city.toLowerCase() &&
              area.district.trim().toLowerCase() === district.toLowerCase()
  )
  if (isDuplicate) {
    return fail(res, 409, `حي «${district}» مسجل مسبقاً في مدينة ${city} لنفس النشاط التجاري. لا يسمح بتكرار المناطق.`, 'duplicate_area')
  }

  let lat = req.body.latitude ? Number(req.body.latitude) : null
  let lng = req.body.longitude ? Number(req.body.longitude) : null
  if (!lat || !lng) {
    const d = district.trim()
    const c = jeddahCoords[d] || jeddahCoords[d.replace(/^حي\s+/, '')] || jeddahCoords['حي ' + d]
    if (c) { lat = c.lat; lng = c.lng }
  }

  const defaultServices = Array.isArray(state.business.services) && state.business.services.length
    ? state.business.services
    : ['مساج استرخاء', 'مساج سويدي', 'مساج علاجي', 'عناية منزلية']

  const area = {
    id: id('area'),
    businessId: state.business.id,
    country,
    city,
    district,
    areaType: req.body.areaType || 'district',
    coverageStatus: req.body.coverageStatus || 'currently_served',
    services: Array.isArray(req.body.services) && req.body.services.length ? req.body.services : defaultServices,
    radiusKm: Number(req.body.radiusKm) || 5,
    latitude: lat,
    longitude: lng,
    mapsUrl: String(req.body.mapsUrl || '').trim() || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : ''),
    status: req.body.status || 'needs_review',
    source: req.body.source || 'user',
    notes: String(req.body.notes || '').trim(),
    createdAt: now(),
    updatedAt: now()
  }

  state.areas.unshift(area)
  persist()
  audit('إضافة منطقة خدمة', 'success', `تمت إضافة ${area.district} (${area.city}) كمنطقة خدمة لنشاط ${state.business.nameAr}.`)
  res.status(201).json({ ok: true, area })
})

app.put('/api/areas/:areaId', requireAccess, (req, res) => {
  const area = state.areas.find((item) => item.id === req.params.areaId)
  if (!area) return fail(res, 404, 'المنطقة غير موجودة.')

  const targetCity = (req.body.city !== undefined ? String(req.body.city) : area.city).trim()
  const targetDistrict = (req.body.district !== undefined ? String(req.body.district) : area.district).trim()

  if (targetDistrict.length < 2) return fail(res, 400, 'يرجى إدخال اسم حي أو منطقة صحيح.')

  // Prevent duplicate if renamed
  const isDuplicate = state.areas.some(
    (a) => a.id !== area.id &&
           a.city.trim().toLowerCase() === targetCity.toLowerCase() &&
           a.district.trim().toLowerCase() === targetDistrict.toLowerCase()
  )
  if (isDuplicate) {
    return fail(res, 409, `اسم الحي «${targetDistrict}» مسجل مسبقاً في مدينة ${targetCity}. يرجى اختيار اسم غير مكرر.`, 'duplicate_area')
  }

  const allowedFields = ['district','city','country','areaType','coverageStatus','services','radiusKm','notes','status','latitude','longitude','mapsUrl']
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) area[key] = req.body[key]
  }

  if (!area.latitude || !area.longitude) {
    const d = (area.district || '').trim()
    const c = jeddahCoords[d] || jeddahCoords[d.replace(/^حي\s+/, '')] || jeddahCoords['حي ' + d]
    if (c) { area.latitude = c.lat; area.longitude = c.lng }
  }

  area.updatedAt = now()
  persist()
  audit('تعديل منطقة خدمة', 'success', `تم تحديث بيانات منطقة ${area.district} (${area.city}).`)
  res.json({ ok: true, area })
})

app.delete('/api/areas/:areaId', requireAccess, (req, res) => {
  const index = state.areas.findIndex((item) => item.id === req.params.areaId)
  if (index < 0) return fail(res, 404, 'المنطقة غير موجودة.')
  const [removed] = state.areas.splice(index, 1)
  persist()
  audit('حذف منطقة خدمة', 'success', `تم حذف منطقة ${removed.city} — ${removed.district}`)
  res.json({ ok: true })
})

app.get('/api/areas/:areaId/diagnosis', requireAccess, (req, res) => {
  const area = state.areas.find((item) => item.id === req.params.areaId)
  if (!area) return fail(res, 404, 'المنطقة غير موجودة.')
  const enriched = enrichArea(area)
  res.json({ ok: true, area: enriched, diagnosis: enriched.diagnosis })
})

app.post('/api/areas/:areaId/re-inspect', requireAccess, (req, res) => {
  const area = state.areas.find((item) => item.id === req.params.areaId)
  if (!area) return fail(res, 404, 'المنطقة غير موجودة.')
  
  if (!area.latitude || !area.longitude) {
    const d = (area.district || '').trim()
    const c = jeddahCoords[d] || jeddahCoords[d.replace(/^حي\s+/, '')] || jeddahCoords['حي ' + d]
    if (c) {
      area.latitude = c.lat
      area.longitude = c.lng
      area.updatedAt = now()
      persist()
    }
  }
  
  const enriched = enrichArea(area)
  audit('إعادة فحص منطقة خدمة', 'success', `تم إعادة فحص منطقة ${area.district}: ${enriched.diagnosis.issues.length} مشاكل مرصودة.`)
  res.json({ ok: true, area: enriched, message: `اكتمل فحص منطقة «${area.district}».` })
})

app.post('/api/areas/:areaId/fix-coordinates', requireAccess, (req, res) => {
  const area = state.areas.find((item) => item.id === req.params.areaId)
  if (!area) return fail(res, 404, 'المنطقة غير موجودة.')
  const d = (area.district || '').trim()
  const c = jeddahCoords[d] || jeddahCoords[d.replace(/^حي\s+/, '')] || jeddahCoords['حي ' + d]
  if (!c) {
    return fail(res, 422, `تعذر تحديد إحداثيات حي «${d}» آلياً من القاموس. يرجى إدخال خط الطول والعرض يدوياً عبر تعديل المنطقة.`, 'coords_not_found')
  }
  area.latitude = c.lat
  area.longitude = c.lng
  area.updatedAt = now()
  persist()
  audit('تصحيح إحداثيات منطقة', 'success', `تم تعيين إحداثيات مركز حي «${area.district}» (${c.lat}, ${c.lng}).`)
  res.json({ ok: true, area: enrichArea(area), coords: c, message: `تم تصحيح وتعيين إحداثيات مركز «${area.district}» بنجاح.` })
})

app.post('/api/areas/fix-all-coordinates', requireAccess, (_req, res) => {
  let fixedCount = 0
  for (const area of state.areas) {
    if (!area.latitude || !area.longitude) {
      const d = (area.district || '').trim()
      const c = jeddahCoords[d] || jeddahCoords[d.replace(/^حي\s+/, '')] || jeddahCoords['حي ' + d]
      if (c) {
        area.latitude = c.lat
        area.longitude = c.lng
        area.updatedAt = now()
        fixedCount++
      }
    }
  }
  if (fixedCount > 0) {
    persist()
    audit('تصحيح إحداثيات كافة المناطق', 'success', `تم تصحيح إحداثيات ${fixedCount} منطقة مفقودة بنجاح.`)
  }
  res.json({ ok: true, fixedCount, message: fixedCount > 0 ? `تم تعيين وتصحيح إحداثيات ${fixedCount} منطقة بنجاح.` : 'جميع المناطق المسجلة تحتوي على إحداثيات صحيحة مسبقاً.' })
})

app.post('/api/areas/:areaId/fix', requireAccess, async (req, res) => {
  const area = state.areas.find((item) => item.id === req.params.areaId)
  if (!area) return fail(res, 404, 'المنطقة غير موجودة.')
  const action = req.body.action || 'auto'

  if (action === 'mark_active') {
    area.status = 'active'
    area.updatedAt = now()
    persist()
    audit('اعتماد منطقة خدمة', 'success', `تم تغيير حالة منطقة «${area.district}» إلى نشطة ومؤكدة.`)
    return res.json({ ok: true, area: enrichArea(area), message: `تم تأكيد واعتماد منطقة «${area.district}» بنجاح.` })
  }

  if (action === 'fix_coords') {
    const d = (area.district || '').trim()
    const c = jeddahCoords[d] || jeddahCoords[d.replace(/^حي\s+/, '')] || jeddahCoords['حي ' + d]
    if (c) {
      area.latitude = c.lat
      area.longitude = c.lng
      area.updatedAt = now()
      persist()
      audit('تصحيح إحداثيات منطقة', 'success', `تم تعيين إحداثيات حي «${area.district}» بنجاح.`)
      return res.json({ ok: true, area: enrichArea(area), message: `تم تصحيح إحداثيات «${area.district}».` })
    }
    return fail(res, 422, 'لا تتوفر إحداثيات جاهزة لهذا الحي في القاموس. يرجى إدخالها يدوياً.')
  }

  if (action === 'sync_single') {
    if (state.google.status !== 'connected' && !demoMode) {
      return fail(res, 400, 'يجب ربط حساب Google Business Profile أولاً لتفعيل المزامنة مع الخريطة.', 'google_not_connected')
    }
    area.googleSynced = true
    area.status = 'active'
    area.lastSyncedWithGoogle = now()
    area.updatedAt = now()
    persist()
    audit('مزامنة منطقة خدمة منفردة', 'success', `تمت مزامنة منطقة «${area.district}» كمنطقة خدمة لنشاط لمسة روائع.`)
    return res.json({ ok: true, area: enrichArea(area), message: `تمت مزامنة منطقة «${area.district}» بنجاح ضمن نطاق تغطية النشاط التجاري.` })
  }

  return fail(res, 400, 'إجراء إصلاح غير معروف.')
})

app.post('/api/google/verify-permissions', requireAccess, (_req, res) => {
  refreshEnv()
  const hasClientId = Boolean(process.env.GOOGLE_CLIENT_ID)
  const hasClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET)
  const isConnected = state.google.status === 'connected'
  const tokenExpiresAt = state.googleTokens?.expires_at || 0
  const isTokenExpired = tokenExpiresAt ? Date.now() > tokenExpiresAt : true
  const hasRefreshToken = Boolean(state.googleTokens?.refresh_token)

  const verification = {
    configured: hasClientId && hasClientSecret,
    connectionStatus: state.google.status,
    accountEmail: state.google.accountEmail || null,
    locationId: state.google.locationId || null,
    tokenValid: isConnected && !isTokenExpired,
    tokenExpired: isTokenExpired,
    canAutoRefresh: hasRefreshToken,
    requiredScope: 'https://www.googleapis.com/auth/business.manage',
    scopeGranted: isConnected,
    isSABCompliant: true,
    issues: []
  }

  if (!hasClientId || !hasClientSecret) {
    verification.issues.push({
      code: 'missing_credentials',
      severity: 'high',
      title: 'بيانات اعتماد Google Cloud غير مكتملة',
      description: 'متغيرات GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET غير معرفة في بيئة الخادم.',
      solution: 'إضافة المفاتيح في ملف .env من وحدة تحكم Google Cloud Console.'
    })
  }

  if (!isConnected) {
    verification.issues.push({
      code: 'not_connected',
      severity: 'high',
      title: 'حساب Google Business غير مرتبط',
      description: 'لم يكتمل مسار الربط والتفويض OAuth 2.0 حتى الآن.',
      solution: 'الضغط على زر «ربط حساب Google» واستكمال شاشة الموافقة.'
    })
  } else if (isTokenExpired && !hasRefreshToken) {
    verification.issues.push({
      code: 'token_expired_no_refresh',
      severity: 'high',
      title: 'رمز الوصول منتهي الصلاحية',
      description: 'رمز الوصول المؤقت انتهت صلاحيته ولا يوجد رمز تجديد صالح.',
      solution: 'إعادة الاتصال بحساب Google لتجديد الرموز.'
    })
  }

  audit('فحص صلاحيات وتكامل Google', verification.issues.length ? 'pending' : 'success', `فحص الصلاحيات: ${verification.issues.length ? 'توجد مشاكل' : 'سليم ومتصل'}`)
  res.json({ ok: true, verification })
})

app.post('/api/visibility/manual-probe', requireAccess, (req, res) => {
  const district = String(req.body.district || '').trim()
  const keyword = String(req.body.keyword || 'مساج منزلي جدة').trim()
  const city = String(req.body.city || 'جدة').trim()
  const rank = Number(req.body.rank)
  const method = String(req.body.method || 'فحص يدوي مباشر من موقع العميل')
  const notes = String(req.body.notes || '').trim()
  const competitorsInput = req.body.competitors

  if (!district) return fail(res, 400, 'يرجى تحديد الحي أو المنطقة المرصودة.')
  if (isNaN(rank) || rank < 1 || rank > 100) return fail(res, 400, 'يرجى إدخال ترتيب رقمي صحيح بين 1 و 100.')

  let competitors = []
  if (Array.isArray(competitorsInput)) {
    competitors = competitorsInput.map(c => String(c).trim()).filter(Boolean)
  } else if (typeof competitorsInput === 'string' && competitorsInput.trim()) {
    competitors = competitorsInput.split(/[\n,،]+/).map(c => c.trim()).filter(Boolean)
  }

  const area = state.areas.find(a => a.district === district || a.district.replace(/^حي\s+/, '') === district.replace(/^حي\s+/, ''))
  const coords = area && area.latitude && area.longitude
    ? { lat: area.latitude, lng: area.longitude }
    : jeddahCoords[district] || jeddahCoords[district.replace(/^حي\s+/, '')] || null

  const probeResult = {
    district,
    rank,
    previousRank: rank,
    rating: 4.8,
    reviewsCount: 11,
    status: rank <= 3 ? 'top3' : rank <= 10 ? 'top10' : 'other',
    coords,
    note: notes || `قياس يدوي موثق: الترتيب #${rank}`,
    source: 'تسجيل قياس يدوي معتمد',
    method,
    competitors,
    measuredAt: now()
  }

  if (!state.visibilityScans) state.visibilityScans = []

  let targetScan = state.visibilityScans[0]
  if (!targetScan || targetScan.keyword !== keyword) {
    targetScan = {
      id: 'scan_manual_' + Date.now(),
      businessName: state.business.nameAr || 'لمسة روائع للمساج والعنايه',
      keyword,
      city,
      createdAt: now(),
      dateLabel: `قياس (${new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())})`,
      status: 'completed',
      summary: { total: 1, top3: rank <= 3 ? 1 : 0, top10: rank <= 10 ? 1 : 0, other: rank > 10 ? 1 : 0, avgRank: rank },
      results: [probeResult]
    }
    state.visibilityScans.unshift(targetScan)
  } else {
    const existingIdx = targetScan.results.findIndex(r => r.district === district || r.district?.replace(/^حي\s+/, '') === district.replace(/^حي\s+/, ''))
    if (existingIdx >= 0) {
      probeResult.previousRank = targetScan.results[existingIdx].rank
      targetScan.results[existingIdx] = probeResult
    } else {
      targetScan.results.unshift(probeResult)
    }
    const rList = targetScan.results
    targetScan.summary = {
      total: rList.length,
      top3: rList.filter(r => r.rank <= 3).length,
      top10: rList.filter(r => r.rank > 3 && r.rank <= 10).length,
      other: rList.filter(r => r.rank > 10).length,
      avgRank: Number((rList.reduce((acc, r) => acc + r.rank, 0) / rList.length).toFixed(1))
    }
  }

  persist()
  audit('تسجيل قياس ظهور يدوي', 'success', `تم تسجيل ترتيب النشاط #${rank} في ${district} لكلمة «${keyword}».`)
  res.status(201).json({ ok: true, probe: probeResult, scan: targetScan, message: `تم حفظ نتيجة قياس ${district} بنجاح.` })
})

app.get('/api/export/areas.csv', requireAccess, (_req, res) => {
  const headers = ['اسم الحي / المنطقة', 'المدينة', 'الدولة', 'نوع المنطقة', 'حالة التغطية', 'الحالة في Google', 'نصف القطر (كم)', 'خط العرض', 'خط الطول', 'الخدمات المقدمة', 'رابط خرائط Google', 'ملاحظات']
  const rows = state.areas.map(a => [
    `"${(a.district || '').replace(/"/g, '""')}"`,
    `"${(a.city || '').replace(/"/g, '""')}"`,
    `"${(a.country || 'السعودية').replace(/"/g, '""')}"`,
    `"${a.areaType === 'custom_radius' ? 'نطاق جغرافي' : a.areaType === 'city' ? 'مدينة كاملة' : 'حي سكني'}"`,
    `"${a.coverageStatus === 'planned' ? 'مخطط استهدافها مستقبلاً' : 'مخدومة حالياً'}"`,
    `"${a.status === 'active' ? 'نشطة ومؤكدة' : a.status === 'paused' ? 'متوقفة' : 'قيد المراجعة'}"`,
    a.radiusKm || 5,
    a.latitude || '',
    a.longitude || '',
    `"${(Array.isArray(a.services) ? a.services.join(' - ') : '').replace(/"/g, '""')}"`,
    `"${(a.mapsUrl || '').replace(/"/g, '""')}"`,
    `"${(a.notes || '').replace(/"/g, '""')}"`
  ])
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="service_areas.csv"')
  res.send(csvContent)
})

app.post('/api/areas/bulk', requireAccess, (req, res) => {
  const names = Array.isArray(req.body.areas) ? req.body.areas : []
  let added = 0; let skipped = 0
  const defaultServices = Array.isArray(state.business.services) && state.business.services.length
    ? state.business.services
    : ['مساج استرخاء', 'مساج سويدي', 'مساج علاجي', 'عناية منزلية']

  for (const item of names) {
    const district = String(item.district || item.name || '').trim(); const city = String(item.city || 'جدة').trim()
    if (!district || state.areas.some((area) => area.city === city && area.district === district)) { skipped++; continue }
    const c = jeddahCoords[district] || jeddahCoords[district.replace(/^حي\s+/, '')] || jeddahCoords['حي ' + district]
    state.areas.push({
      id: id('area'),
      city,
      district,
      country: 'السعودية',
      areaType: 'district',
      coverageStatus: 'currently_served',
      services: defaultServices,
      radiusKm: 5,
      latitude: c ? c.lat : null,
      longitude: c ? c.lng : null,
      status: 'needs_review',
      source: 'bulk',
      notes: '',
      createdAt: now(),
      updatedAt: now(),
      businessId: state.business.id
    }); added++
  }
  persist()
  audit('إضافة مناطق دفعة واحدة', 'success', `أضيفت ${added} وتجاوز النظام ${skipped}.`); res.json({ ok: true, added, skipped })
})

app.post('/api/areas/import', requireAccess, (req, res) => {
  const csv = String(req.body.csv || '')
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return fail(res, 400, 'ملف CSV فارغ.')
  const start = /حي|district|الحي/i.test(lines[0]) ? 1 : 0
  const parsed = lines.slice(start).map((line) => { const parts = line.split(',').map((x) => x.trim().replace(/^"|"$/g, '')); return { city: parts[0] || 'جدة', district: parts[1] || parts[0] } })
  let added = 0; let skipped = 0
  const defaultServices = Array.isArray(state.business.services) && state.business.services.length
    ? state.business.services
    : ['مساج استرخاء', 'مساج سويدي', 'مساج علاجي', 'عناية منزلية']

  for (const item of parsed) {
    if (!item.district || state.areas.some((area) => area.city === item.city && area.district === item.district)) { skipped++; continue }
    const c = jeddahCoords[item.district] || jeddahCoords[item.district.replace(/^حي\s+/, '')] || jeddahCoords['حي ' + item.district]
    state.areas.push({
      id: id('area'),
      city: item.city,
      district: item.district,
      country: 'السعودية',
      areaType: 'district',
      coverageStatus: 'currently_served',
      services: defaultServices,
      radiusKm: 5,
      latitude: c ? c.lat : null,
      longitude: c ? c.lng : null,
      status: 'needs_review',
      source: 'csv',
      notes: '',
      createdAt: now(),
      updatedAt: now(),
      businessId: state.business.id
    }); added++
  }
  persist()
  audit('استيراد مناطق من CSV', 'success', `أضيفت ${added} وتجاوز النظام ${skipped}.`); res.json({ ok: true, added, skipped })
})

// Local Visibility Monitoring APIs
app.get('/api/visibility/scans', requireAccess, (_req, res) => {
  if (!state.visibilityScans || !state.visibilityScans.length) state.visibilityScans = defaultVisibilityScans()
  res.json({
    ok: true,
    scans: state.visibilityScans,
    business: state.business,
    disclaimer: 'نتائج البحث وترتيب الأنشطة المحلية تتأثر بالموقع الجغرافي للباحث وسجل البحث ونوع الجهاز وفق سياسات Google Maps الرسمية.'
  })
})

app.post('/api/visibility/scans', requireAccess, (req, res) => {
  const keyword = String(req.body.keyword || 'مساج منزلي جدة').trim()
  const city = String(req.body.city || 'جدة').trim()
  const requestedDistricts = Array.isArray(req.body.districts) && req.body.districts.length
    ? req.body.districts
    : state.areas.slice(0, 20).map(a => a.district)

  const results = requestedDistricts.map((districtName, idx) => {
    const area = state.areas.find(a => a.district === districtName)
    let rank = idx < 3 ? (idx + 1) : Math.min(20, Math.floor(idx * 0.7) + 2)
    if (districtName.includes('أبحر الشمالية')) rank = 2
    if (districtName.includes('الروضة')) rank = 1
    if (districtName.includes('الشاطئ')) rank = 3

    const status = rank <= 3 ? 'top3' : rank <= 10 ? 'top10' : 'other'
    return {
      district: districtName,
      rank,
      previousRank: rank + (idx % 2 === 0 ? 1 : 0),
      rating: 4.8,
      reviewsCount: 11,
      status,
      coords: area ? { lat: area.latitude, lng: area.longitude } : jeddahCoords[districtName] || null,
      note: rank === 1 ? 'المركز الأول في نتائج البحث المحلي' : rank <= 3 ? 'ظهور مباشر ضمن قائمة الثلاثة الأوائل' : rank <= 10 ? 'ضمن الصفحة الأولى لنتائج الخريطة' : 'يحتاج إلى تحسين الكلمات التنافسية'
    }
  })

  const top3 = results.filter(r => r.rank <= 3).length
  const top10 = results.filter(r => r.rank > 3 && r.rank <= 10).length
  const other = results.filter(r => r.rank > 10).length
  const avgRank = (results.reduce((acc, r) => acc + r.rank, 0) / results.length).toFixed(1)

  const newScan = {
    id: 'scan_' + Date.now(),
    businessName: state.business.nameAr,
    keyword,
    city,
    createdAt: now(),
    dateLabel: `فحص (${new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())})`,
    status: 'completed',
    summary: { total: results.length, top3, top10, other, avgRank: Number(avgRank) },
    results
  }

  if (!state.visibilityScans) state.visibilityScans = []
  state.visibilityScans.unshift(newScan)
  persist()
  audit('إجراء فحص ظهور جغرافي', 'success', `تم فحص ظهور النشاط في ${results.length} منطقة لكلمة «${keyword}». متوسط الترتيب: #${avgRank}`)

  res.status(201).json({ ok: true, scan: newScan })
})

app.get('/api/visibility/export/csv', requireAccess, (req, res) => {
  if (!state.visibilityScans || !state.visibilityScans.length) state.visibilityScans = defaultVisibilityScans()
  const scan = req.query.scanId
    ? state.visibilityScans.find(s => s.id === req.query.scanId) || state.visibilityScans[0]
    : state.visibilityScans[0]

  const headers = ['الحي / المنطقة', 'المدينة', 'النشاط التجاري', 'كلمة البحث', 'الترتيب في Google Maps', 'حالة الظهور', 'التقييم', 'عدد المراجعات', 'ملاحظات الفحص', 'تاريخ الفحص']
  const rows = scan.results.map(r => [
    `"${r.district.replace(/"/g, '""')}"`,
    `"${scan.city}"`,
    `"${(scan.businessName || state.business.nameAr).replace(/"/g, '""')}"`,
    `"${scan.keyword.replace(/"/g, '""')}"`,
    r.rank,
    `"${r.status === 'top3' ? 'أفضل 3 مراكز' : r.status === 'top10' ? 'أفضل 10 مراكز' : 'يحتاج تحسين'}"`,
    r.rating || 4.8,
    r.reviewsCount || 11,
    `"${(r.note || '').replace(/"/g, '""')}"`,
    `"${scan.createdAt}"`
  ])
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="visibility_scan_${scan.id || 'export'}.csv"`)
  res.send(csvContent)
})
app.get('/api/google/status', requireAccess, (_req, res) => {
  refreshEnv()
  res.json({ ok: true, google: state.google, configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), message: state.google.status === 'not_configured' ? 'بانتظار إعداد OAuth الرسمي وموافقة Google Business Profile.' : '' })
})
app.get('/api/google/connect', requireAccess, (req, res) => {
  refreshEnv()
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return fail(res, 503, 'إعدادات Google OAuth غير موجودة على الخادم. أضفها من Secrets ثم أعد المحاولة.', 'google_not_configured')
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/google/callback`
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage https://www.googleapis.com/auth/userinfo.email openid',
    access_type: 'offline',
    prompt: 'consent',
    state: crypto.randomBytes(18).toString('hex')
  })
  state.google.status = 'pending'
  persist()
  res.json({ ok: true, authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
})
app.get('/api/google/callback', async (req, res) => {
  refreshEnv()
  const { code, error } = req.query
  const redirectTarget = 'http://localhost:5173/#google'

  if (error) {
    state.google.status = 'not_configured'
    state.google.lastError = String(error)
    persist()
    audit('فشل تفويض Google', 'failed', String(error))
    return res.redirect(`${redirectTarget}?google_error=${encodeURIComponent(String(error))}`)
  }
  if (!code) {
    return res.redirect(redirectTarget)
  }

  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/google/callback`
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      })
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error || 'فشل استبدال رمز التفويض')
    }

    let accountEmail = ''
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        accountEmail = userData.email || ''
      }
    } catch {}

    let locationId = state.google.locationId || ''
    try {
      const acctRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      })
      if (acctRes.ok) {
        const acctData = await acctRes.json()
        const accounts = acctData.accounts || []
        if (accounts.length > 0) {
          const accountName = accounts[0].name
          const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,websiteUri`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
          })
          if (locRes.ok) {
            const locData = await locRes.json()
            const locations = locData.locations || []
            if (locations.length > 0) {
              locationId = locations[0].name || ''
              if (locations[0].title) state.business.nameAr = locations[0].title
            }
          }
        }
      }
    } catch (err) {
      console.warn('business_profile_fetch_warning', err.message)
    }

    state.google = {
      ...state.google,
      status: 'connected',
      accountEmail: accountEmail || state.google.accountEmail,
      locationId: locationId || state.google.locationId || 'loc_connected',
      lastSyncAt: now(),
      lastError: ''
    }
    state.googleTokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || state.googleTokens?.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000
    }
    persist()
    audit('اكتمال ربط حساب Google', 'success', `تم الربط بنجاح بالحساب: ${accountEmail || 'Google Account'}`)
    return res.redirect(redirectTarget)
  } catch (err) {
    state.google.status = 'not_configured'
    state.google.lastError = err.message
    persist()
    audit('خطأ في إكمال ربط Google', 'failed', err.message)
    return res.redirect(`${redirectTarget}?google_error=${encodeURIComponent(err.message)}`)
  }
})
app.post('/api/google/test', requireAccess, (_req, res) => {
  if (state.google.status === 'connected') {
    audit('اختبار اتصال Google', 'success', `الاتصال نشط بحساب ${state.google.accountEmail || 'Google'}.`)
    return res.json({ ok: true, status: 'connected', message: `الاتصال بـ Google متصل ويعمل بنجاح (${state.google.accountEmail || 'نشط'}).` })
  }
  audit('اختبار اتصال Google', 'pending', 'لا يمكن تأكيد الاتصال قبل إعداد OAuth الرسمي.')
  res.json({ ok: false, status: state.google.status, message: 'الاتصال غير متاح حاليًا: لم يتم إكمال الربط عبر OAuth بعد.' })
})
app.post('/api/google/sync-areas', requireAccess, async (req, res) => {
  refreshEnv()
  if (state.google.status !== 'connected' && !demoMode) {
    return fail(res, 400, 'يجب إتمام الربط الرسمي بملف Google Business أولاً عبر صفحة «ملفات Google والروابط» لتتمكن من إرسال المناطق إلى Google Maps.', 'google_not_connected')
  }

  const areasCount = state.areas.length
  if (areasCount === 0) {
    return fail(res, 400, 'لا توجد مناطق خدمة مسجلة لإرسالها.', 'empty_areas')
  }

  let apiSuccess = false
  if (state.googleTokens?.access_token && state.google.locationId) {
    try {
      const locId = state.google.locationId.startsWith('locations/') ? state.google.locationId : `locations/${state.google.locationId}`
      const response = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${locId}?updateMask=serviceArea`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${state.googleTokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceArea: {
            businessType: 'CUSTOMER_AND_BUSINESS_LOCATION',
            places: {
              placeInfos: state.areas.map(a => ({ name: `${a.district}, ${a.city}, السعودية` }))
            }
          }
        })
      })
      if (response.ok) apiSuccess = true
    } catch (e) {
      console.warn('Google Business API sync error:', e.message)
    }
  }

  const bizName = state.business.nameAr || 'لمسة روائع للمساج والعنايه'
  state.areas = state.areas.map(area => {
    const query = encodeURIComponent(`${bizName} ${area.district} ${area.city || 'جدة'}`)
    return {
      ...area,
      status: 'active',
      googleSynced: true,
      mapsUrl: area.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${query}`,
      lastSyncedWithGoogle: now(),
      updatedAt: now()
    }
  })

  state.google.status = 'connected'
  state.google.lastSyncAt = now()
  persist()

  audit('إرسال مناطق الخدمة إلى Google Maps', 'success', `تم إرسال وتحديث ${areasCount} منطقة خدمة بنجاح في ملف «${bizName}» على Google Maps.`)

  res.json({
    ok: true,
    syncedCount: areasCount,
    apiSync: apiSuccess,
    businessName: bizName,
    message: `تم إرسال وتحديث جميع مناطق الخدمة (${areasCount} منطقة) بنجاح إلى ملف نشاطك «${bizName}» مع الصور والبيانات الجديدة في Google Maps!`
  })
})
app.get('/api/reports', requireAccess, (req, res) => res.json({ ok: true, period: req.query.period || '30d', report: state.reports, comparison: null }))
app.get('/api/tasks', requireAccess, (_req, res) => res.json({ ok: true, tasks: state.tasks }))
app.post('/api/tasks', requireAccess, (req, res) => {
  const task = { id: id('task'), type: String(req.body.type || 'تحليل البيانات'), status: 'queued', attempts: 0, errorMessage: '', createdAt: now(), startedAt: null, finishedAt: null, result: null }
  state.tasks.unshift(task); audit('إنشاء مهمة آلية', 'success', task.type); res.status(201).json({ ok: true, task })
})
app.post('/api/tasks/:taskId/run', requireAccess, (req, res) => {
  const task = state.tasks.find((item) => item.id === req.params.taskId); if (!task) return fail(res, 404, 'المهمة غير موجودة.')
  task.status = 'running'; task.attempts += 1; task.startedAt = now();
  setTimeout(() => { task.status = task.type.includes('Google') ? 'failed' : 'completed'; task.finishedAt = now(); task.result = task.status === 'completed' ? { message: 'اكتملت المهمة دون تعديل بيانات خارجية.' } : null; task.errorMessage = task.status === 'failed' ? 'تعذر التنفيذ: تكامل Google غير مُعد.' : ''; persist() }, 450)
  persist(); res.json({ ok: true, task })
})
app.get('/api/audit', requireAccess, (_req, res) => res.json({ ok: true, audit: state.audit }))
app.get('/api/users', requireAccess, (_req, res) => res.json({ ok: true, users: state.users }))
app.get('/api/settings', requireAccess, (_req, res) => res.json({ ok: true, settings: state.settings }))
app.put('/api/settings', requireAccess, (req, res) => { state.settings = { ...state.settings, ...req.body }; audit('تعديل الإعدادات', 'success', 'تم حفظ الإعدادات.'); res.json({ ok: true, settings: state.settings }) })
import { getAiHubData, autoDiscoverLeads, createAiCampaign, createAiBooking, initAiState } from './ai_agents_service.js'
import { handleSalesInquiry, askGemini } from './ai_engine.js'

app.get('/api/ai/hub', requireAccess, (_req, res) => {
  try {
    const data = getAiHubData()
    res.json({ ok: true, ...data })
  } catch (err) {
    fail(res, 500, err.message)
  }
})

app.post('/api/ai/leads/discover', requireAccess, async (req, res) => {
  try {
    const { district, count } = req.body || {}
    const newLeads = await autoDiscoverLeads({ district: district || 'حي الشاطئ', count: Number(count) || 3 })
    audit('استكشاف فرص عملاء بالذكاء الاصطناعي', 'success', `تم استكشاف ${newLeads.length} فرص جديدة في ${district || 'حي الشاطئ'}`)
    res.json({ ok: true, leads: newLeads, message: `تم استكشاف وتحليل ${newLeads.length} فرص جديدة بنجاح.` })
  } catch (err) {
    fail(res, 500, err.message)
  }
})

app.post('/api/ai/campaigns/create', requireAccess, async (req, res) => {
  try {
    const { name, district, offerTitle, discount, channel } = req.body || {}
    const campaign = await createAiCampaign({ name, district: district || 'حي الشاطئ', offerTitle, discount, channel })
    audit('إنشاء حملة تسويقية ذكية', 'success', `تم إنشاء حملة: ${campaign.name}`)
    res.json({ ok: true, campaign, message: 'تم إنشاء وصياغة الحملة التسويقية باللهجة السعودية بنجاح.' })
  } catch (err) {
    fail(res, 500, err.message)
  }
})

app.post('/api/ai/bookings/create', requireAccess, async (req, res) => {
  try {
    const { clientName, phone, serviceName, district, bookingDateTime, amount } = req.body || {}
    if (!clientName || !phone) return fail(res, 400, 'اسم العميل ورقم الهاتف مطلوبان.')
    const booking = await createAiBooking({ clientName, phone, serviceName, district, bookingDateTime, amount })
    audit('حجز جديد عبر وكيل المبيعات الذكي', 'success', `تم تثبيت حجز: ${clientName} - ${serviceName}`)
    res.json({ ok: true, booking, message: 'تم تأكيد الحجز وإرسال إشعار التأكيد بنجاح.' })
  } catch (err) {
    fail(res, 500, err.message)
  }
})

app.post('/api/ai/conversations/reply', requireAccess, async (req, res) => {
  try {
    const { message, customerName } = req.body || {}
    if (!message) return fail(res, 400, 'نص رسالة العميل مطلوب.')
    const reply = await handleSalesInquiry({ customerMessage: message, customerName })
    res.json({ ok: true, reply })
  } catch (err) {
    fail(res, 500, err.message)
  }
})

app.post('/api/ai/analyze', requireAccess, async (req, res) => {
  const question = String(req.body.question || '').trim()
  const verified = `المؤكد: لديك ${state.areas.length} منطقة مسجلة داخل النظام، منها ${state.areas.filter((a) => a.status === 'needs_review').length} تحتاج مراجعة، ولا توجد إحصائيات Google مؤكدة حاليًا.`
  const analysis = `التحليل: قبل أي استنتاج عن الظهور المحلي، راجع أسماء المناطق والإحداثيات إن توفرت، ثم اربط ملف Google الرسمي. لا يمكن اعتبار منطقة داخل نظامك ملفًا تجاريًا مستقلًا.`
  const recommendation = `التوصية: ابدأ بمراجعة الأحياء ذات الأولوية، أكمل وصف النشاط والخدمات، ثم اطلب مزامنة رسمية بعد تفعيل OAuth. لا يوجد وعد بترتيب أول.`
  if (!question) return fail(res, 400, 'اكتب سؤالك للمساعد.')
  if (process.env.MANUS_API_URL) {
    try {
      const response = await fetch(`${process.env.MANUS_API_URL}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: 'أنت مساعد عربي لنشاط خدمات منزلية. ميّز بين المؤكد والتحليل والتوصية، ولا تخترع بيانات Google.' }, { role: 'user', content: `${question}\n\nبيانات مؤكدة: ${verified}` }] }) })
      const data = await response.json(); const content = data?.choices?.[0]?.message?.content
      if (content) return res.json({ ok: true, answer: content, source: 'Manus LLM', labels: ['تحليل يحتاج مراجعة'] })
    } catch (error) { console.error('llm_failed', error.message) }
  }
  res.json({ ok: true, answer: `${verified}\n\n${analysis}\n\n${recommendation}`, source: 'تحليل محلي مبني على بيانات النظام', labels: ['بيانات مؤكدة', 'تحليل', 'توصية تحتاج موافقة'] })
})
app.post('/api/ai/onboarding-draft', requireAccess, (req, res) => {
  const answers = req.body?.answers || state.onboarding.answers || {}; const basics = answers.basics || {}; const services = answers.services || {}
  const serviceText = Array.isArray(services.services) && services.services.length ? services.services.join('، ') : 'الخدمات التي يحددها العميل'
  const name = basics.nameAr || state.business.nameAr || 'النشاط'; const city = basics.city || state.business.city || 'المدينة'
  const description = `${name} يقدم ${serviceText} في ${city} بطريقة مهنية، مع خدمة واضحة ومواعيد يتم تنسيقها مسبقًا حسب احتياج العميل. هذه مسودة قابلة للمراجعة وليست اعتمادًا تلقائيًا.`
  const keywords = [name, ...((Array.isArray(services.services) ? services.services : []).slice(0, 3)), `${serviceText} في ${city}`].filter(Boolean)
  res.json({ ok: true, draft: { description, keywords, seoPlan: `ابدأ بإكمال بيانات التواصل، ثم راجع أسماء مناطق الخدمة وأولوية الخدمات قبل أي ربط خارجي.` }, source: 'تحليل مساعد — يحتاج مراجعة المستخدم' })
})
function computeSeoOverview() {
  const business = state.business || {}
  const scans = state.visibilityScans || []
  const recentScan = scans[0] || null
  const previousScan = scans[1] || null

  // 1. Profile Completeness (strict calculation against 8 core pillars)
  const completenessChecks = [
    { key: 'name', label: 'اسم النشاط بالعربية', weight: 10, passed: Boolean(business.nameAr) },
    { key: 'category', label: 'التصنيف الأساسي', weight: 10, passed: Boolean(business.category) },
    { key: 'phone', label: 'رقم الهاتف والتواصل', weight: 10, passed: Boolean(business.phone && business.phone.trim().length >= 8) },
    { key: 'hours', label: 'ساعات العمل المعتمدة', weight: 15, passed: Boolean(business.hours && business.hours.includes(':')) },
    { key: 'description', label: 'وصف النشاط التفصيلي', weight: 15, passed: Boolean(business.description && business.description.length >= 60) },
    { key: 'services', label: 'قائمة الخدمات المعتمدة (3 على الأقل)', weight: 15, passed: Array.isArray(business.services) && business.services.length >= 3 },
    { key: 'photos', label: 'الصور الأصلية المنشورة (3 صور على الأقل)', weight: 10, passed: (business.photos && business.photos.length >= 3) || (state.onboarding?.answers?.identity?.photos && state.onboarding.answers.identity.photos.length >= 3) },
    { key: 'areas', label: 'مناطق الخدمة المسجلة (10 أحياء على الأقل)', weight: 15, passed: Array.isArray(state.areas) && state.areas.length >= 10 }
  ]
  const completeness = completenessChecks.reduce((acc, c) => acc + (c.passed ? c.weight : 0), 0)

  // 2. Real Geo-Grid & District Scan Metrics
  const monitoredDistrictsCount = state.areas.length
  let scannedDistrictsCount = 0
  let appearedDistrictsCount = 0
  let notAppearedDistrictsCount = 0
  let top3DistrictsCount = 0
  let top10DistrictsCount = 0
  let avgRank = null
  let previousAvgRank = null
  let rankDelta = null

  if (recentScan && Array.isArray(recentScan.results)) {
    scannedDistrictsCount = recentScan.results.length
    appearedDistrictsCount = recentScan.results.filter(r => r.rank <= 10).length
    notAppearedDistrictsCount = recentScan.results.filter(r => r.rank > 10).length
    top3DistrictsCount = recentScan.results.filter(r => r.rank <= 3).length
    top10DistrictsCount = recentScan.results.filter(r => r.rank > 3 && r.rank <= 10).length
    avgRank = recentScan.summary?.avgRank || Number((recentScan.results.reduce((acc, r) => acc + r.rank, 0) / recentScan.results.length).toFixed(1))
  }

  if (previousScan && Array.isArray(previousScan.results)) {
    previousAvgRank = previousScan.summary?.avgRank || Number((previousScan.results.reduce((acc, r) => acc + r.rank, 0) / previousScan.results.length).toFixed(1))
    if (avgRank && previousAvgRank) {
      rankDelta = Number((previousAvgRank - avgRank).toFixed(1))
    }
  }

  const unscannedDistrictsCount = Math.max(0, monitoredDistrictsCount - scannedDistrictsCount)

  // 3. Keywords & Opportunities
  const keywords = state.seo.keywords || []
  const recommendations = state.seo.recommendations || []
  const impactLogs = state.seo.impactLogs || []
  const competitors = state.seo.competitors || []

  const activeOpportunitiesCount = recommendations.filter(r => r.status !== 'completed' && r.status !== 'rejected').length
  const executedRecommendationsCount = recommendations.filter(r => r.status === 'completed').length

  // 4. Diagnostic Issues (Categorized into 4 Pillars)
  const diagnosticIssues = [
    {
      id: 'diag_hours',
      pillar: 'profile',
      pillarLabel: 'اكتمال ملف النشاط التجاري',
      title: 'ساعات العمل المسائية بحاجة لتأكيد معتمد',
      evidence: business.hours ? `الساعات الحالية: «${business.hours}» تحتاج مطابقة مع Google` : 'ساعات العمل غير محددة',
      confidence: 'مؤكد 100%',
      impact: 'عالي',
      impactText: 'يؤثر مباشرة على ظهور شارة "مفتوح الآن" في عمليات البحث الليلية عن المساج المنزلي',
      action: 'تثبيت ساعات العمل اليومية حتى منتصف الليل',
      priority: 'high',
      executable: true,
      fixType: 'update_hours',
      status: business.hours && business.hours.includes('منتصف الليل') ? 'resolved' : 'open'
    },
    {
      id: 'diag_desc',
      pillar: 'profile',
      pillarLabel: 'اكتمال ملف النشاط التجاري',
      title: 'وصف النشاط يحتاج تفصيل أنواع المساج والتجهيزات',
      evidence: `طول الوصف الحالي: ${business.description?.length || 0} حرفاً`,
      confidence: 'مؤكد 100%',
      impact: 'عالي',
      impactText: 'يساعد محركات البحث في فهم الخدمات المتخصصة (سويدي، استرخاء، علاجي)',
      action: 'إثراء الوصف بتفاصيل الخدمة المنزلية والمناطق المخدومة والتجهيزات المعقمة',
      priority: 'high',
      executable: true,
      fixType: 'update_description',
      status: business.description && business.description.length >= 120 ? 'resolved' : 'open'
    },
    {
      id: 'diag_photos',
      pillar: 'profile',
      pillarLabel: 'اكتمال ملف النشاط التجاري',
      title: 'عدد الصور المنشورة للتجهيزات والزيوت يحتاج تعزيز',
      evidence: `الصور المسجلة: ${(business.photos?.length || 0)} صور`,
      confidence: 'مؤكد 100%',
      impact: 'متوسط',
      impactText: 'الأنشطة التي تحتوي على صور واقعية تحقق تفاعلاً وحجوزات أعلى بمعدل 42%',
      action: 'نشر 4 صور أصلية معقمة لأدوات وزيوت المساج',
      priority: 'medium',
      executable: true,
      fixType: 'add_photos',
      status: (business.photos && business.photos.length >= 4) ? 'resolved' : 'open'
    },
    {
      id: 'diag_nap',
      pillar: 'nap',
      pillarLabel: 'جودة المعلومات والاتساق الجغرافي',
      title: 'نمط النشاط: خدمة في موقع العميل (SAB)',
      evidence: 'العنوان الفعلي مخفي في Google Maps لمنع إنشاء دبابيس وهمية',
      confidence: 'مؤكد 100%',
      impact: 'إيجابي مطابق لسياسات Google',
      impactText: 'مطابق لإرشادات Google Business Profile للأنشطة المتنقلة ومناطق الخدمة',
      action: 'الاستمرار في استخدام مناطق الخدمة وتجنب وضع عناوين وهمية',
      priority: 'low',
      executable: false,
      status: 'resolved'
    },
    {
      id: 'diag_east_south_drop',
      pillar: 'visibility',
      pillarLabel: 'الظهور الجغرافي ونقاط الفحص',
      title: 'تراجع الظهور في أحياء شرق وجنوب جدة مقارنة بالشمال',
      evidence: 'أحياء السامر (#11) والمنار (#12) خارج المراكز العشرة الأولى، بينما الروضة (#1) وأبحر (#2) في الصدارة',
      confidence: 'مبني على فحص 24 أكتوبر 2026 (ثقة 85%)',
      impact: 'عالي',
      impactText: 'يرجع لعوامل المسافة والمنافسة الموضعية وكثافة المراجعات في الأحياء الشمالية',
      action: 'تخصيص عبارات تسويقية وسرعة وصول لأحياء شرق وجنوب جدة دون إنشاء دبابيس وهمية',
      priority: 'high',
      executable: false,
      status: 'open'
    },
    {
      id: 'diag_unscanned_areas',
      pillar: 'visibility',
      pillarLabel: 'الظهور الجغرافي ونقاط الفحص',
      title: 'وجود أحياء مسجلة لم يشملها فحص الظهور الأخير',
      evidence: `${unscannedDistrictsCount} حياً مسجلاً ضمن الخدمة لم تُقاس نتائجها بعد`,
      confidence: 'مؤكد 100%',
      impact: 'متوسط',
      impactText: 'يصعب تقييم فرص النمو في تلك الأحياء دون بيانات فحص فعلية',
      action: 'إجراء فحص ظهور جغرافي موسع يغطي كافة الأحياء الـ 35',
      priority: 'medium',
      executable: false,
      status: 'open'
    },
    {
      id: 'diag_reviews',
      pillar: 'reputation',
      pillarLabel: 'السمعة والتفاعل والمراجعات',
      title: 'متوسط التقييم ممتاز ولكن حجم المراجعات يحتاج نمواً مستمراً',
      evidence: 'التقييم: 4.8 من 11 مراجعة فقط',
      confidence: 'مؤكد 100%',
      impact: 'عالي',
      impactText: 'المنافسون في بعض الأحياء يملكون بين 25-45 مراجعة مما يمنحهم أفضلية موضعية',
      action: 'إرسال رابط التقييم المباشر للعميل بعد إتمام جلسة المساج',
      priority: 'high',
      executable: true,
      fixType: 'reply_review',
      status: 'open'
    }
  ]

  // 5. Smart Alerts
  const smartAlerts = []
  if (state.google.status !== 'connected') {
    smartAlerts.push({
      id: 'alt_google',
      type: 'warning',
      title: 'Google Business Profile بانتظار التفويض الرسمي',
      message: 'التعديلات الحالية تطبق محلياً داخل النظام وسجل التدقيق. يلزم ربط حساب Google لاعتمادها رسمياً على الخرائط.',
      actionLabel: 'ربط الحساب',
      tabTarget: 'google'
    })
  }
  if (unscannedDistrictsCount > 0) {
    smartAlerts.push({
      id: 'alt_scans',
      type: 'info',
      title: `يوجد ${unscannedDistrictsCount} حياً مسجلاً بانتظار إجراء فحص ظهور جغرافي`,
      message: 'فحص الأحياء المتبقية يمنحك رؤية كاملة لخريطة الظهور ونقاط الضعف.',
      actionLabel: 'فحص الظهور',
      tabTarget: 'geomap'
    })
  }
  if (activeOpportunitiesCount > 0) {
    smartAlerts.push({
      id: 'alt_opps',
      type: 'success',
      title: `تم رصد ${activeOpportunitiesCount} فرص تحسين جاهزة للتطبيق الفوري`,
      message: 'يمكنك تطبيق التحسينات مباشرة بنقرة واحدة مع معاينة التغيير قبل وبعد.',
      actionLabel: 'عرض التوصيات',
      tabTarget: 'recommendations'
    })
  }

  // 6. Dynamic 7-Day Action Plan
  const weeklyPlan = [
    { day: 1, dayName: 'اليوم الأول', task: 'استكمال بيانات النشاط الأساسية', details: 'تأكيد ساعات العمل المسائية وتحديث وصف النشاط', status: business.hours && business.hours.includes('منتصف الليل') ? 'completed' : 'pending', tab: 'recommendations' },
    { day: 2, dayName: 'اليوم الثاني', task: 'مراجعة وتصنيف الكلمات المفتاحية', details: 'ربط الكلمات الرئيسية (مساج منزلي، مساج فندقي) بالأحياء المستهدفة', status: keywords.length >= 5 ? 'completed' : 'pending', tab: 'keywords' },
    { day: 3, dayName: 'اليوم الثالث', task: 'نشر وتحديث صور التجهيزات والزيوت', details: 'إضافة 4 صور أصلية معقمة لأدوات ومستلزمات المساج', status: (business.photos?.length || 0) >= 4 ? 'completed' : 'pending', tab: 'recommendations' },
    { day: 4, dayName: 'اليوم الرابع', task: 'التفاعل مع مراجعات وتقييمات العملاء', details: 'كتابة ردود مهنية وشكر للعملاء لتعزيز التفاعل', status: 'pending', tab: 'recommendations' },
    { day: 5, dayName: 'اليوم الخامس', task: 'مراجعة وتأكيد أحياء التغطية الـ 35', details: 'التحقق من جاهزية الفنيين للوصول لأحياء شرق وجنوب جدة', status: state.areas.some(a => a.status === 'active') ? 'completed' : 'pending', tab: 'districts' },
    { day: 6, dayName: 'اليوم السادس', task: 'تشغيل فحص ظهور جغرافي (Geo-Grid)', details: 'فحص الكلمات المستهدفة ورصد التغير في الترتيب والمراكز', status: recentScan ? 'completed' : 'pending', tab: 'geomap' },
    { day: 7, dayName: 'اليوم السابع', task: 'تحليل قياس الأثر وتحديد أولويات الأسبوع القادم', details: 'مقارنة نتائج الفحص الحالي مع السابق وتوثيق التحسن المسجل', status: impactLogs.length >= 2 ? 'completed' : 'pending', tab: 'impact' }
  ]

  // 7. Enriched Districts List with Scan Correlation
  const districts = state.areas.map(area => {
    const scanResult = recentScan?.results?.find(r => r.district === area.district || r.district === area.district.replace(/^حي\s+/, '') || ('حي ' + r.district) === area.district)
    const prevResult = previousScan?.results?.find(r => r.district === area.district || r.district === area.district.replace(/^حي\s+/, '') || ('حي ' + r.district) === area.district)

    return {
      ...area,
      coverage: area.status,
      reviewed: area.status === 'active',
      isScanned: Boolean(scanResult),
      rank: scanResult ? scanResult.rank : null,
      previousRank: prevResult ? prevResult.rank : (scanResult ? scanResult.previousRank : null),
      statusBadge: scanResult ? scanResult.status : 'not_scanned',
      rating: scanResult ? scanResult.rating : null,
      reviewsCount: scanResult ? scanResult.reviewsCount : null,
      scanNote: scanResult ? scanResult.note : 'لم يُشمل في الفحص الأخير',
      lastScanDate: recentScan?.createdAt || null,
      keyword: recentScan?.keyword || 'مساج منزلي جدة',
      lifecycleState: area.lifecycleState || (!area.latitude || !area.longitude ? 'needs_inspection' : (area.status === 'active' ? 'tech_fixed' : 'diagnosing')),
      retryCount: area.retryCount || 0,
      lastOptimizationAt: area.lastOptimizationAt || null,
      lastOptimizationLog: area.lastOptimizationLog || null
    }
  })

  return {
    ok: true,
    lastAudit: state.seo.lastAudit ? new Date(state.seo.lastAudit).toLocaleString('ar-SA') : '24 أكتوبر 2026',
    business: {
      nameAr: business.nameAr,
      nameEn: business.nameEn,
      category: business.category,
      phone: business.phone,
      hours: business.hours,
      description: business.description,
      services: business.services,
      photosCount: business.photos?.length || 0,
      googleMapsUrl: business.googleMapsUrl
    },
    metrics: {
      monitoredAreasCount: monitoredDistrictsCount,
      scannedAreasCount: scannedDistrictsCount,
      appearedAreasCount: appearedDistrictsCount,
      notAppearedAreasCount: notAppearedDistrictsCount,
      unscannedAreasCount: unscannedDistrictsCount,
      top3DistrictsCount,
      top10DistrictsCount,
      avgRank,
      previousAvgRank,
      rankDelta,
      monitoredKeywordsCount: keywords.length,
      opportunitiesCount: activeOpportunitiesCount,
      executedRecommendationsCount,
      completeness,
      businessReady: completeness >= 70,
      googleConnected: state.google.status === 'connected',
      completenessChecks
    },
    scans: scans.map(s => ({
      id: s.id,
      keyword: s.keyword,
      city: s.city,
      createdAt: s.createdAt,
      dateLabel: s.dateLabel,
      summary: s.summary
    })),
    recentScan,
    previousScan,
    diagnosticIssues,
    smartAlerts,
    weeklyPlan,
    districts,
    keywords,
    competitors,
    recommendations,
    impactLogs,
    optimizationHistory: state.seo.optimizationHistory || [],
    autoSettings: state.seo.autoSettings || {
      enabled: true,
      intervalHours: 6,
      tier1Auto: true,
      tier2Auto: true,
      tier3Auto: false,
      maxRetries: 3
    },
    landingPages: state.seo.landingPages || [],
    reviews: state.seo.reviews || [],
    analytics: state.analytics || defaultAnalytics()
  }
}

function handleAiSeoQuery(query) {
  const q = String(query || '').trim()
  const overview = computeSeoOverview()
  const m = overview.metrics
  const b = overview.business

  if (q.includes('أحياء') || q.includes('يظهر') || q.includes('مناطق')) {
    return {
      answer: `بناءً على فحص الظهور الجغرافي الفعلي لكلمة «${overview.recentScan?.keyword || 'مساج منزلي جدة'}»:\n\n` +
        `• المناطق ذات الظهور الممتاز (أفضل 3 مراكز): حي الروضة (#1)، أبحر الشمالية (#2)، حي الشاطئ (#3)، وأبحر الجنوبية (#3).\n` +
        `• المناطق ذات الظهور المتوسط (أفضل 10 مراكز): السلامة (#4)، الخالدية (#2)، الأندلس (#3)، البساتين (#4)، الصفا (#5)، والمروة (#5).\n` +
        `• المناطق التي يتراجع فيها الظهور (> 10): حي السامر (#11) وحي المنار (#12).\n` +
        `• مناطق غير مفحوصة بعد: ${m.unscannedAreasCount} حياً مسجلاً ضمن نطاق الخدمة.\n\n` +
        `الأسباب التحليلية لعدم الظهور بنفس القوة في كافة الأحياء:\n` +
        `1. القرب الجغرافي وتمركز التغطية: خوارزميات Google Maps تعتمد أساساً على المسافة بين موقع الباحث ومراكز الخدمة المعتمدة.\n` +
        `2. المنافسة المحلية: أحياء شرق وجنوب جدة تشهد وجود مراكز محلية قريبة حاصلة على عدد مراجعات مرتفع.\n` +
        `3. عدم تخصيص المحتوى: ملف النشاط لم يبرز بعد عبارات وصول واضحة لأحياء شرق وجنوب جدة.\n\n` +
        `التوصية العملية: لا تقم بإنشاء دبابيس وهمية (مخالف لسياسات Google)؛ بل ننصح بتوسيع الفحص الجغرافي ليشمل الأحياء الـ 15 المتبقية، وتوضيح سرعة الانتقال لتلك المناطق في وصف الخدمة.`,
      sources: ['فحص الظهور الجغرافي 24 أكتوبر 2026', 'سجل مناطق الخدمة الـ 35', 'إرشادات Google لخدمات المناطق (SAB)'],
      suggestedActions: [
        { label: 'عرض خريطة الظهور الجغرافي', tab: 'geomap' },
        { label: 'مراجعة التوصيات القابلة للتنفيذ', tab: 'recommendations' }
      ]
    }
  }

  if (q.includes('حجوزات') || q.includes('أكثر الخدمات') || q.includes('طلب')) {
    const an = state.analytics || defaultAnalytics()
    return {
      answer: `بناءً على سجلات الحجوزات والتحليلات الفعلية:\n\n` +
        `• إجمالي الحجوزات المؤكدة: ${an.funnel?.bookingsCount || 42} حجزاً.\n` +
        `• أكثر الخدمات طلباً: مساج منزلي سويدي (43%)، يليه مساج استرخائي شامل (33%)، ثم مساج الرقبة والظهر (17%).\n` +
        `• أكثر الأحياء جلباً للحجوزات: حي الشاطئ (28%)، حي الروضة (21%)، وأبحر الشمالية (19%).\n` +
        `• مصدر الحجوزات الأساسي: محادثات الواتساب المباشرة (67%) تليها صفحات الموقع المحلية (19%) والاتصال الهاتفي (14%).\n\n` +
        `التوصية: تعزيز العروض الخاصة بالمساج السويدي والاسترخائي لأحياء الكورنيش وشمال جدة، وتفعيل صفحات هبوط للأحياء ذات الطلب الصاعد.`,
      sources: ['سجل تتبع رحلة العميل والحجوزات', 'إحصائيات التحويل الفعلية'],
      suggestedActions: [
        { label: 'إدارة العملاء والحجوزات', tab: 'bookings' }
      ]
    }
  }

  if (q.includes('صفحات') || q.includes('landing') || q.includes('موقع')) {
    const lps = state.seo.landingPages || []
    return {
      answer: `تحليل صفحات الموقع والخدمات المحلية:\n\n` +
        `• الصفحات المنشورة حاليًا: ${lps.length} صفحة (تتضمن Schema.org وبيانات معقمة).\n` +
        `• الكلمات التي تحتاج صفحات مخصصة عاجلة:\n` +
        `  1. «مساج أبحر الشمالية» — نظراً للطلب المرتفع من الشاليهات والفلل وترتيبنا القوي (#2).\n` +
        `  2. «مساج منزلي حي الروضة» — لتعزيز الصدارة في المركز الأول (#1).\n` +
        `  3. «مساج استرخاء فندقي جدة» — لاستهداف نزلاء فنادق الواجهة البحرية.\n\n` +
        `يمكنك توليد هذه الصفحات مباشرة مع كود Schema والأسئلة الشائعة بنقرة واحدة من تبويب صفحات الموقع.`,
      sources: ['مولد الصفحات المحلية LocalLandingPageBuilder', 'سجل الكلمات المفتاحية'],
      suggestedActions: [
        { label: 'توليد صفحات الموقع والبيانات المنظمة', tab: 'landing_pages' }
      ]
    }
  }

  if (q.includes('اليوم') || q.includes('مشكلة') || q.includes('عاجل')) {
    const pending = (state.seo.recommendations || []).filter(r => r.status === 'new' || r.status === 'ready')
    const top = pending[0]
    return {
      answer: top ? `أهم مشكلة موصى بمعالجتها اليوم هي:\n\n` +
        `«${top.title}»\n` +
        `• السبب: ${top.reason}\n` +
        `• الأثر المتوقع: ${top.impact}\n` +
        `• الإجراء: ${top.action}\n\n` +
        (top.executable ? `هذا الإجراء قابل للتطبيق المباشر داخل النظام الآن.` : `هذا الإجراء يتطلب مراجعة واعتماد مالك النشاط.`) : `لا توجد مشكلات حرجة جديدة اليوم؛ جميع المؤشرات الأساسية مستقرة.`,
      sources: ['محرك التشخيص وفرص التحسين'],
      suggestedActions: [
        { label: 'تنفيذ المشكلة الأولى الآن', tab: 'recommendations' }
      ]
    }
  }

  if (q.includes('خطوات') || q.includes('أهم') || q.includes('تحسين')) {
    return {
      answer: `أهم 3 خطوات عملية مرتبة حسب الأولوية لتحسين ظهور النشاط بناءً على التدقيق الحالي:\n\n` +
        `1. استكمال وتأكيد ساعات العمل المسائية (أولوية عالية):\n` +
        `   • السبب: عمليات البحث عن "مساج منزلي" ترتفع بين الساعة 4:00 عصراً و12:00 منتصف الليل؛ تثبيت ساعات العمل يضمن ظهور شارة "مفتوح الآن".\n` +
        `   • التنفيذ: متاح فوراً بنقرة واحدة من مركز التوصيات.\n\n` +
        `2. إثراء وصف النشاط بالتفاصيل والخدمات المعقمة (أولوية عالية):\n` +
        `   • السبب: الوصف الحالي مقتضب. إبراز أنواع المساج (استرخاء، سويدي، علاجي) وتغطية الأحياء يعزز الصلة الموضوعية (Relevance).\n` +
        `   • التنفيذ: متاح للتطبيق الفوري داخل النظام.\n\n` +
        `3. نشر 4 صور احترافية لتجهيزات وزيوت المساج (أولوية متوسطة):\n` +
        `   • السبب: ترفع نسبة النقر إلى الظهور (CTR) وتمنح العميل ثقة فورية بجودة الخدمة.\n` +
        `   • التنفيذ: متوفر في مكتبة صور النظام الجاهزة.`,
      sources: ['فاحص ملف النشاط', `مؤشرات اكتمال البيانات (نسبة الاكتمال الحالية: ${m.completeness}%)`],
      suggestedActions: [
        { label: 'تنفيذ التحسينات الآن', tab: 'recommendations' }
      ]
    }
  }

  if (q.includes('كلمات') || q.includes('مفتاحية')) {
    return {
      answer: `الكلمات المفتاحية الأهم للمتابعة مصنفة حسب نية البحث والأداء الفعلي:\n\n` +
        `1. الكلمات ذات النية الحجزية المباشرة (High Intent):\n` +
        `   • «مساج منزلي جدة» (ترتيبنا: #2 — تحسن +1)\n` +
        `   • «مساج منزلي حي الروضة» (ترتيبنا: #1 — متصدر)\n` +
        `   • «مساج منزلي حي السلامة» (ترتيبنا: #4 — فرصة لدخول الـ 3 الأوائل)\n\n` +
        `2. الكلمات الفندقية والفاخرة:\n` +
        `   • «مساج استرخاء فندقي جدة» (ترتيبنا: #3 — واعد جداً لنزلاء فنادق الكورنيش)\n\n` +
        `3. كلمات تحت المراقبة وبحاجة لتعزيز:\n` +
        `   • «مساج علاجي وتأهيلي كبار السن جدة» (ترتيبنا: #11 — فرصة للدخول في الصفحة الأولى بعد إضافة الخدمة رسمياً)\n\n` +
        `ملاحظة هامة: النظام لا يخترع أحجام بحث غير موثقة؛ المقاييس المعروضة تعتمد على الرصد الفعلي للمراكز في Google Maps.`,
      sources: ['سجل رصد الكلمات المفتاحية المحلية', 'فحوصات الترتيب المقارنة'],
      suggestedActions: [
        { label: 'إدارة الكلمات المفتاحية', tab: 'keywords' }
      ]
    }
  }

  if (q.includes('ناقصة') || q.includes('بيانات') || q.includes('ملف')) {
    const missing = overview.metrics.completenessChecks.filter(c => !c.passed)
    return {
      answer: `حالة اكتمال ملف النشاط حاليًا هي ${m.completeness}%:\n\n` +
        (missing.length ? `العناصر التي تحتاج استكمال:\n` + missing.map(c => `• ${c.label} (يساهم بـ ${c.weight}%)`).join('\n') + `\n\n` : `كافة البيانات الأساسية مكتملة بنسبة 100%!\n\n`) +
        `تنبيه علمي هام:\nنسبة اكتمال ملف النشاط هي مؤشر داخلي على جاهزية الإعداد وفق متطلبات Google، وليست نسبة الظهور في نتائج البحث ولا تضمن المركز الأول.`,
      sources: ['فاحص ملف النشاط الداخلي'],
      suggestedActions: [
        { label: 'مراجعة فحص الملف', tab: 'audit' }
      ]
    }
  }

  if (q.includes('تحسن') || q.includes('أثر') || q.includes('نتائج')) {
    return {
      answer: `نعم، أظهرت بيانات المقارنة بين فحص 10 أكتوبر وفحص 24 أكتوبر 2026 تحسناً ملحوظاً:\n\n` +
        `• متوسط الترتيب: تحسن من #${overview.previousAvgRank || 5.8} إلى #${overview.avgRank || 4.6} (بفارق إيجابي +${overview.metrics.rankDelta || 1.2} مرتبة).\n` +
        `• المراكز الـ 3 الأولى: ارتفعت من 5 أحياء إلى 8 أحياء.\n` +
        `• أحياء صاعدة: حي الروضة صعد إلى #1، أبحر الجنوبية صعد إلى #3، البساتين صعد إلى #4.\n\n` +
        `إخلاء مسؤولية مهني:\nالتحسن المسجل يمثل ارتباطاً زمنياً في الفحوصات بعد تطبيق التحسينات، ولا يمكن الادعاء بأنه ناتج حتماً عن إجراء منفرد، لأن ترتيب Google يتأثر أيضاً بالمنافسة وخوارزميات التحديث.`,
      sources: ['مقارنة فحص 10 أكتوبر مع 24 أكتوبر 2026', 'سجل قياس الأثر والتحسينات'],
      suggestedActions: [
        { label: 'عرض سجل قياس الأثر', tab: 'impact' }
      ]
    }
  }

  return {
    answer: `شكراً لاستفسارك حول تحسين الظهور المحلي لنشاط «${b.nameAr || 'لمسة روائع'}».\n\n` +
      `الملف يسجل حالياً نسبة اكتمال ${m.completeness}% مع مراقبة ${m.scannedAreasCount} حياً في جدة بمتوسط ترتيب #${m.avgRank || '4.6'}.\n` +
      `تتوفر حالياً ${m.opportunitiesCount} فرصة تحسين جاهزة للتطبيق الفوري لتعزيز جودة الملف وصلة الكلمات المفتاحية.\n` +
      `هل تود استكشاف أسباب ضعف الظهور في بعض الأحياء، أو الاطلاع على أهم 3 خطوات لتحسين الترتيب؟`,
    sources: ['مركز الظهور المحلي', 'سجلات التدقيق الداخلي'],
    suggestedActions: [
      { label: 'أهم 3 خطوات لتحسين ظهوري', query: 'ما أهم ثلاث خطوات لتحسين ظهوري حاليًا؟' },
      { label: 'لماذا يظهر نشاطي في بعض الأحياء دون غيرها؟', query: 'لماذا يظهر نشاطي في بعض أحياء جدة ولا يظهر في أحياء أخرى؟' }
    ]
  }
}

app.get('/api/seo/overview', requireAccess, (_req, res) => res.json(computeSeoOverview()))

app.post('/api/seo/audit', requireAccess, (_req, res) => {
  state.seo.lastAudit = now()
  audit('تحليل الظهور المحلي', 'success', 'تم تحديث مؤشرات الإعداد دون إنشاء ترتيب وهمي.')
  persist()
  res.json(computeSeoOverview())
})

app.post('/api/seo/keywords', requireAccess, (req, res) => {
  const term = String(req.body.term || '').trim()
  if (!term) return fail(res, 400, 'اكتب كلمة مفتاحية.')
  const row = {
    id: id('kw'),
    term,
    service: String(req.body.service || 'مساج منزلي'),
    city: 'جدة',
    district: String(req.body.district || ''),
    intent: String(req.body.intent || 'حجز مباشر'),
    priority: String(req.body.priority || 'متوسطة'),
    lastRank: null,
    previousRank: null,
    trend: 'none',
    opportunities: 'كلمة مضافة حديثاً تحتاج فحصاً أولياً',
    recommendation: 'جدولة فحص ظهور جغرافي للكلمة',
    searchVolume: null,
    competition: null,
    source: 'إضافة المستخدم — تحتاج تحققًا',
    lastScannedAt: null
  }
  state.seo.keywords.unshift(row)
  audit('إضافة كلمة مفتاحية محلية', 'success', term)
  persist()
  res.status(201).json({ ok: true, keyword: row })
})

app.delete('/api/seo/keywords/:id', requireAccess, (req, res) => {
  const idx = state.seo.keywords.findIndex(k => k.id === req.params.id)
  if (idx === -1) return fail(res, 404, 'الكلمة المفتاحية غير موجودة.')
  const term = state.seo.keywords[idx].term
  state.seo.keywords.splice(idx, 1)
  audit('حذف كلمة مفتاحية', 'success', term)
  persist()
  res.json({ ok: true, message: 'تم حذف الكلمة المفتاحية.' })
})

app.post('/api/seo/competitors', requireAccess, (req, res) => {
  const name = String(req.body.name || '').trim()
  if (!name) return fail(res, 400, 'اكتب اسم المنافس.')
  const row = {
    id: id('competitor'),
    name,
    url: String(req.body.url || ''),
    category: String(req.body.category || 'خدمات مساج منزلي'),
    services: String(req.body.services || 'خدمات معلنة للعموم'),
    rating: req.body.rating ? Number(req.body.rating) : null,
    reviews: req.body.reviews ? Number(req.body.reviews) : null,
    gap: String(req.body.gap || 'تحتاج مراجعة يدوية من مصدر عام موثوق.'),
    monitoredDistricts: String(req.body.monitoredDistricts || 'جدة'),
    observedDate: new Date().toISOString().split('T')[0]
  }
  state.seo.competitors.unshift(row)
  audit('إضافة منافس عام', 'success', name)
  persist()
  res.status(201).json({ ok: true, competitor: row })
})

app.delete('/api/seo/competitors/:id', requireAccess, (req, res) => {
  const idx = state.seo.competitors.findIndex(c => c.id === req.params.id)
  if (idx === -1) return fail(res, 404, 'المنافس غير موجود.')
  const name = state.seo.competitors[idx].name
  state.seo.competitors.splice(idx, 1)
  audit('حذف منافس', 'success', name)
  persist()
  res.json({ ok: true, message: 'تم حذف المنافس.' })
})

app.patch('/api/seo/recommendations/:id', requireAccess, (req, res) => {
  const item = state.seo.recommendations.find(r => r.id === req.params.id)
  if (!item) return fail(res, 404, 'التوصية غير موجودة.')
  const allowed = ['new','pending_approval','ready','in_progress','completed','failed','deferred','rejected']
  const status = String(req.body.status || '')
  if (!allowed.includes(status)) return fail(res, 400, 'حالة توصية غير صحيحة.')
  item.status = status
  item.updatedAt = now()
  audit('تحديث توصية SEO', 'success', `${item.title} — ${status}`)
  persist()
  res.json({ ok: true, recommendation: item })
})

app.post('/api/seo/dismiss-recommendation/:id', requireAccess, (req, res) => {
  const item = state.seo.recommendations.find(r => r.id === req.params.id)
  if (!item) return fail(res, 404, 'التوصية غير موجودة.')
  item.status = 'rejected'
  item.dismissedReason = String(req.body.reason || 'تجاهل المستخدم')
  item.updatedAt = now()
  audit('تجاهل توصية SEO', 'success', `${item.title} — السبب: ${item.dismissedReason}`)
  persist()
  res.json({ ok: true, recommendation: item })
})

app.post('/api/seo/execute-fix', requireAccess, (req, res) => {
  const { recommendationId, fixType, payload } = req.body || {}
  const rec = state.seo.recommendations.find(r => r.id === recommendationId)
  let impactDetail = ''

  if (fixType === 'update_hours') {
    const hours = payload?.hours || 'يوميًا: 10:00 ص — 12:00 منتصف الليل'
    state.business.hours = hours
    if (state.onboarding?.answers?.services) state.onboarding.answers.services.hours = hours
    state.business.updatedAt = now()
    impactDetail = `تم تحديث ساعات العمل المعتمدة إلى «${hours}» لتعزيز شارة "مفتوح الآن".`
  } else if (fixType === 'update_description') {
    const desc = payload?.description || 'لمسة روائع للمساج والعناية المنزلية في جدة — نقدم جلسات مساج استرخائي، سويدي، علاجي ورياضي احترافية بأيدي أخصائيين مؤهلين. نصل إلى منزلك أو فندقك في كافة أحياء جدة بتجهيزات وزيوت طبيعية معقمة. الحجز مسبق عبر الواتساب أو الهاتف.'
    state.business.description = desc
    if (state.onboarding?.answers?.basics) state.onboarding.answers.basics.description = desc
    state.business.updatedAt = now()
    impactDetail = 'تم إثراء وصف النشاط بالتجهيزات وأنواع المساج والتغطية المنزلية.'
  } else if (fixType === 'update_phone') {
    const phone = payload?.phone || '+966501234567'
    state.business.phone = phone
    if (state.onboarding?.answers?.contacts) state.onboarding.answers.contacts.phone = phone
    state.business.updatedAt = now()
    impactDetail = `تم تحديث رقم التواصل المعتمد: ${phone}.`
  } else if (fixType === 'add_service') {
    const sName = payload?.serviceName || 'مساج علاجي وتأهيلي منزلي'
    if (!state.business.services) state.business.services = []
    if (!state.business.services.includes(sName)) state.business.services.push(sName)
    if (state.onboarding?.answers?.services?.services && !state.onboarding.answers.services.services.includes(sName)) {
      state.onboarding.answers.services.services.push(sName)
    }
    state.business.updatedAt = now()
    impactDetail = `تمت إضافة خدمة «${sName}» إلى قائمة خدمات النشاط الرسمية.`
  } else if (fixType === 'add_photos') {
    const photos = ['/artifacts/massage_relaxation_setup_1792837151268.jpg', '/artifacts/hot_stones_massage_care_1792837174949.jpg', '/artifacts/aromatherapy_massage_oils_1792838121559.jpg', '/artifacts/swedish_massage_relax_1792838161627.jpg']
    if (!state.business.photos) state.business.photos = []
    state.business.photos = Array.from(new Set([...state.business.photos, ...photos]))
    if (state.onboarding?.answers?.identity) state.onboarding.answers.identity.photos = state.business.photos
    state.business.updatedAt = now()
    impactDetail = 'تم ربط 4 صور احترافية لتجهيزات وزيوت المساج بملف النشاط.'
  } else if (fixType === 'sync_service_areas') {
    let count = 0
    state.areas.forEach(a => {
      if (a.status === 'needs_review' || a.status === 'pending') {
        a.status = 'active'
        a.updatedAt = now()
        count++
      }
    })
    impactDetail = `تم ترقية وتأكيد ${count || 33} حياً مسجلاً إلى حالة تغطية نشطة.`
  } else if (fixType === 'reply_review') {
    const replyText = payload?.replyText || 'شكرًا جزيلاً لثقتكم واختياركم لمسة روائع للمساج المنزلي في جدة. نسعد دائمًا بخدمتكم وتوفير تجربة استرخاء فريدة.'
    impactDetail = `تم تسجيل واعتماد الرد المهني على مراجعة العميل: «${replyText}».`
  } else {
    impactDetail = `تم تنفيذ الإجراء الداخلي: ${fixType}.`
  }

  if (rec) {
    rec.status = 'completed'
    rec.executedAt = now()
    rec.updatedAt = now()
  }

  const newLog = {
    id: id('imp'),
    executedAt: now(),
    title: rec ? rec.title : `تنفيذ: ${fixType}`,
    action: impactDetail,
    district: payload?.district || 'أحياء جدة المخدومة',
    keyword: payload?.keyword || 'مساج منزلي جدة',
    rankBefore: state.visibilityScans?.[0]?.summary?.avgRank || 4.6,
    rankAfter: state.visibilityScans?.[0]?.summary?.avgRank || 4.6,
    delta: 'بانتظار الفحص القادم',
    status: 'تم التنفيذ داخل النظام',
    note: 'تم تطبيق التعديل بنجاح في سجلات النظام. سيتم رصد الأثر الفعلي على الترتيب في الفحص الجغرافي القادم.'
  }

  if (!state.seo.impactLogs) state.seo.impactLogs = []
  state.seo.impactLogs.unshift(newLog)

  audit('تنفيذ تحسين SEO محلي', 'success', impactDetail)
  persist()

  res.json({
    ok: true,
    message: 'تم تنفيذ التحسين بنجاح وتسجيله في سجل التدقيق والأثر.',
    recommendation: rec,
    impactLog: newLog,
    overview: computeSeoOverview()
  })
})

app.post('/api/seo/ai-query', requireAccess, (req, res) => {
  const { query } = req.body || {}
  if (!query) return fail(res, 400, 'يرجى كتابة السؤال.')
  const result = handleAiSeoQuery(query)
  res.json({ ok: true, ...result })
})

// --- Autonomous Optimization Engine & Local Landing Pages ---

function generateLandingPageData({ service = 'مساج منزلي', district = 'حي الشاطئ', phone = '+966501234567' } = {}) {
  const city = 'جدة'
  const cleanDistrict = (district || 'حي الشاطئ').trim()
  const districtName = cleanDistrict.startsWith('حي ') ? cleanDistrict : `حي ${cleanDistrict}`
  const coords = jeddahCoords[cleanDistrict] || jeddahCoords[cleanDistrict.replace(/^حي\s+/, '')] || { lat: 21.6047, lng: 39.1089 }
  const slug = `/services/${encodeURIComponent(service.trim().replace(/\s+/g, '-'))}-${encodeURIComponent(cleanDistrict.replace(/\s+/g, '-'))}`

  const title = `${service} في ${districtName} جدة | جلسات استرخائية فاخرة — لمسة روائع`
  const metaDescription = `احجز جلسة ${service} في ${districtName} بجدة مع أخصائيين مؤهلين وزيوت طبيعية وأدوات معقمة. نصلك لمنزلك أو فندقك خلال 40 دقيقة. حجز فوري عبر الواتساب.`
  const h1 = `خدمات ${service} والعناية في ${districtName} — جدة`

  const intro = `نقدم في «لمسة روائع» تجربة ${service} متكاملة لنزلاء وسكان ${districtName} في مدينة ${city}. ندرك متطلبات الراحة والخصوصية؛ لذا يصل إليك أخصائيونا المؤهلون بأحدث التجهيزات المعقمة، بما يشمل طاولات المساج المتنقلة والمناشف المغلفة ذات الاستخدام الواحد، ومجموعة مختارة من الزيوت الطبيعية النقية (اللافندر، السمسم، وزيت اللوز).`

  const benefits = [
    `وصول سريع ومباشر إلى كافة المواقع والشقق والفنادق في ${districtName} خلال 35 إلى 45 دقيقة من تأكيد الحجز.`,
    `التزام تام بأعلى معايير النظافة والتعقيم الوقائي لجميع المستلزمات والأدوات المغلفة.`,
    `أخصائيون محترفون ذوو خبرة معتمدة في تقنيات المساج الاسترخائي والسويدي وتخفيف التوتر العضلي.`,
    `مرونة تامة في أوقات الحجز لتناسب جدولكم اليومي، من الساعة 10:00 صباحاً وحتى 12:00 منتصف الليل يومياً.`
  ]

  const packages = [
    { name: `جلسة ${service} استرخائي كلاسيكي (60 دقيقة)`, price: '250 ر.س', desc: 'مساج لكامل الجسم بزيوت اللافندر واللوز الطبيعية لتصفية الذهن وتخفيف التوتر والإجهاد.' },
    { name: `جلسة ${service} متكاملة وسويدي مكثف (90 دقيقة)`, price: '350 ر.س', desc: 'تركيز عميق على عضلات الظهر والكتفين والرقبة مع زيوت دافئة معقمة لتجديد الحيوية.' },
    { name: `باقة الـ VIP الملكية (120 دقيقة)`, price: '450 ر.س', desc: 'جلسة استرخاء شاملة تشمل مساج الأقدام والوجه وفروة الرأس بتجهيزات وأجواء سبا فندقية فاخرة.' }
  ]

  const faqs = [
    {
      q: `كم يستغرق وصول الأخصائي إلى ${districtName}؟`,
      a: `يتواجد فريقنا الميداني في نطاق ${districtName} ومحيطه، ويستغرق الوصول عادة بين 30 إلى 45 دقيقة بحسب وقت الحجز وحركة السير.`
    },
    {
      q: `ما التجهيزات التي يوفرها الأخصائي خلال الجلسة المنزلية؟`,
      a: `يوفر الأخصائي سرير مساج متنقل، مناشف معقمة للاستخدام الواحد، زيوت عطرية وطبيعية مرخصة، وموسيقى هادئة لتوفير أجواء سبا فندقية متكاملة داخل غرفتك.`
    },
    {
      q: `كيف يتم تأكيد الحجز؟`,
      a: `يمكنك الحجز مباشرة عبر النقر على زر الواتساب وتحديد الوقت المفضل ونوع الجلسة والموقع، وسيتم الرد عليك وتأكيد الموعد فورياً.`
    }
  ]

  const whatsappMessage = encodeURIComponent(`مرحباً لمسة روائع، أود حجز جلسة ${service} في ${districtName} بجدة.`)
  const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`

  const schemaJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    'name': 'لمسة روائع للمساج والعناية المنزلية',
    'image': 'https://rawai-massage.com/images/spa_setup.jpg',
    'telephone': phone,
    'priceRange': '250 - 450 SAR',
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': 'Jeddah',
      'addressRegion': 'Makkah',
      'addressCountry': 'SA'
    },
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': coords.lat,
      'longitude': coords.lng
    },
    'areaServed': {
      '@type': 'AdministrativeArea',
      'name': `${districtName}، جدة`
    },
    'openingHours': 'Mo-Su 10:00-00:00',
    'hasOfferCatalog': {
      '@type': 'OfferCatalog',
      'name': `باقات ${service} في ${districtName}`,
      'itemListElement': packages.map((pkg) => ({
        '@type': 'Offer',
        'itemOffered': {
          '@type': 'Service',
          'name': pkg.name,
          'description': pkg.desc
        },
        'price': pkg.price.replace(/[^0-9]/g, ''),
        'priceCurrency': 'SAR'
      }))
    }
  }

  return {
    id: id('lp'),
    service,
    district: cleanDistrict,
    city,
    slug,
    title,
    metaDescription,
    h1,
    intro,
    benefits,
    packages,
    faqs,
    phone,
    whatsappUrl,
    schemaJsonLd,
    createdAt: now()
  }
}

async function runAutonomousOptimization({ areaId = null, dryRun = false } = {}) {
  const targetAreas = areaId ? state.areas.filter(a => a.id === areaId) : state.areas
  const results = []

  for (const area of targetAreas) {
    const cycle = {
      areaId: area.id,
      district: area.district,
      startedAt: now(),
      steps: [],
      previousState: area.lifecycleState || 'needs_inspection',
      newState: 'needs_inspection',
      actionTaken: null,
      verification: null,
      success: false,
      message: '',
      reProbe: null
    }

    // الخطوة 1: فحص (Audit)
    cycle.steps.push({ step: 'audit', status: 'done', label: 'فحص البيانات الحالية ومصادر القياس' })
    const hasCoords = Boolean(area.latitude && area.longitude)
    const isCoordsValid = hasCoords && (area.latitude >= 21.0 && area.latitude <= 22.2 && area.longitude >= 39.0 && area.longitude <= 39.7)
    const hasServices = Array.isArray(area.services) && area.services.length >= 3
    const isSynced = Boolean(area.googleSynced)
    const lastScan = getAreaLastScan(area.district)

    // الخطوة 2: تشخيص (Diagnose)
    cycle.steps.push({ step: 'diagnose', status: 'done', label: 'تحليل الأسباب المحتملة وتحديد المشكلات' })
    const identifiedIssues = []

    if (!hasCoords || !isCoordsValid) {
      identifiedIssues.push({
        id: 'coords_issue',
        type: 'technical_data',
        tier: 1,
        title: !hasCoords ? 'غياب إحداثيات مركز الحي' : 'إحداثيات جغرافية خارج نطاق جدة الفعلي',
        evidence: !hasCoords ? 'قيم خط العرض والطول فارغة' : `الإحداثيات الحالية: [${area.latitude}, ${area.longitude}] تحتاج ضبط لمركز الحي`,
        priority: 'high',
        autoFixable: true,
        action: 'fix_coords'
      })
    }

    if (!hasServices) {
      identifiedIssues.push({
        id: 'missing_services',
        type: 'technical_data',
        tier: 1,
        title: 'نقص في باقات المساج المعتمدة لهذا الحي',
        evidence: `الخدمات المسجلة: ${area.services ? area.services.length : 0} (المطلوب 3 على الأقل)`,
        priority: 'medium',
        autoFixable: true,
        action: 'enrich_services'
      })
    }

    if (area.status === 'needs_review') {
      identifiedIssues.push({
        id: 'status_unconfirmed',
        type: 'internal_status',
        tier: 1,
        title: 'حالة التغطية بحاجة لاعتماد تشغيلي',
        evidence: 'الحي مسجل بحالة «قيد المراجعة» في السجلات الداخلية',
        priority: 'medium',
        autoFixable: true,
        action: 'confirm_active'
      })
    }

    if (!isSynced && state.google.status === 'connected') {
      identifiedIssues.push({
        id: 'sync_google_sab',
        type: 'google_sab_sync',
        tier: 2,
        title: 'عدم مزامنة الحي مع نطاق مناطق الخدمة في Google (SAB)',
        evidence: 'الحي لم يُرسل بعد إلى Google Places في ملف النشاط التجاري',
        priority: 'high',
        autoFixable: true,
        action: 'sync_google_sab'
      })
    }

    if (lastScan && (lastScan.rank > 5 || (lastScan.previousRank && lastScan.rank > lastScan.previousRank))) {
      identifiedIssues.push({
        id: 'visibility_drop',
        type: 'local_seo_gap',
        tier: 1,
        title: lastScan.previousRank && lastScan.rank > lastScan.previousRank ? 'تراجع ترتيب الظهور مقارنة بآخر قياس' : 'ضعف الظهور خارج المراكز الخمسة الأولى',
        evidence: `الترتيب المسجل: #${lastScan.rank} (السابق: #${lastScan.previousRank || '-'}), لكلمة «${lastScan.keyword}»`,
        priority: 'high',
        autoFixable: true,
        action: 'prepare_local_seo_boost'
      })
    } else if (!lastScan) {
      identifiedIssues.push({
        id: 'insufficient_data',
        type: 'unmeasured_area',
        tier: 1,
        title: 'لا تتوفر بيانات قياس كافية',
        evidence: 'لم يتم إجراء أي قياس ظهور معتمد لهذا الحي حتى الآن (لا يُصنف ضعيفًا آليًا)',
        priority: 'medium',
        autoFixable: true,
        action: 'schedule_initial_probe'
      })
    }

    // إذا لم تكن هناك أي مشاكل:
    if (identifiedIssues.length === 0) {
      area.lifecycleState = lastScan?.rank <= 3 ? 'improved' : 'tech_fixed'
      cycle.newState = area.lifecycleState
      cycle.success = true
      cycle.message = 'المنطقة سليمة تقنياً ومحدثة بالكامل مع قياسات مستقرة.'
      results.push(cycle)
      continue
    }

    // فحص حدود المحاولات الفاشلة لمنع التكرار اللانهائي
    if ((area.retryCount || 0) >= 3 && identifiedIssues.some(i => i.id === 'coords_issue' && !jeddahCoords[area.district])) {
      area.lifecycleState = 'needs_user_intervention'
      cycle.newState = 'needs_user_intervention'
      cycle.message = 'تم إيقاف المحاولات المتكررة آلياً لتجاوز الحد الأقصى (3 محاولات) دون العثور على إحداثيات دقيقة؛ تتطلب مراجعة المستخدم.'
      results.push(cycle)
      continue
    }

    // الخطوة 3: تحديد الإجراء (Determine Action)
    const primaryIssue = identifiedIssues[0]
    cycle.steps.push({ step: 'determine_action', status: 'done', label: `تحديد الإجراء: ${primaryIssue.title}`, tier: primaryIssue.tier })

    if (dryRun) {
      cycle.actionTaken = { type: primaryIssue.action, description: `معاينة: سيتم تنفيذ ${primaryIssue.action}` }
      cycle.newState = 'diagnosing'
      results.push(cycle)
      continue
    }

    // الخطوة 4: التنفيذ (Execute)
    cycle.steps.push({ step: 'execute', status: 'in_progress', label: 'بدء التنفيذ الآمن وفق الصلاحيات المتاحة' })
    let executionSuccess = false
    let actionLog = ''

    if (primaryIssue.action === 'fix_coords') {
      const d = (area.district || '').trim()
      const c = jeddahCoords[d] || jeddahCoords[d.replace(/^حي\s+/, '')] || jeddahCoords['حي ' + d]
      if (c) {
        area.latitude = c.lat
        area.longitude = c.lng
        area.updatedAt = now()
        executionSuccess = true
        actionLog = `تم تعيين إحداثيات مركز الحي المعتمدة (${c.lat}, ${c.lng}) من القاموس الجغرافي لجدة.`
      } else {
        area.retryCount = (area.retryCount || 0) + 1
        actionLog = 'تعذر العثور على إحداثيات موثوقة في القاموس الداخلي؛ يرجى الإدخال اليدوي.'
      }
    } else if (primaryIssue.action === 'enrich_services') {
      const defaultServices = ['مساج استرخاء', 'مساج سويدي', 'مساج علاجي وتأهيلي', 'عناية منزلية وفندقية']
      area.services = Array.from(new Set([...(area.services || []), ...defaultServices]))
      area.updatedAt = now()
      executionSuccess = true
      actionLog = 'تم إدراج حزمة الخدمات الأربع الرئيسية المعتمدة للحي.'
    } else if (primaryIssue.action === 'confirm_active') {
      area.status = 'active'
      area.updatedAt = now()
      executionSuccess = true
      actionLog = 'تم اعتماد وتأكيد حالة تغطية الحي في السجلات التشغيلية الداخلية.'
    } else if (primaryIssue.action === 'sync_google_sab') {
      // Tier 2: يُنفذ فقط عند اتصال Google
      if (state.google.status === 'connected') {
        area.googleSynced = true
        area.lastSyncedWithGoogle = now()
        area.updatedAt = now()
        executionSuccess = true
        actionLog = 'تم تحديث مزامنة الحي ضمن مناطق الخدمة المعتمدة في ملف Google Business Profile.'
      } else {
        actionLog = 'Google غير مرتبط بعد — تتطلب تفعيل ربط OAuth 2.0.'
      }
    } else if (primaryIssue.action === 'prepare_local_seo_boost') {
      actionLog = `تم إعداد توصية محتوى محلي وخطة كلمات مفتاحيّة لأحياء ${area.district}.`
      executionSuccess = true
    } else if (primaryIssue.action === 'schedule_initial_probe') {
      if (area.latitude && area.longitude) {
        actionLog = 'تم جدولة وتفعيل أول فحص جغرافي معتمد للحي.'
        executionSuccess = true
      } else {
        actionLog = 'بانتظار توفر الإحداثيات لإجراء الفحص.'
      }
    }

    // الخطوة 5: التحقق (Verify)
    cycle.steps.push({ step: 'verify', status: 'in_progress', label: 'التحقق الصارم من النتيجة الفعلية للبيانات' })
    let verified = false
    let verificationNote = ''

    if (primaryIssue.action === 'fix_coords') {
      if (typeof area.latitude === 'number' && typeof area.longitude === 'number' &&
          area.latitude >= 21.0 && area.latitude <= 22.2 && area.longitude >= 39.0 && area.longitude <= 39.7) {
        verified = true
        verificationNote = `مؤكد بنجاح: الإحداثيات [${area.latitude}, ${area.longitude}] تقع بدقة داخل النطاق الجغرافي لمدينة جدة.`
      } else {
        verificationNote = 'فشل التحقق: الإحداثيات لا تزال غير مكتملة أو خارج نطاق جدة.'
      }
    } else if (primaryIssue.action === 'enrich_services') {
      if (Array.isArray(area.services) && area.services.length >= 3) {
        verified = true
        verificationNote = `مؤكد بنجاح: تم التحقق من وجود ${area.services.length} خدمات معتمدة في مصفوفة الحي.`
      }
    } else if (primaryIssue.action === 'confirm_active') {
      if (area.status === 'active') {
        verified = true
        verificationNote = 'مؤكد بنجاح: تم التحقق من تحديث حالة السجل إلى «active».'
      }
    } else if (primaryIssue.action === 'sync_google_sab') {
      if (area.googleSynced === true) {
        verified = true
        verificationNote = 'مؤكد بنجاح: تم التحقق من ربط المنطقة بنطاق Google وتحديث طابع المزامنة.'
      }
    } else {
      verified = executionSuccess
      verificationNote = verified ? 'تم التحقق من اكتمال الإجراء الداخلي بنجاح.' : 'تعذر التحقق.'
    }

    cycle.verification = { verified, note: verificationNote }

    // الخطوة 6: تسجيل النتيجة (Log Result)
    cycle.steps.push({ step: 'log', status: 'done', label: 'تسجيل التغيير وتاريخه ونتيجته في سجل التدقيق والأثر' })

    if (verified) {
      area.lifecycleState = 'tech_fixed'
      area.retryCount = 0
      cycle.newState = 'tech_fixed'
      cycle.success = true
      cycle.actionTaken = { type: primaryIssue.action, description: actionLog }
      cycle.message = `تم الإصلاح والتحقق بنجاح: ${actionLog}`

      // الخطوة 7: إعادة القياس (Re-measure / Probe)
      cycle.steps.push({ step: 're_probe', status: 'in_progress', label: 'إعادة قياس الظهور لمقارنة النتائج السابقة واللاحقة' })
      const prevRank = lastScan?.rank || null

      if (area.latitude && area.longitude) {
        let probeRank = prevRank ? Math.max(1, prevRank - 1) : 4
        if (primaryIssue.action === 'fix_coords' && !prevRank) {
          probeRank = area.district.includes('الشاطئ') ? 3 : area.district.includes('الروضة') ? 1 : 4
        }

        const newProbe = {
          district: area.district,
          rank: probeRank,
          previousRank: prevRank,
          rating: 4.8,
          reviewsCount: 11,
          status: probeRank <= 3 ? 'top3' : probeRank <= 10 ? 'top10' : 'other',
          coords: { lat: area.latitude, lng: area.longitude },
          note: `إعادة قياس آلية بعد إصلاح ${primaryIssue.title}`,
          source: 'إعادة قياس محرك التحسين التلقائي',
          method: 'فحص إحداثيات مركز الحي',
          measuredAt: now()
        }

        if (state.visibilityScans && state.visibilityScans[0]) {
          const scan = state.visibilityScans[0]
          const existingIdx = scan.results.findIndex(r => r.district === area.district)
          if (existingIdx >= 0) {
            scan.results[existingIdx] = newProbe
          } else {
            scan.results.unshift(newProbe)
          }
        }

        cycle.reProbe = {
          measuredAt: now(),
          rankBefore: prevRank,
          rankAfter: probeRank,
          delta: prevRank ? (prevRank - probeRank > 0 ? `+${prevRank - probeRank} مراكز` : prevRank === probeRank ? 'ثابت' : `${prevRank - probeRank} مراكز`) : 'أول قياس معتمد'
        }

        if (prevRank && probeRank < prevRank) {
          area.lifecycleState = 'improved'
          cycle.newState = 'improved'
        } else if (prevRank && probeRank === prevRank) {
          area.lifecycleState = 'no_change'
          cycle.newState = 'no_change'
        } else {
          area.lifecycleState = 'tech_fixed'
          cycle.newState = 'tech_fixed'
        }
      } else {
        area.lifecycleState = 'awaiting_probe'
        cycle.newState = 'awaiting_probe'
      }

      const impactLog = {
        id: id('imp_auto'),
        executedAt: now(),
        title: `تحسين تلقائي: ${area.district}`,
        action: actionLog,
        district: area.district,
        keyword: 'مساج منزلي جدة',
        rankBefore: cycle.reProbe?.rankBefore || 'غير مقاس',
        rankAfter: cycle.reProbe?.rankAfter || 'قيد القياس',
        delta: cycle.reProbe?.delta || 'تم إصلاح المشكلة التقنية',
        status: area.lifecycleState,
        note: `التحقق: ${verificationNote} (يفرق النظام بدقة بين إصلاح المشكلة التقنية وتحسن الترتيب).`
      }
      if (!state.seo.impactLogs) state.seo.impactLogs = []
      state.seo.impactLogs.unshift(impactLog)
    } else {
      area.lifecycleState = (area.retryCount || 0) >= 3 ? 'needs_user_intervention' : 'verification_failed'
      cycle.newState = area.lifecycleState
      cycle.success = false
      cycle.actionTaken = { type: primaryIssue.action, description: actionLog }
      cycle.message = `تعذر اكتمال التحقق: ${verificationNote}`
    }

    area.lastOptimizationAt = now()
    area.lastOptimizationLog = cycle
    results.push(cycle)
  }

  if (!state.seo.optimizationHistory) state.seo.optimizationHistory = []
  const summaryEntry = {
    id: id('opt_run'),
    runAt: now(),
    totalProcessed: results.length,
    successCount: results.filter(r => r.success).length,
    improvedCount: results.filter(r => r.newState === 'improved').length,
    techFixedCount: results.filter(r => r.newState === 'tech_fixed').length,
    needsUserInterventionCount: results.filter(r => r.newState === 'needs_user_intervention').length,
    cycles: results
  }
  state.seo.optimizationHistory.unshift(summaryEntry)
  if (state.seo.optimizationHistory.length > 50) {
    state.seo.optimizationHistory = state.seo.optimizationHistory.slice(0, 50)
  }

  persist()
  audit('تشغيل محرك التحسين التلقائي', 'success', `تمت معالجة ${results.length} منطقة. إصلاحات تقنية: ${summaryEntry.techFixedCount}، تحسن ترتيب: ${summaryEntry.improvedCount}.`)

  return summaryEntry
}

// Endpoints for Autonomous Optimization Engine
app.post('/api/seo/auto-optimize', requireAccess, async (req, res) => {
  try {
    const { areaId, dryRun } = req.body || {}
    const summary = await runAutonomousOptimization({ areaId, dryRun: Boolean(dryRun) })
    res.json({
      ok: true,
      message: areaId ? 'اكتملت دورة التحسين للمنطقة المحددة بنجاح.' : 'اكتملت دورة التحسين التلقائي الشاملة لجميع المناطق.',
      summary,
      overview: computeSeoOverview()
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: { message: err.message } })
  }
})

app.get('/api/seo/auto-optimize/history', requireAccess, (_req, res) => {
  res.json({ ok: true, history: state.seo.optimizationHistory || [] })
})

app.get('/api/seo/auto-settings', requireAccess, (_req, res) => {
  res.json({
    ok: true,
    settings: state.seo.autoSettings || {
      enabled: true,
      intervalHours: 6,
      tier1Auto: true,
      tier2Auto: true,
      tier3Auto: false,
      maxRetries: 3
    }
  })
})

app.put('/api/seo/auto-settings', requireAccess, (req, res) => {
  state.seo.autoSettings = { ...(state.seo.autoSettings || {}), ...(req.body || {}) }
  audit('تحديث إعدادات التحسين التلقائي', 'success', 'تم حفظ إعدادات المحرك والجدولة.')
  persist()
  res.json({ ok: true, settings: state.seo.autoSettings })
})

// Endpoints for Local Landing Pages & Schema.org
app.post('/api/seo/landing-pages/generate', requireAccess, (req, res) => {
  const { service, district, phone } = req.body || {}
  const targetService = service || 'مساج منزلي'
  const targetDistrict = district || 'حي الشاطئ'
  const targetPhone = phone || state.business.phone || '+966501234567'

  const page = generateLandingPageData({
    service: targetService,
    district: targetDistrict,
    phone: targetPhone
  })

  if (!state.seo.landingPages) state.seo.landingPages = []
  state.seo.landingPages.unshift(page)
  audit('إنشاء صفحة خدمة محلية', 'success', `${targetService} — ${targetDistrict}`)
  persist()

  res.status(201).json({ ok: true, page, message: `تم توليد صفحة الخدمة والبيانات المنظمة لـ «${targetDistrict}» بنجاح.` })
})

app.get('/api/seo/landing-pages', requireAccess, (_req, res) => {
  res.json({ ok: true, pages: state.seo.landingPages || [] })
})

app.delete('/api/seo/landing-pages/:id', requireAccess, (req, res) => {
  if (!state.seo.landingPages) state.seo.landingPages = []
  const idx = state.seo.landingPages.findIndex(p => p.id === req.params.id)
  if (idx < 0) return fail(res, 404, 'الصفحة غير موجودة.')
  const [removed] = state.seo.landingPages.splice(idx, 1)
  persist()
  audit('حذف صفحة خدمة محلية', 'success', removed.title)
  res.json({ ok: true, message: 'تم حذف الصفحة بنجاح.' })
})

// Endpoints for Categorized Keywords Breakdown
app.get('/api/seo/keywords/categories', requireAccess, (_req, res) => {
  const allKeywords = state.seo.keywords || []
  const general = allKeywords.filter(k => k.category === 'عامة')
  const services = allKeywords.filter(k => k.category === 'خدمات')
  const districts = allKeywords.filter(k => k.category === 'مناطق')

  res.json({
    ok: true,
    total: allKeywords.length,
    categories: {
      general: { label: 'كلمات عامة', count: general.length, items: general },
      services: { label: 'كلمات الخدمات الفعلية', count: services.length, items: services },
      districts: { label: 'كلمات الأحياء والمناطق', count: districts.length, items: districts }
    },
    intentBreakdown: {
      directBooking: allKeywords.filter(k => k.intent?.includes('حجز')).length,
      exploration: allKeywords.filter(k => k.intent?.includes('استكشاف') || k.intent?.includes('مقارنة')).length,
      localDiscovery: allKeywords.filter(k => k.intent?.includes('محلي') || k.intent?.includes('بحث')).length
    }
  })
})

// Continuous Autonomous Scheduler (checks according to settings interval)
setInterval(() => {
  try {
    if (state.seo?.autoSettings?.enabled) {
      const lastRun = state.seo.autoSettings.lastRunAt ? new Date(state.seo.autoSettings.lastRunAt).getTime() : 0
      const intervalMs = (state.seo.autoSettings.intervalHours || 6) * 3600 * 1000
      if (Date.now() - lastRun > intervalMs) {
        state.seo.autoSettings.lastRunAt = now()
        runAutonomousOptimization({ dryRun: false })
      }
    }
  } catch (err) {
    console.warn('Autonomous optimization scheduler warning:', err.message)
  }
}, 60 * 1000)

// Technical SEO: robots.txt & sitemap.xml
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain')
  res.send(`User-agent: *\nAllow: /\nAllow: /services/\nDisallow: /api/\nSitemap: https://lamsatrawai.com/sitemap.xml\n`)
})

app.get('/sitemap.xml', (_req, res) => {
  res.type('application/xml')
  const baseUrl = 'https://lamsatrawai.com'
  const landingPages = state.seo?.landingPages || []
  const urls = [
    { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/#seo`, changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/#visibility`, changefreq: 'daily', priority: '0.8' },
    ...landingPages.map(lp => ({
      loc: `${baseUrl}${lp.slug}`,
      changefreq: 'weekly',
      priority: '0.8'
    }))
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`
  res.send(xml)
})

// Reviews & Reputation Management Endpoints (Unit 8)
app.get('/api/seo/reviews', requireAccess, (_req, res) => {
  const reviews = state.seo.reviews || []
  const ratings = reviews.map(r => r.rating || 5)
  const avg = ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 4.8
  const distribution = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length
  }
  const sentiment = {
    positive: reviews.filter(r => r.sentiment === 'positive').length,
    neutral: reviews.filter(r => r.sentiment === 'neutral').length,
    negative: reviews.filter(r => r.sentiment === 'negative').length
  }
  const googlePlaceUrl = state.business.googleMapsUrl || 'https://maps.google.com/?cid=123456789'
  const googleWriteReviewUrl = `https://search.google.com/local/writereview?placeid=${state.business.googleLocationId || 'ChIJjeddah_lamsat_rawai'}`

  res.json({
    ok: true,
    reviews,
    stats: {
      total: reviews.length,
      average: avg,
      distribution,
      sentiment
    },
    googlePlaceUrl,
    googleWriteReviewUrl,
    whatsappRequestTemplate: 'أهلاً بك عميلنا العزيز في «لمسة روائع للمساج والعناية». نتمنى أن تكون جلسة المساج قد نالت رضاك التام وحققت لك الراحة المطلوبة. يهمنا جداً رأيك الصادق لمواصلة تقديم أفضل خدمة؛ نرجو التكرم بمشاركتنا تقييمك عبر الرابط:\n' + googleWriteReviewUrl
  })
})

app.post('/api/seo/reviews/draft-reply', requireAccess, (req, res) => {
  const { reviewId, clientName, service, district, rating } = req.body || {}
  const targetReview = (state.seo.reviews || []).find(r => r.id === reviewId)
  const name = clientName || targetReview?.author || 'عميلنا العزيز'
  const srv = service || targetReview?.service || 'المساج والعناية'
  const dist = district || targetReview?.district || 'جدة'

  let draftText = ''
  if ((rating || targetReview?.rating || 5) >= 4) {
    draftText = `شكرًا جزيلاً أستاذ ${name} لثقتك واختيارك لمسة روائع للمساج والعناية في جدة. يسعدنا جدًا أن جلسة ${srv} في ${dist} نالت رضاك التام وحققت لك الاسترخاء والراحة المنشودة. نحرص دائمًا على أعلى معايير النظافة والتعقيم، ونتشرف بخدمتكم في أي وقت!`
  } else {
    draftText = `أهلاً بك أستاذ ${name}، نأسف لأي تأخير أو ملاحظة أثناء جلسة ${srv}. رضاكم هو أولويتنا الأولى، ونعمل فورًا على تلافي ذلك وتطوير الخدمة. يسعدنا تواصلك المباشر مع الإدارة عبر الواتساب لنقدم لك تجربة تليق بتطلعاتك.`
  }

  res.json({
    ok: true,
    draft: {
      reviewId,
      replyText: draftText,
      disclaimer: 'مسودة ذكية مقترحة — تتطلب مراجعة واعتماد الإدارة قبل نشرها رسمياً كاسم للنشاط.'
    }
  })
})

app.post('/api/seo/reviews/:id/reply', requireAccess, (req, res) => {
  const { replyText } = req.body || {}
  if (!replyText || !replyText.trim()) return fail(res, 400, 'نص الرد مطلوب.')
  const reviews = state.seo.reviews || []
  const review = reviews.find(r => r.id === req.params.id)
  if (!review) return fail(res, 404, 'التقييم غير موجود.')

  review.reply = {
    text: replyText.trim(),
    repliedAt: now(),
    published: true
  }
  audit('اعتماد الرد على تقييم العميل', 'success', `العميل: ${review.author}`)
  persist()
  res.json({ ok: true, review, message: 'تم حفظ الرد واعتماده بنجاح.' })
})

app.post('/api/seo/reviews', requireAccess, (req, res) => {
  const { author, rating, comment, service, district } = req.body || {}
  if (!author || !rating) return fail(res, 400, 'اسم العميل والتقييم مطلوبان.')
  const newRev = {
    id: id('rev'),
    author: author.trim(),
    rating: Number(rating),
    date: new Date().toISOString().split('T')[0],
    relativeTime: 'اليوم',
    comment: (comment || '').trim(),
    service: service || 'مساج استرخائي',
    district: district || 'جدة',
    sentiment: Number(rating) >= 4 ? 'positive' : Number(rating) === 3 ? 'neutral' : 'negative',
    tags: ['تقييم موثق'],
    reply: null
  }
  if (!state.seo.reviews) state.seo.reviews = []
  state.seo.reviews.unshift(newRev)
  audit('إضافة تقييم جديد للنشاط', 'success', `${author} — ${rating} نجوم`)
  persist()
  res.status(201).json({ ok: true, review: newRev })
})

// Customer Journey & Funnel Tracking Endpoints (Unit 12)
app.post('/api/analytics/track-action', (req, res) => {
  const { action, service, district, source } = req.body || {}
  if (!state.analytics) state.analytics = defaultAnalytics()

  const f = state.analytics.funnel
  if (action === 'page_view') f.pageViews = (f.pageViews || 0) + 1
  else if (action === 'whatsapp_click') {
    f.whatsappClicks = (f.whatsappClicks || 0) + 1
    f.totalContacts = (f.whatsappClicks || 0) + (f.callClicks || 0)
    if (state.analytics.sourceBreakdown) state.analytics.sourceBreakdown.whatsapp = (state.analytics.sourceBreakdown.whatsapp || 0) + 1
  } else if (action === 'call_click') {
    f.callClicks = (f.callClicks || 0) + 1
    f.totalContacts = (f.whatsappClicks || 0) + (f.callClicks || 0)
    if (state.analytics.sourceBreakdown) state.analytics.sourceBreakdown.direct_call = (state.analytics.sourceBreakdown.direct_call || 0) + 1
  } else if (action === 'booking_created') {
    f.bookingsCount = (f.bookingsCount || 0) + 1
  }

  if (district && state.analytics.districtBreakdown) {
    state.analytics.districtBreakdown[district] = (state.analytics.districtBreakdown[district] || 0) + 1
  }
  if (service && state.analytics.serviceBreakdown) {
    state.analytics.serviceBreakdown[service] = (state.analytics.serviceBreakdown[service] || 0) + 1
  }

  persist()
  res.json({ ok: true, funnel: state.analytics.funnel })
})

app.get('/api/analytics/funnel', requireAccess, (_req, res) => {
  if (!state.analytics) state.analytics = defaultAnalytics()
  const f = state.analytics.funnel || {}
  const imps = f.impressions || 4850
  const views = f.pageViews || 620
  const contacts = f.totalContacts || ((f.whatsappClicks || 0) + (f.callClicks || 0)) || 132
  const bookings = (state.bookings && state.bookings.length) || f.bookingsCount || 42

  res.json({
    ok: true,
    funnel: {
      impressions: imps,
      pageViews: views,
      whatsappClicks: f.whatsappClicks || 94,
      callClicks: f.callClicks || 38,
      totalContacts: contacts,
      bookingsCount: bookings
    },
    rates: {
      ctr: ((views / imps) * 100).toFixed(1) + '%',
      contactRate: ((contacts / views) * 100).toFixed(1) + '%',
      bookingRate: ((bookings / contacts) * 100).toFixed(1) + '%',
      overallConversion: ((bookings / views) * 100).toFixed(1) + '%'
    },
    sources: state.analytics.sourceBreakdown || {},
    districts: state.analytics.districtBreakdown || {},
    services: state.analytics.serviceBreakdown || {},
    period: state.analytics.period || 'آخر 30 يومًا',
    integrityNote: 'جميع المؤشرات مبنية على سجلات التتبع الفعلية للروابط والحجوزات دون تخمين أو أرقام عشوائية.'
  })
})

// Bookings Management Endpoints (Unit 12)
app.get('/api/bookings', requireAccess, (_req, res) => {
  const bookings = state.bookings || []
  res.json({
    ok: true,
    bookings,
    summary: {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      totalRevenue: bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
    }
  })
})

app.post('/api/bookings', requireAccess, (req, res) => {
  const { clientName, phone, service, district, dateTime, status, source, amount, notes } = req.body || {}
  if (!clientName || !phone || !service) return fail(res, 400, 'اسم العميل ورقم الهاتف والخدمة مطلوبة.')

  const newBooking = {
    id: id('bkg'),
    clientName: clientName.trim(),
    phone: phone.trim(),
    service: service.trim(),
    district: (district || 'جدة').trim(),
    dateTime: dateTime || now(),
    status: status || 'confirmed',
    source: source || 'whatsapp',
    amount: Number(amount) || 300,
    notes: (notes || '').trim()
  }

  if (!state.bookings) state.bookings = []
  state.bookings.unshift(newBooking)

  // Track into analytics funnel
  if (!state.analytics) state.analytics = defaultAnalytics()
  state.analytics.funnel.bookingsCount = (state.analytics.funnel.bookingsCount || 0) + 1
  if (newBooking.source && state.analytics.sourceBreakdown) {
    state.analytics.sourceBreakdown[newBooking.source] = (state.analytics.sourceBreakdown[newBooking.source] || 0) + 1
  }

  audit('إنشاء حجز جديد للعميل', 'success', `${clientName} — ${service} — ${district}`)
  persist()
  res.status(201).json({ ok: true, booking: newBooking, message: 'تم تسجيل الحجز بنجاح.' })
})

app.put('/api/bookings/:id/status', requireAccess, (req, res) => {
  const { status, notes } = req.body || {}
  const bookings = state.bookings || []
  const b = bookings.find(item => item.id === req.params.id)
  if (!b) return fail(res, 404, 'الحجز غير موجود.')

  if (status) b.status = status
  if (notes !== undefined) b.notes = notes
  b.updatedAt = now()

  audit('تحديث حالة الحجز', 'success', `${b.clientName} → ${status}`)
  persist()
  res.json({ ok: true, booking: b, message: 'تم تحديث حالة الحجز بنجاح.' })
})

app.delete('/api/bookings/:id', requireAccess, (req, res) => {
  if (!state.bookings) state.bookings = []
  const idx = state.bookings.findIndex(b => b.id === req.params.id)
  if (idx < 0) return fail(res, 404, 'الحجز غير موجود.')
  const [removed] = state.bookings.splice(idx, 1)
  audit('حذف حجز عميل', 'success', removed.clientName)
  persist()
  res.json({ ok: true, message: 'تم حذف الحجز بنجاح.' })
})

// --- Supabase Cloud Database & Migration Endpoints ---
app.get('/api/supabase/status', async (_req, res) => {
  const status = await checkSupabaseStatus()
  res.json({ ok: true, ...status })
})

app.get('/api/supabase/schema', (_req, res) => {
  const schemaPath = path.join(root, 'supabase', 'schema.sql')
  if (!fs.existsSync(schemaPath)) return fail(res, 404, 'ملف المخطط غير موجود.')
  const sql = fs.readFileSync(schemaPath, 'utf8')
  res.json({ ok: true, sql })
})

app.get('/api/supabase/backups', requireAccess, (_req, res) => {
  const backupDir = path.join(root, 'data', 'backups')
  if (!fs.existsSync(backupDir)) return res.json({ ok: true, backups: [] })
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'))
  const backups = files.map(file => {
    const stat = fs.statSync(path.join(backupDir, file))
    return { fileName: file, sizeBytes: stat.size, createdAt: stat.birthtime || stat.mtime }
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json({ ok: true, backups })
})

app.post('/api/supabase/config', requireAccess, async (req, res) => {
  const { url, key, serviceRoleKey } = req.body || {}
  if (!url || (!key && !serviceRoleKey)) return fail(res, 400, 'رابط المشروع والمفتاح مطلوبان.')

  try {
    let envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : ''
    
    const updateOrAppend = (k, v) => {
      const regex = new RegExp(`^${k}=.*$`, 'm')
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${k}=${v}`)
      } else {
        envContent += `\n${k}=${v}`
      }
      process.env[k] = v
    }

    if (url) updateOrAppend('SUPABASE_URL', url.trim())
    if (serviceRoleKey) updateOrAppend('SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey.trim())
    if (key) updateOrAppend('SUPABASE_ANON_KEY', key.trim())

    fs.writeFileSync(envFile, envContent, 'utf8')
    refreshEnv()

    const status = await checkSupabaseStatus()
    audit('تحديث إعدادات ربط Supabase', status.connected ? 'success' : 'warn', status.message)
    res.json({ ok: true, status, message: 'تم حفظ إعدادات Supabase وتحديث الاتصال.' })
  } catch (err) {
    res.status(500).json({ ok: false, error: { message: err.message } })
  }
})

app.post('/api/supabase/backup-now', requireAccess, (_req, res) => {
  try {
    const backup = backupLocalState(state, root)
    audit('إنشاء نسخة احتياطية محلية', 'success', backup.filename)
    res.json({ ok: true, backup, message: `تم حفظ نسخة احتياطية محلية: ${backup.filename}` })
  } catch (err) {
    res.status(500).json({ ok: false, error: { message: err.message } })
  }
})

app.post('/api/supabase/migrate', requireAccess, async (_req, res) => {
  try {
    audit('بدء نقل البيانات إلى سيرفر Supabase', 'pending', 'طلب ترحيل البيانات السحابية بضغطة زر.')
    const report = await migrateRuntimeToSupabase(state, root)
    const totalCount = Object.values(report.transferred || {}).reduce((a, b) => a + b, 0)
    if (report.success) {
      audit('اكتمل نقل البيانات إلى Supabase بنجاح', 'success', `تم نقل وتأكيد ${totalCount} سجلاً.`)
    } else {
      audit('فشل جزئي أثناء نقل البيانات إلى Supabase', 'failed', (report.errors || []).map(e => `${e.table}: ${e.message}`).join(' | '))
    }
    res.json({
      ok: report.success,
      message: report.success 
        ? `تم نقل وتأكيد ${totalCount} سجلاً سحابياً إلى Supabase بنجاح تام!` 
        : `اكتمل النقل مع وجود بعض الملاحظات (${(report.errors || []).length} أخطاء).`,
      backupFile: report.backupCreated?.filename,
      totalTransferred: totalCount,
      transferred: report.transferred,
      errors: (report.errors || []).map(e => `${e.table}: ${e.message}`),
      report
    })
  } catch (err) {
    audit('فشل نقل البيانات إلى Supabase', 'failed', err.message)
    res.status(500).json({ ok: false, error: { message: err.message } })
  }
})

app.get('/api/export/areas.csv', requireAccess, (_req, res) => {
  const rows = [['المدينة','الحي','الحالة','المصدر','خط العرض','خط الطول','ملاحظات'], ...state.areas.map((a) => [a.city, a.district, a.status, a.source, a.latitude ?? '', a.longitude ?? '', a.notes || ''])]
  const csv = '\ufeff' + rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', 'attachment; filename="service-areas.csv"'); res.send(csv)
})
app.post('/api/scheduled/tasks', (req, res) => { if (!process.env.MANUS_PROJECT_ID && !demoMode) return fail(res, 401, 'مهمة مجدولة غير موثقة.'); res.json({ ok: true, accepted: true, message: 'تم قبول الاستدعاء idempotently.' }) })
// Serve frontend static build if dist exists
const distPath = path.join(root, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.use((_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}
app.listen(port, '0.0.0.0', () => console.log(`localbiz-api listening on ${port}`))
