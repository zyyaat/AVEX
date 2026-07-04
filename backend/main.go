package main

import (
        "context"
        "database/sql"
        "encoding/json"
        "fmt"
        "log"
        "net/http"
        "os"
        "regexp"
        "strconv"
        "strings"
        "time"

        _ "modernc.org/sqlite"
        "github.com/golang-jwt/jwt/v5"
        "github.com/google/uuid"
        "github.com/rs/cors"
        "golang.org/x/crypto/bcrypt"
)

func contextWithUser(r *http.Request, c *Claims) context.Context {
        return context.WithValue(r.Context(), "user", c)
}

var DB *sql.DB

// ===== MODELS =====
type Claims struct {
        UserID string `json:"user_id"`
        Phone  string `json:"phone"`
        Name   string `json:"name"`
        Admin  bool   `json:"admin"`
        jwt.RegisteredClaims
}

// ===== AUTH =====
func HashPassword(p string) (string, error) { b, e := bcrypt.GenerateFromPassword([]byte(p), bcrypt.DefaultCost); return string(b), e }
func CheckPassword(p, h string) bool { return bcrypt.CompareHashAndPassword([]byte(h), []byte(p)) == nil }
func GenerateJWT(uid, phone, name string, admin bool) (string, error) {
        secret := os.Getenv("JWT_SECRET"); if secret == "" { secret = "avex-secret-key" }
        claims := &Claims{UserID: uid, Phone: phone, Name: name, Admin: admin, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(7*24*time.Hour)), IssuedAt: jwt.NewNumericDate(time.Now())}}
        return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}
func VerifyJWT(ts string) (*Claims, error) {
        secret := os.Getenv("JWT_SECRET"); if secret == "" { secret = "avex-secret-key" }
        claims := &Claims{}
        _, err := jwt.ParseWithClaims(ts, claims, func(t *jwt.Token) (interface{}, error) { return []byte(secret), nil })
        return claims, err
}

func cleanPhone(p string) string {
        v := regexp.MustCompile(`[^\d+]`).ReplaceAllString(p, "")
        if strings.HasPrefix(v, "+20") {
                return "0" + v[3:]
        }
        if len(v) == 13 && strings.HasPrefix(v, "20") && v[2] == '1' {
                return "0" + v[2:]
        }
        if strings.HasPrefix(v, "+") {
                v = strings.ReplaceAll(v, "+", "")
        }
        return regexp.MustCompile(`[^0-9]`).ReplaceAllString(v, "")
}
func validPhone(p string) bool { matched, _ := regexp.MatchString(`^01[0125][0-9]{8}$`, p); return matched }

// ===== HELPERS =====
func writeJSON(w http.ResponseWriter, s int, d interface{}) { w.Header().Set("Content-Type", "application/json"); w.WriteHeader(s); json.NewEncoder(w).Encode(d) }
func writeErr(w http.ResponseWriter, s int, m string) { writeJSON(w, s, map[string]string{"error": m}) }

func GetUser(r *http.Request) *Claims {
        if c, ok := r.Context().Value("user").(*Claims); ok { return c }
        return nil
}

// ===== MIDDLEWARE =====
func AuthMW(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                ah := r.Header.Get("Authorization")
                if ah == "" { writeErr(w, 401, "غير مصرح"); return }
                parts := strings.Split(ah, " ")
                if len(parts) != 2 || parts[0] != "Bearer" { writeErr(w, 401, "صيغة خاطئة"); return }
                c, err := VerifyJWT(parts[1])
                if err != nil { writeErr(w, 401, "رمز غير صالح"); return }
                ctx := contextWithUser(r, c)
                next.ServeHTTP(w, r.WithContext(ctx))
        })
}

func OptionalAuthMW(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                ah := r.Header.Get("Authorization")
                if ah != "" {
                        parts := strings.Split(ah, " ")
                        if len(parts) == 2 && parts[0] == "Bearer" {
                                if c, err := VerifyJWT(parts[1]); err == nil { r = r.WithContext(contextWithUser(r, c)) }
                        }
                }
                next.ServeHTTP(w, r)
        })
}

func AdminMW(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                c := GetUser(r)
                if c == nil || !c.Admin { writeErr(w, 403, "غير مصرح - مطلوب مسؤول"); return }
                next.ServeHTTP(w, r)
        })
}

