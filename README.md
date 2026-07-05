# 🚀 AVEX — منصة توصيل طعام عالمية

منصة توصيل كاملة مبنية بـ **Go backend** (بنية modular) + **5 تطبيقات Next.js**.

## ✨ المميزات

### 5 تطبيقات متكاملة
- 🛒 **Customer** — تطبيق العميل (تصفح المطاعم، طلبات، تتبع)
- 🛵 **Driver** — تطبيق المندوب (عروض، تسليم، أرباح، مستويات)
- 🏪 **Merchant** — تطبيق التاجر (إدارة المنيو، الطلبات، ساعات العمل)
- 🎧 **Support** — تطبيق الدعم (تذاكر، محادثات، بحث شامل)
- ⚙️ **Admin** — لوحة الإدارة (مناطق، مستويات، تجار، مندوبين)

### نظام المستويات والمناطق
- 4 مستويات للمندوبين (مبتدئ/برونزي/فضي/ذهبي) بشروط قابلة للتعديل
- مصفوفة أسعار (مستوى × منطقة) تُدار من لوحة الإدارة
- خوارزمية توزيع بترتيب: مسافة + مستوى + استجابة + شيفت
- Geofence (70م للاستلام، 50م للتسليم)

## 🛠️ التقنيات

| الطبقة | التقنية |
|---|---|
| **Backend** | Go 1.23 (بنية modular: cmd/ + internal/) |
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Database** | PostgreSQL (إنتاج) — `pgx/v5` driver |
| **Styling** | Tailwind CSS 4, Fluent design (أبيض/أسود/رمادي) |
| **State** | Zustand |
| **Animations** | Framer Motion |

## 📁 هيكل المشروع

```
avex/
├── backend/
│   ├── cmd/server/main.go              ← نقطة الدخول
│   └── internal/
│       ├── shared/                     ← DB, JWT (4 types), middlewares, geo
│       ├── dispatch/                   ← خوارزميات التوزيع والتسعير
│       ├── customer/                   ← 13 مسار
│       ├── driver/                     ← 21 مسار
│       ├── merchant/                   ← 14 مسار
│       ├── support/                    ← 12 مسار
│       └── admin/                      ← 35+ مسار
├── apps/
│   ├── customer/   (Next.js, port 3000)
│   ├── driver/     (Next.js, port 3001)
│   ├── admin/      (Next.js, port 3002)
│   ├── support/    (Next.js, port 3003)
│   └── merchant/   (Next.js, port 3004)
├── scripts/
│   ├── replit-backend.sh               ← يشغّل الـ backend
│   ├── replit-app.sh                   ← يشغّل أي تطبيق Next.js
│   └── start-all.sh                    ← يشغّل الكل محلياً
├── .replit                             ← إعدادات Replit
├── replit.nix                          ← حزم Nix
└── replit.md                           ← تعليمات Replit Agent (دليل البناء الكامل)
```

## 🚀 التشغيل المحلي

```bash
# يشغّل الـ backend + كل التطبيقات الـ 5
bash scripts/start-all.sh
```

ثم افتح:
- Customer: http://localhost:3000
- Driver: http://localhost:3001
- Admin: http://localhost:3002
- Support: http://localhost:3003
- Merchant: http://localhost:3004
- Backend API: http://localhost:8080

## 🔑 الحسابات التجريبية

| التطبيق | الهاتف | كلمة المرور |
|---|---|---|
| Admin | 01000000000 | admin123 |
| Driver | 01100000001 / 002 | 123456 |
| Merchant | 01200000001 إلى 005 | 123456 |
| Support | 01500000001 / 002 | 123456 |
| Customer | أي رقم مصري | (سجّل بنفسك) |

## ☁️ النشر على Replit

**كل تطبيق على Replit منفصل** — 6 Replits إجمالاً.

اطلع على **[replit.md](./replit.md)** للدليل الكامل خطوة بخطوة (تعليمات Replit Agent).

### باختصار:
1. استورد الـ repo على Replit
2. عدّل سطر `run` في `.replit` حسب التطبيق
3. اضغط **Run**

لربط التطبيقات بالإنتاج، أضف Secret في كل تطبيق (عدا الـ Backend):
- `BACKEND_URL` = رابط الـ Backend Replit

## 🌍 متغيرات البيئة

| المتغير | مطلوب | الوصف |
|---|---|---|
| `DATABASE_URL` | ✅ نعم | رابط PostgreSQL (مثال: `postgres://user:pass@host:5432/avex?sslmode=require`) |
| `PORT` | لا (8080) | منفذ Go backend |
| `JWT_SECRET` | لا | مفتاح JWT |
| `BACKEND_URL` | للتطبيقات | رابط الـ backend (يُستخدم في Next.js apps) |

### PostgreSQL فقط
الباك إند يتعامل مع **PostgreSQL فقط** — لا يوجد SQLite. تحتاج لقاعدة PostgreSQL مثلاً:
- **Neon** (neon.tech) — مجاني
- **Supabase** (supabase.com) — مجاني
- **Replit Postgres** — مدمج في Replit

```bash
DATABASE_URL="postgres://user:pass@host:5432/avex?sslmode=require"
```

## 🔌 API Endpoints (95+ مسار)

- **Customer** (13): auth, menu, orders, addresses, cards, coupons
- **Driver** (21): auth, offers, delivery, earnings, support tickets
- **Merchant** (14): auth, orders KDS, menu CRUD, store hours, stats
- **Support** (12): agent auth, tickets, search, order/driver lookup
- **Admin** (35+): dashboard, zones, tiers, prices, drivers, applications, restaurants

اطلع على `backend/internal/*/routes.go` للقائمة الكاملة.

## 📄 الرخصة
© 2026 AVEX. جميع الحقوق محفوظة.
