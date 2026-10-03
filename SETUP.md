# دوريسيو — دليل الإعداد (SETUP.md)

هذا الدليل يشرح إعداد Dorisio من الصفر حتى النشر: قاعدة البيانات، المصادقة، مزوّدو
OAuth الحقيقيون، التخزين، الإشعارات، أول مدير، PWA، والعمل دون اتصال.

---

## 1) المتطلبات

| المتطلب | الإصدار |
| --- | --- |
| Node.js | 20 أو أحدث |
| npm | 10+ |
| PostgreSQL | 15 أو أحدث |
| بيئة HTTPS | مطلوبة في الإنتاج (لملفات الـ cookies الآمنة، التثبيت، والإشعارات) |

---

## 2) متغيرات البيئة

```bash
cp .env.example .env
```

| المتغير | مطلوب | الوصف |
| --- | --- | --- |
| `DATABASE_URL` | نعم | اتصال PostgreSQL |
| `NEXT_PUBLIC_APP_URL` | نعم | أصل التطبيق، يُستخدم لروابط OAuth والـ PWA |
| `SESSION_SECRET` | موصى به | سلسلة عشوائية طويلة لتوقيع الجلسات |
| `ADMIN_SETUP_TOKEN` | للتهيئة | رمز لمرة واحدة لإنشاء أول مدير (احذفه بعد الاستخدام) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | اختياري | تسجيل الدخول عبر Google |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | اختياري | تسجيل الدخول عبر GitHub |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | اختياري | تسجيل الدخول عبر Facebook |
| `SMTP_URL` / `MAIL_FROM` | اختياري | إرسال روابط الاستعادة بالبريد |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | اختياري | Web Push |
| `FIREBASE_SERVER_KEY` | اختياري | Firebase Cloud Messaging (Legacy) |
| `STORAGE_BUCKET` / `STORAGE_PUBLIC_URL` | اختياري | تخزين الصور في Object Storage |
| `ALLOW_DEV_SEED` | تطوير | يسمح بسكربت البيانات التجريبية |

> **لا تُضع أي مفتاح سري في كود الواجهة.** كل الأسرار تُقرأ من `process.env` على الخادم فقط.

---

## 3) قاعدة البيانات

```bash
npx drizzle-kit push     # ينشئ الجداول مباشرة في PostgreSQL
```

الجداول: `users`, `sessions`, `oauth_accounts`, `password_reset_tokens`, `leagues`,
`teams`, `players`, `matches`, `match_events`, `match_lineups`, `ratings`, `awards`,
`announcements`, `notifications`, `push_subscriptions`.

ملاحظات تصميم مهمة:

- **الترتيب والإحصائيات مشتقّة** من المباريات والأحداث (`src/lib/league.ts`) ولا تُخزَّن
  مكرّرة، فلا يمكن أن تتعارض أبداً مع البيانات الرسمية.
- **نتيجة المباراة تُعاد حسابها بالكامل** من قائمة الأحداث بعد أي إضافة/تعديل/حذف،
  فلا توجد نتائج سالبة أو متراكمة.
- **`match_events.id` يُولَّد على الجهاز** (UUID) ويُخزَّن كمفتاح أساسي، مع قيد فريد إضافي
  على (المباراة، الدقيقة، النوع، اللاعب). الإدراج يستخدم `ON CONFLICT DO NOTHING`،
  لذلك إعادة الإرسال والمزامنة بعد الانقطاع **لن تُنشئ أهدافاً مكررة**.

---

## 4) المصادقة

### 4.1 البريد وكلمة المرور

- تجزئة كلمة المرور بـ `scrypt` مع ملح عشوائي (`src/lib/auth.ts`).
- الجلسة: رمز عشوائي 32 بايت يُحفظ في كوكي `HttpOnly` + `SameSite=Lax` (+`Secure` في الإنتاج)،
  ويُخزَّن بصيغة SHA-256 في جدول `sessions` لمدة 30 يوماً.
- استعادة كلمة المرور: رمز لمرة واحدة صالح ساعة واحدة.
  - إن كان `SMTP_URL` مضبوطاً أرسل الرابط بالبريد.
  - وإلا يُسلَّم الرابط كإشعار داخل التطبيق في صفحة **حسابي** (لا نوافذ وهمية).

