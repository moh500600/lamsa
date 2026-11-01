# مدير النشاط المحلي

نسخة تشغيلية عربية RTL لإدارة نشاط خدمات منزلية ومناطق خدمته، مع API خلفية قابلة للتوسع وقاعدة بيانات متعددة العملاء ومخطط جاهز للترحيل.

تتضمن النسخة الآن وحدة **AI Smart Business Setup**: معالجًا يظهر للمستخدم الجديد قبل لوحة التحكم، يحفظ التقدم على الخادم بعد كل خطوة، يدعم الأسئلة التكيفية، يراجع البيانات قبل الإكمال، يقترح مسودة وصف عبر AI بعد موافقة المستخدم، ويضيف الأحياء المختارة إلى جدول مناطق الخدمة مع منع التكرار. بعد الإكمال لا يعيد طلب البيانات الأساسية عند إضافة حي جديد.

وتتضمن أيضًا وحدة **AI Local SEO & Google Maps Ranking Optimizer** داخل القائمة الرئيسية. تعرض جودة إعداد النشاط، وتحليل الأحياء الـ33 مع فصل التغطية الفعلية عن الظهور المؤكد، وقاعدة الكلمات المفتاحية، وملفات المنافسين العامة، ومركز توصيات بحالات موافقة وتنفيذ. لا تعرض الوحدة ترتيبًا تقديريًا على أنه ترتيب Google، ولا تنفذ تغييرات خارجية دون مصدر رسمي وموافقة.

## التشغيل السريع

```bash
cp .env.example .env
npm install
npm run dev
```

افتح واجهة Vite على المنفذ 5173. الـ API يعمل على 3000. في Cloud Preview يستخدم WebDev المنفذ المسجل تلقائيًا؛ لا تغيّر PORT إلا من إعدادات المشروع.

الوضع المحلي يبدأ ببيانات أولية للأحياء الـ33 المطلوبة، وكلها بحالة `needs_review`. هذه بيانات تهيئة داخلية وليست بيانات Google، ولا ينشئ التطبيق ملفاتًا تجارية للأحياء.

## أين أضع مفاتيح API؟

| التكامل | المتغير | المكان الصحيح |
|---|---|---|
| Google OAuth | `GOOGLE_CLIENT_ID` و`GOOGLE_CLIENT_SECRET` و`GOOGLE_REDIRECT_URI` | على الخادم فقط، عبر Secrets في WebDev أو `.env` محليًا. لا تضعها في `src/`. |
| الذكاء الاصطناعي الخارجي | `OPENAI_API_KEY` و`OPENAI_API_BASE` | الخادم فقط إذا اخترت مزودًا خارجيًا. WebDev يستطيع استخدام Manus LLM المدمج عبر `MANUS_API_URL` دون مفتاح إضافي. |
| قاعدة البيانات | `DATABASE_URL` | يحقنها WebDev تلقائيًا عند تفعيل قاعدة البيانات المُدارة. لا تضعها في الواجهة. المخطط في `schema.sql`. |
| Manus OAuth | `MANUS_PROJECT_ID` و`MANUS_OAUTH_PORTAL_URL` و`MANUS_OAUTH_API_URL` و`MANUS_JWT_SECRET` | يحقنها WebDev تلقائيًا؛ لا تنسخها يدويًا إلى الكود. |

في مشروع WebDev الفعلي استخدم إعداد Secrets/Environment في لوحة المشروع أو `webdev.request_secrets`. لا ترسل المفاتيح داخل المحادثة ولا تحفظها في Git. ملف `.env.example` أسماء فقط بلا قيم حقيقية.

## Google Business Profile

صفحة Google تظل في حالة «بانتظار إعداد الوصول» حتى تضيف OAuth الرسمي وتستوفي الموافقات والصلاحيات. لا يوجد في النظام رابط نجاح وهمي، ولا يتم إنشاء 33 ملفًا تجاريًا. بعد إعداد OAuth، يجب إكمال callback وتبادل الرمز وتشفير refresh token قبل تفعيل المزامنة الإنتاجية.

## قاعدة البيانات

`schema.sql` يبني الجداول الأساسية: organizations, users, memberships, businesses, service_areas, google_connections, tasks, audit_logs. يجب تشغيل الترحيلات بطريقة additive وآمنة. يلزم إضافة طبقة repository تستخدم `DATABASE_URL` بدل التخزين المحلي قبل نشر SaaS متعدد العملاء على الإنتاج. التخزين الحالي `data/runtime.json` مخصص للتطوير والمعاينة فقط.

## الأمان قبل الإنتاج

فعّل التحقق من جلسة Manus OAuth وصلاحيات العضوية على كل endpoint، واستبدل `DEMO_MODE` في الإنتاج، وأضف تشفيرًا فعليًا لرموز Google، وتحققًا من JWT للمجدول، ومحدد معدل الطلبات، وتخزينًا كائنيًا للملفات، وترحيلات قاعدة البيانات. لا تسجل كلمات المرور أو رموز OAuth.

## البناء

```bash
npm run build
NODE_ENV=production npm start
```

## ملفات مهمة

- `src/App.tsx`: يحتوي أيضًا على معالج الإعداد الأولي ذي الخطوات الثماني والمراجعة النهائية.
- `src/SeoPage.tsx`: مركز الظهور المحلي وتبويبات الأحياء والكلمات والمنافسين والتوصيات.
- `src/styles.css`: نظام التصميم العربي المتجاوب.
- `server/index.js`: API وحالة التطوير ومحرك المهام.
- `schema.sql`: مخطط MySQL متعدد العملاء، بما فيه onboarding_progress وonboarding_answers وbusiness_profiles وbusiness_services وbusiness_contacts وbusiness_media وseo_preferences.
- `schema.sql`: يتضمن كذلك جداول `seo_audits` و`seo_recommendations` و`seo_tasks` و`keywords` و`keyword_clusters` و`competitor_profiles` و`website_audits` و`content_drafts` و`review_analysis` و`ranking_observations` و`seo_reports` و`seo_integrations`.
- `.env.example`: أسماء الأسرار ومكانها.
- `plan.md` و`TODO.md`: خطة ونطاق التنفيذ.