// ===== INIT DB =====
func InitDB() error {
        dbPath := os.Getenv("DB_PATH"); if dbPath == "" { dbPath = "./avex.db" }
        dsn := dbPath + "?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)"
        var err error
        DB, err = sql.Open("sqlite", dsn)
        if err != nil { return err }
        DB.SetMaxOpenConns(25)
        if err = DB.Ping(); err != nil { return err }

        schema := `
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name VARCHAR(255), phone VARCHAR(20) UNIQUE, email VARCHAR(255), password_hash VARCHAR(255), loyalty_points INTEGER DEFAULT 0, is_admin BOOLEAN DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS addresses (id TEXT PRIMARY KEY, user_id TEXT, label VARCHAR(100), lat REAL, lng REAL, location_url TEXT, address_text TEXT, is_default BOOLEAN DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS favorites (id TEXT PRIMARY KEY, user_id TEXT, menu_item_id TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, menu_item_id));
        CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name VARCHAR(255), name_ar VARCHAR(255), icon VARCHAR(50) DEFAULT '🍽️', image_url TEXT, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS menu_items (id TEXT PRIMARY KEY, name VARCHAR(255), name_ar VARCHAR(255), description TEXT, description_ar TEXT, price REAL, image VARCHAR(50) DEFAULT '🍽️', image_url TEXT, is_popular BOOLEAN DEFAULT 0, is_available BOOLEAN DEFAULT 1, rating REAL DEFAULT 4.5, rating_count INTEGER DEFAULT 0, prep_time INTEGER DEFAULT 15, calories INTEGER DEFAULT 0, category_id TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, order_number VARCHAR(50) UNIQUE, user_id TEXT, customer_name VARCHAR(255), phone VARCHAR(20), location_lat REAL, location_lng REAL, location_url TEXT, location_address TEXT, subtotal REAL, delivery_fee REAL, discount REAL DEFAULT 0, coupon_code VARCHAR(50), total REAL, payment_method VARCHAR(20) DEFAULT 'cash', status VARCHAR(30) DEFAULT 'new', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS order_items (id TEXT PRIMARY KEY, order_id TEXT, menu_item_id TEXT, name VARCHAR(255), price REAL, quantity INTEGER);
        CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code VARCHAR(50) UNIQUE, description TEXT, description_ar TEXT, type VARCHAR(20) DEFAULT 'percentage', value REAL, min_order REAL DEFAULT 0, max_discount REAL, is_active BOOLEAN DEFAULT 1, usage_limit INTEGER, used_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS settings (key VARCHAR(100) PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS saved_cards (id TEXT PRIMARY KEY, user_id TEXT, paymob_token TEXT, brand VARCHAR(16), last4 CHAR(4), exp_month INTEGER, exp_year INTEGER, cardholder_name VARCHAR(128), is_default BOOLEAN DEFAULT 0, is_active BOOLEAN DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS payment_transactions (id TEXT PRIMARY KEY, order_id TEXT, paymob_txn_id BIGINT, amount_cents INTEGER, status VARCHAR(32) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        `
        _, err = DB.Exec(schema)
        if err != nil { return err }

        // Default settings
        settings := map[string]string{"free_shipping_threshold": "30", "delivery_fee": "3.99", "restaurant_name": "AVEX", "restaurant_name_ar": "أفكس", "restaurant_phone": "+201005551234", "restaurant_address": "القاهرة، مصر", "restaurant_hours": "يومياً 10ص - 12م"}
        for k, v := range settings { DB.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", k, v) }

        return nil
}

// ===== SEED =====
func Seed() {
        var count int
        DB.QueryRow("SELECT COUNT(*) FROM categories").Scan(&count)
        if count > 0 { return }
        log.Println("🌱 Seeding data...")

        // Admin
        adminPass, _ := HashPassword("admin123")
        DB.Exec("INSERT INTO users (id, name, phone, password_hash, is_admin) VALUES (?, ?, ?, ?, 1)", "admin-001", "مدير AVEX", "01000000000", adminPass)

        // Categories
        cats := []struct{ id, name, nameAr, icon string }{
                {"cat-Burgers", "Burgers", "برغر", "🍔"}, {"cat-Pizza", "Pizza", "بيتزا", "🍕"},
                {"cat-Sides", "Sides", "مقبلات", "🍟"}, {"cat-Drinks", "Drinks", "مشروبات", "🥤"},
                {"cat-Desserts", "Desserts", "حلويات", "🍰"},
        }
        for _, c := range cats {
                DB.Exec("INSERT INTO categories (id, name, name_ar, icon, sort_order) VALUES (?, ?, ?, ?, ?)", c.id, c.name, c.nameAr, c.icon, len(cats))
        }

        // Menu items
        items := []struct{ name, nameAr, desc, descAr string; price float64; img string; popular bool; rating float64; rc, pt, cal int; cat string }{
                {"Classic Burger", "برغر كلاسيكي", "Juicy beef patty", "قطعة لحم بقري طازجة", 12.99, "https://sfile.chatglm.cn/images-ppt/1d832f630b65.jpg", true, 4.8, 324, 15, 650, "cat-Burgers"},
                {"Double Cheese Burger", "دبل تشيز برغر", "Two beef patties", "قطعتان من اللحم البقري", 16.99, "https://sfile.chatglm.cn/images-ppt/2f96fe27d3e9.jpg", true, 4.9, 412, 18, 890, "cat-Burgers"},
                {"Spicy Chicken Burger", "برغر الدجاج الحار", "Crispy chicken", "فيليه دجاج مقرمش", 13.49, "https://sfile.chatglm.cn/images-ppt/399af1a4b512.jpg", false, 4.7, 198, 16, 720, "cat-Burgers"},
                {"Mushroom Swiss Burger", "برغر المشروم", "Beef with mushrooms", "لحم بقري مع مشروم", 14.99, "https://sfile.chatglm.cn/images-ppt/0ce2d82a15ec.jpg", false, 4.6, 156, 17, 700, "cat-Burgers"},
                {"Margherita", "بيتزا مارغريتا", "Fresh mozzarella", "موزاريلا طازجة", 15.99, "https://sfile.chatglm.cn/images-ppt/893e366ad435.jpg", true, 4.7, 287, 20, 850, "cat-Pizza"},
                {"Pepperoni", "بيتزا بيبروني", "Loaded pepperoni", "شرائح بيبروني", 17.99, "https://sfile.chatglm.cn/images-ppt/0efa7148f85a.jpg", true, 4.8, 356, 22, 980, "cat-Pizza"},
                {"BBQ Chicken Pizza", "بيتزا دجاج باربيكيو", "Grilled chicken", "دجاج مشوي", 18.99, "https://sfile.chatglm.cn/images-ppt/b1128c2d7ab8.jpeg", false, 4.6, 178, 22, 920, "cat-Pizza"},
                {"Veggie Supreme", "بيتزا خضار", "Bell peppers", "فلفل ملون", 16.49, "https://sfile.chatglm.cn/images-ppt/f28d88f6a90b.png", false, 4.5, 134, 20, 780, "cat-Pizza"},
                {"French Fries", "بطاطس مقلية", "Crispy golden fries", "بطاطس مقرمشة", 4.99, "https://sfile.chatglm.cn/images-ppt/ea35bc731d9e.jpg", true, 4.7, 445, 8, 365, "cat-Sides"},
                {"Onion Rings", "حلقات البصل", "Crispy onion rings", "حلقات بصل", 5.49, "https://sfile.chatglm.cn/images-ppt/9aaff81824b7.jpg", false, 4.5, 167, 10, 410, "cat-Sides"},
                {"Chicken Wings", "أجنحة دجاج", "Spicy buffalo wings", "أجنحة بافالو", 9.99, "https://sfile.chatglm.cn/images-ppt/ccce3e544078.jpg", true, 4.8, 289, 15, 580, "cat-Sides"},
                {"Mozzarella Sticks", "أصابع موزاريلا", "Fried mozzarella", "موزاريلا مقلية", 6.49, "https://sfile.chatglm.cn/images-ppt/51e2a90a8a30.jpg", false, 4.6, 198, 10, 450, "cat-Sides"},
                {"Coca-Cola", "كوكا كولا", "330ml can", "علبة 330مل", 2.49, "https://sfile.chatglm.cn/images-ppt/1310f5bc0748.jpg", false, 4.5, 312, 2, 140, "cat-Drinks"},
                {"Orange Juice", "عصير برتقال", "Fresh squeezed", "عصير طازج", 4.49, "https://sfile.chatglm.cn/images-ppt/f5d00fc46ec1.jpg", true, 4.7, 234, 5, 165, "cat-Drinks"},
                {"Iced Coffee", "قهوة مثلجة", "Cold brew", "كولد برو", 5.49, "https://sfile.chatglm.cn/images-ppt/ec0d8482a2be.jpg", true, 4.8, 278, 5, 220, "cat-Drinks"},
                {"Mineral Water", "مياه معدنية", "500ml", "زجاجة 500مل", 1.49, "https://sfile.chatglm.cn/images-ppt/311a8c72f800.jpg", false, 4.4, 145, 1, 0, "cat-Drinks"},
                {"Chocolate Brownie", "براوني الشوكولاتة", "Warm brownie", "براوني دافئ", 6.99, "https://sfile.chatglm.cn/images-ppt/fa9851b1681e.jpg", true, 4.9, 367, 8, 520, "cat-Desserts"},
                {"Cheesecake", "تشيز كيك", "Creamy cheesecake", "تشيز كيك", 7.49, "https://sfile.chatglm.cn/images-ppt/0f3319609656.jpg", false, 4.8, 245, 5, 480, "cat-Desserts"},
                {"Milkshake", "ميلك شيك", "Vanilla milkshake", "ميلك شيك", 5.99, "https://sfile.chatglm.cn/images-ppt/ab6e313a4e50.jpg", false, 4.7, 189, 5, 380, "cat-Desserts"},
                {"Apple Pie", "فطيرة تفاح", "Warm apple pie", "فطيرة تفاح", 5.49, "https://sfile.chatglm.cn/images-ppt/04230212dbc8.jpg", false, 4.6, 156, 6, 410, "cat-Desserts"},
        }
        for i, it := range items {
                id := fmt.Sprintf("item-%d", i+1)
                DB.Exec("INSERT INTO menu_items (id, name, name_ar, description, description_ar, price, image, image_url, is_popular, is_available, rating, rating_count, prep_time, calories, category_id) VALUES (?, ?, ?, ?, ?, ?, '🍽️', ?, ?, 1, ?, ?, ?, ?, ?)", id, it.name, it.nameAr, it.desc, it.descAr, it.price, it.img, it.popular, it.rating, it.rc, it.pt, it.cal, it.cat)
        }

        // Coupons
        coupons := []struct{ code, descAr, typ string; val, min, max float64 }{
                {"AVEX30", "خصم 30% على أول طلب", "percentage", 30, 10, 30},
                {"FREEDEL", "توصيل مجاني فوق 15 ج.م", "fixed", 3.99, 15, 0},
                {"FAMILY99", "خصم 5 ج.م على الوجبات العائلية", "fixed", 5, 30, 0},
                {"LUNCH15", "خصم 15% في ساعة الغداء", "percentage", 15, 10, 10},
        }
        for i, c := range coupons {
                id := fmt.Sprintf("coupon-%d", i+1)
                var maxD interface{}; if c.max > 0 { maxD = c.max }
                DB.Exec("INSERT INTO coupons (id, code, description_ar, type, value, min_order, max_discount, is_active, used_count) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)", id, c.code, c.descAr, c.typ, c.val, c.min, maxD)
        }
        log.Println("✅ Seed done: 5 cats, 20 items, 4 coupons, 1 admin")
}

// ===== HANDLERS =====
func HandleHealth(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]string{"service": "avex-api", "status": "ok"}) }

