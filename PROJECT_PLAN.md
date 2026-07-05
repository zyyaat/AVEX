# 🚀 AVEX — خطة المشروع الكاملة

منصة توصيل طعام عالمية متعددة التطبيقات، مبنية بـ **Go backend** (بنية modular) + **5 تطبيقات Next.js** + **PostgreSQL** فقط.

---

## 📋 الفهرس

1. [نظرة عامة](#1-نظرة-عامة)
2. [المكدّس التقني](#2-المكدّس-التقني)
3. [البنية المعمارية للـ Backend](#3-البنية-المعمارية-للـ-backend)
4. [قاعدة البيانات (PostgreSQL)](#4-قاعدة-البيانات-postgresql)
5. [نظام المستويات (Driver Tiers)](#5-نظام-المستويات-driver-tiers)
6. [نظام المناطق (Delivery Zones)](#6-نظام-المناطق-delivery-zones)
7. [مصفوفة الأسعار (Tier × Zone Pricing)](#7-مصفوفة-الأسعار-tier--zone-pricing)
8. [الخوارزميات الأربعة](#8-الخوارزميات-الأربعة)
9. [تدفّق تسجيل المندوب](#9-تدفق-تسجيل-المندوب)
10. [تطبيق العميل (Customer)](#10-تطبيق-العميل-customer)
11. [تطبيق المندوب (Driver)](#11-تطبيق-المندوب-driver)
12. [تطبيق التاجر (Merchant)](#12-تطبيق-التاجر-merchant)
13. [تطبيق الدعم (Support)](#13-تطبيق-الدعم-support)
14. [لوحة الإدارة (Admin)](#14-لوحة-الإدارة-admin)
15. [كل الـ API Endpoints](#15-كل-الـ-api-endpoints)
16. [الحسابات التجريبية](#16-الحسابات-التجريبية)
17. [النشر على Replit](#17-النشر-على-replit)
18. [متغيرات البيئة](#18-متغيرات-البيئة)

---

## 1. نظرة عامة

**AVEX** منصة توصيل طعام عالمية تضم:

- **5 تطبيقات منفصلة** (عميل، مندوب، تاجر، دعم، إدارة) + **backend واحد** مشترك
- **تصميم Microsoft Fluent**: أبيض + أسود + رمادي فقط، بدون ألوان
- **PostgreSQL فقط** كقاعدة بيانات (لا SQLite)
- **نشر على Replit**: كل تطبيق على Replit منفصل

### التطبيقات والمنافذ

| التطبيق | المنفذ | الوصف |
|---|---|---|
| **Backend** | 8080 | Go API — قلب المنصة |
| **Customer** | 3000 | تطبيق العميل |
| **Driver** | 3001 | تطبيق المندوب |
| **Admin** | 3002 | لوحة الإدارة |
| **Support** | 3003 | تطبيق الدعم |
| **Merchant** | 3004 | تطبيق التاجر |

---

## 2. المكدّس التقني

| الطبقة | التقنية |
|---|---|
| **Backend** | Go 1.23 (بنية modular: `cmd/` + `internal/`) |
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Database** | PostgreSQL فقط — `pgx/v5` driver |
| **Styling** | Tailwind CSS 4, Fluent design (أبيض/أسود/رمادي) |
| **State** | Zustand |
| **Animations** | Framer Motion |
| **Auth** | JWT (4 أنواع: customer, driver, merchant, agent) |
| **Maps** | Google Maps links + Haversine للمسافات |
| **Fonts** | Cairo (عربي + لاتيني) |

---

## 3. البنية المعمارية للـ Backend

```
backend/
├── cmd/server/main.go              ← نقطة الدخول (~40 سطر)
└── internal/
    ├── shared/                     ← كل ما هو مشترك
    │   ├── db.go                   (DB + schema + migrations)
    │   ├── seed.go                 (Seed + SeedDriverSystem + SeedMerchantAndAgentSystem)
    │   ├── auth.go                 (Claims + 4 JWT generators + phone helpers)
    │   ├── http.go                 (WriteJSON + 6 middlewares)
    │   ├── geo.go                  (HaversineM)
    │   └── settings.go             (GetSetting + FindZoneByLatLng)
    ├── dispatch/                   ← خوارزميات مشتركة
    │   ├── dispatch.go             (DispatchOrder + AcceptOfferInternal)
    │   ├── pricing.go              (ComputeDriverFee)
    │   └── tier.go                 (EvaluateDriverTier)
    ├── customer/   (handlers + routes — 13 مسار)
    ├── driver/     (handlers + routes — 21 مسار)
    ├── merchant/   (handlers + routes — 14 مسار)
    ├── support/    (handlers + routes — 12 مسار)
    └── admin/      (handlers + routes — 35+ مسار)
```

### النمط المعماري

- كل package له `routes.go` يفضح `RegisterRoutes(mux *http.ServeMux)`
- `cmd/server/main.go` يسجّل كل المسارات الـ 5 في 5 سطور:
  ```go
  customer.RegisterRoutes(mux)
  driver.RegisterRoutes(mux)
  merchant.RegisterRoutes(mux)
  support.RegisterRoutes(mux)
  admin.RegisterRoutes(mux)
  ```
- نفس الـ binary واحد يخدم كل التطبيقات على port 8080

### Middlewares (6)

| Middleware | الوصف |
|---|---|
| `AuthMW` | مصادقة عميل عادي (JWT) |
| `OptionalAuthMW` | مصادقة اختيارية (للـ checkout匿名) |
| `AdminMW` | يتطلب صلاحية admin |
| `DriverAuthMW` | يتطلب JWT مندوب |
| `MerchantAuthMW` | يتطلب JWT تاجر |
| `AgentAuthMW` | يتطلب JWT موظف دعم |

---

## 4. قاعدة البيانات (PostgreSQL)

### الجداول (28 جدول)

#### جداول العميل الأساسية (12)
1. **users** — العملاء + الأدمن
2. **addresses** — عناوين العميل
3. **favorites** — المفضلة
4. **restaurants** — المطاعم (+ lat, lng, zone_id)
5. **categories** — فئات الطعام
6. **menu_items** — أصناف المنيو
7. **orders** — الطلبات (+ driver_id, zone_id, dispatch_distance_m, delivery_distance_m, driver_fee, platform_margin)
8. **order_items** — أصناف الطلب
9. **coupons** — الكوبونات
10. **settings** — إعدادات النظام
11. **saved_cards** — بطاقات العميل
12. **payment_transactions** — معاملات الدفع

#### جداول المناطق والمستويات (4)
13. **delivery_zones** — مناطق العمل (geofence دائري)
14. **driver_tiers** — تعريف المستويات
15. **tier_thresholds** — شروط كل مستوى
16. **tier_zone_prices** — مصفوفة الأسعار (مستوى × منطقة)

#### جداول المندوبين (7)
17. **driver_applications** — طلبات الالتحاق (عبر البورتال)
18. **drivers** — حسابات المندوبين
19. **driver_stats** — إحصائيات تراكمية
20. **driver_shifts** — ورديات المندوبين
21. **driver_tier_history** — سجل تغييرات المستوى
22. **dispatch_offers** — عروض الطلبات على المندوبين
23. **support_tickets** — تذاكر الدعم (+ assigned_to, priority)

#### جداول الدعم (1)
24. **support_messages** — رسائل التذاكر (+ is_internal)

#### جداول التاجر (3)
25. **merchants** — حسابات التجار
26. **store_hours** — ساعات العمل اليومية
27. **scheduled_orders** — الطلبات المجدولة

#### جداول الدعم (1)
28. **support_agents** — حسابات موظفي الدعم

### الـ Schema الكامل

كل الجداول تستخدم:
- `BOOLEAN DEFAULT TRUE/FALSE` (ليس 1/0)
- `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `TEXT PRIMARY KEY` (UUIDs)
- `UNIQUE` constraints حيث يلزم
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` للـ migrations

---

## 5. نظام المستويات (Driver Tiers)

### المستويات الأربعة

| الكود | الاسم بالعربية | sort_order | اللون |
|---|---|---|---|
| `starter` | مبتدئ | 1 | `#9CA3AF` (رمادي فاتح) |
| `bronze` | برونزي | 2 | `#A16207` (بني داكن) |
| `silver` | فضي | 3 | `#6B7280` (رمادي) |
| `gold` | ذهبي | 4 | `#000000` (أسود صريح) |

> **ملاحظة تصميمية**: لأن الـ design system أبيض/أسود/رمادي، المستويات بتتمايز بـ **كثافة اللون** مش بألوان مختلفة.

### شروط كل مستوى (tier_thresholds)

| المستوى | acceptance | completion | rating | on_time | shift_adherence | lifetime_orders |
|---|---|---|---|---|---|---|
| starter | 0% | 0% | 0 | 0% | 0% | 0 |
| bronze | 60% | 85% | 4.5 | 85% | 80% | 50 |
| silver | 75% | 92% | 4.7 | 92% | 90% | 250 |
| gold | 90% | 96% | 4.8 | 96% | 95% | 750 |

### عوامل إنزال المستوى (Downgrade Triggers)

1. **رفض الطلبات** — Low Acceptance Rate (أوضح سبب)
2. **تقييم عميل منخفض** — تحت 4.5/4.7
3. **عدم إكمال الطلبات** — Completion rate تحت 90-95%
4. **التسليم المتأخر** — Low On-Time Rate
5. **التأخير عن الشيفت** — يخصم من shift_adherence + يتسجّل في driver_shifts.is_late
6. **عدم الالتزام بـ Geofence** — الخروج من دائرة الاستقطاب
7. **عدم التحرك للمطعم بعد القبول** — تأخير الـ pickup
8. **شكاوى من المطاعم أو العملاء** — complaints ضد المندوب
9. **عدم نشاط (Inactivity)** — عدم تسجيل دخول لفترة طويلة

> **ملاحظة مهمة**: المندوب **لا يمكنه إلغاء طلب بعد قبوله** — يجب فتح تذكرة دعم بعذر مقنع للحالات الخاصة فقط.

### دورة التحديث
- **تلقائياً**: كل 24 ساعة + بعد كل طلب مكتمل
- **يدوياً**: من لوحة الإدارة

---

## 6. نظام المناطق (Delivery Zones)

### المناطق الافتراضية (4 مناطق في القاهرة)

| الـ ID | الاسم | المركز (lat, lng) | نصف القطر |
|---|---|---|---|
| `zone-nasr` | مدينة نصر | 30.0566, 31.3656 | 4000م |
| `zone-maadi` | المعادي | 29.9602, 31.2569 | 3500م |
| `zone-heliopolis` | مصر الجديدة | 30.0915, 31.3425 | 3500م |
| `zone-downtown` | وسط البلد | 30.0444, 31.2357 | 3000م |

### آلية تحديد المنطقة
- كل منطقة = دائرة جغرافية (مركز + نصف قطر)
- المطعم ينتمي لمنطقة واحدة (restaurants.zone_id)
- لما الطلب يُنشأ: zone_id = restaurant.zone_id (أو يُحسب من موقع العميل)
- المندوب يجب أن يكون في نفس منطقة المطعم (أو قريب منها)

### Geofence Settings
- `pickup_geofence_m`: 70 (للاستلام من المطعم)
- `delivery_geofence_m`: 50 (للتسليم للعميل)
- `dispatch_radius_m`: 5000 (أقصى مسافة مندوب↔مطعم للتوزيع)
- `location_stale_seconds`: 30 (يعتبر المندوب offline لو لم يحدّث GPS خلال 30 ثانية)

---

## 7. مصفوفة الأسعار (Tier × Zone Pricing)

### البنية
كل خلية في المصفوفة (4 مستويات × 4 مناطق = 16 خلية) تحتوي على:

| الحقل | الوصف |
|---|---|
| `base_fee` | رسوم أساسية ثابتة (ج.م) |
| `per_km_fee` | رسوم إضافية لكل كيلومتر (مطعم→عميل) |
| `min_fee` | الحد الأدنى للرسوم |
| `max_fee` | الحد الأقصى للرسوم (0 = بلا حد) |
| `free_above` | توصيل مجاني فوق هذا المبلغ (للعميل) |
| `estimated_minutes` | زمن التوصيل المتوقع للعرض |

### القيم الافتراضية

| المستوى | base | per_km | min | max | free_above | est_minutes |
|---|---|---|---|---|---|---|
| starter | 4.0 | 1.5 | 3 | 20 | 30 | 35 |
| bronze | 5.0 | 2.0 | 4 | 22 | 30 | 30 |
| silver | 6.0 | 2.5 | 5 | 25 | 30 | 25 |
| gold | 7.0 | 3.0 | 6 | 28 | 30 | 20 |

### معاملات المناطق (Zone Multipliers)
- `zone-nasr`: ×1.0
- `zone-maadi`: ×0.95 (أقل شوية)
- `zone-heliopolis`: ×1.0
- `zone-downtown`: ×1.10 (أعلى بسبب الازدحام)

> **ملاحظة**: كل هذه القيم **قابلة للتعديل من لوحة الإدارة** بدون لمس الكود.

### الفرق بين رسم العميل ورسم المندوب
- **رسم العميل** (عند checkout): يُحسب من تسعيرة افتراضية (silver) للمنطقة
- **رسم المندوب** (عند القبول): يُحسب من تسعيرة مستواه الفعلي × منطقة المطعم
- **هامش AVEX** = رسم العميل - رسم المندوب (يُحفظ في `orders.platform_margin`)

---

## 8. الخوارزميات الأربعة

### 🔵 الخوارزمية 1: تقييم مستوى المندوب (Tier Evaluation)

**متى تشتغل؟**
- كل 24 ساعة (cron job)
- فوراً بعد كل طلب مكتمل
- عند الطلب اليدوي من الأدمن

**الخطوات:**
```
INPUT: driver_id
1. اقرأ driver_stats لآخر 30 يوم
2. احسب:
   acceptance_rate  = accepted / (accepted + rejected) × 100
   completion_rate  = completed / accepted × 100
   customer_rating  = rating_sum / rating_count
   on_time_rate     = on_time_count / completed × 100
   shift_adherence  = shift_attended / shift_scheduled × 100
3. حمّل كل driver_tiers مرتبة تنازلياً حسب sort_order
4. لكل tier (من الأعلى للأقل):
   اقرأ tier_thresholds له
   لو المندوب يحقق كل الحدود الدنيا → خلاص، اقبل هذا المستوى
   اخرج من اللوب
5. لو المستوى الجديد ≠ الحالي:
   - حدّث drivers.tier_id
   - أضف سطر في driver_tier_history
6. رجّع المستوى النهائي
```

---

### 🟢 الخوارزمية 2: التوزيع (Dispatch)

**متى تشتغل؟**
- فوراً عند قبول المطعم الطلب (المطعم إجباري auto-accept)

**الخطوات:**
```
INPUT: order_id (الطلب تم قبوله من المطعم)
1. اقرأ الطلب → حدد restaurant_id → اقرأ المطعم → zone_id = restaurant.zone_id
2. احصل على نطاق البحث R (من settings: dispatch_radius_m، افتراضي 5000)
3. ابحث عن المندوبين المرشحين:
   - is_online = TRUE
   - is_active = TRUE
   - is_verified = TRUE
   - tier_id IS NOT NULL
   - location_updated_at > NOW() - INTERVAL '30 seconds'
   - مفيهومش dispatch_offer حالي status='accepted'
   - مفيهومش order active حالياً (status في ['assigned','picked_up','on_the_way'])
   - المسافة مندوب→مطعم ≤ R
4. لكل مرشح، احسب score:
   distance_score  = 1 - (distance_m / R)              → الأقرب = 1.0
   tier_score      = tier.sort_order / max_sort_order  → Gold = 1.0
   response_score  = 1 - (avg_response_sec / 60)       → الأسرع = أعلى
   shift_score     = 1.0 (لو في شيفت نشطة) / 0.5 (لو خارج الشيفت)
   
   total = distance×0.50 + tier×0.30 + response×0.10 + shift×0.10
5. رتّب تنازلياً، خذ أعلى 5
6. أنشئ dispatch_offers لكل واحد فيهم:
   - status = 'pending'
   - expires_at = NOW() + INTERVAL '15 seconds'
7. لو أي واحد منهم auto_accept = TRUE:
   - اقبل له فوراً (أعلى priority)
```

---

### 🟡 الخوارزمية 3: حساب رسوم التوصيل (Pricing)

**للعميل (عند checkout):**
```
INPUT: restaurant_id, customer_lat, customer_lng
1. zone_id = restaurant.zone_id
2. اقرأ tier_zone_prices لـ zone_id (باستخدام تسعيرة silver كافتراضي)
3. base_fee = row.base_fee
4. distance_m = haversine(restaurant, customer)
5. per_km = row.per_km_fee
6. fee = base_fee + (distance_m/1000) × per_km
7. لو fee < min_fee → fee = min_fee
8. لو max_fee > 0 و fee > max_fee → fee = max_fee
9. لو order.subtotal ≥ free_above > 0 → fee = 0
10. ارجع fee
```

**للمندوب (عند القبول):**
```
INPUT: driver_id, order_id
1. driver.tier_id, restaurant.zone_id
2. اقرأ tier_zone_prices[tier_id, zone_id]
3. base_fee = row.base_fee
4. distance_m = order.delivery_distance_m (مطعم→عميل، محسوب مسبقاً)
5. per_km = row.per_km_fee
6. driver_fee = base_fee + (distance_m/1000) × per_km
7. طبّق min/max بنفس الطريقة
8. احفظ driver_fee في orders.driver_fee
9. platform_margin = customer_fee - driver_fee
10. ارجع driver_fee
```

---

### 🔴 الخوارزمية 4: Geofence الالتزام

**الاستلام من المطعم (70 متر):**
```
INPUT: driver.lat, driver.lng, restaurant.lat, restaurant.lng
1. distance = haversine(driver, restaurant)
2. لو distance ≤ 70:
   - مسموح بتأكيد الاستلام (picked_up)
3. لو > 70:
   - ارفض + رسالة "اقترب من المطعم بمسافة X متر (مطلوب أقل من 70 متر)"
```

**التسليم للعميل (50 متر):**
```
INPUT: driver.lat, driver.lng, customer.lat, customer.lng
1. distance = haversine(driver, customer)
2. لو distance ≤ 50:
   - مسموح بتأكيد التسليم (delivered)
3. لو > 50:
   - ارفض + رسالة "اقترب من العميل بمسافة X متر (مطلوب أقل من 50 متر)"
```

---

### 🟣 Haversine Distance

دالة لحساب المسافة بين نقطتين جغرافيتين (great-circle distance) بالمتر:
```go
func HaversineM(lat1, lng1, lat2, lng2 float64) float64 {
    const R = 6371000.0 // Earth radius in meters
    rlat1 := lat1 * math.Pi / 180
    rlat2 := lat2 * math.Pi / 180
    dlat := (lat2 - lat1) * math.Pi / 180
    dlng := (lng2 - lng1) * math.Pi / 180
    a := 0.5 - 0.5*math.Cos(dlat) + math.Cos(rlat1)*math.Cos(rlat2)*(0.5-0.5*math.Cos(dlng))
    return 2 * R * math.Asin(math.Sqrt(a))
}
```

---

## 9. تدفّق تسجيل المندوب

**القاعدة الذهبية**: مفيش تسجيل ذاتي من تطبيق المندوب. التطبيق فيه **login فقط**.

### مراحل حياة المندوب

```
[1] تقديم الطلب (Admin Portal)
    ├─ الأدمن بيدخل بيانات المندوب: الاسم، الموبايل، الرقم القومي، 
    │   رقم الرخصة، نوع المركبة، رقم اللوحة، العنوان، هاتف طوارئ
    ├─ النظام بينشئ سجل في driver_applications بـ status = 'pending'
    └─ (لا يوجد حساب بعد)

[2] توثيق الأوراق (Admin Portal)
    ├─ الأدمن يراجع: صورة الرخصة + صورة البطاقة + صورة المركبة
    ├─ لو موافق:
    │   - يُنشأ drivers row
    │   - is_verified = TRUE
    │   - status = 'active'
    │   - tier = 'starter'
    │   - كلمة المرور الابتدائية = الرقم القومي
    │   - must_change_password = TRUE
    │   - driver_applications.driver_id = new driver id
    └─ لو رافض: status = 'rejected' + سبب الرفض

[3] تفعيل الوردية (Admin Portal)
    ├─ الأدمن يحدد لكل مندوب: يوم + ساعة بداية + ساعة نهاية + منطقة
    └─ النظام يتابع الحضور → late_to_shift (عامل إنزال مستوى)

[4] تشغيل التطبيق (Driver App)
    └─ المندوب يسجل دخول → يغيّر كلمة المرور (إجباري أول مرة) → يشغّل online → يستلم عروض
```

---

## 10. تطبيق العميل (Customer)

**المسار:** `apps/customer/` — Port 3000

### الصفحات/المكونات
- **HomeRestaurants** — الرئيسية مع قائمة المطاعم
- **RestaurantPage** — صفحة المطعم مع المنيو
- **MenuCard** — بطاقة صنف
- **ProductDetail** — تفاصيل الصنف
- **CartDrawer** — سلة التسوق (drawer جانبي)
- **CheckoutDialog** — dialog الدفع + الكوبون + العنوان
- **AuthDialog** — تسجيل/دخول العميل
- **MyOrders** — طلباتي
- **AccountPage** — حسابي (عناوين، بطاقات، مفضلة)
- **OrderTracking** — تتبع الطلب برقم الطلب
- **BottomTabBar** — شريط سفلي (4 تبويبات)
- **OffersSection** — العروض
- **SearchPage** — البحث
- **AboutSection** + **Footer**

### Store (Zustand)
- `useAuth` — auth state (token, user)
- `useCart` — cart state (items, totals)

### الـ API Endpoints (13)
- `POST /api/auth/register` — تسجيل عميل
- `POST /api/auth/login` — دخول
- `GET /api/auth/me` — بياناتي
- `GET /api/menu` — قائمة الطعام (categories + items)
- `GET /api/restaurants` — قائمة المطاعم
- `GET /api/restaurants/{id}` — تفاصيل مطعم + منيو
- `GET /api/settings` — الإعدادات
- `POST /api/coupons/validate` — التحقق من كوبون
- `POST /api/orders` — إنشاء طلب (مع auto-accept من المطعم + dispatch)
- `GET /api/orders` — طلباتي
- `GET /api/orders/track?number=X` — تتبع طلب
- `GET/POST/DELETE /api/addresses` — العناوين
- `GET/POST/DELETE /api/cards` — البطاقات

---

## 11. تطبيق المندوب (Driver)

**المسار:** `apps/driver/` — Port 3001

### الصفحات

| الصفحة | المسار | الوصف |
|---|---|---|
| Login | `/login` | تسجيل دخول فقط (لا register) |
| Home | `/` | online/offline toggle + شارة المستوى + 4 إحصائيات + عروض polling |
| OfferModal | (popup) | مودال عرض طلب جديد بعدّاد 15 ثانية SVG دائري |
| ActiveDelivery | (component) | الطلب الحالي: 4 خطوات (مطعم→استلام→طريق→تسليم) |
| Earnings | `/earnings` | أرباحي (اليوم/الأسبوع/الشهر) + رسم 7 أيام |
| History | `/history` | سجل الطلبات بترقيم صفحات |
| Profile | `/profile` | بياناتي + auto-accept toggle + تغيير كلمة المرور |
| Support | `/support` | تذاكري + فتح تذكرة (للإلغاء الخاص) |
| Support Chat | `/support/{id}` | محادثة تذكرة مع polling |

### المكونات الرئيسية
- **BottomTabBar** — 5 تبويبات (Home / History / Earnings / Support / Profile)
- **OfferModal** — bottom-sheet بعدّاد دائري SVG 15ث + تفاصيل الطلب + أرباح المندوب + أزرار قبول/رفض
- **ActiveDelivery** — مؤشر 4 خطوات + بطاقة مطعم + قائمة أصناف + بطاقة عميل مع `tel:` + زر حسب الحالة + geofence hint
- **TierBadge** — شارة المستوى بلونه من DB

### Store (Zustand)
- `useAuth` — auth state
- `useDriver` — driver data + offers + active order + polling helpers

### Polling
- `/api/driver/offers` كل **3 ثواني** لما online=1 ومفيش active order
- `/api/driver/location` كل **5 ثواني** لما online=1 (GPS watchPosition)
- `/api/driver/active-order` كل **5 ثواني** لما فيه active

### الـ API Endpoints (21)

**Auth:**
- `POST /api/driver/auth/login` — دخول
- `POST /api/driver/auth/change-password` — تغيير كلمة المرور
- `GET /api/driver/me` — بياناتي + مستواي + إحصائياتي + المستوى التالي

**الحالة:**
- `PATCH /api/driver/online` — online/offline toggle
- `PATCH /api/driver/location` — تحديث GPS
- `PATCH /api/driver/auto-accept` — تفعيل/إيقاف القبول التلقائي
- `GET /api/driver/shift` — شيفتي الحالية + حالة الحضور

**العروض والطلبات:**
- `GET /api/driver/offers` — عروضي الحالية (pending)
- `POST /api/driver/offers/{id}/accept` — قبول عرض
- `POST /api/driver/offers/{id}/reject` — رفض عرض ⚠️ (يخصم من acceptance)
- `GET /api/driver/active-order` — الطلب اللي شغّال عليه
- `POST /api/driver/orders/{id}/picked-up` — استلام من المطعم (geofence 70m)
- `POST /api/driver/orders/{id}/arrived` — وصلت للعميل (تنبيه العميل)
- `POST /api/driver/orders/{id}/delivered` — تسليم للعميل (geofence 50m)

**الأرباح والإحصائيات:**
- `GET /api/driver/earnings?period=today|week|month` — أرباحي
- `GET /api/driver/history?page=` — سجل طلباتي

**الدعم:**
- `GET /api/driver/support/tickets` — تذاكري
- `POST /api/driver/support/tickets` — فتح تذكرة (cancellation_request/complaint/other)
- `GET /api/driver/support/tickets/{id}` — تفاصيل تذكرة + رسائلها
- `POST /api/driver/support/tickets/{id}/messages` — إرسال رسالة في تذكرة

---

## 12. تطبيق التاجر (Merchant)

**المسار:** `apps/merchant/` — Port 3004

### الصفحات

| الصفحة | الوصف |
|---|---|
| Login | تسجيل دخول (حساب مطعم — يُنشأ من لوحة الإدارة) |
| Dashboard | 4 KPIs + رسم 7 أيام + زر pause/resume |
| Orders (KDS) | بطاقات طلبات حية بترتيب زمن الاستلام، حالة (جديد/قيد التحضير/جاهز) |
| Order Detail | modal بتفاصيل الطلب + الأصناف |
| Menu Manager | CRUD أصناف، سعر، صورة، وقت تحضير، توفر |
| Store Hours | 7 أيام مع time pickers + open/closed toggle لكل يوم |

### تدفّق الطلب (Merchant)
```
جديد (accepted) → قيد التحضير (preparing) → جاهز للاستلام (ready) → خرج مع المندوب
```

### الـ API Endpoints (14)

**Auth:**
- `POST /api/merchant/auth/login` — دخول
- `POST /api/merchant/auth/change-password` — تغيير كلمة المرور
- `GET /api/merchant/me` — بياناتي + بيانات المطعم

**الطلبات:**
- `GET /api/merchant/orders?status=` — طلبات مطعمي
- `GET /api/merchant/orders/{id}/items` — أصناف طلب
- `PATCH /api/merchant/orders/{id}/status` — تحديث حالة (accepted→preparing→ready)

**المنيو:**
- `GET /api/merchant/menu` — منيو مطعمي + الفئات
- `POST /api/merchant/menu/items` — إضافة صنف
- `PATCH /api/merchant/menu/items/{id}` — تعديل صنف
- `DELETE /api/merchant/menu/items/{id}` — حذف صنف

**المتجر:**
- `GET /api/merchant/hours` — ساعات العمل
- `PUT /api/merchant/hours` — تحديث ساعات العمل
- `PATCH /api/merchant/pause` — pause/resume المطعم
- `GET /api/merchant/stats` — إحصائيات (اليوم/نشطة/مكتملة/إيرادات + 7 أيام)
- `GET /api/merchant/scheduled-orders` — الطلبات المجدولة

---

## 13. تطبيق الدعم (Support)

**المسار:** `apps/support/` — Port 3003

### الصفحات

| الصفحة | الوصف |
|---|---|
| Login | تسجيل دخول موظف دعم |
| Agent Dashboard | 4 KPIs (مفتوحة/عاجلة/مسندة ليّ/اليوم) + توزيع حسب النوع + أحدث التذاكر |
| Inbox | قائمة التذاكر مع فلتر (الكل/مسندة ليّ/غير مسندة/مفتوحة) |
| Ticket Detail | محادثة + ملاحظات داخلية + إجراءات (إسناد/أولوية/إغلاق/إلغاء طلب) |
| Search | بحث شامل (عملاء/مندوبون/طلبات في query واحد) |
| Order Detail | تفاصيل طلب كاملة |
| Driver Detail | إحصائيات مندوب + آخر الطلبات |

### الـ API Endpoints (12)

**Auth:**
- `POST /api/agent/auth/login` — دخول
- `GET /api/agent/me` — بياناتي

**التذاكر:**
- `GET /api/agent/tickets?filter=mine|open|unassigned` — قائمة التذاكر
- `GET /api/agent/tickets/{id}` — تفاصيل تذكرة + رسائل
- `POST /api/agent/tickets/{id}/assign` — إسناد ليّ
- `PATCH /api/agent/tickets/{id}/priority` — تحديد الأولوية (low/normal/high/urgent)
- `POST /api/agent/tickets/{id}/messages` — رد (مع is_internal للـ internal notes)
- `PATCH /api/agent/tickets/{id}/resolve` — إغلاق تذكرة
- `POST /api/agent/tickets/{id}/cancel-order` — إلغاء الطلب المرتبط (للحالات الخاصة)

**البحث والاستعلام:**
- `GET /api/agent/search?q=` — بحث شامل (عملاء + مندوبون + طلبات)
- `GET /api/agent/orders/{id}` — تفاصيل طلب
- `GET /api/agent/drivers/{id}` — تفاصيل مندوب + إحصائيات + آخر الطلبات
- `GET /api/agent/stats` — إحصائيات الدعم

---

## 14. لوحة الإدارة (Admin)

**المسار:** `apps/admin/` — Port 3002

### الصفحات (10 صفحات)

| الصفحة | الوصف |
|---|---|
| Dashboard | KPIs حية (طلبات اليوم، مندوبين نشطين، إيرادات، تذاكر) + رسم 7 أيام + توزيع الحالات |
| Orders | جدول كل الطلبات مع فلترة + تفاصيل كل طلب |
| Restaurants | CRUD مطاعم (ينشئ حساب تاجر تلقائياً عند الإنشاء) |
| Zones | CRUD مناطق العمل |
| Tiers | CRUD مستويات + شروط قابلة للتعديل |
| Tier Prices | مصفوفة الأسعار (مستوى × منطقة) — تحرير مباشر لكل خلية |
| Drivers | قائمة المندوبين + تغيير المستوى + تفعيل/إيقاف |
| Applications | طلبات الالتحاق + توثيق/رفض |
| Support | inbox كل التذاكر + الرد + الإغلاق + إلغاء طلب |
| Settings | إعدادات النظام (نطاق التوزيع، geofence، رسوم) |

### الـ API Endpoints (35+)

**Dashboard:**
- `GET /api/admin/dashboard` — KPIs شاملة

**الطلبات:**
- `GET /api/admin/orders?status=` — كل الطلبات مع فلترة
- `PATCH /api/orders/{id}` — تحديث حالة طلب (admin override)

**المطاعم:**
- `GET /api/admin/restaurants` — قائمة مع إحصائيات
- `POST /api/admin/restaurants` — إنشاء (ينشئ حساب تاجر تلقائياً)
- `PATCH /api/admin/restaurants/{id}` — تعديل
- `DELETE /api/admin/restaurants/{id}` — إيقاف

**المناطق:**
- `GET/POST /api/admin/zones`
- `PATCH/DELETE /api/admin/zones/{id}`

**المستويات:**
- `GET/POST /api/admin/tiers`
- `PATCH /api/admin/tiers/{id}`
- `PUT /api/admin/tiers/{id}/thresholds` — تحديث شروط

**مصفوفة الأسعار:**
- `GET /api/admin/tier-prices?zone_id=`
- `PUT /api/admin/tier-prices/{tier_id}/{zone_id}` — تحديث خلية

**المندوبين:**
- `GET /api/admin/drivers` — قائمة كاملة
- `PATCH /api/admin/drivers/{id}/status` — تفعيل/إيقاف
- `PATCH /api/admin/drivers/{id}/tier` — تثبيت يدوي لمستوى
- `GET /api/admin/drivers/{id}/tier-history` — سجل تغييرات المستوى
- `POST/GET /api/admin/drivers/{id}/shifts` — جدولة ورديات

**طلبات الالتحاق:**
- `GET /api/admin/driver-applications`
- `POST /api/admin/driver-applications` — إنشاء طلب
- `PATCH /api/admin/driver-applications/{id}/verify` — توثيق + إنشاء حساب
- `PATCH /api/admin/driver-applications/{id}/reject` — رفض

**الدعم:**
- `GET /api/admin/support/tickets`
- `PATCH /api/admin/support/tickets/{id}/resolve`
- `POST /api/admin/support/tickets/{id}/messages`
- `POST /api/admin/support/tickets/{id}/cancel-order`

**الإعدادات والـ CRUD القديم:**
- `PUT /api/admin/settings` — تحديث إعداد
- `GET/POST /api/admin/categories` — الفئات
- `GET/POST/PATCH/DELETE /api/admin/menu-items` — أصناف المنيو
- `GET/POST/DELETE /api/admin/coupons` — الكوبونات

---

## 15. كل الـ API Endpoints

**المجموع:** 95+ مسار موزّعة كالتالي:
- **Customer**: 13
- **Driver**: 21
- **Merchant**: 14
- **Support**: 12
- **Admin**: 35+

اطلع على `backend/internal/*/routes.go` للقائمة الكاملة بكل التفاصيل.

---

## 16. الحسابات التجريبية

بعد الـ seed التلقائي:

| التطبيق | الهاتف | كلمة المرور | ملاحظات |
|---|---|---|---|
| Admin | 01000000000 | admin123 | حساب المدير |
| Driver | 01100000001 | 123456 | مستوى مبتدئ |
| Driver | 01100000002 | 123456 | مستوى فضي |
| Merchant | 01200000001 | 123456 | Burger House |
| Merchant | 01200000002 | 123456 | Pizza Palace |
| Merchant | 01200000003 | 123456 | Shawarma King |
| Merchant | 01200000004 | 123456 | Sweet Dreams |
| Merchant | 01200000005 | 123456 | Fresh & Cold |
| Support | 01500000001 | 123456 | أحمد الدعم |
| Support | 01500000002 | 123456 | سارة الدعم |
| Customer | أي رقم مصري | (سجّل بنفسك) | 010/011/012/015 |

---

## 17. النشر على Replit

### المكدّس على Replit
**6 Replits منفصلة** (1 backend + 5 تطبيقات):

| Replit | السكربت | المنفذ |
|---|---|---|
| Backend | `bash scripts/replit-backend.sh` | 8080 |
| Customer | `bash scripts/replit-app.sh customer 3000` | 3000 |
| Driver | `bash scripts/replit-app.sh driver 3001` | 3001 |
| Admin | `bash scripts/replit-app.sh admin 3002` | 3002 |
| Support | `bash scripts/replit-app.sh support 3003` | 3003 |
| Merchant | `bash scripts/replit-app.sh merchant 3004` | 3004 |

### خطوات النشر

#### 1. استيراد من GitHub
- اذهب إلى [replit.com](https://replit.com)
- **Create Repl** → **Import from GitHub**
- اختر الـ repo: `zyyaat/AVEX`

#### 2. إنشاء قاعدة PostgreSQL
استخدم أحد المزودين المجانيين:
- **Neon** (neon.tech) — الأسرع للإعداد
- **Supabase** (supabase.com) — مع لوحة تحكم
- **Replit Postgres** — مدمج في Replit

احصل على connection string (يبدأ بـ `postgres://...`).

#### 3. إعداد Backend Replit
في الـ Backend Replit:
- عدّل `.replit`: `run = "bash scripts/replit-backend.sh"`
- أضف **Secrets**:
  - `DATABASE_URL` = رابط PostgreSQL
  - `JWT_SECRET` = أي نص عشوائي
- اضغط **Run**

#### 4. إعداد تطبيقات Next.js
في كل تطبيق Next.js Replit (5 تطبيقات):
- عدّل `.replit`: `run = "bash scripts/replit-app.sh <app> <port>"`
- أضف **Secret**:
  - `BACKEND_URL` = رابط الـ Backend Replit (مثال: `https://avex-backend.yourname.repl.co`)
- اضغط **Run`

### `replit.nix`
```nix
{ pkgs }: {
  deps = [
    pkgs.go
    pkgs.nodejs_20
    pkgs.bun
    pkgs.postgresql
    pkgs.git
    pkgs.cacert
  ];
}
```

---

## 18. متغيرات البيئة

| المتغير | مطلوب | الوصف |
|---|---|---|
| `DATABASE_URL` | ✅ نعم | رابط PostgreSQL (مثال: `postgres://user:pass@host:5432/avex?sslmode=require`) |
| `PORT` | لا (8080) | منفذ Go backend |
| `JWT_SECRET` | لا | مفتاح JWT |
| `BACKEND_URL` | للتطبيقات | رابط الـ backend (يُستخدم في Next.js apps) |

### إعدادات النظام (قابلة للتعديل من لوحة الإدارة)

| المفتاح | الافتراضي | الوصف |
|---|---|---|
| `dispatch_radius_m` | 5000 | أقصى مسافة مندوب↔مطعم للتوزيع |
| `offer_expiry_seconds` | 15 | مدة عرض الطلب على المندوب قبل انتهائه |
| `pickup_geofence_m` | 70 | المسافة المطلوبة من المطعم لتأكيد الاستلام |
| `delivery_geofence_m` | 50 | المسافة المطلوبة من العميل لتأكيد التسليم |
| `location_stale_seconds` | 30 | يعتبر المندوب offline لو لم يحدّث GPS خلال هذه المدة |
| `delivery_fee` | 3.99 | رسوم التوصيل الافتراضية للعميل |
| `free_shipping_threshold` | 30 | حد التوصيل المجاني للعميل |

---

## 📁 هيكل المشروع الكامل

```
avex/
├── backend/
│   ├── cmd/server/main.go              ← نقطة الدخول
│   └── internal/
│       ├── shared/                     ← DB (PostgreSQL), JWT, middlewares, helpers
│       │   ├── db.go
│       │   ├── seed.go
│       │   ├── auth.go
│       │   ├── http.go
│       │   ├── geo.go
│       │   └── settings.go
│       ├── dispatch/                   ← خوارزميات مشتركة
│       │   ├── dispatch.go
│       │   ├── pricing.go
│       │   └── tier.go
│       ├── customer/                   ← 13 مسار
│       │   ├── handlers.go
│       │   └── routes.go
│       ├── driver/                     ← 21 مسار
│       │   ├── handlers.go
│       │   └── routes.go
│       ├── merchant/                   ← 14 مسار
│       │   ├── handlers.go
│       │   └── routes.go
│       ├── support/                    ← 12 مسار
│       │   ├── handlers.go
│       │   └── routes.go
│       └── admin/                      ← 35+ مسار
│           ├── handlers.go
│           └── routes.go
├── apps/
│   ├── customer/   (Next.js, port 3000)
│   ├── driver/     (Next.js, port 3001)
│   ├── admin/      (Next.js, port 3002)
│   ├── support/    (Next.js, port 3003)
│   └── merchant/   (Next.js, port 3004)
├── scripts/
│   ├── replit-backend.sh               ← يشغّل الـ backend
│   ├── replit-app.sh                   ← يشغّل أي تطبيق Next.js
│   ├── start-all.sh                    ← يشغّل الكل محلياً
│   └── convert-placeholders.py         ← أداة تحويل ? → $N
├── .replit                             ← إعدادات Replit
├── replit.nix                          ← حزم Nix
├── README.md                           ← الوثيقة الرئيسية
├── REPLIT.md                           ← دليل النشر الكامل
└── PROJECT_PLAN.md                     ← هذه الوثيقة
```

---

## 🎯 المميزات الرئيسية

### ✅ ما يميز AVEX

1. **نظام مستويات متقدم** — 4 مستويات بشروط قابلة للتعديل من الإدارة
2. **مصفوفة أسعار مرنة** — كل خلية (مستوى × منطقة) قابلة للتعديل
3. **خوارزمية توزيع ذكية** — score = مسافة×0.5 + مستوى×0.3 + استجابة×0.1 + شيفت×0.1
4. **Geofence دقيق** — 70م للاستلام، 50م للتسليم
5. **تسجيل مندوبين عبر البورتال** — لا تسجيل ذاتي
6. **لا إلغاء من المندوب** — دعم فقط بعذر مقنع
7. **دعم كامل للـ 4 أدوار** — عميل، مندوب، تاجر، دعم، إدارة
8. **تصميم Fluent موحّد** — أبيض/أسود/رمادي في كل التطبيقات
9. **PostgreSQL فقط** — لا SQLite، جاهز للإنتاج
10. **بنية modular نظيفة** — كل تطبيق في package منفصل

### 🔒 القيود المعمارية

- المطعم **إجباري auto-accept** للطلبات (لا خيار رفض)
- المندوب **لا يمكنه إلغاء** طلب بعد قبوله
- التسجيل الذاتي للمندوبين **ممنوع** — عبر البورتال فقط
- GPS **إجباري** لما المندوب online (لو stale > 30ث → offline تلقائياً)

---

## 📄 الرخصة

© 2026 AVEX. جميع الحقوق محفوظة.
