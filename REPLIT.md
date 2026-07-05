# 🚀 AVEX — دليل النشر على Replit

منصة AVEX تتكون من **6 أجزاء** منفصلة، كل واحد يُنشر على Replit مستقل:

| # | الجزء | المنفذ | السكربت | الوصف |
|---|---|---|---|---|
| 1 | **Backend** | 8080 | `scripts/replit-backend.sh` | Go API — قلب المنصة |
| 2 | **Customer** | 3000 | `scripts/replit-app.sh customer 3000` | تطبيق العميل |
| 3 | **Driver** | 3001 | `scripts/replit-app.sh driver 3001` | تطبيق المندوب |
| 4 | **Admin** | 3002 | `scripts/replit-app.sh admin 3002` | لوحة الإدارة |
| 5 | **Support** | 3003 | `scripts/replit-app.sh support 3003` | تطبيق الدعم |
| 6 | **Merchant** | 3004 | `scripts/replit-app.sh merchant 3004` | تطبيق التاجر |

---

## 📋 خطوات النشر (لكل Replit)

### الخطوة 1: إنشاء Replit من GitHub
1. روح على [replit.com](https://replit.com)
2. اضغط **Create Repl** → **Import from GitHub**
3. اختر الـ repo: `zyyaat/AVEX`
4. اضغط **Import**

### الخطوة 2: تعديل ملف `.replit` حسب التطبيق
افتح ملف `.replit` في الـ Replit وغيّر سطر `run`:

#### Backend Replit:
```toml
run = "bash scripts/replit-backend.sh"
[[ports]]
localPort = 8080
externalPort = 80
```

#### Customer / Driver / Admin / Support / Merchant Replit:
```toml
run = "bash scripts/replit-app.sh customer 3000"  # غيّر الاسم والمنفذ
[[ports]]
localPort = 3000  # نفس المنفذ
externalPort = 80
```

### الخطوة 3: تشغيل
اضغط زر **Run** — السكربت هيقوم بـ:
1. تثبيت الـ dependencies
2. بناء التطبيق
3. تشغيله على المنفذ المحدد

---

## 🔗 ربط التطبيقات ببعضها

كل تطبيق Next.js بيستخدم **proxy route** على `/api/*` بيوصل للـ backend.

في ملف `apps/<app>/src/app/api/[...path]/route.ts`:
```typescript
const API_BASE = 'http://localhost:8080'
```

**للإنتاج على Replit**: غيّر `API_BASE` لرابط الـ Backend Replit:
```typescript
const API_BASE = process.env.BACKEND_URL || 'http://localhost:8080'
```

في كل Replit (عدا الـ Backend)، أضف Secret:
- `BACKEND_URL` = `https://<backend-replit-name>.<your-username>.repl.co`

---

## 🔑 الحسابات التجريبية (بعد الـ seed)

| التطبيق | الهاتف | كلمة المرور |
|---|---|---|
| Admin | 01000000000 | admin123 |
| Driver | 01100000001 / 002 | 123456 |
| Merchant | 01200000001 إلى 005 | 123456 |
| Support | 01500000001 / 002 | 123456 |
| Customer | أي رقم | (سجّل بنفسك) |

---

## 🗄️ قاعدة البيانات

- **التطوير**: SQLite في `backend/avex.db` (يُنشأ تلقائياً + seed)
- **الإنتاج**: يُنصح بـ PostgreSQL — غيّر `DB_PATH` وعدّل `internal/shared/db.go`

---

## 🛠️ البنية المعمارية

```
backend/
├── cmd/server/main.go              ← نقطة الدخول
└── internal/
    ├── shared/                     ← DB, JWT, middlewares, helpers
    ├── dispatch/                   ← خوارزميات التوزيع والتسعير
    ├── customer/                   ← 13 مسار
    ├── driver/                     ← 21 مسار
    ├── merchant/                   ← 14 مسار
    ├── support/                    ← 12 مسار
    └── admin/                      ← 35+ مسار

apps/
├── customer/   (Next.js, port 3000)
├── driver/     (Next.js, port 3001)
├── admin/      (Next.js, port 3002)
├── support/    (Next.js, port 3003)
└── merchant/   (Next.js, port 3004)
```

---

## ❓ استكشاف الأخطاء

**Go not found على Replit**: تأكد إن `replit.nix` فيه `pkgs.go`.

**Build fails**: شغّل `cd backend && go build ./cmd/server` يدوياً وشوف الخطأ.

**App can't reach backend**: تأكد إن `BACKEND_URL` Secret مظبوط في Replit.

**Port conflicts**: كل Replit لازم يستخدم منفذ مختلف. الـ default لكل تطبيق مذكور فوق.

---

## 📦 التحديث من GitHub

في أي Replit:
```bash
git pull origin main
```
ثم اضغط **Run** تاني.