func HandleRegister(w http.ResponseWriter, r *http.Request) {
        var b struct{ Name, Phone, Password, Email string }
        json.NewDecoder(r.Body).Decode(&b)
        if len(b.Name) < 2 { writeErr(w, 400, "الاسم قصير جداً"); return }
        p := cleanPhone(b.Phone)
        if !validPhone(p) { writeErr(w, 400, "رقم الهاتف يجب أن يكون 11 رقماً مصرياً (010/011/012/015)"); return }
        if len(b.Password) < 6 { writeErr(w, 400, "كلمة المرور 6 أحرف على الأقل"); return }
        var exist string
        if DB.QueryRow("SELECT id FROM users WHERE phone = ?", p).Scan(&exist) == nil { writeErr(w, 409, "رقم الهاتف مسجل"); return }
        hash, _ := HashPassword(b.Password)
        uid := uuid.New().String()
        DB.Exec("INSERT INTO users (id, name, phone, email, password_hash) VALUES (?, ?, ?, ?, ?)", uid, b.Name, p, b.Email, hash)
        token, _ := GenerateJWT(uid, p, b.Name, false)
        writeJSON(w, 201, map[string]interface{}{"token": token, "user": map[string]interface{}{"id": uid, "name": b.Name, "phone": p, "email": b.Email, "loyaltyPoints": 0, "isAdmin": false}})
}