### 4.2 Google OAuth

1. افتح [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create credentials → OAuth client ID → Web application**.
2. أضف **Authorized redirect URI**:
   `https://YOUR-DOMAIN/api/auth/oauth/callback/google`
3. انسخ `Client ID` و `Client Secret` إلى `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
4. في **OAuth consent screen** أضف نطاقي `openid`, `email`, `profile` (التطبيق يطلبها مسبقاً).

### 4.3 GitHub OAuth

1. **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Authorization callback URL**:
   `https://YOUR-DOMAIN/api/auth/oauth/callback/github`
3. انسخ `Client ID`، ثم أنشئ `Client Secret` وضعهما في `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.
4. الصلاحيات المطلوبة: `read:user user:email` (معرّفة في `src/lib/oauth.ts`).

### 4.4 Facebook OAuth

1. [developers.facebook.com](https://developers.facebook.com/apps) → أنشئ تطبيقاً من نوع **Consumer**.
2. أضف منتج **Facebook Login → Settings**، وفي **Valid OAuth Redirect URIs** ضع:
   `https://YOUR-DOMAIN/api/auth/oauth/callback/facebook`
3. انسخ `App ID` و `App Secret` إلى `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET`.
4. لاستخدام البريد الإلكتروني في الإنتاج يجب إرسال التطبيق للمراجعة (App Review) للحصول
   على إذن `email`.

تدفّق OAuth منفَّذ يدوياً في `src/lib/oauth.ts`:
`/api/auth/oauth/[provider]` ← توجيه للمزوّد مع `state` عشوائي محفوظ في كوكي ←
`/api/auth/oauth/callback/[provider]` ← تبادل الرمز (`authorization_code`) ← جلب الملف ←
ربط/إنشاء مستخدم ← إنشاء جلسة. أي اختلاف في `state` يُرفض (حماية CSRF).

---

## 5) إنشاء أول مدير (الأمان)

**لا يمكن لأي مستخدم اختيار صلاحية «مدير» عند التسجيل** — الحقل يُضبط دائماً على `user`
على الخادم، وواجهة التسجيل لا تحتوي على خيار الدور أصلاً.

### الطريقة الأولى: نقطة التهيئة المحمية (موصى بها)

```bash
# 1) أضف رمزاً لمرة واحدة في .env
ADMIN_SETUP_TOKEN=$(openssl rand -hex 24)   # ثم أعد تشغيل الخادم

# 2) من بيئة موثوقة (curl)، بعد أن يُنشئ المستخدم حسابه:
curl -X POST https://YOUR-DOMAIN/api/admin/promote \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@dorisio.app","token":"THE_TOKEN_ABOVE"}'

# 3) احذف ADMIN_SETUP_TOKEN من البيئة فوراً
```

النقطة ترفض العمل إذا لم يكن `ADMIN_SETUP_TOKEN` مضبوطاً، وتستخدم مقارنة ثابتة الزمن.

### الطريقة الثانية: من قاعدة البيانات مباشرة (مشغّل النظام)

```bash
psql "$DATABASE_URL" -c "UPDATE users SET role='admin' WHERE email='you@dorisio.app';"
```

الحماية على مستوى الخادم في كل مسار:

- `requireUser()` / `requireAdmin()` في `src/lib/auth.ts` تُستدعى داخل كل مسار تعديلي.
- كل تعديل (دوري/فريق/لاعب/مباراة/حدث/جائزة/إعلان/تشكيلة) يتطلب `admin`.
- المستخدم العادي يستطيع: القراءة العامة، تعديل ملفه فقط، وإرسال تقييماته فقط.

---

## 6) رفع الصور (اللاعبين/الشعارات/الملف الشخصي)

المسار `POST /api/upload` يتحقق على الخادم من:

- تسجيل الدخول.
- نوع الملف (`image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`) مع فحص توقيع الملف.
- الحجم الأقصى 1.2MB.

حالياً تُخزَّن الصورة كـ data URL على السجل نفسه. للإنتاج، استبدل دالة التخزين في
`src/app/api/upload/route.ts` بـ **Firebase Storage** أو **S3**:

```ts
// مثال: Firebase Storage (Admin SDK) — خادم فقط
const [file] = await bucket.upload(path, buffer, { contentType });
const url = await file.getSignedUrl({ action: "read", expires: "2099-01-01" });
```

ثم اضبط `STORAGE_BUCKET` / `STORAGE_PUBLIC_URL` واستخدم الرابط الناتج في الحقل
`photoUrl` / `logoUrl` كما هو مطبق الآن.

---

## 7) الإشعارات

### 7.1 داخل التطبيق (مفعّل)

جدول `notifications` + صندوق في صفحة **حسابي**، مع إشعارات أمنية (استعادة كلمة المرور)
وإشعارات بثّ للجميع. أنشئ إشعارات بـ `PUT /api/notifications` (للمدير).

### 7.2 Web Push / FCM

بنية التخزين جاهزة في `push_subscriptions` (endpoint, p256dh, auth) مع نقطة
`POST /api/notifications` بإجراء `subscribe` / `unsubscribe`.

لتفعيل الإرسال الفعلي:

1. **Web Push (VAPID)**: ولّد المفاتيح:
   ```bash
   npx web-push generate-vapid-keys
   ```
   ضع الناتج في `NEXT_PUBLIC_VAPID_PUBLIC_KEY` و `VAPID_PRIVATE_KEY`، ثم أضف خدمة
   اشتراك ورسائل عند (انطلاق المباراة / هدف / نهاية المباراة / إعلان / لاعب الأسبوع).
2. **Firebase Cloud Messaging**: أنشئ مشروعاً في Firebase، فعّل **Cloud Messaging**،
   أضف `FIREBASE_SERVER_KEY` (Legacy) أو استخدم HTTP v1 مع حساب خدمة، وسجّل التوكن في
   `push_subscriptions`.

الإذن يُطلب من المستخدم بشكل صريح (زر مستقل) ولا يُطلب تلقائياً عند فتح التطبيق —
تجنّباً للإزعاج.

---

## 8) البيانات التجريبية (تطوير فقط)

```bash
# كمدير، مع تأكيد صريح:
curl -X POST https://YOUR-DOMAIN/api/seed \
  -H 'Content-Type: application/json' \
  -H 'Cookie: dorisio_session=...' \
  -d '{"confirm":"SEED-DEV-ONLY"}'
```

ينشئ: 5 فرق، 55 لاعباً، جدولاً كاملاً (10 مباريات)، مباريات بأحداث حقيقية، وإعلاناً.
لن يعمل بدون `confirm` الصحيح، ويجب عدم تشغيله على بيانات الإنتاج.

---

## 9) PWA والعمل دون اتصال

### ما تم بناؤه

- `public/manifest.webmanifest` — اسم عربي، اتجاه RTL، ألوان الهوية، اختصارات.
- `public/sw.js` — تخزين مؤقت للغلاف، صفحات بسياسة Network-first مع تخزين، ملفات ثابتة
  Cache-first، وfallback إلى `/offline`.
- `src/lib/client/offline.ts` — تخزين IndexedDB للبيانات + **طابور أحداث** مع حالات
  `pending / syncing / failed` وعدد محاولات.
- شريط حالة في الأعلى: «أنت غير متصل» / «N تغييراً بانتظار المزامنة».

### اختبار التثبيت

1. افتح الموقع عبر **HTTPS** (أو `localhost`).
2. في Chrome/Edge: أيقونة التثبيت في شريط العنوان، أو **Settings → Install Dorisio**.
3. على Android: **Add to Home screen**.
4. على iOS Safari: **مشاركة → إضافة إلى الشاشة الرئيسية**.

### اختبار العمل دون اتصال

1. افتح `/table` و`/matches` و`/players` مرة واحدة (يُخزَّن في الكاش).
2. DevTools → Network → **Offline** (أو أغلق الواي فاي).
3. أعد تحميل الصفحة: يعمل التطبيق ويعرض آخر بيانات محفوظة مع مؤشر «غير متصل».
4. كمدير في مركز المباراة: سجّل حدثاً وأنت دون اتصال → يظهر «بانتظار المزامنة».
5. أعد الاتصال → تُرسل الأحداث تلقائياً، وتختفي من الطابور **بعد تأكيد الخادم فقط**،
   وبمعرّفاتها الأصلية فلا تتكرر.

> ملاحظة: خادم التطوير المحلي لا يدعم SSE خلف بعض الوكلاء؛ في الإنتاج يعمل
> `/api/matches/[id]/stream` عبر `text/event-stream` مع إعادة اتصال تلقائية.

---

## 10) النشر

```bash
npm run build
npm start        # أو منصة الاستضافة: npm run build && npm run start
```

قبل النشر:

1. ضع كل متغيّرات البيئة في إعدادات المنصة (لا في المستودع).
2. استخدم PostgreSQL مُداراً مع نسخ احتياطية.
3. فعّل HTTPS إجبارياً (كوكي `Secure` تلقائياً في `NODE_ENV=production`).
4. اضبط `NEXT_PUBLIC_APP_URL` على النطاق النهائي **قبل** إعداد OAuth.
5. أنشئ أول مدير ثم **احذف `ADMIN_SETUP_TOKEN`**.
6. فعّل `Cache-Control` على مستوى CDN للملفات الثابتة فقط (الـ API يعيد `no-store`).

### التحقق قبل الإطلاق

```bash
npx next typegen
npm exec tsc -- --noEmit
npm run build
curl -s https://YOUR-DOMAIN/api/health   # {"ok":true}
```

---

## 11) أخطاء شائعة ورسائلها

| الرسالة | السبب | الحل |
| --- | --- | --- |
| «يجب تسجيل الدخول…» | انتهت الجلسة | أعد تسجيل الدخول |
| «هذه العملية متاحة لمدير الدوري فقط» | الحساب `user` | رقِّ الحساب (القسم 5) |
| «هذا الحدث مسجّل مسبقاً…» | إعادة إرسال | متعمَّد — يمنع التكرار |
| «اللاعب ليس في قائمة الفريقين…» | لاعب خارج المباراة | اختر لاعباً مشاركاً |
| «التقييم متاح فقط بعد انتهاء المباراة» | المباراة لم تنتهِ | انتظر `FINAL` |
| «لا يمكن استبدال جدول لُعبت منه مباريات» | حماية التاريخ | أنشئ موسم جديداً |
| «تسجيل الدخول عبر … غير مفعّل» | ناقص مفتاح OAuth | أكمل القسم 4 |

---

## 12) مطابقة Firebase (اختياري للترحيل)

التطبيق مبني على طبقة بيانات علائقية في هذه البيئة. عند الترحيل إلى Firebase، يُنفَّذ
نفس التصميم كما يلي:

| المفهوم الحالي | ما يقابل في Firebase |
| --- | --- |
| جدول `users` + `sessions` | `users/{uid}` + Firebase Authentication (Custom Claims للدور) |
| `leagues, teams, players, matches` | مجموعات بنفس الأسماء |
| `match_events` بمعرّف من الجهاز | `matchEvents/{clientEventId}` مع قيد عدم التكرار |
| `match_events` + `ON CONFLICT DO NOTHING` | `create()` داخل `runTransaction` مع التحقق من عدم الوجود |
| احتساب الترتيب | Cloud Function تُستدعى عند `onWrite` لمجموعة `matches` |
| SSE `/api/matches/[id]/stream` | `onSnapshot` على المباراة والأحداث |
| `push_subscriptions` | FCM device tokens |
| `POST /api/upload` | Firebase Storage + قواعد أمان للمسارات |
| الجلسات عبر كوكي | Firebase ID tokens + `verifyIdToken()` على الخادم |
| `requireAdmin()` | `request.auth.token.admin === true` داخل Firestore Security Rules |

قواعد الأمان المكافئة يجب أن تمنع: تغيير `role`، تعديل النتائج، إنشاء أهداف تعسفية،
تعديل تقييمات الآخرين، وتعديل الجوائز — تماماً كما هو منفَّذ حالياً على الخادم.
