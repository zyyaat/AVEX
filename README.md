# 🚀 AVEX - تطبيق توصيل عالمي

تطبيق توصيل طعام عالمي بُني بـ **Go backend** + **Next.js frontend**.

## ✨ المميزات

- 🔐 **نظام مصادقة كامل** (تسجيل/دخول/JWT)
- 🍔 **قائمة طعام ديناميكية** مع صور حقيقية
- 🛒 **سلة تسوق ذكية** (منع الحذف بالخطأ، شريط تقدم للتوصيل المجاني)
- 📱 **رقم هاتف مصري** (010/011/012/015) مع معالجة +20
- 🎁 **نظام كوبونات** كامل (AVEX30, FREEDEL, FAMILY99, LUNCH15)
- 👑 **AVEX Club** (اشتراك مميز)
- 💳 **حفظ البطاقات** (tokenization جاهز لـ Paymob)
- 📍 **عناوين محفوظة** + تحديد الموقع
- 📦 **تتبع الطلبات** برقم الطلب
- 📊 **لوحة تحكم مسؤول** كاملة (Kanban, CRUD, إعدادات)
- 🎨 **تصميم عالمي** (بنفسجي + أصفر، RTL، responsive)

## 🛠️ التقنيات

| الطبقة | التقنية |
|--------|---------|
| **Backend** | Go 1.23+ (net/http, JWT, bcrypt) |
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Database** | SQLite (افتراضي) / PostgreSQL (إنتاج) |
| **Styling** | Tailwind CSS 4, shadcn/ui |
| **State** | Zustand (cart + auth) |
| **Animations** | Framer Motion |

## 📦 النشر على Replit

### 1. استيراد من GitHub
```bash
git clone <your-repo-url>
cd avex
```

### 2. تثبيت Go
```bash
# Replit يدعم Go تلقائياً عبر replit.nix
# أو ثبّته يدوياً:
wget https://go.dev/dl/go1.23.4.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.23.4.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
```

### 3. تثبيت Node dependencies
```bash
npm install
# أو
bun install
```

### 4. بناء Go backend
```bash
cd backend
go mod tidy
go build -o avex-api .
cd ..
```

### 5. إعداد قاعدة البيانات
```bash
# SQLite (افتراضي)
# لا حاجة لأي إعداد

# PostgreSQL (إنتاج)
export DB_DRIVER=postgres
export DATABASE_URL="host=localhost port=5432 user=postgres dbname=avex sslmode=disable"
```

### 6. تشغيل
```bash
# تشغيل Go backend (منفذ 8080)
cd backend && ./avex-api &

# تشغيل Next.js (منفذ 3000)
cd .. && npm run dev
```

أو استخدم سكريبت البدء:
```bash
bash scripts/start.sh
```

## 🔑 حساب المسؤول الافتراضي
```
الهاتف: 01000000000
كلمة المرور: admin123
```

## 🌍 متغيرات البيئة

| المتغير | الافتراضي | الوصف |
|---------|-----------|-------|
| `PORT` | 8080 | منفذ Go backend |
| `DB_DRIVER` | sqlite | sqlite / postgres |
| `DATABASE_URL` | - | رابط PostgreSQL |
| `JWT_SECRET` | avex-secret-key | مفتاح JWT |
| `DB_PATH` | ./avex.db | مسار SQLite |

## 📁 هيكل المشروع

```
avex/
├── backend/              # Go backend
│   ├── main.go           # كل الـ API في ملف واحد
│   ├── go.mod            # Go module
│   └── avex-api          # الباينري (يُبنى)
├── src/                  # Next.js frontend
│   ├── app/
│   │   ├── page.tsx      # الصفحة الرئيسية
│   │   ├── layout.tsx    # Layout (RTL, Cairo font)
│   │   ├── globals.css   # ألوان AVEX (بنفسجي + أصفر)
│   │   └── api/[...path] # Proxy route → Go backend
│   ├── components/
│   │   ├── franks/       # مكونات الواجهة
│   │   └── admin/        # لوحة التحكم
│   ├── store/            # Zustand (cart + auth)
│   └── lib/              # API client
├── prisma/               # Prisma schema (مرجعي)
├── scripts/              # سكريبتات
├── .replit               # إعدادات Replit
├── replit.nix            # حزم Nix لـ Replit
└── package.json
```

## 🔌 API Endpoints

### عامة
- `GET /api/health` - فحص الصحة
- `GET /api/menu` - قائمة الطعام
- `GET /api/settings` - الإعدادات
- `POST /api/auth/register` - تسجيل
- `POST /api/auth/login` - دخول
- `POST /api/orders` - إنشاء طلب
- `GET /api/orders/track?number=X` - تتبع طلب
- `POST /api/coupons/validate` - التحقق من كوبون

### مصادقة مطلوبة
- `GET /api/auth/me` - بيانات المستخدم
- `GET /api/orders` - طلباتي
- `GET/POST/DELETE /api/addresses` - العناوين
- `GET/POST/DELETE /api/cards` - البطاقات

### مسؤول فقط
- `GET/POST /api/admin/categories` - الفئات
- `GET/POST/PATCH/DELETE /api/admin/menu-items` - الأصناف
- `GET/POST/DELETE /api/admin/coupons` - الكوبونات
- `PUT /api/admin/settings` - الإعدادات
- `PATCH /api/orders/{id}` - تحديث حالة الطلب

## 📄 الرخصة
© 2026 AVEX. جميع الحقوق محفوظة.