func HandleLogin(w http.ResponseWriter, r *http.Request) {
        var b struct{ Phone, Password string }
        json.NewDecoder(r.Body).Decode(&b)
        p := cleanPhone(b.Phone)
        var uid, name, ph, email sql.NullString
        var hash string
        var lp int
        var admin bool
        var ct time.Time
        err := DB.QueryRow("SELECT id, name, phone, email, password_hash, loyalty_points, is_admin, created_at FROM users WHERE phone = ?", p).Scan(&uid, &name, &ph, &email, &hash, &lp, &admin, &ct)
        if err != nil { writeErr(w, 401, "رقم الهاتف أو كلمة المرور غير صحيحة"); return }
        if !CheckPassword(b.Password, hash) { writeErr(w, 401, "رقم الهاتف أو كلمة المرور غير صحيحة"); return }
        token, _ := GenerateJWT(uid.String, ph.String, name.String, admin)
        writeJSON(w, 200, map[string]interface{}{"token": token, "user": map[string]interface{}{"id": uid.String, "name": name.String, "phone": ph.String, "email": email.String, "loyaltyPoints": lp, "isAdmin": admin, "createdAt": ct.Format(time.RFC3339)}})
}

func HandleMe(w http.ResponseWriter, r *http.Request) {
        c := GetUser(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        var name, ph, email sql.NullString; var lp int; var admin bool; var ct time.Time
        DB.QueryRow("SELECT name, phone, email, loyalty_points, is_admin, created_at FROM users WHERE id = ?", c.UserID).Scan(&name, &ph, &email, &lp, &admin, &ct)
        writeJSON(w, 200, map[string]interface{}{"id": c.UserID, "name": name.String, "phone": ph.String, "email": email.String, "loyaltyPoints": lp, "isAdmin": admin, "createdAt": ct.Format(time.RFC3339)})
}

func HandleMenu(w http.ResponseWriter, r *http.Request) {
        rows, _ := DB.Query("SELECT id, name, name_ar, icon, image_url, sort_order FROM categories ORDER BY sort_order ASC")
        var cats []map[string]interface{}
        for rows.Next() {
                var id, name, nameAr, icon string; var imgURL sql.NullString; var so int
                rows.Scan(&id, &name, &nameAr, &icon, &imgURL, &so)
                cat := map[string]interface{}{"id": id, "name": name, "nameAr": nameAr, "icon": icon, "imageUrl": nil, "order": so, "items": []map[string]interface{}{}}
                if imgURL.Valid { cat["imageUrl"] = imgURL.String }
                itemRows, _ := DB.Query("SELECT id, name, name_ar, description, description_ar, price, image, image_url, is_popular, is_available, rating, rating_count, prep_time, calories FROM menu_items WHERE category_id = ? AND is_available = 1 ORDER BY price ASC", id)
                for itemRows.Next() {
                        var m map[string]interface{} = make(map[string]interface{})
                        var mid, mn, mna, md, mda, mi string; var mp float64; var miu sql.NullString; var mp2, ma bool; var mr float64; var mrc, mpt, mcal int
                        itemRows.Scan(&mid, &mn, &mna, &md, &mda, &mp, &mi, &miu, &mp2, &ma, &mr, &mrc, &mpt, &mcal)
                        m = map[string]interface{}{"id": mid, "name": mn, "nameAr": mna, "description": md, "descriptionAr": mda, "price": mp, "image": mi, "imageUrl": nil, "isPopular": mp2, "isAvailable": ma, "rating": mr, "ratingCount": mrc, "prepTime": mpt, "calories": mcal}
                        if miu.Valid { m["imageUrl"] = miu.String }
                        cat["items"] = append(cat["items"].([]map[string]interface{}), m)
                }
                itemRows.Close()
                cats = append(cats, cat)
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"categories": cats})
}

func HandleSettings(w http.ResponseWriter, r *http.Request) {
        rows, _ := DB.Query("SELECT key, value FROM settings")
        s := map[string]string{}
        for rows.Next() { var k, v string; rows.Scan(&k, &v); s[k] = v }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"settings": s})
}

func HandleValidateCoupon(w http.ResponseWriter, r *http.Request) {
        var b struct{ Code string; Subtotal float64 }
        json.NewDecoder(r.Body).Decode(&b)
        var typ string; var val, min float64; var maxD sql.NullFloat64; var active bool; var ul sql.NullInt64; var uc int; var descAr string
        err := DB.QueryRow("SELECT type, value, min_order, max_discount, is_active, usage_limit, used_count, description_ar FROM coupons WHERE code = ? AND is_active = 1", b.Code).Scan(&typ, &val, &min, &maxD, &active, &ul, &uc, &descAr)
        if err != nil { writeErr(w, 404, "كوبون غير صالح"); return }
        if ul.Valid && int64(uc) >= ul.Int64 { writeErr(w, 400, "تم استخدام الكوبون للحد الأقصى"); return }
        if b.Subtotal < min { writeErr(w, 400, "الحد الأدنى "+strconv.FormatFloat(min, 'f', 2, 64)+" ج.م"); return }
        var disc float64
        if typ == "percentage" { disc = b.Subtotal * val / 100; if maxD.Valid && disc > maxD.Float64 { disc = maxD.Float64 } } else { disc = val; if disc > b.Subtotal { disc = b.Subtotal } }
        writeJSON(w, 200, map[string]interface{}{"valid": true, "code": b.Code, "discount": disc, "descriptionAr": descAr})
}

