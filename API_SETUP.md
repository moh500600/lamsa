# إعداد مفاتيح API

## 1) التطوير المحلي

انسخ `.env.example` إلى `.env` في جذر المشروع بجانب `package.json`، ثم ضع القيم داخل `.env` فقط:

```bash
cp .env.example .env
```

لا تضع أي قيمة في `src/` أو داخل ملفات React؛ كل ما يقرأه المتصفح قابل للاستخراج.

## 2) Google Business Profile

أنشئ OAuth Client من Google Cloud للمستخدمين الحقيقيين، وفعّل فقط واجهات Google Business Profile التي يسمح بها حسابك. ضع القيم التالية في الخادم:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://YOUR-DOMAIN.example/api/google/callback
```

أضف رابط Redirect نفسه في Google Cloud حرفيًا. لا ترسل `GOOGLE_CLIENT_SECRET` إلى الواجهة. النظام الحالي يعرض حالة انتظار إعداد الوصول، ويرفض ادعاء نجاح الربط قبل إكمال تبادل الكود والتحقق من الاستجابة الرسمية.

## 3) الذكاء الاصطناعي

في مشروع WebDev يفضّل استخدام Manus LLM المدمج عبر `MANUS_API_URL`؛ لا تحتاج إلى مفتاح مزود خارجي. إذا أردت مزودًا خارجيًا على الخادم، استخدم:

```env
OPENAI_API_KEY=...
OPENAI_API_BASE=https://api.openai.com/v1
```

لا تستخدم `VITE_OPENAI_API_KEY` أو أي متغير يبدأ بـ `VITE_` للمفتاح السري.

## 4) قاعدة البيانات

عند استخدام قاعدة WebDev المُدارة، تُحقن `DATABASE_URL` تلقائيًا ولا تحتاج لوضعها في الواجهة. نفّذ `schema.sql` عبر migrations. الوضع الحالي يستخدم `data/runtime.json` للمعاينة المحلية فقط؛ قبل SaaS الإنتاجي يجب ربط repository بطبقة قاعدة البيانات وفرض organization membership وRLS/سياسات الخادم لكل طلب.

## 5) Manus OAuth

`MANUS_PROJECT_ID` و`MANUS_OAUTH_PORTAL_URL` و`MANUS_OAUTH_API_URL` و`MANUS_JWT_SECRET` يحقنها WebDev عند تفعيل الخادم. لا تنسخها من أي بيئة ولا تحفظها في ZIP عام.

## 6) قائمة التحقق قبل الإنتاج

عطّل `DEMO_MODE`، أضف جلسات OAuth الحقيقية، شغّل migrations، شفّر refresh tokens، فعّل rate limiting، راجع CORS، اختبر سياسات العزل، وأضف backup/restore لدى مزود قاعدة البيانات. لا تستخدم بيانات الأحياء كبيانات Google مؤكدة.
