package main

import (
        "context"
        "database/sql"
        "encoding/json"
        "fmt"
        "log"
        "math"
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
        UserID   string `json:"user_id"`
        Phone    string `json:"phone"`
        Name     string `json:"name"`
        Admin    bool   `json:"admin"`
        IsDriver bool   `json:"is_driver"`
        DriverID string `json:"driver_id,omitempty"`
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
func GenerateDriverJWT(driverID, phone, name string) (string, error) {
        secret := os.Getenv("JWT_SECRET"); if secret == "" { secret = "avex-secret-key" }
        claims := &Claims{UserID: driverID, Phone: phone, Name: name, IsDriver: true, DriverID: driverID, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(30*24*time.Hour)), IssuedAt: jwt.NewNumericDate(time.Now())}}
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

// DriverAuthMW - requires driver JWT
func DriverAuthMW(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                ah := r.Header.Get("Authorization")
                if ah == "" { writeErr(w, 401, "غير مصرح"); return }
                parts := strings.Split(ah, " ")
                if len(parts) != 2 || parts[0] != "Bearer" { writeErr(w, 401, "صيغة خاطئة"); return }
                c, err := VerifyJWT(parts[1])
                if err != nil { writeErr(w, 401, "رمز غير صالح"); return }
                if !c.IsDriver { writeErr(w, 403, "هذا المسار للمندوبين فقط"); return }
                ctx := contextWithUser(r, c)
                next.ServeHTTP(w, r.WithContext(ctx))
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
        CREATE TABLE IF NOT EXISTS restaurants (id TEXT PRIMARY KEY, name VARCHAR(255), name_ar VARCHAR(255), description TEXT, description_ar TEXT, image_url TEXT, cover_url TEXT, rating REAL DEFAULT 4.5, rating_count INTEGER DEFAULT 0, delivery_time_min INTEGER DEFAULT 20, delivery_time_max INTEGER DEFAULT 45, delivery_fee REAL DEFAULT 3.99, min_order REAL DEFAULT 0, is_active BOOLEAN DEFAULT 1, is_pro BOOLEAN DEFAULT 0, cuisines TEXT, lat REAL, lng REAL, zone_id TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name VARCHAR(255), name_ar VARCHAR(255), icon VARCHAR(50) DEFAULT '🍽️', image_url TEXT, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS menu_items (id TEXT PRIMARY KEY, name VARCHAR(255), name_ar VARCHAR(255), description TEXT, description_ar TEXT, price REAL, image VARCHAR(50) DEFAULT '🍽️', image_url TEXT, is_popular BOOLEAN DEFAULT 0, is_available BOOLEAN DEFAULT 1, rating REAL DEFAULT 4.5, rating_count INTEGER DEFAULT 0, prep_time INTEGER DEFAULT 15, calories INTEGER DEFAULT 0, category_id TEXT, restaurant_id TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, order_number VARCHAR(50) UNIQUE, user_id TEXT, restaurant_id TEXT, customer_name VARCHAR(255), phone VARCHAR(20), location_lat REAL, location_lng REAL, location_url TEXT, location_address TEXT, subtotal REAL, delivery_fee REAL, discount REAL DEFAULT 0, tax REAL DEFAULT 0, coupon_code VARCHAR(50), total REAL, payment_method VARCHAR(20) DEFAULT 'cash', status VARCHAR(30) DEFAULT 'new', driver_id TEXT, zone_id TEXT, dispatch_distance_m INTEGER, delivery_distance_m INTEGER, driver_fee REAL DEFAULT 0, platform_margin REAL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS order_items (id TEXT PRIMARY KEY, order_id TEXT, menu_item_id TEXT, name VARCHAR(255), price REAL, quantity INTEGER);
        CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code VARCHAR(50) UNIQUE, description TEXT, description_ar TEXT, type VARCHAR(20) DEFAULT 'percentage', value REAL, min_order REAL DEFAULT 0, max_discount REAL, is_active BOOLEAN DEFAULT 1, usage_limit INTEGER, used_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS settings (key VARCHAR(100) PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS saved_cards (id TEXT PRIMARY KEY, user_id TEXT, paymob_token TEXT, brand VARCHAR(16), last4 CHAR(4), exp_month INTEGER, exp_year INTEGER, cardholder_name VARCHAR(128), is_default BOOLEAN DEFAULT 0, is_active BOOLEAN DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS payment_transactions (id TEXT PRIMARY KEY, order_id TEXT, paymob_txn_id BIGINT, amount_cents INTEGER, status VARCHAR(32) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

        -- ===== Driver / Tier / Zone system =====
        CREATE TABLE IF NOT EXISTS delivery_zones (id TEXT PRIMARY KEY, name VARCHAR(255), name_ar VARCHAR(255), center_lat REAL, center_lng REAL, radius_m INTEGER DEFAULT 3000, is_active BOOLEAN DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS driver_tiers (id TEXT PRIMARY KEY, code VARCHAR(20) UNIQUE, name_ar VARCHAR(255), sort_order INTEGER DEFAULT 0, color VARCHAR(16), is_active BOOLEAN DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS tier_thresholds (id TEXT PRIMARY KEY, tier_id TEXT NOT NULL, min_acceptance_rate REAL DEFAULT 0, min_completion_rate REAL DEFAULT 0, min_customer_rating REAL DEFAULT 0, min_on_time_rate REAL DEFAULT 0, min_shift_adherence REAL DEFAULT 0, min_lifetime_orders INTEGER DEFAULT 0, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (tier_id) REFERENCES driver_tiers(id));
        CREATE TABLE IF NOT EXISTS tier_zone_prices (id TEXT PRIMARY KEY, tier_id TEXT NOT NULL, zone_id TEXT NOT NULL, base_fee REAL DEFAULT 0, per_km_fee REAL DEFAULT 0, min_fee REAL DEFAULT 0, max_fee REAL DEFAULT 0, free_above REAL DEFAULT 0, estimated_minutes INTEGER DEFAULT 30, is_active BOOLEAN DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(tier_id, zone_id), FOREIGN KEY (tier_id) REFERENCES driver_tiers(id), FOREIGN KEY (zone_id) REFERENCES delivery_zones(id));

        CREATE TABLE IF NOT EXISTS driver_applications (id TEXT PRIMARY KEY, name VARCHAR(255) NOT NULL, phone VARCHAR(20) UNIQUE NOT NULL, national_id VARCHAR(50) UNIQUE NOT NULL, license_number VARCHAR(50) NOT NULL, vehicle_type VARCHAR(20) DEFAULT 'motorcycle', vehicle_plate VARCHAR(50), address TEXT, emergency_phone VARCHAR(20), national_id_photo TEXT, license_photo TEXT, vehicle_photo TEXT, status VARCHAR(30) DEFAULT 'pending', rejection_reason TEXT, submitted_by TEXT, submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, reviewed_at TIMESTAMP, reviewed_by TEXT, driver_id TEXT);
        CREATE TABLE IF NOT EXISTS drivers (id TEXT PRIMARY KEY, name VARCHAR(255), phone VARCHAR(20) UNIQUE, password_hash VARCHAR(255), vehicle_type VARCHAR(20) DEFAULT 'motorcycle', license_number VARCHAR(50), national_id VARCHAR(50), tier_id TEXT, tier_evaluated_at TIMESTAMP, is_online BOOLEAN DEFAULT 0, is_active BOOLEAN DEFAULT 1, is_verified BOOLEAN DEFAULT 0, lat REAL, lng REAL, location_updated_at TIMESTAMP, last_seen_at TIMESTAMP, shift_start TIMESTAMP, auto_accept BOOLEAN DEFAULT 0, must_change_password BOOLEAN DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (tier_id) REFERENCES driver_tiers(id));
        CREATE TABLE IF NOT EXISTS driver_stats (driver_id TEXT PRIMARY KEY, total_orders INTEGER DEFAULT 0, accepted_orders INTEGER DEFAULT 0, rejected_orders INTEGER DEFAULT 0, completed_orders INTEGER DEFAULT 0, cancelled_by_support INTEGER DEFAULT 0, late_to_shift INTEGER DEFAULT 0, late_pickups INTEGER DEFAULT 0, late_deliveries INTEGER DEFAULT 0, rating_sum REAL DEFAULT 0, rating_count INTEGER DEFAULT 0, on_time_count INTEGER DEFAULT 0, shift_scheduled INTEGER DEFAULT 0, shift_attended INTEGER DEFAULT 0, total_earnings REAL DEFAULT 0, period_starts TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (driver_id) REFERENCES drivers(id));
        CREATE TABLE IF NOT EXISTS driver_shifts (id TEXT PRIMARY KEY, driver_id TEXT NOT NULL, zone_id TEXT, shift_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL, checked_in_at TIMESTAMP, checked_out_at TIMESTAMP, is_late BOOLEAN DEFAULT 0, late_minutes INTEGER DEFAULT 0, status VARCHAR(20) DEFAULT 'scheduled', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (driver_id) REFERENCES drivers(id), FOREIGN KEY (zone_id) REFERENCES delivery_zones(id));
        CREATE TABLE IF NOT EXISTS driver_tier_history (id TEXT PRIMARY KEY, driver_id TEXT NOT NULL, from_tier_id TEXT, to_tier_id TEXT NOT NULL, reason VARCHAR(255), evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (driver_id) REFERENCES drivers(id));
        CREATE TABLE IF NOT EXISTS dispatch_offers (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, driver_id TEXT NOT NULL, offered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, responded_at TIMESTAMP, status VARCHAR(20) DEFAULT 'pending', expires_at TIMESTAMP, distance_m INTEGER, UNIQUE(order_id, driver_id), FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (driver_id) REFERENCES drivers(id));
        CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, driver_id TEXT, order_id TEXT, type VARCHAR(30), reason TEXT, status VARCHAR(20) DEFAULT 'open', admin_notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, resolved_at TIMESTAMP);
        CREATE TABLE IF NOT EXISTS support_messages (id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL, sender VARCHAR(20) NOT NULL, body TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (ticket_id) REFERENCES support_tickets(id));
        `
        _, err = DB.Exec(schema)
        if err != nil { return err }

        // Migrations: add columns to existing tables if missing (idempotent)
        migrations := []string{
                "ALTER TABLE restaurants ADD COLUMN lat REAL",
                "ALTER TABLE restaurants ADD COLUMN lng REAL",
                "ALTER TABLE restaurants ADD COLUMN zone_id TEXT",
                "ALTER TABLE orders ADD COLUMN driver_id TEXT",
                "ALTER TABLE orders ADD COLUMN zone_id TEXT",
                "ALTER TABLE orders ADD COLUMN dispatch_distance_m INTEGER",
                "ALTER TABLE orders ADD COLUMN delivery_distance_m INTEGER",
                "ALTER TABLE orders ADD COLUMN driver_fee REAL DEFAULT 0",
                "ALTER TABLE orders ADD COLUMN platform_margin REAL DEFAULT 0",
                "ALTER TABLE drivers ADD COLUMN must_change_password BOOLEAN DEFAULT 0",
        }
        for _, m := range migrations {
                DB.Exec(m) // ignore errors - column already exists
        }

        // Default settings
        settings := map[string]string{
                "free_shipping_threshold": "30", "delivery_fee": "3.99",
                "restaurant_name": "AVEX", "restaurant_name_ar": "أفكس",
                "restaurant_phone": "+201005551234", "restaurant_address": "القاهرة، مصر",
                "restaurant_hours": "يومياً 10ص - 12م",
                "dispatch_radius_m": "5000",       // max driver→restaurant distance
                "offer_expiry_seconds": "15",      // offer countdown
                "pickup_geofence_m": "70",         // distance from restaurant to allow pickup
                "delivery_geofence_m": "50",       // distance from customer to allow delivery
                "location_stale_seconds": "30",    // mark driver offline if GPS not updated
        }
        for k, v := range settings { DB.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", k, v) }

        return nil
}

// ===== SEED =====
func Seed() {
        var count int
        DB.QueryRow("SELECT COUNT(*) FROM restaurants").Scan(&count)
        if count > 0 { return }
        log.Println("🌱 Seeding data...")

        // Admin
        adminPass, _ := HashPassword("admin123")
        DB.Exec("INSERT INTO users (id, name, phone, password_hash, is_admin) VALUES (?, ?, ?, ?, 1)", "admin-001", "مدير AVEX", "01000000000", adminPass)

        // Categories
        cats := []struct{ id, name, nameAr, icon string }{
                {"cat-Burgers", "Burgers", "برغر", "🍔"}, {"cat-Pizza", "Pizza", "بيتزا", "🍕"},
                {"cat-Sides", "Sides", "مقبلات", "🍟"}, {"cat-Drinks", "Drinks", "مشروبات", "🥤"},
                {"cat-Desserts", "Desserts", "حلويات", "🍰"}, {"cat-Shawarma", "Shawarma", "شاورما", "🌯"},
        }
        for i, c := range cats {
                DB.Exec("INSERT INTO categories (id, name, name_ar, icon, sort_order) VALUES (?, ?, ?, ?, ?)", c.id, c.name, c.nameAr, c.icon, i)
        }

        // Restaurants
        restaurants := []struct{ id, name, nameAr, descAr, cuisines string; rating float64; rc int; dtMin, dtMax int; dFee, minOrd float64; isPro bool }{
                {"rest-1", "Burger House", "برجر هاوس", "أفضل برغر في المدينة", "برغر, ساندويتش", 4.8, 324, 20, 35, 3.99, 0, true},
                {"rest-2", "Pizza Palace", "بيتزا بالاس", "بيتزا إيطالية أصيلة", "بيتزا, إيطالي", 4.7, 287, 25, 45, 4.99, 0, true},
                {"rest-3", "Shawarma King", "ملك الشاورما", "شاورما طازجة يومياً", "شاورما, عربي", 4.6, 198, 15, 30, 2.99, 0, false},
                {"rest-4", "Sweet Dreams", "أحلام حلوة", "حلويات ومعجنات طازجة", "حلويات", 4.9, 156, 15, 25, 3.49, 0, false},
                {"rest-5", "Fresh & Cold", "فريش آند كولد", "مشروبات طازجة وعصائر", "مشروبات, عصائر", 4.5, 134, 10, 20, 1.99, 0, false},
        }
        for _, r := range restaurants {
                DB.Exec("INSERT INTO restaurants (id, name, name_ar, description_ar, cuisines, rating, rating_count, delivery_time_min, delivery_time_max, delivery_fee, min_order, is_active, is_pro) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
                        r.id, r.name, r.nameAr, r.descAr, r.cuisines, r.rating, r.rc, r.dtMin, r.dtMax, r.dFee, r.minOrd, r.isPro)
        }

        // Menu items - linked to restaurants
        items := []struct{ name, nameAr, desc, descAr string; price float64; img string; popular bool; rating float64; rc, pt, cal int; cat, rest string }{
                // Burger House
                {"Classic Burger", "برغر كلاسيكي", "Juicy beef patty", "قطعة لحم بقري طازجة", 12.99, "https://sfile.chatglm.cn/images-ppt/1d832f630b65.jpg", true, 4.8, 324, 15, 650, "cat-Burgers", "rest-1"},
                {"Double Cheese Burger", "دبل تشيز برغر", "Two beef patties", "قطعتان من اللحم البقري", 16.99, "https://sfile.chatglm.cn/images-ppt/2f96fe27d3e9.jpg", true, 4.9, 412, 18, 890, "cat-Burgers", "rest-1"},
                {"Spicy Chicken Burger", "برغر الدجاج الحار", "Crispy chicken", "فيليه دجاج مقرمش", 13.49, "https://sfile.chatglm.cn/images-ppt/399af1a4b512.jpg", false, 4.7, 198, 16, 720, "cat-Burgers", "rest-1"},
                {"Mushroom Swiss Burger", "برغر المشروم", "Beef with mushrooms", "لحم بقري مع مشروم", 14.99, "https://sfile.chatglm.cn/images-ppt/0ce2d82a15ec.jpg", false, 4.6, 156, 17, 700, "cat-Burgers", "rest-1"},
                {"French Fries", "بطاطس مقلية", "Crispy golden fries", "بطاطس مقرمشة", 4.99, "https://sfile.chatglm.cn/images-ppt/ea35bc731d9e.jpg", true, 4.7, 445, 8, 365, "cat-Sides", "rest-1"},
                {"Onion Rings", "حلقات البصل", "Crispy onion rings", "حلقات بصل", 5.49, "https://sfile.chatglm.cn/images-ppt/9aaff81824b7.jpg", false, 4.5, 167, 10, 410, "cat-Sides", "rest-1"},
                // Pizza Palace
                {"Margherita", "بيتزا مارغريتا", "Fresh mozzarella", "موزاريلا طازجة", 15.99, "https://sfile.chatglm.cn/images-ppt/893e366ad435.jpg", true, 4.7, 287, 20, 850, "cat-Pizza", "rest-2"},
                {"Pepperoni", "بيتزا بيبروني", "Loaded pepperoni", "شرائح بيبروني", 17.99, "https://sfile.chatglm.cn/images-ppt/0efa7148f85a.jpg", true, 4.8, 356, 22, 980, "cat-Pizza", "rest-2"},
                {"BBQ Chicken Pizza", "بيتزا دجاج باربيكيو", "Grilled chicken", "دجاج مشوي", 18.99, "https://sfile.chatglm.cn/images-ppt/b1128c2d7ab8.jpeg", false, 4.6, 178, 22, 920, "cat-Pizza", "rest-2"},
                {"Veggie Supreme", "بيتزا خضار", "Bell peppers", "فلفل ملون", 16.49, "https://sfile.chatglm.cn/images-ppt/f28d88f6a90b.png", false, 4.5, 134, 20, 780, "cat-Pizza", "rest-2"},
                // Shawarma King
                {"Chicken Shawarma", "شاورما دجاج", "Grilled chicken wrap", "شاورما دجاج مشوي", 8.99, "https://sfile.chatglm.cn/images-ppt/399af1a4b512.jpg", true, 4.7, 198, 10, 450, "cat-Shawarma", "rest-3"},
                {"Beef Shawarma", "شاورما لحم", "Tender beef wrap", "شاورما لحم طري", 9.99, "https://sfile.chatglm.cn/images-ppt/1d832f630b65.jpg", true, 4.8, 167, 12, 520, "cat-Shawarma", "rest-3"},
                {"Chicken Wings", "أجنحة دجاج", "Spicy buffalo wings", "أجنحة بافالو", 9.99, "https://sfile.chatglm.cn/images-ppt/ccce3e544078.jpg", false, 4.6, 289, 15, 580, "cat-Sides", "rest-3"},
                {"Mozzarella Sticks", "أصابع موزاريلا", "Fried mozzarella", "موزاريلا مقلية", 6.49, "https://sfile.chatglm.cn/images-ppt/51e2a90a8a30.jpg", false, 4.5, 156, 10, 450, "cat-Sides", "rest-3"},
                // Sweet Dreams
                {"Chocolate Brownie", "براوني الشوكولاتة", "Warm brownie", "براوني دافئ", 6.99, "https://sfile.chatglm.cn/images-ppt/fa9851b1681e.jpg", true, 4.9, 367, 8, 520, "cat-Desserts", "rest-4"},
                {"Cheesecake", "تشيز كيك", "Creamy cheesecake", "تشيز كيك", 7.49, "https://sfile.chatglm.cn/images-ppt/0f3319609656.jpg", false, 4.8, 245, 5, 480, "cat-Desserts", "rest-4"},
                {"Milkshake", "ميلك شيك", "Vanilla milkshake", "ميلك شيك", 5.99, "https://sfile.chatglm.cn/images-ppt/ab6e313a4e50.jpg", false, 4.7, 189, 5, 380, "cat-Desserts", "rest-4"},
                {"Apple Pie", "فطيرة تفاح", "Warm apple pie", "فطيرة تفاح", 5.49, "https://sfile.chatglm.cn/images-ppt/04230212dbc8.jpg", false, 4.6, 156, 6, 410, "cat-Desserts", "rest-4"},
                // Fresh & Cold
                {"Coca-Cola", "كوكا كولا", "330ml can", "علبة 330مل", 2.49, "https://sfile.chatglm.cn/images-ppt/1310f5bc0748.jpg", false, 4.5, 312, 2, 140, "cat-Drinks", "rest-5"},
                {"Orange Juice", "عصير برتقال", "Fresh squeezed", "عصير طازج", 4.49, "https://sfile.chatglm.cn/images-ppt/f5d00fc46ec1.jpg", true, 4.7, 234, 5, 165, "cat-Drinks", "rest-5"},
                {"Iced Coffee", "قهوة مثلجة", "Cold brew", "كولد برو", 5.49, "https://sfile.chatglm.cn/images-ppt/ec0d8482a2be.jpg", true, 4.8, 278, 5, 220, "cat-Drinks", "rest-5"},
                {"Mineral Water", "مياه معدنية", "500ml", "زجاجة 500مل", 1.49, "https://sfile.chatglm.cn/images-ppt/311a8c72f800.jpg", false, 4.4, 145, 1, 0, "cat-Drinks", "rest-5"},
        }
        for i, it := range items {
                id := fmt.Sprintf("item-%d", i+1)
                DB.Exec("INSERT INTO menu_items (id, name, name_ar, description, description_ar, price, image, image_url, is_popular, is_available, rating, rating_count, prep_time, calories, category_id, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, '🍽️', ?, ?, 1, ?, ?, ?, ?, ?, ?)", id, it.name, it.nameAr, it.desc, it.descAr, it.price, it.img, it.popular, it.rating, it.rc, it.pt, it.cal, it.cat, it.rest)
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
        log.Println("✅ Seed done: 6 cats, 5 restaurants, 22 items, 4 coupons, 1 admin")

        seedDriverSystem()
}

// ===== DRIVER SYSTEM SEED =====
func seedDriverSystem() {
        var zc int
        DB.QueryRow("SELECT COUNT(*) FROM delivery_zones").Scan(&zc)
        if zc > 0 { return } // already seeded
        log.Println("🌱 Seeding driver system...")

        // Delivery zones (Cairo)
        zones := []struct{ id, name, nameAr string; lat, lng float64; r int }{
                {"zone-nasr", "Nasr City", "مدينة نصر", 30.0566, 31.3656, 4000},
                {"zone-maadi", "Maadi", "المعادي", 29.9602, 31.2569, 3500},
                {"zone-heliopolis", "Heliopolis", "مصر الجديدة", 30.0915, 31.3425, 3500},
                {"zone-downtown", "Downtown", "وسط البلد", 30.0444, 31.2357, 3000},
        }
        for _, z := range zones {
                DB.Exec("INSERT INTO delivery_zones (id, name, name_ar, center_lat, center_lng, radius_m, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)", z.id, z.name, z.nameAr, z.lat, z.lng, z.r)
        }

        // Driver tiers (sort_order: 1=starter, 2=bronze, 3=silver, 4=gold)
        tiers := []struct{ id, code, nameAr, color string; sort int }{
                {"tier-starter", "starter", "مبتدئ", "#9CA3AF", 1},
                {"tier-bronze", "bronze", "برونزي", "#A16207", 2},
                {"tier-silver", "silver", "فضي", "#6B7280", 3},
                {"tier-gold", "gold", "ذهبي", "#000000", 4},
        }
        for _, t := range tiers {
                DB.Exec("INSERT INTO driver_tiers (id, code, name_ar, sort_order, color, is_active) VALUES (?, ?, ?, ?, ?, 1)", t.id, t.code, t.nameAr, t.sort, t.color)
        }

        // Tier thresholds
        thresholds := []struct{ tierID string; acc, comp, rating, onTime, shift float64; lifetime int }{
                {"tier-starter", 0, 0, 0, 0, 0, 0},
                {"tier-bronze", 60, 85, 4.5, 85, 80, 50},
                {"tier-silver", 75, 92, 4.7, 92, 90, 250},
                {"tier-gold", 90, 96, 4.8, 96, 95, 750},
        }
        for _, th := range thresholds {
                DB.Exec("INSERT INTO tier_thresholds (id, tier_id, min_acceptance_rate, min_completion_rate, min_customer_rating, min_on_time_rate, min_shift_adherence, min_lifetime_orders) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        "th-"+th.tierID, th.tierID, th.acc, th.comp, th.rating, th.onTime, th.shift, th.lifetime)
        }

        // Tier zone prices (matrix: 4 tiers × 4 zones = 16 cells)
        // Format: base, per_km, min, max, free_above, est_minutes
        type price struct{ base, perKm, mn, mx, free float64; est int }
        // pricing matrix - higher tiers earn more
        matrix := map[string]price{
                "starter":   {base: 4.0, perKm: 1.5, mn: 3, mx: 20, free: 30, est: 35},
                "bronze":    {base: 5.0, perKm: 2.0, mn: 4, mx: 22, free: 30, est: 30},
                "silver":    {base: 6.0, perKm: 2.5, mn: 5, mx: 25, free: 30, est: 25},
                "gold":      {base: 7.0, perKm: 3.0, mn: 6, mx: 28, free: 30, est: 20},
        }
        // zone multipliers - downtown slightly higher (congestion), maadi slightly lower
        zoneMult := map[string]float64{
                "zone-nasr": 1.0, "zone-maadi": 0.95, "zone-heliopolis": 1.0, "zone-downtown": 1.10,
        }
        for _, t := range tiers {
                for _, z := range zones {
                        p := matrix[t.code]
                        m := zoneMult[z.id]
                        DB.Exec(`INSERT INTO tier_zone_prices (id, tier_id, zone_id, base_fee, per_km_fee, min_fee, max_fee, free_above, estimated_minutes, is_active)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                                "tp-"+t.code+"-"+z.id, t.id, z.id,
                                p.base*m, p.perKm*m, p.mn*m, p.mx*m, p.free, p.est)
                }
        }

        // Assign restaurants to zones + give them lat/lng
        restZones := []struct{ id string; lat, lng float64; zoneID string }{
                {"rest-1", 30.0570, 31.3660, "zone-nasr"},       // Burger House
                {"rest-2", 30.0625, 31.3500, "zone-nasr"},       // Pizza Palace
                {"rest-3", 29.9605, 31.2570, "zone-maadi"},      // Shawarma King
                {"rest-4", 30.0910, 31.3420, "zone-heliopolis"}, // Sweet Dreams
                {"rest-5", 30.0450, 31.2360, "zone-downtown"},   // Fresh & Cold
        }
        for _, rz := range restZones {
                DB.Exec("UPDATE restaurants SET lat = ?, lng = ?, zone_id = ? WHERE id = ?", rz.lat, rz.lng, rz.zoneID, rz.id)
        }

        // Demo driver accounts (for testing the app)
        // Phone: 01100000001 / password: 123456 → starter
        // Phone: 01100000002 / password: 123456 → silver (for demo)
        demoDrivers := []struct{ id, name, phone, national, license, tier string; lat, lng float64 }{
                {"driver-demo-1", "مندوب تجريبي 1", "01100000001", "29001011234567", "MOTO-2024-001", "tier-starter", 30.0570, 31.3660},
                {"driver-demo-2", "مندوب تجريبي 2", "01100000002", "29001021234568", "MOTO-2024-002", "tier-silver",  30.0620, 31.3500},
        }
        for _, d := range demoDrivers {
                hash, _ := HashPassword("123456")
                DB.Exec(`INSERT INTO drivers (id, name, phone, password_hash, vehicle_type, license_number, national_id, tier_id, is_active, is_verified, must_change_password, lat, lng, location_updated_at)
                         VALUES (?, ?, ?, ?, 'motorcycle', ?, ?, ?, 1, 1, 0, ?, ?, CURRENT_TIMESTAMP)`,
                        d.id, d.name, d.phone, hash, d.license, d.national, d.tier, d.lat, d.lng)
                DB.Exec(`INSERT INTO driver_stats (driver_id, period_starts) VALUES (?, CURRENT_TIMESTAMP)`, d.id)
        }

        log.Println("✅ Driver system seeded: 4 zones, 4 tiers, 16 prices, 2 demo drivers (01100000001/2, pass: 123456)")
}

// ===== HELPER: Haversine distance in meters =====
func haversineM(lat1, lng1, lat2, lng2 float64) float64 {
        const R = 6371000.0 // Earth radius in meters
        rlat1 := lat1 * 3.141592653589793 / 180
        rlat2 := lat2 * 3.141592653589793 / 180
        dlat := (lat2 - lat1) * 3.141592653589793 / 180
        dlng := (lng2 - lng1) * 3.141592653589793 / 180
        a := 0.5 - 0.5*math.Cos(dlat) + math.Cos(rlat1)*math.Cos(rlat2)*(0.5-0.5*math.Cos(dlng))
        return 2 * R * math.Asin(math.Sqrt(a))
}

// ===== HELPER: get setting as string =====
func getSetting(key, def string) string {
        var v string
        if DB.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&v) != nil { return def }
        if v == "" { return def }
        return v
}

// ===== HELPER: get setting as int =====
func getSettingInt(key string, def int) int {
        v := getSetting(key, "")
        if v == "" { return def }
        n, err := strconv.Atoi(v)
        if err != nil { return def }
        return n
}

// ===== HELPER: find zone by lat/lng =====
func findZoneByLatLng(lat, lng float64) string {
        rows, err := DB.Query("SELECT id, center_lat, center_lng, radius_m FROM delivery_zones WHERE is_active = 1")
        if err != nil { return "" }
        defer rows.Close()
        var bestID string
        var bestDist float64 = -1
        for rows.Next() {
                var id string; var clat, clng float64; var r int
                rows.Scan(&id, &clat, &clng, &r)
                d := haversineM(lat, lng, clat, clng)
                if d <= float64(r) {
                        if bestDist < 0 || d < bestDist { bestID = id; bestDist = d }
                }
        }
        return bestID
}

// ===== HELPER: compute driver fee from tier × zone =====
func computeDriverFee(tierID, zoneID string, distanceM float64) float64 {
        if tierID == "" || zoneID == "" { return 0 }
        var base, perKm, mn, mx, freeAbove float64
        err := DB.QueryRow("SELECT base_fee, per_km_fee, min_fee, max_fee, free_above FROM tier_zone_prices WHERE tier_id = ? AND zone_id = ? AND is_active = 1", tierID, zoneID).Scan(&base, &perKm, &mn, &mx, &freeAbove)
        if err != nil { return 0 }
        fee := base + (distanceM/1000.0)*perKm
        if fee < mn { fee = mn }
        if mx > 0 && fee > mx { fee = mx }
        _ = freeAbove // free_above applies to customer, not driver
        return fee
}

// ===== HELPER: Tier evaluation for a driver =====
// Returns new tier_id. Logs history if changed.
func evaluateDriverTier(driverID string) string {
        var currentTier sql.NullString
        var lifetime int
        DB.QueryRow("SELECT tier_id, (SELECT COUNT(*) FROM orders WHERE driver_id = ? AND status = 'delivered') FROM drivers WHERE id = ?", driverID, driverID).Scan(&currentTier, &lifetime)

        // Compute stats over last 30 days from driver_stats (cumulative)
        var accepted, rejected, completed, onTime, ratingSum float64
        var ratingCount, shiftScheduled, shiftAttended int
        DB.QueryRow(`SELECT accepted_orders, rejected_orders, completed_orders, on_time_count, rating_sum, rating_count, shift_scheduled, shift_attended
                     FROM driver_stats WHERE driver_id = ?`, driverID).Scan(&accepted, &rejected, &completed, &onTime, &ratingSum, &ratingCount, &shiftScheduled, &shiftAttended)

        acceptanceRate := 0.0
        if accepted+rejected > 0 { acceptanceRate = accepted / (accepted + rejected) * 100 }
        completionRate := 0.0
        if accepted > 0 { completionRate = completed / accepted * 100 }
        customerRating := 0.0
        if ratingCount > 0 { customerRating = ratingSum / float64(ratingCount) }
        onTimeRate := 0.0
        if completed > 0 { onTimeRate = onTime / completed * 100 }
        shiftAdherence := 0.0
        if shiftScheduled > 0 { shiftAdherence = float64(shiftAttended) / float64(shiftScheduled) * 100 }

        // Load all tiers sorted desc by sort_order
        rows, err := DB.Query("SELECT id, sort_order FROM driver_tiers WHERE is_active = 1 ORDER BY sort_order DESC")
        if err != nil { return currentTier.String }
        defer rows.Close()
        type tierRow struct{ id string; sort int }
        var tiers []tierRow
        for rows.Next() {
                var t tierRow
                rows.Scan(&t.id, &t.sort)
                tiers = append(tiers, t)
        }
        if len(tiers) == 0 { return currentTier.String }

        // Find highest tier whose thresholds are met
        var newTier = tiers[len(tiers)-1].id // default = lowest tier
        for _, t := range tiers {
                var acc, comp, rating, onT, shift sql.NullFloat64
                var life sql.NullInt64
                DB.QueryRow(`SELECT min_acceptance_rate, min_completion_rate, min_customer_rating, min_on_time_rate, min_shift_adherence, min_lifetime_orders
                              FROM tier_thresholds WHERE tier_id = ?`, t.id).Scan(&acc, &comp, &rating, &onT, &shift, &life)
                meets := true
                if acc.Valid && acceptanceRate < acc.Float64 { meets = false }
                if comp.Valid && completionRate < comp.Float64 { meets = false }
                if rating.Valid && customerRating < rating.Float64 { meets = false }
                if onT.Valid && onTimeRate < onT.Float64 { meets = false }
                if shift.Valid && shiftAdherence < shift.Float64 { meets = false }
                if life.Valid && lifetime < int(life.Int64) { meets = false }
                if meets { newTier = t.id; break }
        }

        // Update if changed
        if !currentTier.Valid || currentTier.String != newTier {
                DB.Exec("UPDATE drivers SET tier_id = ?, tier_evaluated_at = CURRENT_TIMESTAMP WHERE id = ?", newTier, driverID)
                DB.Exec("INSERT INTO driver_tier_history (id, driver_id, from_tier_id, to_tier_id, reason) VALUES (?, ?, ?, ?, ?)",
                        uuid.New().String(), driverID, currentTier.String, newTier, "auto_evaluation")
        }
        return newTier
}

// ===== HELPER: get driver from JWT context =====
func GetDriver(r *http.Request) *Claims { return GetUser(r) }

// ===== HELPER: dispatch an order to eligible drivers =====
// Creates dispatch_offers for top-5 drivers. Called when restaurant accepts order.
func dispatchOrder(orderID string) {
        // Get order + restaurant info
        var restID, zoneID sql.NullString
        var rlat, rlng sql.NullFloat64
        DB.QueryRow("SELECT restaurant_id, zone_id FROM orders WHERE id = ?", orderID).Scan(&restID, &zoneID)
        if !restID.Valid { return }
        DB.QueryRow("SELECT lat, lng FROM restaurants WHERE id = ?", restID.String).Scan(&rlat, &rlng)
        if !rlat.Valid { return }
        if !zoneID.Valid || zoneID.String == "" {
                z := findZoneByLatLng(rlat.Float64, rlng.Float64)
                if z != "" { zoneID.String = z; DB.Exec("UPDATE orders SET zone_id = ? WHERE id = ?", z, orderID) }
        }

        maxR := getSettingInt("dispatch_radius_m", 5000)
        expirySec := getSettingInt("offer_expiry_seconds", 15)

        // Find eligible online drivers
        rows, err := DB.Query(`SELECT d.id, d.lat, d.lng, d.tier_id, dt.sort_order
                               FROM drivers d
                               LEFT JOIN driver_tiers dt ON dt.id = d.tier_id
                               WHERE d.is_online = 1 AND d.is_active = 1 AND d.is_verified = 1
                                 AND d.tier_id IS NOT NULL
                                 AND d.location_updated_at > datetime('now', ?)
                                 AND d.id NOT IN (SELECT driver_id FROM dispatch_offers WHERE order_id = ? AND status = 'accepted')
                                 AND d.id NOT IN (SELECT driver_id FROM orders WHERE id != ? AND status IN ('assigned','picked_up','on_the_way','delivering'))`,
                fmt.Sprintf("-%d seconds", getSettingInt("location_stale_seconds", 30)), orderID, orderID)
        if err != nil { return }
        defer rows.Close()

        type candidate struct {
                id string; dist float64; tierSort int; lat, lng float64
        }
        var candidates []candidate
        for rows.Next() {
                var id, tierID sql.NullString
                var lat, lng sql.NullFloat64
                var tierSort sql.NullInt64
                rows.Scan(&id, &lat, &lng, &tierID, &tierSort)
                if !lat.Valid || !lng.Valid { continue }
                d := haversineM(lat.Float64, rlng.Float64, lat.Float64, lng.Float64)
                if d > float64(maxR) { continue }
                ts := 0
                if tierSort.Valid { ts = int(tierSort.Int64) }
                candidates = append(candidates, candidate{id: id.String, dist: d, tierSort: ts, lat: lat.Float64, lng: lng.Float64})
        }
        if len(candidates) == 0 { return }

        // Find max tier sort for normalization
        maxSort := 0
        for _, c := range candidates { if c.tierSort > maxSort { maxSort = c.tierSort } }
        if maxSort == 0 { maxSort = 1 }

        // Score each candidate
        type scored struct {
                id, tid string; score float64; dist float64
        }
        var scoredList []scored
        for _, c := range candidates {
                distScore := 1 - c.dist/float64(maxR)
                tierScore := float64(c.tierSort) / float64(maxSort)
                // response score = 1.0 (no historical data yet, default)
                respScore := 1.0
                // shift score = 1.0 (assume always in shift for now)
                shiftScore := 1.0
                total := distScore*0.50 + tierScore*0.30 + respScore*0.10 + shiftScore*0.10
                scoredList = append(scoredList, scored{id: c.id, tid: "", score: total, dist: c.dist})
        }
        // Sort by score desc
        for i := 0; i < len(scoredList); i++ {
                for j := i + 1; j < len(scoredList); j++ {
                        if scoredList[j].score > scoredList[i].score {
                                scoredList[i], scoredList[j] = scoredList[j], scoredList[i]
                        }
                }
        }
        // Take top 5
        if len(scoredList) > 5 { scoredList = scoredList[:5] }

        // Get tier_id of each driver for auto-accept check + offer creation
        expiresAt := time.Now().Add(time.Duration(expirySec) * time.Second)
        for _, s := range scoredList {
                var tierID sql.NullString
                var autoAccept bool
                DB.QueryRow("SELECT tier_id, auto_accept FROM drivers WHERE id = ?", s.id).Scan(&tierID, &autoAccept)
                offerID := uuid.New().String()
                DB.Exec(`INSERT INTO dispatch_offers (id, order_id, driver_id, offered_at, status, expires_at, distance_m)
                         VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'pending', ?, ?)`,
                        offerID, orderID, s.id, expiresAt, int(s.dist))
                // If auto-accept: accept immediately
                if autoAccept {
                        acceptOfferInternal(offerID, s.id, orderID)
                        return // stop, one driver accepted
                }
        }
}

// ===== HELPER: internal accept offer (used by dispatch auto-accept and driver manual accept) =====
func acceptOfferInternal(offerID, driverID, orderID string) bool {
        // Mark offer as accepted
        DB.Exec("UPDATE dispatch_offers SET status = 'accepted', responded_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'", offerID)
        // Expire all other pending offers for this order
        DB.Exec("UPDATE dispatch_offers SET status = 'expired', responded_at = CURRENT_TIMESTAMP WHERE order_id = ? AND id != ? AND status = 'pending'", orderID, offerID)
        // Get order info for driver_fee calculation
        var restID, zoneID sql.NullString
        var cLat, cLng, rLat, rLng sql.NullFloat64
        var dispatchDist sql.NullInt64
        DB.QueryRow("SELECT restaurant_id, zone_id, location_lat, location_lng, dispatch_distance_m FROM orders WHERE id = ?", orderID).Scan(&restID, &zoneID, &cLat, &cLng, &dispatchDist)
        DB.QueryRow("SELECT lat, lng FROM restaurants WHERE id = ?", restID.String).Scan(&rLat, &rLng)
        // Compute delivery distance: restaurant → customer
        deliveryDist := 0.0
        if rLat.Valid && cLat.Valid { deliveryDist = haversineM(rLat.Float64, rLng.Float64, cLat.Float64, cLng.Float64) }
        // Compute driver fee: tier × zone
        var tierID sql.NullString
        DB.QueryRow("SELECT tier_id FROM drivers WHERE id = ?", driverID).Scan(&tierID)
        zid := zoneID.String
        if zid == "" { zid = findZoneByLatLng(rLat.Float64, rLng.Float64) }
        driverFee := computeDriverFee(tierID.String, zid, deliveryDist)
        // Customer already paid delivery_fee; margin = delivery_fee - driver_fee
        var custFee sql.NullFloat64
        DB.QueryRow("SELECT delivery_fee FROM orders WHERE id = ?", orderID).Scan(&custFee)
        margin := 0.0
        if custFee.Valid { margin = custFee.Float64 - driverFee }
        if margin < 0 { margin = 0 }
        // Update order
        DB.Exec(`UPDATE orders SET driver_id = ?, status = 'assigned', dispatch_distance_m = ?, delivery_distance_m = ?, driver_fee = ?, platform_margin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                driverID, int(dispatchDist.Int64), int(deliveryDist), driverFee, margin, orderID)
        // Update driver stats: accepted+1
        DB.Exec("UPDATE driver_stats SET accepted_orders = accepted_orders + 1, total_orders = total_orders + 1, updated_at = CURRENT_TIMESTAMP WHERE driver_id = ?", driverID)
        return true
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
        type itemData struct{ id, nameAr string; price float64; qty int; restID string }
        var items []itemData
        var restID string
        for _, it := range b.Items {
                var id, na string; var pr float64; var rid sql.NullString
                if DB.QueryRow("SELECT id, name_ar, price, restaurant_id FROM menu_items WHERE id = ?", it.MenuItemID).Scan(&id, &na, &pr, &rid) == nil {
                        items = append(items, itemData{id, na, pr, it.Quantity, rid.String})
                        sub += pr * float64(it.Quantity)
                        if restID == "" && rid.Valid { restID = rid.String }
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
        // Determine order zone: from restaurant, or from customer location
        var orderZoneID string
        if restID != "" {
                var zid sql.NullString
                DB.QueryRow("SELECT zone_id FROM restaurants WHERE id = ?", restID).Scan(&zid)
                if zid.Valid { orderZoneID = zid.String }
        }
        if orderZoneID == "" { orderZoneID = findZoneByLatLng(b.LocationLat, b.LocationLng) }
        // Restaurant auto-accepts order (mandatory) → status = 'accepted' → trigger dispatch
        status := "accepted"
        DB.Exec("INSERT INTO orders (id, order_number, user_id, restaurant_id, customer_name, phone, location_lat, location_lng, location_url, location_address, subtotal, delivery_fee, discount, coupon_code, total, payment_method, status, zone_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                oid, onum, uid, restID, b.CustomerName, p, b.LocationLat, b.LocationLng, locURL, b.LocationAddress, sub, delFee, disc, couponCode, total, b.PaymentMethod, status, orderZoneID)
        for _, it := range items { DB.Exec("INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?, ?)", uuid.New().String(), oid, it.id, it.nameAr, it.price, it.qty) }
        if c := GetUser(r); c != nil { pts := int(total / 10); if pts > 0 { DB.Exec("UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?", pts, c.UserID) } }
        // Restaurant auto-accepted → dispatch to drivers
        go dispatchOrder(oid)
        writeJSON(w, 201, map[string]interface{}{"order": map[string]interface{}{"id": oid, "orderNumber": onum, "status": status, "total": total}})
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

// ===== RESTAURANTS =====
func HandleGetRestaurants(w http.ResponseWriter, r *http.Request) {
        rows, err := DB.Query("SELECT id, name, name_ar, description_ar, image_url, cover_url, rating, rating_count, delivery_time_min, delivery_time_max, delivery_fee, min_order, is_pro, cuisines FROM restaurants WHERE is_active = 1 ORDER BY is_pro DESC, rating DESC")
        if err != nil { writeErr(w, 500, "فشل تحميل المطاعم"); return }
        defer rows.Close()
        var restaurants []map[string]interface{}
        for rows.Next() {
                var id, name, nameAr string
                var descAr, imgURL, coverURL, cuisines sql.NullString
                var rating float64
                var rc, dtMin, dtMax int
                var dFee, minOrd float64
                var isPro bool
                rows.Scan(&id, &name, &nameAr, &descAr, &imgURL, &coverURL, &rating, &rc, &dtMin, &dtMax, &dFee, &minOrd, &isPro, &cuisines)
                restaurants = append(restaurants, map[string]interface{}{
                        "id": id, "name": name, "nameAr": nameAr,
                        "descriptionAr": descAr.String, "imageUrl": imgURL.String, "coverUrl": coverURL.String,
                        "rating": rating, "ratingCount": rc,
                        "deliveryTimeMin": dtMin, "deliveryTimeMax": dtMax,
                        "deliveryFee": dFee, "minOrder": minOrd,
                        "isPro": isPro, "cuisines": cuisines.String,
                })
        }
        writeJSON(w, 200, map[string]interface{}{"restaurants": restaurants})
}

func HandleGetRestaurant(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        if id == "" { id = r.URL.Query().Get("id") }
        if id == "" { writeErr(w, 400, "معرف المطعم مطلوب"); return }

        var name, nameAr string
        var descAr, imgURL, coverURL, cuisines sql.NullString
        var rating float64
        var rc, dtMin, dtMax int
        var dFee, minOrd float64
        var isPro, isActive bool
        err := DB.QueryRow("SELECT name, name_ar, description_ar, image_url, cover_url, rating, rating_count, delivery_time_min, delivery_time_max, delivery_fee, min_order, is_pro, is_active, cuisines FROM restaurants WHERE id = ?", id).
                Scan(&name, &nameAr, &descAr, &imgURL, &coverURL, &rating, &rc, &dtMin, &dtMax, &dFee, &minOrd, &isPro, &isActive, &cuisines)
        if err != nil { writeErr(w, 404, "المطعم غير موجود"); return }

        // Get menu items
        itemRows, _ := DB.Query("SELECT id, name, name_ar, description, description_ar, price, image, image_url, is_popular, is_available, rating, rating_count, prep_time, calories, category_id FROM menu_items WHERE restaurant_id = ? AND is_available = 1 ORDER BY is_popular DESC, price ASC", id)
        type MenuItem struct {
                ID string `json:"id"`
                Name string `json:"name"`
                NameAr string `json:"nameAr"`
                Description string `json:"description"`
                DescriptionAr string `json:"descriptionAr"`
                Price float64 `json:"price"`
                Image string `json:"image"`
                ImageURL *string `json:"imageUrl"`
                IsPopular bool `json:"isPopular"`
                IsAvailable bool `json:"isAvailable"`
                Rating float64 `json:"rating"`
                RatingCount int `json:"ratingCount"`
                PrepTime int `json:"prepTime"`
                Calories int `json:"calories"`
                CategoryID string `json:"categoryId"`
        }
        var items []MenuItem
        for itemRows.Next() {
                var m MenuItem
                var imgU sql.NullString
                itemRows.Scan(&m.ID, &m.Name, &m.NameAr, &m.Description, &m.DescriptionAr, &m.Price, &m.Image, &imgU, &m.IsPopular, &m.IsAvailable, &m.Rating, &m.RatingCount, &m.PrepTime, &m.Calories, &m.CategoryID)
                if imgU.Valid { m.ImageURL = &imgU.String }
                items = append(items, m)
        }
        itemRows.Close()

        writeJSON(w, 200, map[string]interface{}{
                "id": id, "name": name, "nameAr": nameAr,
                "descriptionAr": descAr.String, "imageUrl": imgURL.String, "coverUrl": coverURL.String,
                "rating": rating, "ratingCount": rc,
                "deliveryTimeMin": dtMin, "deliveryTimeMax": dtMax,
                "deliveryFee": dFee, "minOrder": minOrd,
                "isPro": isPro, "cuisines": cuisines.String,
                "menu": items,
        })
}

// ===== DRIVER AUTH HANDLERS =====
func HandleDriverLogin(w http.ResponseWriter, r *http.Request) {
        var b struct{ Phone, Password string }
        json.NewDecoder(r.Body).Decode(&b)
        p := cleanPhone(b.Phone)
        var id, name, ph, hash sql.NullString
        var active, verified, mustChange sql.NullBool
        err := DB.QueryRow("SELECT id, name, phone, password_hash, is_active, is_verified, must_change_password FROM drivers WHERE phone = ?", p).Scan(&id, &name, &ph, &hash, &active, &verified, &mustChange)
        if err != nil { writeErr(w, 401, "رقم الهاتف أو كلمة المرور غير صحيحة"); return }
        if !CheckPassword(b.Password, hash.String) { writeErr(w, 401, "رقم الهاتف أو كلمة المرور غير صحيحة"); return }
        if !active.Bool { writeErr(w, 403, "حسابك موقوف، تواصل مع الإدارة"); return }
        if !verified.Bool { writeErr(w, 403, "حسابك لم يتم توثيقه بعد"); return }
        // Mark last_seen
        DB.Exec("UPDATE drivers SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?", id.String)
        token, _ := GenerateDriverJWT(id.String, ph.String, name.String)
        writeJSON(w, 200, map[string]interface{}{
                "token": token,
                "mustChangePassword": mustChange.Bool,
                "driver": map[string]interface{}{
                        "id": id.String, "name": name.String, "phone": ph.String,
                },
        })
}

func HandleDriverChangePassword(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        var b struct{ OldPassword, NewPassword string }
        json.NewDecoder(r.Body).Decode(&b)
        if len(b.NewPassword) < 6 { writeErr(w, 400, "كلمة المرور الجديدة 6 أحرف على الأقل"); return }
        var hash string
        DB.QueryRow("SELECT password_hash FROM drivers WHERE id = ?", c.DriverID).Scan(&hash)
        if !CheckPassword(b.OldPassword, hash) { writeErr(w, 400, "كلمة المرور الحالية غير صحيحة"); return }
        newHash, _ := HashPassword(b.NewPassword)
        DB.Exec("UPDATE drivers SET password_hash = ?, must_change_password = 0 WHERE id = ?", newHash, c.DriverID)
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

func HandleDriverMe(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        var id, name, ph, tierID, tierName, tierColor sql.NullString
        var tierSort sql.NullInt64
        var online, active, verified, autoAccept, mustChange sql.NullBool
        var lat, lng sql.NullFloat64
        var createdAt, lastSeen, locUpd sql.NullString
        DB.QueryRow(`SELECT d.id, d.name, d.phone, d.tier_id, dt.name_ar, dt.color, dt.sort_order,
                            d.is_online, d.is_active, d.is_verified, d.auto_accept, d.must_change_password,
                            d.lat, d.lng, d.created_at, d.last_seen_at, d.location_updated_at
                     FROM drivers d LEFT JOIN driver_tiers dt ON dt.id = d.tier_id WHERE d.id = ?`, c.DriverID).
                Scan(&id, &name, &ph, &tierID, &tierName, &tierColor, &tierSort, &online, &active, &verified, &autoAccept, &mustChange, &lat, &lng, &createdAt, &lastSeen, &locUpd)
        // Get stats
        var stats map[string]interface{}
        var acc, rej, comp, onTime, ratingSum, earnings float64
        var ratingCount, shiftSch, shiftAtt int
        DB.QueryRow(`SELECT accepted_orders, rejected_orders, completed_orders, on_time_count, rating_sum, rating_count, shift_scheduled, shift_attended, total_earnings
                     FROM driver_stats WHERE driver_id = ?`, c.DriverID).Scan(&acc, &rej, &comp, &onTime, &ratingSum, &ratingCount, &shiftSch, &shiftAtt, &earnings)
        acceptanceRate := 0.0
        if acc+rej > 0 { acceptanceRate = acc / (acc + rej) * 100 }
        completionRate := 0.0
        if acc > 0 { completionRate = comp / acc * 100 }
        customerRating := 0.0
        if ratingCount > 0 { customerRating = ratingSum / float64(ratingCount) }
        onTimeRate := 0.0
        if comp > 0 { onTimeRate = onTime / comp * 100 }
        shiftAdherence := 0.0
        if shiftSch > 0 { shiftAdherence = float64(shiftAtt) / float64(shiftSch) * 100 }
        stats = map[string]interface{}{
                "acceptedOrders":   acc,
                "rejectedOrders":   rej,
                "completedOrders":  comp,
                "ratingCount":      ratingCount,
                "rating":           customerRating,
                "onTimeRate":       onTimeRate,
                "acceptanceRate":   acceptanceRate,
                "completionRate":   completionRate,
                "shiftAdherence":   shiftAdherence,
                "totalEarnings":    earnings,
                "lifetimeOrders":   comp,
        }
        // Next tier info
        nextTier := map[string]interface{}(nil)
        if tierSort.Valid {
                rows, _ := DB.Query(`SELECT t.id, t.name_ar, t.sort_order, th.min_acceptance_rate, th.min_completion_rate, th.min_customer_rating, th.min_on_time_rate, th.min_shift_adherence, th.min_lifetime_orders
                                     FROM driver_tiers t LEFT JOIN tier_thresholds th ON th.tier_id = t.id
                                     WHERE t.is_active = 1 AND t.sort_order > ? ORDER BY t.sort_order ASC LIMIT 1`, tierSort.Int64)
                if rows.Next() {
                        var nid, nname sql.NullString; var nsort sql.NullInt64
                        var nacc, ncomp, nrat, nonT, nshift sql.NullFloat64; var nlife sql.NullInt64
                        rows.Scan(&nid, &nname, &nsort, &nacc, &ncomp, &nrat, &nonT, &nshift, &nlife)
                        nextTier = map[string]interface{}{
                                "id": nid.String, "nameAr": nname.String, "sortOrder": nsort.Int64,
                                "minAcceptanceRate": nacc.Float64, "minCompletionRate": ncomp.Float64,
                                "minCustomerRating": nrat.Float64, "minOnTimeRate": nonT.Float64,
                                "minShiftAdherence": nshift.Float64, "minLifetimeOrders": nlife.Int64,
                        }
                }
                rows.Close()
        }
        writeJSON(w, 200, map[string]interface{}{
                "id": id.String, "name": name.String, "phone": ph.String,
                "tier": map[string]interface{}{
                        "id": tierID.String, "nameAr": tierName.String, "color": tierColor.String, "sortOrder": tierSort.Int64,
                },
                "isOnline": online.Bool, "isActive": active.Bool, "isVerified": verified.Bool,
                "autoAccept": autoAccept.Bool, "mustChangePassword": mustChange.Bool,
                "lat": lat.Float64, "lng": lng.Float64,
                "createdAt": createdAt.String, "lastSeen": lastSeen.String, "locationUpdatedAt": locUpd.String,
                "stats": stats, "nextTier": nextTier,
        })
}

func HandleDriverToggleOnline(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        var b struct{ Online bool }
        json.NewDecoder(r.Body).Decode(&b)
        DB.Exec("UPDATE drivers SET is_online = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?", b.Online, c.DriverID)
        writeJSON(w, 200, map[string]interface{}{"online": b.Online})
}

func HandleDriverUpdateLocation(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        var b struct{ Lat, Lng float64 }
        json.NewDecoder(r.Body).Decode(&b)
        if b.Lat == 0 || b.Lng == 0 { writeErr(w, 400, "الموقع غير صالح"); return }
        DB.Exec("UPDATE drivers SET lat = ?, lng = ?, location_updated_at = CURRENT_TIMESTAMP, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?", b.Lat, b.Lng, c.DriverID)
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

func HandleDriverToggleAutoAccept(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        var b struct{ AutoAccept bool }
        json.NewDecoder(r.Body).Decode(&b)
        DB.Exec("UPDATE drivers SET auto_accept = ? WHERE id = ?", b.AutoAccept, c.DriverID)
        writeJSON(w, 200, map[string]interface{}{"autoAccept": b.AutoAccept})
}

func HandleDriverGetShift(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        var id, zid, zname, status sql.NullString
        var sdate, stime, etime sql.NullString
        var isCheckedIn, isLate sql.NullBool
        var lateMin sql.NullInt64
        DB.QueryRow(`SELECT s.id, s.zone_id, z.name_ar, s.shift_date, s.start_time, s.end_time, s.status,
                            CASE WHEN s.checked_in_at IS NOT NULL THEN 1 ELSE 0 END, s.is_late, s.late_minutes
                     FROM driver_shifts s LEFT JOIN delivery_zones z ON z.id = s.zone_id
                     WHERE s.driver_id = ? AND s.shift_date = CURRENT_DATE ORDER BY s.start_time ASC LIMIT 1`, c.DriverID).
                Scan(&id, &zid, &zname, &sdate, &stime, &etime, &status, &isCheckedIn, &isLate, &lateMin)
        if !id.Valid {
                writeJSON(w, 200, map[string]interface{}{"shift": nil})
                return
        }
        writeJSON(w, 200, map[string]interface{}{
                "shift": map[string]interface{}{
                        "id": id.String, "zoneId": zid.String, "zoneName": zname.String,
                        "date": sdate.String, "startTime": stime.String, "endTime": etime.String,
                        "status": status.String, "isCheckedIn": isCheckedIn.Bool,
                        "isLate": isLate.Bool, "lateMinutes": lateMin.Int64,
                },
        })
}

// ===== DRIVER OFFERS / ORDERS HANDLERS =====
func HandleDriverGetOffers(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        // Expire stale offers first
        DB.Exec("UPDATE dispatch_offers SET status = 'expired' WHERE driver_id = ? AND status = 'pending' AND expires_at < CURRENT_TIMESTAMP", c.DriverID)
        rows, _ := DB.Query(`SELECT o.id, o.order_id, o.offered_at, o.expires_at, o.distance_m,
                                    ord.order_number, ord.customer_name, ord.phone, ord.location_lat, ord.location_lng,
                                    ord.location_url, ord.location_address, ord.subtotal, ord.delivery_fee, ord.total,
                                    ord.payment_method, ord.status,
                                    r.name_ar AS restaurant_name, r.lat AS r_lat, r.lng AS r_lng, r.zone_id,
                                    z.name_ar AS zone_name,
                                    (SELECT GROUP_CONCAT(name || ' × ' || quantity, '، ') FROM order_items WHERE order_id = ord.id) AS items_summary
                             FROM dispatch_offers o
                             JOIN orders ord ON ord.id = o.order_id
                             LEFT JOIN restaurants r ON r.id = ord.restaurant_id
                             LEFT JOIN delivery_zones z ON z.id = r.zone_id
                             WHERE o.driver_id = ? AND o.status = 'pending'
                             ORDER BY o.offered_at DESC`, c.DriverID)
        var offers []map[string]interface{}
        for rows.Next() {
                var offerID, orderID, orderNum, custName, phone, locURL, locAddr, payMethod, status, restName, itemsSum sql.NullString
                var zoneID, zoneName sql.NullString
                var offeredAt, expiresAt sql.NullString
                var dist sql.NullInt64
                var lat, lng, rLat, rLng, subtotal, delFee, total sql.NullFloat64
                rows.Scan(&offerID, &orderID, &offeredAt, &expiresAt, &dist, &orderNum, &custName, &phone, &lat, &lng, &locURL, &locAddr, &subtotal, &delFee, &total, &payMethod, &status, &restName, &rLat, &rLng, &zoneID, &zoneName, &itemsSum)
                // Calculate driver fee preview based on driver's tier × zone
                var tierID sql.NullString
                DB.QueryRow("SELECT tier_id FROM drivers WHERE id = ?", c.DriverID).Scan(&tierID)
                deliveryDist := 0.0
                if rLat.Valid && lat.Valid { deliveryDist = haversineM(rLat.Float64, rLng.Float64, lat.Float64, lng.Float64) }
                driverFee := computeDriverFee(tierID.String, zoneID.String, deliveryDist)
                offers = append(offers, map[string]interface{}{
                        "offerId": offerID.String, "orderId": orderID.String,
                        "orderNumber": orderNum.String, "customerName": custName.String, "phone": phone.String,
                        "locationLat": lat.Float64, "locationLng": lng.Float64,
                        "locationUrl": locURL.String, "locationAddress": locAddr.String,
                        "subtotal": subtotal.Float64, "deliveryFee": delFee.Float64, "total": total.Float64,
                        "paymentMethod": payMethod.String, "status": status.String,
                        "restaurantName": restName.String, "restaurantLat": rLat.Float64, "restaurantLng": rLng.Float64,
                        "zoneName": zoneName.String,
                        "itemsSummary": itemsSum.String,
                        "offeredAt": offeredAt.String, "expiresAt": expiresAt.String,
                        "distanceM": dist.Int64,
                        "driverFee": driverFee,
                        "estimatedDeliveryDistanceM": int(deliveryDist),
                })
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"offers": offers})
}

func HandleDriverAcceptOffer(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        offerID := r.PathValue("id")
        var orderID, status sql.NullString
        var expiresAt sql.NullString
        DB.QueryRow("SELECT order_id, status, expires_at FROM dispatch_offers WHERE id = ? AND driver_id = ?", offerID, c.DriverID).Scan(&orderID, &status, &expiresAt)
        if !orderID.Valid { writeErr(w, 404, "العرض غير موجود"); return }
        if status.String != "pending" { writeErr(w, 400, "تم استخدام هذا العرض"); return }
        // Check if expired
        var expTime time.Time
        if expiresAt.Valid { expTime, _ = time.Parse(time.RFC3339, expiresAt.String) }
        if time.Now().After(expTime) {
                DB.Exec("UPDATE dispatch_offers SET status = 'expired', responded_at = CURRENT_TIMESTAMP WHERE id = ?", offerID)
                writeErr(w, 400, "انتهت صلاحية العرض"); return
        }
        // Check if another driver already accepted
        var exists string
        if DB.QueryRow("SELECT driver_id FROM dispatch_offers WHERE order_id = ? AND status = 'accepted'", orderID.String).Scan(&exists) == nil {
                DB.Exec("UPDATE dispatch_offers SET status = 'expired', responded_at = CURRENT_TIMESTAMP WHERE id = ?", offerID)
                writeErr(w, 409, "تم قبول الطلب من مندوب آخر"); return
        }
        // Accept
        acceptOfferInternal(offerID, c.DriverID, orderID.String)
        writeJSON(w, 200, map[string]interface{}{"success": true, "orderId": orderID.String})
}

func HandleDriverRejectOffer(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        offerID := r.PathValue("id")
        var orderID sql.NullString
        DB.QueryRow("SELECT order_id FROM dispatch_offers WHERE id = ? AND driver_id = ? AND status = 'pending'", offerID, c.DriverID).Scan(&orderID)
        if !orderID.Valid { writeErr(w, 404, "العرض غير موجود"); return }
        DB.Exec("UPDATE dispatch_offers SET status = 'rejected', responded_at = CURRENT_TIMESTAMP WHERE id = ?", offerID)
        // Increment rejected count
        DB.Exec("UPDATE driver_stats SET rejected_orders = rejected_orders + 1, total_orders = total_orders + 1, updated_at = CURRENT_TIMESTAMP WHERE driver_id = ?", c.DriverID)
        // Re-dispatch to other drivers (in background)
        go dispatchOrder(orderID.String)
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

func HandleDriverGetActiveOrder(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        var id, orderNum, custName, phone, locURL, locAddr, payMethod, status, restName sql.NullString
        var rLat, rLng, cLat, cLng, sub, delFee, total, driverFee sql.NullFloat64
        var dispatchDist, deliveryDist sql.NullInt64
        var createdAt sql.NullString
        err := DB.QueryRow(`SELECT o.id, o.order_number, o.customer_name, o.phone, o.location_url, o.location_address,
                                   o.payment_method, o.status, o.subtotal, o.delivery_fee, o.total, o.driver_fee,
                                   o.location_lat, o.location_lng, o.dispatch_distance_m, o.delivery_distance_m, o.created_at,
                                   r.name_ar, r.lat, r.lng
                            FROM orders o LEFT JOIN restaurants r ON r.id = o.restaurant_id
                            WHERE o.driver_id = ? AND o.status IN ('assigned','picked_up','on_the_way','delivering')`, c.DriverID).
                Scan(&id, &orderNum, &custName, &phone, &locURL, &locAddr, &payMethod, &status, &sub, &delFee, &total, &driverFee, &cLat, &cLng, &dispatchDist, &deliveryDist, &createdAt, &restName, &rLat, &rLng)
        if err != nil {
                writeJSON(w, 200, map[string]interface{}{"order": nil})
                return
        }
        // Get items
        var items []map[string]interface{}
        itemRows, _ := DB.Query("SELECT name, price, quantity FROM order_items WHERE order_id = ?", id.String)
        for itemRows.Next() {
                var n string; var p float64; var q int
                itemRows.Scan(&n, &p, &q)
                items = append(items, map[string]interface{}{"name": n, "price": p, "quantity": q})
        }
        itemRows.Close()
        writeJSON(w, 200, map[string]interface{}{
                "order": map[string]interface{}{
                        "id": id.String, "orderNumber": orderNum.String,
                        "customerName": custName.String, "phone": phone.String,
                        "locationUrl": locURL.String, "locationAddress": locAddr.String,
                        "locationLat": cLat.Float64, "locationLng": cLng.Float64,
                        "paymentMethod": payMethod.String, "status": status.String,
                        "subtotal": sub.Float64, "deliveryFee": delFee.Float64, "total": total.Float64,
                        "driverFee": driverFee.Float64,
                        "dispatchDistanceM": dispatchDist.Int64, "deliveryDistanceM": deliveryDist.Int64,
                        "createdAt": createdAt.String,
                        "restaurantName": restName.String, "restaurantLat": rLat.Float64, "restaurantLng": rLng.Float64,
                        "items": items,
                },
        })
}

func HandleDriverPickedUp(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        orderID := r.PathValue("id")
        // Verify order belongs to driver and status is assigned
        var status sql.NullString
        DB.QueryRow("SELECT o.status FROM orders o WHERE o.id = ? AND o.driver_id = ?", orderID, c.DriverID).Scan(&status)
        if !status.Valid { writeErr(w, 404, "الطلب غير موجود"); return }
        if status.String != "assigned" { writeErr(w, 400, "لا يمكن الاستلام في هذه المرحلة"); return }
        // Check geofence (70m from restaurant)
        var dLat, dLng sql.NullFloat64
        DB.QueryRow("SELECT lat, lng FROM drivers WHERE id = ?", c.DriverID).Scan(&dLat, &dLng)
        if !dLat.Valid { writeErr(w, 400, "لم يتم العثور على موقعك الحالي"); return }
        geofence := getSettingInt("pickup_geofence_m", 70)
        var restLat, restLng float64
        DB.QueryRow("SELECT lat, lng FROM restaurants r JOIN orders o ON o.restaurant_id = r.id WHERE o.id = ?", orderID).Scan(&restLat, &restLng)
        dist := haversineM(dLat.Float64, dLng.Float64, restLat, restLng)
        if dist > float64(geofence) {
                writeErr(w, 400, fmt.Sprintf("اقترب من المطعم - المسافة الحالية %d متر (مطلوب أقل من %d متر)", int(dist), geofence))
                return
        }
        DB.Exec("UPDATE orders SET status = 'picked_up', updated_at = CURRENT_TIMESTAMP WHERE id = ?", orderID)
        writeJSON(w, 200, map[string]interface{}{"success": true, "status": "picked_up", "distance": int(dist)})
}

func HandleDriverArrived(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        orderID := r.PathValue("id")
        var status sql.NullString
        DB.QueryRow("SELECT status FROM orders WHERE id = ? AND driver_id = ?", orderID, c.DriverID).Scan(&status)
        if !status.Valid { writeErr(w, 404, "الطلب غير موجود"); return }
        if status.String != "picked_up" && status.String != "on_the_way" { writeErr(w, 400, "لا يمكن التأكيد في هذه المرحلة"); return }
        if status.String == "picked_up" {
                DB.Exec("UPDATE orders SET status = 'on_the_way', updated_at = CURRENT_TIMESTAMP WHERE id = ?", orderID)
        }
        writeJSON(w, 200, map[string]interface{}{"success": true, "status": "on_the_way"})
}

func HandleDriverDelivered(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        orderID := r.PathValue("id")
        var status sql.NullString
        var cLat, cLng sql.NullFloat64
        var driverFee sql.NullFloat64
        DB.QueryRow("SELECT status, location_lat, location_lng, driver_fee FROM orders WHERE id = ? AND driver_id = ?", orderID, c.DriverID).Scan(&status, &cLat, &cLng, &driverFee)
        if !status.Valid { writeErr(w, 404, "الطلب غير موجود"); return }
        if status.String != "on_the_way" && status.String != "picked_up" { writeErr(w, 400, "لا يمكن التسليم في هذه المرحلة"); return }
        // Check geofence (50m from customer)
        var dLat, dLng sql.NullFloat64
        DB.QueryRow("SELECT lat, lng FROM drivers WHERE id = ?", c.DriverID).Scan(&dLat, &dLng)
        if !dLat.Valid || !cLat.Valid { writeErr(w, 400, "الموقع غير متاح"); return }
        geofence := getSettingInt("delivery_geofence_m", 50)
        dist := haversineM(dLat.Float64, dLng.Float64, cLat.Float64, cLng.Float64)
        if dist > float64(geofence) {
                writeErr(w, 400, fmt.Sprintf("اقترب من العميل - المسافة الحالية %d متر (مطلوب أقل من %d متر)", int(dist), geofence))
                return
        }
        DB.Exec("UPDATE orders SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = ?", orderID)
        // Update driver stats: completed+1, on_time+1 (assume on-time for now), earnings += driver_fee
        DB.Exec(`UPDATE driver_stats SET completed_orders = completed_orders + 1, on_time_count = on_time_count + 1, total_earnings = total_earnings + ?, updated_at = CURRENT_TIMESTAMP WHERE driver_id = ?`,
                driverFee.Float64, c.DriverID)
        // Re-evaluate tier
        go evaluateDriverTier(c.DriverID)
        writeJSON(w, 200, map[string]interface{}{"success": true, "status": "delivered", "earnings": driverFee.Float64})
}

// ===== DRIVER EARNINGS / HISTORY =====
func HandleDriverEarnings(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        period := r.URL.Query().Get("period")
        if period == "" { period = "today" }
        var periodClause string
        switch period {
        case "today":
                periodClause = "AND date(o.created_at) = date('now')"
        case "week":
                periodClause = "AND o.created_at >= datetime('now', '-7 days')"
        case "month":
                periodClause = "AND o.created_at >= datetime('now', '-30 days')"
        default:
                periodClause = ""
        }
        var total sql.NullFloat64
        var count sql.NullInt64
        DB.QueryRow("SELECT COALESCE(SUM(driver_fee), 0), COUNT(*) FROM orders WHERE driver_id = ? AND status = 'delivered' "+periodClause, c.DriverID).Scan(&total, &count)
        writeJSON(w, 200, map[string]interface{}{
                "period": period,
                "totalEarnings": total.Float64,
                "completedOrders": count.Int64,
        })
}

func HandleDriverHistory(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        page, _ := strconv.Atoi(r.URL.Query().Get("page"))
        if page < 1 { page = 1 }
        limit := 20
        offset := (page - 1) * limit
        rows, _ := DB.Query(`SELECT o.id, o.order_number, o.status, o.driver_fee, o.created_at, r.name_ar
                             FROM orders o LEFT JOIN restaurants r ON r.id = o.restaurant_id
                             WHERE o.driver_id = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?`, c.DriverID, limit, offset)
        var orders []map[string]interface{}
        for rows.Next() {
                var id, onum, status sql.NullString; var fee sql.NullFloat64; var ct sql.NullString; var rname sql.NullString
                rows.Scan(&id, &onum, &status, &fee, &ct, &rname)
                orders = append(orders, map[string]interface{}{
                        "id": id.String, "orderNumber": onum.String, "status": status.String,
                        "earnings": fee.Float64, "createdAt": ct.String, "restaurantName": rname.String,
                })
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"orders": orders, "page": page})
}

// ===== DRIVER SUPPORT TICKETS =====
func HandleDriverCreateTicket(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        var b struct{ OrderID, Type, Reason string }
        json.NewDecoder(r.Body).Decode(&b)
        if b.Reason == "" { writeErr(w, 400, "السبب مطلوب"); return }
        validTypes := map[string]bool{"cancellation_request": true, "complaint": true, "other": true}
        if !validTypes[b.Type] { b.Type = "other" }
        id := uuid.New().String()
        var orderID interface{}
        if b.OrderID != "" { orderID = b.OrderID }
        DB.Exec("INSERT INTO support_tickets (id, driver_id, order_id, type, reason, status) VALUES (?, ?, ?, ?, ?, 'open')", id, c.DriverID, orderID, b.Type, b.Reason)
        writeJSON(w, 201, map[string]interface{}{"id": id})
}

func HandleDriverGetTickets(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        rows, _ := DB.Query("SELECT id, order_id, type, reason, status, created_at, resolved_at FROM support_tickets WHERE driver_id = ? ORDER BY created_at DESC", c.DriverID)
        var tickets []map[string]interface{}
        for rows.Next() {
                var id, typ, reason, status sql.NullString; var oid sql.NullString; var ct, rt sql.NullString
                rows.Scan(&id, &oid, &typ, &reason, &status, &ct, &rt)
                tickets = append(tickets, map[string]interface{}{
                        "id": id.String, "orderId": oid.String, "type": typ.String,
                        "reason": reason.String, "status": status.String,
                        "createdAt": ct.String, "resolvedAt": rt.String,
                })
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"tickets": tickets})
}

func HandleDriverGetTicket(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        ticketID := r.PathValue("id")
        var typ, reason, status sql.NullString; var oid sql.NullString; var ct, rt sql.NullString
        DB.QueryRow("SELECT type, reason, status, order_id, created_at, resolved_at FROM support_tickets WHERE id = ? AND driver_id = ?", ticketID, c.DriverID).Scan(&typ, &reason, &status, &oid, &ct, &rt)
        if !typ.Valid { writeErr(w, 404, "التذكرة غير موجودة"); return }
        rows, _ := DB.Query("SELECT id, sender, body, created_at FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC", ticketID)
        var msgs []map[string]interface{}
        for rows.Next() {
                var mid, sender, body sql.NullString; var mct sql.NullString
                rows.Scan(&mid, &sender, &body, &mct)
                msgs = append(msgs, map[string]interface{}{
                        "id": mid.String, "sender": sender.String, "body": body.String, "createdAt": mct.String,
                })
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{
                "ticket": map[string]interface{}{
                        "id": ticketID, "type": typ.String, "reason": reason.String,
                        "status": status.String, "orderId": oid.String,
                        "createdAt": ct.String, "resolvedAt": rt.String,
                },
                "messages": msgs,
        })
}

func HandleDriverSendMessage(w http.ResponseWriter, r *http.Request) {
        c := GetDriver(r)
        if c == nil { writeErr(w, 401, "غير مصرح"); return }
        ticketID := r.PathValue("id")
        var b struct{ Body string }
        json.NewDecoder(r.Body).Decode(&b)
        if b.Body == "" { writeErr(w, 400, "الرسالة فارغة"); return }
        var status sql.NullString
        DB.QueryRow("SELECT status FROM support_tickets WHERE id = ? AND driver_id = ?", ticketID, c.DriverID).Scan(&status)
        if !status.Valid { writeErr(w, 404, "التذكرة غير موجودة"); return }
        if status.String == "resolved" { writeErr(w, 400, "التذكرة مغلقة"); return }
        mid := uuid.New().String()
        DB.Exec("INSERT INTO support_messages (id, ticket_id, sender, body) VALUES (?, ?, 'driver', ?)", mid, ticketID, b.Body)
        writeJSON(w, 201, map[string]interface{}{"id": mid})
}

// ===== ADMIN: ZONES =====
func HandleAdminGetZones(w http.ResponseWriter, r *http.Request) {
        rows, _ := DB.Query("SELECT id, name, name_ar, center_lat, center_lng, radius_m, is_active, created_at FROM delivery_zones ORDER BY created_at ASC")
        var zones []map[string]interface{}
        for rows.Next() {
                var id, name, nameAr sql.NullString; var lat, lng sql.NullFloat64; var rad sql.NullInt64; var active sql.NullBool; var ct sql.NullString
                rows.Scan(&id, &name, &nameAr, &lat, &lng, &rad, &active, &ct)
                zones = append(zones, map[string]interface{}{
                        "id": id.String, "name": name.String, "nameAr": nameAr.String,
                        "centerLat": lat.Float64, "centerLng": lng.Float64, "radiusM": rad.Int64,
                        "isActive": active.Bool, "createdAt": ct.String,
                })
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"zones": zones})
}
func HandleAdminCreateZone(w http.ResponseWriter, r *http.Request) {
        var b struct{ Name, NameAr string; CenterLat, CenterLng float64; RadiusM int }
        json.NewDecoder(r.Body).Decode(&b)
        if b.NameAr == "" { writeErr(w, 400, "الاسم مطلوب"); return }
        id := "zone-" + uuid.New().String()[:8]
        DB.Exec("INSERT INTO delivery_zones (id, name, name_ar, center_lat, center_lng, radius_m, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)", id, b.Name, b.NameAr, b.CenterLat, b.CenterLng, b.RadiusM)
        writeJSON(w, 201, map[string]interface{}{"id": id})
}
func HandleAdminUpdateZone(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        var b struct{ Name, NameAr string; CenterLat, CenterLng float64; RadiusM int; IsActive *bool }
        json.NewDecoder(r.Body).Decode(&b)
        DB.Exec("UPDATE delivery_zones SET name = COALESCE(NULLIF(?, ''), name), name_ar = COALESCE(NULLIF(?, ''), name_ar), center_lat = COALESCE(NULLIF(?, 0), center_lat), center_lng = COALESCE(NULLIF(?, 0), center_lng), radius_m = COALESCE(NULLIF(?, 0), radius_m) WHERE id = ?",
                b.Name, b.NameAr, b.CenterLat, b.CenterLng, b.RadiusM, id)
        if b.IsActive != nil { DB.Exec("UPDATE delivery_zones SET is_active = ? WHERE id = ?", *b.IsActive, id) }
        writeJSON(w, 200, map[string]interface{}{"success": true})
}
func HandleAdminDeleteZone(w http.ResponseWriter, r *http.Request) {
        DB.Exec("UPDATE delivery_zones SET is_active = 0 WHERE id = ?", r.PathValue("id"))
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

// ===== ADMIN: TIERS =====
func HandleAdminGetTiers(w http.ResponseWriter, r *http.Request) {
        rows, _ := DB.Query(`SELECT t.id, t.code, t.name_ar, t.sort_order, t.color, t.is_active,
                                    th.min_acceptance_rate, th.min_completion_rate, th.min_customer_rating,
                                    th.min_on_time_rate, th.min_shift_adherence, th.min_lifetime_orders
                             FROM driver_tiers t LEFT JOIN tier_thresholds th ON th.tier_id = t.id
                             ORDER BY t.sort_order ASC`)
        var tiers []map[string]interface{}
        for rows.Next() {
                var id, code, nameAr, color sql.NullString; var sort sql.NullInt64; var active sql.NullBool
                var acc, comp, rating, onT, shift sql.NullFloat64; var life sql.NullInt64
                rows.Scan(&id, &code, &nameAr, &sort, &color, &active, &acc, &comp, &rating, &onT, &shift, &life)
                tiers = append(tiers, map[string]interface{}{
                        "id": id.String, "code": code.String, "nameAr": nameAr.String,
                        "sortOrder": sort.Int64, "color": color.String, "isActive": active.Bool,
                        "thresholds": map[string]interface{}{
                                "minAcceptanceRate": acc.Float64, "minCompletionRate": comp.Float64,
                                "minCustomerRating": rating.Float64, "minOnTimeRate": onT.Float64,
                                "minShiftAdherence": shift.Float64, "minLifetimeOrders": life.Int64,
                        },
                })
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"tiers": tiers})
}
func HandleAdminCreateTier(w http.ResponseWriter, r *http.Request) {
        var b struct{ Code, NameAr, Color string; SortOrder int }
        json.NewDecoder(r.Body).Decode(&b)
        if b.Code == "" || b.NameAr == "" { writeErr(w, 400, "الكود والاسم مطلوبان"); return }
        id := "tier-" + b.Code
        DB.Exec("INSERT INTO driver_tiers (id, code, name_ar, sort_order, color, is_active) VALUES (?, ?, ?, ?, ?, 1)", id, b.Code, b.NameAr, b.SortOrder, b.Color)
        DB.Exec("INSERT INTO tier_thresholds (id, tier_id) VALUES (?, ?)", "th-"+id, id)
        writeJSON(w, 201, map[string]interface{}{"id": id})
}
func HandleAdminUpdateTier(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        var b struct{ NameAr, Color string; SortOrder int; IsActive *bool }
        json.NewDecoder(r.Body).Decode(&b)
        DB.Exec("UPDATE driver_tiers SET name_ar = COALESCE(NULLIF(?, ''), name_ar), color = COALESCE(NULLIF(?, ''), color), sort_order = COALESCE(NULLIF(?, 0), sort_order) WHERE id = ?", b.NameAr, b.Color, b.SortOrder, id)
        if b.IsActive != nil { DB.Exec("UPDATE driver_tiers SET is_active = ? WHERE id = ?", *b.IsActive, id) }
        writeJSON(w, 200, map[string]interface{}{"success": true})
}
func HandleAdminUpdateTierThresholds(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        var b struct{ MinAcceptanceRate, MinCompletionRate, MinCustomerRating, MinOnTimeRate, MinShiftAdherence float64; MinLifetimeOrders int }
        json.NewDecoder(r.Body).Decode(&b)
        DB.Exec(`INSERT INTO tier_thresholds (id, tier_id, min_acceptance_rate, min_completion_rate, min_customer_rating, min_on_time_rate, min_shift_adherence, min_lifetime_orders, updated_at)
                 VALUES ('th-'+?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(id) DO UPDATE SET min_acceptance_rate=excluded.min_acceptance_rate, min_completion_rate=excluded.min_completion_rate,
                 min_customer_rating=excluded.min_customer_rating, min_on_time_rate=excluded.min_on_time_rate,
                 min_shift_adherence=excluded.min_shift_adherence, min_lifetime_orders=excluded.min_lifetime_orders, updated_at=CURRENT_TIMESTAMP`,
                id, id, b.MinAcceptanceRate, b.MinCompletionRate, b.MinCustomerRating, b.MinOnTimeRate, b.MinShiftAdherence, b.MinLifetimeOrders)
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

// ===== ADMIN: TIER-PRICES (matrix) =====
func HandleAdminGetTierPrices(w http.ResponseWriter, r *http.Request) {
        zoneID := r.URL.Query().Get("zone_id")
        q := `SELECT id, tier_id, zone_id, base_fee, per_km_fee, min_fee, max_fee, free_above, estimated_minutes, is_active FROM tier_zone_prices`
        args := []interface{}{}
        if zoneID != "" { q += " WHERE zone_id = ?"; args = append(args, zoneID) }
        rows, _ := DB.Query(q, args...)
        var prices []map[string]interface{}
        for rows.Next() {
                var id, tierID, zoneID sql.NullString; var base, perKm, mn, mx, free sql.NullFloat64; var est sql.NullInt64; var active sql.NullBool
                rows.Scan(&id, &tierID, &zoneID, &base, &perKm, &mn, &mx, &free, &est, &active)
                prices = append(prices, map[string]interface{}{
                        "id": id.String, "tierId": tierID.String, "zoneId": zoneID.String,
                        "baseFee": base.Float64, "perKmFee": perKm.Float64,
                        "minFee": mn.Float64, "maxFee": mx.Float64, "freeAbove": free.Float64,
                        "estimatedMinutes": est.Int64, "isActive": active.Bool,
                })
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"prices": prices})
}
func HandleAdminUpdateTierPrice(w http.ResponseWriter, r *http.Request) {
        tierID := r.PathValue("tier_id")
        zoneID := r.PathValue("zone_id")
        var b struct{ BaseFee, PerKmFee, MinFee, MaxFee, FreeAbove float64; EstimatedMinutes int; IsActive *bool }
        json.NewDecoder(r.Body).Decode(&b)
        DB.Exec(`INSERT INTO tier_zone_prices (id, tier_id, zone_id, base_fee, per_km_fee, min_fee, max_fee, free_above, estimated_minutes, is_active, updated_at)
                 VALUES ('tp-'||?||'-'||?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
                 ON CONFLICT(tier_id, zone_id) DO UPDATE SET base_fee=excluded.base_fee, per_km_fee=excluded.per_km_fee,
                 min_fee=excluded.min_fee, max_fee=excluded.max_fee, free_above=excluded.free_above,
                 estimated_minutes=excluded.estimated_minutes, updated_at=CURRENT_TIMESTAMP`,
                tierID, zoneID, tierID, zoneID, b.BaseFee, b.PerKmFee, b.MinFee, b.MaxFee, b.FreeAbove, b.EstimatedMinutes)
        if b.IsActive != nil { DB.Exec("UPDATE tier_zone_prices SET is_active = ? WHERE tier_id = ? AND zone_id = ?", *b.IsActive, tierID, zoneID) }
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

// ===== ADMIN: DRIVER APPLICATIONS =====
func HandleAdminGetApplications(w http.ResponseWriter, r *http.Request) {
        rows, _ := DB.Query(`SELECT id, name, phone, national_id, license_number, vehicle_type, vehicle_plate, address, emergency_phone,
                                    national_id_photo, license_photo, vehicle_photo, status, rejection_reason, submitted_at, reviewed_at, driver_id
                             FROM driver_applications ORDER BY submitted_at DESC`)
        var apps []map[string]interface{}
        for rows.Next() {
                var id, name, phone, nat, lic, vt, plate, addr, emPhone, nPhoto, lPhoto, vPhoto, status, reason sql.NullString
                var submitted, reviewed sql.NullString; var driverID sql.NullString
                rows.Scan(&id, &name, &phone, &nat, &lic, &vt, &plate, &addr, &emPhone, &nPhoto, &lPhoto, &vPhoto, &status, &reason, &submitted, &reviewed, &driverID)
                apps = append(apps, map[string]interface{}{
                        "id": id.String, "name": name.String, "phone": phone.String,
                        "nationalId": nat.String, "licenseNumber": lic.String, "vehicleType": vt.String,
                        "vehiclePlate": plate.String, "address": addr.String, "emergencyPhone": emPhone.String,
                        "nationalIdPhoto": nPhoto.String, "licensePhoto": lPhoto.String, "vehiclePhoto": vPhoto.String,
                        "status": status.String, "rejectionReason": reason.String,
                        "submittedAt": submitted.String, "reviewedAt": reviewed.String, "driverId": driverID.String,
                })
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"applications": apps})
}
func HandleAdminCreateApplication(w http.ResponseWriter, r *http.Request) {
        c := GetUser(r)
        var b struct{ Name, Phone, NationalID, LicenseNumber, VehicleType, VehiclePlate, Address, EmergencyPhone string }
        json.NewDecoder(r.Body).Decode(&b)
        if b.Name == "" || b.Phone == "" || b.NationalID == "" || b.LicenseNumber == "" {
                writeErr(w, 400, "البيانات الأساسية مطلوبة"); return
        }
        p := cleanPhone(b.Phone)
        if !validPhone(p) { writeErr(w, 400, "رقم الهاتف غير صالح"); return }
        id := "app-" + uuid.New().String()[:8]
        var submittedBy interface{}
        if c != nil { submittedBy = c.UserID }
        DB.Exec(`INSERT INTO driver_applications (id, name, phone, national_id, license_number, vehicle_type, vehicle_plate, address, emergency_phone, status, submitted_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`, id, b.Name, p, b.NationalID, b.LicenseNumber, b.VehicleType, b.VehiclePlate, b.Address, b.EmergencyPhone, submittedBy)
        writeJSON(w, 201, map[string]interface{}{"id": id})
}
func HandleAdminVerifyApplication(w http.ResponseWriter, r *http.Request) {
        c := GetUser(r)
        appID := r.PathValue("id")
        var name, phone, natID, licNum, vt sql.NullString
        DB.QueryRow("SELECT name, phone, national_id, license_number, vehicle_type FROM driver_applications WHERE id = ? AND status = 'pending'", appID).Scan(&name, &phone, &natID, &licNum, &vt)
        if !name.Valid { writeErr(w, 404, "الطلب غير موجود أو تمت معالجته"); return }
        // Create driver account - default password = national_id
        hash, _ := HashPassword(natID.String)
        driverID := "driver-" + uuid.New().String()[:8]
        // Get starter tier id
        var starterID sql.NullString
        DB.QueryRow("SELECT id FROM driver_tiers ORDER BY sort_order ASC LIMIT 1").Scan(&starterID)
        DB.Exec(`INSERT INTO drivers (id, name, phone, password_hash, vehicle_type, license_number, national_id, tier_id, is_active, is_verified, must_change_password)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)`, driverID, name.String, phone.String, hash, vt.String, licNum.String, natID.String, starterID.String)
        DB.Exec("INSERT INTO driver_stats (driver_id, period_starts) VALUES (?, CURRENT_TIMESTAMP)", driverID)
        DB.Exec("UPDATE driver_applications SET status = 'verified', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?, driver_id = ? WHERE id = ?", c.UserID, driverID, appID)
        writeJSON(w, 200, map[string]interface{}{"success": true, "driverId": driverID, "initialPassword": natID.String})
}
func HandleAdminRejectApplication(w http.ResponseWriter, r *http.Request) {
        c := GetUser(r)
        var b struct{ Reason string }
        json.NewDecoder(r.Body).Decode(&b)
        DB.Exec("UPDATE driver_applications SET status = 'rejected', rejection_reason = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?", b.Reason, c.UserID, r.PathValue("id"))
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

// ===== ADMIN: DRIVERS =====
func HandleAdminGetDrivers(w http.ResponseWriter, r *http.Request) {
        rows, _ := DB.Query(`SELECT d.id, d.name, d.phone, d.vehicle_type, d.tier_id, dt.name_ar AS tier_name, dt.color AS tier_color, dt.sort_order,
                                    d.is_online, d.is_active, d.is_verified, d.auto_accept, d.lat, d.lng, d.last_seen_at, d.created_at,
                                    (SELECT completed_orders FROM driver_stats WHERE driver_id = d.id) AS completed,
                                    (SELECT total_earnings FROM driver_stats WHERE driver_id = d.id) AS earnings
                             FROM drivers d LEFT JOIN driver_tiers dt ON dt.id = d.tier_id ORDER BY d.created_at DESC`)
        var drivers []map[string]interface{}
        for rows.Next() {
                var id, name, phone, vt, tierID, tierName, tierColor sql.NullString
                var tierSort sql.NullInt64
                var online, active, verified, autoAccept sql.NullBool
                var lat, lng sql.NullFloat64
                var lastSeen, createdAt sql.NullString
                var completed sql.NullInt64
                var earnings sql.NullFloat64
                rows.Scan(&id, &name, &phone, &vt, &tierID, &tierName, &tierColor, &tierSort, &online, &active, &verified, &autoAccept, &lat, &lng, &lastSeen, &createdAt, &completed, &earnings)
                drivers = append(drivers, map[string]interface{}{
                        "id": id.String, "name": name.String, "phone": phone.String,
                        "vehicleType": vt.String,
                        "tierId": tierID.String, "tierName": tierName.String, "tierColor": tierColor.String, "tierSortOrder": tierSort.Int64,
                        "isOnline": online.Bool, "isActive": active.Bool, "isVerified": verified.Bool, "autoAccept": autoAccept.Bool,
                        "lat": lat.Float64, "lng": lng.Float64,
                        "lastSeen": lastSeen.String, "createdAt": createdAt.String,
                        "completedOrders": completed.Int64, "totalEarnings": earnings.Float64,
                })
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"drivers": drivers})
}
func HandleAdminUpdateDriverStatus(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        var b struct{ IsActive *bool }
        json.NewDecoder(r.Body).Decode(&b)
        if b.IsActive != nil { DB.Exec("UPDATE drivers SET is_active = ? WHERE id = ?", *b.IsActive, id) }
        writeJSON(w, 200, map[string]interface{}{"success": true})
}
func HandleAdminUpdateDriverTier(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        var b struct{ TierID string }
        json.NewDecoder(r.Body).Decode(&b)
        var oldTier sql.NullString
        DB.QueryRow("SELECT tier_id FROM drivers WHERE id = ?", id).Scan(&oldTier)
        DB.Exec("UPDATE drivers SET tier_id = ?, tier_evaluated_at = CURRENT_TIMESTAMP WHERE id = ?", b.TierID, id)
        DB.Exec("INSERT INTO driver_tier_history (id, driver_id, from_tier_id, to_tier_id, reason) VALUES (?, ?, ?, ?, ?)", uuid.New().String(), id, oldTier.String, b.TierID, "manual_admin")
        writeJSON(w, 200, map[string]interface{}{"success": true})
}
func HandleAdminGetDriverTierHistory(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        rows, _ := DB.Query(`SELECT h.id, h.from_tier_id, ft.name_ar AS from_name, h.to_tier_id, tt.name_ar AS to_name, h.reason, h.evaluated_at
                             FROM driver_tier_history h
                             LEFT JOIN driver_tiers ft ON ft.id = h.from_tier_id
                             LEFT JOIN driver_tiers tt ON tt.id = h.to_tier_id
                             WHERE h.driver_id = ? ORDER BY h.evaluated_at DESC`, id)
        var hist []map[string]interface{}
        for rows.Next() {
                var hid, fromID, fromName, toID, toName, reason sql.NullString; var at sql.NullString
                rows.Scan(&hid, &fromID, &fromName, &toID, &toName, &reason, &at)
                hist = append(hist, map[string]interface{}{
                        "id": hid.String, "fromTierId": fromID.String, "fromTierName": fromName.String,
                        "toTierId": toID.String, "toTierName": toName.String, "reason": reason.String, "evaluatedAt": at.String,
                })
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"history": hist})
}

// ===== ADMIN: DRIVER SHIFTS =====
func HandleAdminCreateShift(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        var b struct{ ZoneID, ShiftDate, StartTime, EndTime string }
        json.NewDecoder(r.Body).Decode(&b)
        if b.ShiftDate == "" || b.StartTime == "" || b.EndTime == "" { writeErr(w, 400, "بيانات الوردية ناقصة"); return }
        sid := "shift-" + uuid.New().String()[:8]
        DB.Exec("INSERT INTO driver_shifts (id, driver_id, zone_id, shift_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, 'scheduled')", sid, id, b.ZoneID, b.ShiftDate, b.StartTime, b.EndTime)
        DB.Exec("UPDATE driver_stats SET shift_scheduled = shift_scheduled + 1 WHERE driver_id = ?", id)
        writeJSON(w, 201, map[string]interface{}{"id": sid})
}
func HandleAdminGetShifts(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        rows, _ := DB.Query(`SELECT s.id, s.driver_id, s.zone_id, z.name_ar AS zone_name, s.shift_date, s.start_time, s.end_time,
                                    s.checked_in_at, s.checked_out_at, s.is_late, s.late_minutes, s.status, s.created_at
                             FROM driver_shifts s LEFT JOIN delivery_zones z ON z.id = s.zone_id
                             WHERE s.driver_id = ? ORDER BY s.shift_date DESC, s.start_time DESC`, id)
        var shifts []map[string]interface{}
        for rows.Next() {
                var sid, did, zid, zname, sdate, stime, etime, ct, cot, status, createdAt sql.NullString
                var isLate sql.NullBool; var lateMin sql.NullInt64
                rows.Scan(&sid, &did, &zid, &zname, &sdate, &stime, &etime, &ct, &cot, &isLate, &lateMin, &status, &createdAt)
                shifts = append(shifts, map[string]interface{}{
                        "id": sid.String, "driverId": did.String, "zoneId": zid.String, "zoneName": zname.String,
                        "shiftDate": sdate.String, "startTime": stime.String, "endTime": etime.String,
                        "checkedInAt": ct.String, "checkedOutAt": cot.String,
                        "isLate": isLate.Bool, "lateMinutes": lateMin.Int64, "status": status.String,
                        "createdAt": createdAt.String,
                })
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"shifts": shifts})
}

// ===== ADMIN: SUPPORT TICKETS =====
func HandleAdminGetTickets(w http.ResponseWriter, r *http.Request) {
        rows, _ := DB.Query(`SELECT t.id, t.driver_id, d.name AS driver_name, t.order_id, t.type, t.reason, t.status, t.admin_notes, t.created_at, t.resolved_at
                             FROM support_tickets t LEFT JOIN drivers d ON d.id = t.driver_id
                             ORDER BY t.created_at DESC`)
        var tickets []map[string]interface{}
        for rows.Next() {
                var id, did, dname, oid, typ, reason, status, notes sql.NullString; var ct, rt sql.NullString
                rows.Scan(&id, &did, &dname, &oid, &typ, &reason, &status, &notes, &ct, &rt)
                tickets = append(tickets, map[string]interface{}{
                        "id": id.String, "driverId": did.String, "driverName": dname.String,
                        "orderId": oid.String, "type": typ.String, "reason": reason.String,
                        "status": status.String, "adminNotes": notes.String,
                        "createdAt": ct.String, "resolvedAt": rt.String,
                })
        }
        rows.Close()
        writeJSON(w, 200, map[string]interface{}{"tickets": tickets})
}
func HandleAdminResolveTicket(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        var b struct{ AdminNotes string }
        json.NewDecoder(r.Body).Decode(&b)
        DB.Exec("UPDATE support_tickets SET status = 'resolved', admin_notes = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?", b.AdminNotes, id)
        writeJSON(w, 200, map[string]interface{}{"success": true})
}
func HandleAdminSendMessage(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        var b struct{ Body string }
        json.NewDecoder(r.Body).Decode(&b)
        if b.Body == "" { writeErr(w, 400, "الرسالة فارغة"); return }
        mid := uuid.New().String()
        DB.Exec("INSERT INTO support_messages (id, ticket_id, sender, body) VALUES (?, ?, 'admin', ?)", mid, id, b.Body)
        writeJSON(w, 201, map[string]interface{}{"id": mid})
}
func HandleAdminCancelOrder(w http.ResponseWriter, r *http.Request) {
        // Admin approves a driver's cancellation request
        ticketID := r.PathValue("id")
        var oid sql.NullString
        DB.QueryRow("SELECT order_id FROM support_tickets WHERE id = ? AND type = 'cancellation_request'", ticketID).Scan(&oid)
        if !oid.Valid { writeErr(w, 404, "تذكرة الإلغاء غير موجودة"); return }
        DB.Exec("UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?", oid.String)
        DB.Exec("UPDATE support_tickets SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, admin_notes = 'تم إلغاء الطلب' WHERE id = ?", ticketID)
        // Free the driver
        var did sql.NullString
        DB.QueryRow("SELECT driver_id FROM orders WHERE id = ?", oid.String).Scan(&did)
        if did.Valid { DB.Exec("UPDATE driver_stats SET cancelled_by_support = cancelled_by_support + 1 WHERE driver_id = ?", did.String) }
        writeJSON(w, 200, map[string]interface{}{"success": true})
}

// ===== MAIN =====
func main() {
        if err := InitDB(); err != nil { log.Fatalf("❌ DB: %v", err) }
        Seed()

        mux := http.NewServeMux()

        // Public
        mux.HandleFunc("GET /api/health", HandleHealth)
        mux.HandleFunc("GET /api/restaurants", HandleGetRestaurants)
        mux.HandleFunc("GET /api/restaurants/{id}", HandleGetRestaurant)
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

        // ===== Driver Auth =====
        mux.HandleFunc("POST /api/driver/auth/login", HandleDriverLogin)
        mux.Handle("POST /api/driver/auth/change-password", DriverAuthMW(http.HandlerFunc(HandleDriverChangePassword)))
        mux.Handle("GET /api/driver/me", DriverAuthMW(http.HandlerFunc(HandleDriverMe)))
        mux.Handle("PATCH /api/driver/online", DriverAuthMW(http.HandlerFunc(HandleDriverToggleOnline)))
        mux.Handle("PATCH /api/driver/location", DriverAuthMW(http.HandlerFunc(HandleDriverUpdateLocation)))
        mux.Handle("PATCH /api/driver/auto-accept", DriverAuthMW(http.HandlerFunc(HandleDriverToggleAutoAccept)))
        mux.Handle("GET /api/driver/shift", DriverAuthMW(http.HandlerFunc(HandleDriverGetShift)))

        // ===== Driver Offers / Orders =====
        mux.Handle("GET /api/driver/offers", DriverAuthMW(http.HandlerFunc(HandleDriverGetOffers)))
        mux.Handle("POST /api/driver/offers/{id}/accept", DriverAuthMW(http.HandlerFunc(HandleDriverAcceptOffer)))
        mux.Handle("POST /api/driver/offers/{id}/reject", DriverAuthMW(http.HandlerFunc(HandleDriverRejectOffer)))
        mux.Handle("GET /api/driver/active-order", DriverAuthMW(http.HandlerFunc(HandleDriverGetActiveOrder)))
        mux.Handle("POST /api/driver/orders/{id}/picked-up", DriverAuthMW(http.HandlerFunc(HandleDriverPickedUp)))
        mux.Handle("POST /api/driver/orders/{id}/arrived", DriverAuthMW(http.HandlerFunc(HandleDriverArrived)))
        mux.Handle("POST /api/driver/orders/{id}/delivered", DriverAuthMW(http.HandlerFunc(HandleDriverDelivered)))

        // ===== Driver Earnings / History =====
        mux.Handle("GET /api/driver/earnings", DriverAuthMW(http.HandlerFunc(HandleDriverEarnings)))
        mux.Handle("GET /api/driver/history", DriverAuthMW(http.HandlerFunc(HandleDriverHistory)))

        // ===== Driver Support =====
        mux.Handle("GET /api/driver/support/tickets", DriverAuthMW(http.HandlerFunc(HandleDriverGetTickets)))
        mux.Handle("POST /api/driver/support/tickets", DriverAuthMW(http.HandlerFunc(HandleDriverCreateTicket)))
        mux.Handle("GET /api/driver/support/tickets/{id}", DriverAuthMW(http.HandlerFunc(HandleDriverGetTicket)))
        mux.Handle("POST /api/driver/support/tickets/{id}/messages", DriverAuthMW(http.HandlerFunc(HandleDriverSendMessage)))

        // ===== Admin: Zones =====
        mux.Handle("GET /api/admin/zones", AuthMW(AdminMW(http.HandlerFunc(HandleAdminGetZones))))
        mux.Handle("POST /api/admin/zones", AuthMW(AdminMW(http.HandlerFunc(HandleAdminCreateZone))))
        mux.Handle("PATCH /api/admin/zones/{id}", AuthMW(AdminMW(http.HandlerFunc(HandleAdminUpdateZone))))
        mux.Handle("DELETE /api/admin/zones/{id}", AuthMW(AdminMW(http.HandlerFunc(HandleAdminDeleteZone))))

        // ===== Admin: Tiers =====
        mux.Handle("GET /api/admin/tiers", AuthMW(AdminMW(http.HandlerFunc(HandleAdminGetTiers))))
        mux.Handle("POST /api/admin/tiers", AuthMW(AdminMW(http.HandlerFunc(HandleAdminCreateTier))))
        mux.Handle("PATCH /api/admin/tiers/{id}", AuthMW(AdminMW(http.HandlerFunc(HandleAdminUpdateTier))))
        mux.Handle("PUT /api/admin/tiers/{id}/thresholds", AuthMW(AdminMW(http.HandlerFunc(HandleAdminUpdateTierThresholds))))

        // ===== Admin: Tier Prices =====
        mux.Handle("GET /api/admin/tier-prices", AuthMW(AdminMW(http.HandlerFunc(HandleAdminGetTierPrices))))
        mux.Handle("PUT /api/admin/tier-prices/{tier_id}/{zone_id}", AuthMW(AdminMW(http.HandlerFunc(HandleAdminUpdateTierPrice))))

        // ===== Admin: Driver Applications =====
        mux.Handle("GET /api/admin/driver-applications", AuthMW(AdminMW(http.HandlerFunc(HandleAdminGetApplications))))
        mux.Handle("POST /api/admin/driver-applications", AuthMW(AdminMW(http.HandlerFunc(HandleAdminCreateApplication))))
        mux.Handle("PATCH /api/admin/driver-applications/{id}/verify", AuthMW(AdminMW(http.HandlerFunc(HandleAdminVerifyApplication))))
        mux.Handle("PATCH /api/admin/driver-applications/{id}/reject", AuthMW(AdminMW(http.HandlerFunc(HandleAdminRejectApplication))))

        // ===== Admin: Drivers =====
        mux.Handle("GET /api/admin/drivers", AuthMW(AdminMW(http.HandlerFunc(HandleAdminGetDrivers))))
        mux.Handle("PATCH /api/admin/drivers/{id}/status", AuthMW(AdminMW(http.HandlerFunc(HandleAdminUpdateDriverStatus))))
        mux.Handle("PATCH /api/admin/drivers/{id}/tier", AuthMW(AdminMW(http.HandlerFunc(HandleAdminUpdateDriverTier))))
        mux.Handle("GET /api/admin/drivers/{id}/tier-history", AuthMW(AdminMW(http.HandlerFunc(HandleAdminGetDriverTierHistory))))

        // ===== Admin: Driver Shifts =====
        mux.Handle("POST /api/admin/drivers/{id}/shifts", AuthMW(AdminMW(http.HandlerFunc(HandleAdminCreateShift))))
        mux.Handle("GET /api/admin/drivers/{id}/shifts", AuthMW(AdminMW(http.HandlerFunc(HandleAdminGetShifts))))

        // ===== Admin: Support Tickets =====
        mux.Handle("GET /api/admin/support/tickets", AuthMW(AdminMW(http.HandlerFunc(HandleAdminGetTickets))))
        mux.Handle("PATCH /api/admin/support/tickets/{id}/resolve", AuthMW(AdminMW(http.HandlerFunc(HandleAdminResolveTicket))))
        mux.Handle("POST /api/admin/support/tickets/{id}/messages", AuthMW(AdminMW(http.HandlerFunc(HandleAdminSendMessage))))
        mux.Handle("POST /api/admin/support/tickets/{id}/cancel-order", AuthMW(AdminMW(http.HandlerFunc(HandleAdminCancelOrder))))

        handler := cors.New(cors.Options{AllowedOrigins: []string{"*"}, AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}, AllowedHeaders: []string{"*"}, AllowCredentials: true}).Handler(mux)

        port := os.Getenv("PORT"); if port == "" { port = "8080" }
        log.Printf("🚀 AVEX API on :%s", port)
        log.Fatal(http.ListenAndServe(":"+port, handler))
}