func HandleCreateOrder(w http.ResponseWriter, r *http.Request) {
        var b struct{ CustomerName, Phone, PaymentMethod string; LocationLat, LocationLng float64; LocationAddress, CouponCode string; Items []struct{ MenuItemID string; Quantity int } }
        json.NewDecoder(r.Body).Decode(&b)
        if b.CustomerName == "" || b.Phone == "" || len(b.Items) == 0 { writeErr(w, 400, "بيانات ناقصة"); return }
        p := cleanPhone(b.Phone)
        if !validPhone(p) { writeErr(w, 400, "رقم الهاتف يجب أن يكون 11 رقماً مصرياً (010/011/012/015)"); return }
        if b.LocationLat == 0 || b.LocationLng == 0 { writeErr(w, 400, "الموقع مطلوب"); return }
        var sub float64
        type itemData struct{ id, nameAr string; price float64; qty int }
        var items []itemData
        for _, it := range b.Items {
                var id, na string; var pr float64
                if DB.QueryRow("SELECT id, name_ar, price FROM menu_items WHERE id = ?", it.MenuItemID).Scan(&id, &na, &pr) == nil {
                        items = append(items, itemData{id, na, pr, it.Quantity}); sub += pr * float64(it.Quantity)
                }
        }
        if sub == 0 { writeErr(w, 400, "لا توجد عناصر صالحة"); return }
        var thr, dfStr string
        DB.QueryRow("SELECT value FROM settings WHERE key = 'free_shipping_threshold'").Scan(&thr)
        DB.QueryRow("SELECT value FROM settings WHERE key = 'delivery_fee'").Scan(&dfStr)
        threshold, _ := strconv.ParseFloat(thr, 64); delFee, _ := strconv.ParseFloat(dfStr, 64)
        if delFee == 0 { delFee = 3.99 }
        if sub >= threshold { delFee = 0 }
        var disc float64; var couponCode string
        if b.CouponCode != "" {
                var typ string; var val, min float64; var maxD sql.NullFloat64; var ul sql.NullInt64; var uc int; var cid string
                if DB.QueryRow("SELECT id, type, value, min_order, max_discount, usage_limit, used_count FROM coupons WHERE code = ? AND is_active = 1", b.CouponCode).Scan(&cid, &typ, &val, &min, &maxD, &ul, &uc) == nil {
                        if sub >= min {
                                if typ == "percentage" { disc = sub * val / 100; if maxD.Valid && disc > maxD.Float64 { disc = maxD.Float64 } } else { disc = val; if disc > sub { disc = sub } }
                                couponCode = b.CouponCode
                                DB.Exec("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", cid)
                        }
                }
        }
        total := sub + delFee - disc; if total < 0 { total = 0 }
        oid := uuid.New().String()
        onum := fmt.Sprintf("AV%d%03d", time.Now().Unix()%1000000, time.Now().Nanosecond()%1000)
        var uid interface{}
        if c := GetUser(r); c != nil { uid = c.UserID }
        locURL := fmt.Sprintf("https://www.google.com/maps?q=%f,%f", b.LocationLat, b.LocationLng)
        DB.Exec("INSERT INTO orders (id, order_number, user_id, customer_name, phone, location_lat, location_lng, location_url, location_address, subtotal, delivery_fee, discount, coupon_code, total, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')", oid, onum, uid, b.CustomerName, p, b.LocationLat, b.LocationLng, locURL, b.LocationAddress, sub, delFee, disc, couponCode, total, b.PaymentMethod)
        for _, it := range items { DB.Exec("INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?, ?)", uuid.New().String(), oid, it.id, it.nameAr, it.price, it.qty) }
        if c := GetUser(r); c != nil { pts := int(total / 10); if pts > 0 { DB.Exec("UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?", pts, c.UserID) } }
        writeJSON(w, 201, map[string]interface{}{"order": map[string]interface{}{"id": oid, "orderNumber": onum, "status": "new", "total": total}})
}

func HandleGetOrders(w http.ResponseWriter, r *http.Request) {
        c := GetUser(r)
        if c == nil { writeErr(w, 403, "غير مصرح"); return }
        q := "SELECT id, order_number, customer_name, phone, location_lat, location_lng, location_url, location_address, subtotal, delivery_fee, discount, coupon_code, total, payment_method, status, created_at FROM orders"
        args := []interface{}{}
        if !c.Admin { q += " WHERE user_id = ?"; args = append(args, c.UserID) }
        q += " ORDER BY created_at DESC LIMIT 100"
        rows, _ := DB.Query(q, args...)
        var orders []map[string]interface{}
        for rows.Next() {
                var id, on, cn, ph, pm, st string; var ll, lln sql.NullFloat64; var lu, la, cc sql.NullString; var sub, df, dc, tot float64; var ct time.Time
                rows.Scan(&id, &on, &cn, &ph, &ll, &lln, &lu, &la, &sub, &df, &dc, &cc, &tot, &pm, &st, &ct)
                o := map[string]interface{}{"id": id, "orderNumber": on, "customerName": cn, "phone": ph, "locationLat": ll.Float64, "locationLng": lln.Float64, "locationUrl": lu.String, "locationAddress": la.String, "subtotal": sub, "deliveryFee": df, "discount": dc, "couponCode": cc.String, "total": tot, "paymentMethod": pm, "status": st, "createdAt": ct.Format(time.RFC3339), "items": []map[string]interface{}{}}
                itemRows, _ := DB.Query("SELECT id, name, price, quantity FROM order_items WHERE order_id = ?", id)
                for itemRows.Next() {
                        var iid, in string; var ip float64; var iq int
                        itemRows.Scan(&iid, &in, &ip, &iq)
                        o["items"] = append(o["items"].([]map[string]interface{}), map[string]interface{}{"id": iid, "name": in, "price": ip, "quantity": iq})
                }
                itemRows.Close()
                orders = append(orders, o)
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"orders": orders})
}

func HandleTrackOrder(w http.ResponseWriter, r *http.Request) {
        on := r.URL.Query().Get("number")
        if on == "" { writeErr(w, 400, "رقم الطلب مطلوب"); return }
        var id, cn, ph, pm, st string; var ll, lln sql.NullFloat64; var lu, la, cc sql.NullString; var sub, df, dc, tot float64; var ct time.Time
        err := DB.QueryRow("SELECT id, order_number, customer_name, phone, location_lat, location_lng, location_url, location_address, subtotal, delivery_fee, discount, coupon_code, total, payment_method, status, created_at FROM orders WHERE order_number = ?", on).Scan(&id, &on, &cn, &ph, &ll, &lln, &lu, &la, &sub, &df, &dc, &cc, &tot, &pm, &st, &ct)
        if err != nil { writeErr(w, 404, "الطلب غير موجود"); return }
        var items []map[string]interface{}
        itemRows, _ := DB.Query("SELECT id, name, price, quantity FROM order_items WHERE order_id = ?", id)
        for itemRows.Next() { var iid, in string; var ip float64; var iq int; itemRows.Scan(&iid, &in, &ip, &iq); items = append(items, map[string]interface{}{"id": iid, "name": in, "price": ip, "quantity": iq}) }
        itemRows.Close()
        writeJSON(w, 200, map[string]interface{}{"order": map[string]interface{}{"id": id, "orderNumber": on, "customerName": cn, "phone": ph, "locationLat": ll.Float64, "locationLng": lln.Float64, "locationUrl": lu.String, "locationAddress": la.String, "subtotal": sub, "deliveryFee": df, "discount": dc, "couponCode": cc.String, "total": tot, "paymentMethod": pm, "status": st, "createdAt": ct.Format(time.RFC3339), "items": items}})
}

func HandleUpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        var b struct{ Status string }
        json.NewDecoder(r.Body).Decode(&b)
        valid := map[string]bool{"new": true, "accepted": true, "preparing": true, "ready": true, "picked_up": true, "delivering": true, "delivered": true, "cancelled": true, "rejected": true}
        if !valid[b.Status] { writeErr(w, 400, "حالة غير صالحة"); return }
        DB.Exec("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", b.Status, id)
        writeJSON(w, 200, map[string]interface{}{"success": true, "status": b.Status})
}

func HandleGetAddresses(w http.ResponseWriter, r *http.Request) {
        c := GetUser(r); if c == nil { writeErr(w, 401, "غير مصرح"); return }
        rows, _ := DB.Query("SELECT id, label, lat, lng, location_url, address_text, is_default FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC", c.UserID)
        var addrs []map[string]interface{}
        for rows.Next() {
                var id, label string; var lat, lng sql.NullFloat64; var lu, at sql.NullString; var def bool
                rows.Scan(&id, &label, &lat, &lng, &lu, &at, &def)
                addrs = append(addrs, map[string]interface{}{"id": id, "label": label, "lat": lat.Float64, "lng": lng.Float64, "locationUrl": lu.String, "addressText": at.String, "isDefault": def})
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"addresses": addrs})
}

func HandleSaveAddress(w http.ResponseWriter, r *http.Request) {
        c := GetUser(r); if c == nil { writeErr(w, 401, "غير مصرح"); return }
        var b struct{ Label, LocationURL, AddressText string; Lat, Lng float64; IsDefault bool }
        json.NewDecoder(r.Body).Decode(&b)
        if b.Label == "" { writeErr(w, 400, "الاسم مطلوب"); return }
        id := uuid.New().String()
        DB.Exec("INSERT INTO addresses (id, user_id, label, lat, lng, location_url, address_text, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", id, c.UserID, b.Label, b.Lat, b.Lng, b.LocationURL, b.AddressText, b.IsDefault)
        writeJSON(w, 201, map[string]interface{}{"id": id})
}

func HandleDeleteAddress(w http.ResponseWriter, r *http.Request) {
        c := GetUser(r); if c == nil { writeErr(w, 401, "غير مصرح"); return }
        DB.Exec("DELETE FROM addresses WHERE id = ? AND user_id = ?", r.PathValue("id"), c.UserID)
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

func HandleGetCards(w http.ResponseWriter, r *http.Request) {
        c := GetUser(r); if c == nil { writeErr(w, 401, "غير مصرح"); return }
        rows, _ := DB.Query("SELECT id, brand, last4, exp_month, exp_year, cardholder_name, is_default FROM saved_cards WHERE user_id = ? AND is_active = 1 ORDER BY is_default DESC, created_at DESC", c.UserID)
        var cards []map[string]interface{}
        for rows.Next() {
                var id, brand, last4 string; var em, ey int; var cn sql.NullString; var def bool
                rows.Scan(&id, &brand, &last4, &em, &ey, &cn, &def)
                cards = append(cards, map[string]interface{}{"id": id, "brand": brand, "last4": last4, "expMonth": em, "expYear": ey, "cardholderName": cn.String, "isDefault": def})
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"cards": cards})
}

func HandleSaveCard(w http.ResponseWriter, r *http.Request) {
        c := GetUser(r); if c == nil { writeErr(w, 401, "غير مصرح"); return }
        var b struct{ PaymobToken, Brand, Last4, CardholderName string; ExpMonth, ExpYear int; IsDefault bool }
        json.NewDecoder(r.Body).Decode(&b)
        if b.PaymobToken == "" || b.Last4 == "" { writeErr(w, 400, "بيانات البطاقة ناقصة"); return }
        if b.IsDefault { DB.Exec("UPDATE saved_cards SET is_default = 0 WHERE user_id = ?", c.UserID) }
        id := uuid.New().String()
        DB.Exec("INSERT INTO saved_cards (id, user_id, paymob_token, brand, last4, exp_month, exp_year, cardholder_name, is_default, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)", id, c.UserID, b.PaymobToken, b.Brand, b.Last4, b.ExpMonth, b.ExpYear, b.CardholderName, b.IsDefault)
        writeJSON(w, 201, map[string]interface{}{"id": id})
}

func HandleDeleteCard(w http.ResponseWriter, r *http.Request) {
        c := GetUser(r); if c == nil { writeErr(w, 401, "غير مصرح"); return }
        DB.Exec("UPDATE saved_cards SET is_active = 0 WHERE id = ? AND user_id = ?", r.PathValue("id"), c.UserID)
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

func HandleSetDefaultCard(w http.ResponseWriter, r *http.Request) {
        c := GetUser(r); if c == nil { writeErr(w, 401, "غير مصرح"); return }
        DB.Exec("UPDATE saved_cards SET is_default = 0 WHERE user_id = ?", c.UserID)
        DB.Exec("UPDATE saved_cards SET is_default = 1 WHERE id = ? AND user_id = ?", r.PathValue("id"), c.UserID)
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

// Admin handlers
func HandleAdminGetCategories(w http.ResponseWriter, r *http.Request) {
        rows, _ := DB.Query("SELECT id, name, name_ar, icon, image_url, sort_order FROM categories ORDER BY sort_order ASC")
        var cats []map[string]interface{}
        for rows.Next() {
                var id, name, nameAr, icon string; var imgURL sql.NullString; var so int
                rows.Scan(&id, &name, &nameAr, &icon, &imgURL, &so)
                cats = append(cats, map[string]interface{}{"id": id, "name": name, "nameAr": nameAr, "icon": icon, "imageUrl": imgURL.String, "order": so})
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"categories": cats})
}

func HandleAdminCreateCategory(w http.ResponseWriter, r *http.Request) {
        var b struct{ Name, NameAr, Icon string; Order int }
        json.NewDecoder(r.Body).Decode(&b)
        if b.Name == "" || b.NameAr == "" { writeErr(w, 400, "الاسم مطلوب"); return }
        if b.Icon == "" { b.Icon = "🍽️" }
        id := uuid.New().String()
        DB.Exec("INSERT INTO categories (id, name, name_ar, icon, sort_order) VALUES (?, ?, ?, ?, ?)", id, b.Name, b.NameAr, b.Icon, b.Order)
        writeJSON(w, 201, map[string]interface{}{"id": id})
}

func HandleAdminGetMenuItems(w http.ResponseWriter, r *http.Request) {
        rows, _ := DB.Query("SELECT m.id, m.name, m.name_ar, m.description, m.description_ar, m.price, m.image, m.image_url, m.is_popular, m.is_available, m.rating, m.rating_count, m.prep_time, m.calories, m.category_id, c.name_ar, c.icon FROM menu_items m LEFT JOIN categories c ON m.category_id = c.id ORDER BY m.category_id, m.price")
        var items []map[string]interface{}
        for rows.Next() {
                var id, name, nameAr, desc, descAr, image, catID string; var price, rating float64; var imgURL, catName, catIcon sql.NullString; var pop, avail bool; var rc, pt, cal int
                rows.Scan(&id, &name, &nameAr, &desc, &descAr, &price, &image, &imgURL, &pop, &avail, &rating, &rc, &pt, &cal, &catID, &catName, &catIcon)
                items = append(items, map[string]interface{}{"id": id, "name": name, "nameAr": nameAr, "description": desc, "descriptionAr": descAr, "price": price, "image": image, "imageUrl": imgURL.String, "isPopular": pop, "isAvailable": avail, "rating": rating, "ratingCount": rc, "prepTime": pt, "calories": cal, "categoryId": catID, "category": map[string]interface{}{"nameAr": catName.String, "icon": catIcon.String}})
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"items": items})
}

func HandleAdminCreateMenuItem(w http.ResponseWriter, r *http.Request) {
        var b map[string]interface{}
        json.NewDecoder(r.Body).Decode(&b)
        id := uuid.New().String()
        DB.Exec("INSERT INTO menu_items (id, name, name_ar, description, description_ar, price, image, image_url, is_popular, is_available, rating, prep_time, calories, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id, b["name"], b["nameAr"], b["description"], b["descriptionAr"], b["price"], b["image"], b["imageUrl"], b["isPopular"], b["isAvailable"], b["rating"], b["prepTime"], b["calories"], b["categoryId"])
        writeJSON(w, 201, map[string]interface{}{"id": id})
}

func HandleAdminUpdateMenuItem(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        var b map[string]interface{}
        json.NewDecoder(r.Body).Decode(&b)
        fields := map[string]string{"name": "name", "nameAr": "name_ar", "description": "description", "descriptionAr": "description_ar", "price": "price", "image": "image", "imageUrl": "image_url", "isPopular": "is_popular", "isAvailable": "is_available", "rating": "rating", "prepTime": "prep_time", "calories": "calories", "categoryId": "category_id"}
        updates := ""; args := []interface{}{}
        for jk, dk := range fields {
                if v, ok := b[jk]; ok {
                        if updates != "" { updates += ", " }
                        updates += dk + " = ?"; args = append(args, v)
                }
        }
        if updates == "" { writeJSON(w, 200, map[string]interface{}{"success": true}); return }
        args = append(args, id)
        DB.Exec("UPDATE menu_items SET "+updates+" WHERE id = ?", args...)
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

func HandleAdminDeleteMenuItem(w http.ResponseWriter, r *http.Request) {
        DB.Exec("DELETE FROM menu_items WHERE id = ?", r.PathValue("id"))
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

func HandleAdminGetCoupons(w http.ResponseWriter, r *http.Request) {
        rows, _ := DB.Query("SELECT id, code, description_ar, type, value, min_order, max_discount, is_active, usage_limit, used_count FROM coupons ORDER BY created_at DESC")
        var coupons []map[string]interface{}
        for rows.Next() {
                var id, code, descAr, typ string; var val, min float64; var maxD sql.NullFloat64; var active bool; var ul sql.NullInt64; var uc int
                rows.Scan(&id, &code, &descAr, &typ, &val, &min, &maxD, &active, &ul, &uc)
                coupons = append(coupons, map[string]interface{}{"id": id, "code": code, "descriptionAr": descAr, "type": typ, "value": val, "minOrder": min, "maxDiscount": maxD.Float64, "isActive": active, "usageLimit": ul.Int64, "usedCount": uc})
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"coupons": coupons})
}

func HandleAdminCreateCoupon(w http.ResponseWriter, r *http.Request) {
        var b map[string]interface{}
        json.NewDecoder(r.Body).Decode(&b)
        id := uuid.New().String()
        DB.Exec("INSERT INTO coupons (id, code, description_ar, type, value, min_order, max_discount, is_active, used_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)",
                id, b["code"], b["descriptionAr"], b["type"], b["value"], b["minOrder"], b["maxDiscount"], b["isActive"])
        writeJSON(w, 201, map[string]interface{}{"id": id})
}

func HandleAdminDeleteCoupon(w http.ResponseWriter, r *http.Request) {
        DB.Exec("DELETE FROM coupons WHERE id = ?", r.PathValue("id"))
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

func HandleUpdateSetting(w http.ResponseWriter, r *http.Request) {
        var b struct{ Key, Value string }
        json.NewDecoder(r.Body).Decode(&b)
        if b.Key == "" { writeErr(w, 400, "المفتاح مطلوب"); return }
        DB.Exec("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP", b.Key, b.Value)
        writeJSON(w, 200, map[string]interface{}{"success": true, "key": b.Key, "value": b.Value})
}

// ===== MAIN =====
func main() {
        if err := InitDB(); err != nil { log.Fatalf("❌ DB: %v", err) }
        Seed()

        mux := http.NewServeMux()

        // Public
        mux.HandleFunc("GET /api/health", HandleHealth)
        mux.HandleFunc("POST /api/auth/register", HandleRegister)
        mux.HandleFunc("POST /api/auth/login", HandleLogin)
        mux.HandleFunc("GET /api/menu", HandleMenu)
        mux.HandleFunc("GET /api/settings", HandleSettings)
        mux.HandleFunc("POST /api/coupons/validate", HandleValidateCoupon)
        mux.HandleFunc("GET /api/orders/track", HandleTrackOrder)
        mux.Handle("POST /api/orders", OptionalAuthMW(http.HandlerFunc(HandleCreateOrder)))

        // Authenticated
        mux.Handle("GET /api/auth/me", AuthMW(http.HandlerFunc(HandleMe)))
        mux.Handle("GET /api/orders", AuthMW(http.HandlerFunc(HandleGetOrders)))
        mux.Handle("GET /api/addresses", AuthMW(http.HandlerFunc(HandleGetAddresses)))
        mux.Handle("POST /api/addresses", AuthMW(http.HandlerFunc(HandleSaveAddress)))
        mux.Handle("DELETE /api/addresses/{id}", AuthMW(http.HandlerFunc(HandleDeleteAddress)))
        mux.Handle("GET /api/cards", AuthMW(http.HandlerFunc(HandleGetCards)))
        mux.Handle("POST /api/cards", AuthMW(http.HandlerFunc(HandleSaveCard)))
        mux.Handle("DELETE /api/cards/{id}", AuthMW(http.HandlerFunc(HandleDeleteCard)))
        mux.Handle("POST /api/cards/{id}/default", AuthMW(http.HandlerFunc(HandleSetDefaultCard)))

        // Admin
        mux.Handle("GET /api/admin/categories", AuthMW(AdminMW(http.HandlerFunc(HandleAdminGetCategories))))
        mux.Handle("POST /api/admin/categories", AuthMW(AdminMW(http.HandlerFunc(HandleAdminCreateCategory))))
        mux.Handle("GET /api/admin/menu-items", AuthMW(AdminMW(http.HandlerFunc(HandleAdminGetMenuItems))))
        mux.Handle("POST /api/admin/menu-items", AuthMW(AdminMW(http.HandlerFunc(HandleAdminCreateMenuItem))))
        mux.Handle("PATCH /api/admin/menu-items/{id}", AuthMW(AdminMW(http.HandlerFunc(HandleAdminUpdateMenuItem))))
        mux.Handle("DELETE /api/admin/menu-items/{id}", AuthMW(AdminMW(http.HandlerFunc(HandleAdminDeleteMenuItem))))
        mux.Handle("GET /api/admin/coupons", AuthMW(AdminMW(http.HandlerFunc(HandleAdminGetCoupons))))
        mux.Handle("POST /api/admin/coupons", AuthMW(AdminMW(http.HandlerFunc(HandleAdminCreateCoupon))))
        mux.Handle("DELETE /api/admin/coupons/{id}", AuthMW(AdminMW(http.HandlerFunc(HandleAdminDeleteCoupon))))
        mux.Handle("PUT /api/admin/settings", AuthMW(AdminMW(http.HandlerFunc(HandleUpdateSetting))))
        mux.Handle("PATCH /api/orders/{id}", AuthMW(AdminMW(http.HandlerFunc(HandleUpdateOrderStatus))))

        handler := cors.New(cors.Options{AllowedOrigins: []string{"*"}, AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}, AllowedHeaders: []string{"*"}, AllowCredentials: true}).Handler(mux)

        port := os.Getenv("PORT"); if port == "" { port = "8080" }
        log.Printf("🚀 AVEX API on :%s", port)
        log.Fatal(http.ListenAndServe(":"+port, handler))
}
