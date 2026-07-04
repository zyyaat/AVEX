# تقرير بحثي شامل: تطبيقات المندوبين (Driver/Delivery Partner Apps)
## دراسة مقارنة لـ Uber, DoorDash, Deliveroo, Talabat, Swiggy, Zomato, Grubhub
### مع اقتراحات ملموسة لتطبيق AVEX Driver

---

## ملخص تنفيذي

تم إجراء بحث مكثف على 38+ مصدراً (المواقع الرسمية، YouTube، Reddit، Medium، Behance، Dribbble، App Store، Google Play، مدونات UX) لفهم كيف تعمل تطبيقات المندوبين في كبرى شركات التوصيل العالمية. التطبيق الحالي **AVEX Driver** (في `apps/driver/src/app/page.tsx`) يحتوي على هيكل أساسي جيد (online/offline + قائمة طلبات + تدفق حالة)، لكنه يفتقر لعشرات الميزات القياسية في الصناعة. هذا التقرير يقدم خريطة طريق تفصيلية للترقية.

---

# 1️⃣ Uber Driver / Uber Eats Driver

## أ. الشاشات الرئيسية (بالترتيب)

التطبيق مبنى بمعمارية **RIBs** (Router-Interactor-Builders) من تطوير Uber نفسها، معروف بأنه سريع جداً وسلس حتى على أجهزة قديمة (مثل Samsung S8).

1. **شاشة Splash / Login** → تسجيل دخول برقم الهاتف + كلمة مرور أو OTP.
2. **شاشة Home (الرئيسية)**: 
   - خريطة كبيرة في الخلفية تظهر موقعك.
   - زر **"Go"** كبير في الأسفل (أحضر التنبيه، يصبح "You're Online").
   - شريط علوي يعرض حالة المنطقة (Busy / Quiet / Normal) مع Surge pricing.
3. **عند استقبال طلب**: يظهر **Modal/Banner** من الأسفل مع صوت "Ping" مميز + اهتزاز، يحوي:
   - **Upfront Fare** (الأجر المعروض مسبقاً) - أبرز رقم.
   - المسافة للـ pickup.
   - المسافة للـ dropoff.
   - اسم المطعم.
   - اسم العميل (الاسم الأول فقط غالباً).
   - **Timer 10-15 ثانية** للقبول.
4. **Earnings Tab**: تبويب منفصل يعرض:
   - أرباح اليوم والأسبوع و breakdown لكل رحلة.
   - **Earnings Estimator**: يعرض أوقات الذروة لكسب أكثر.
5. **Account/Profile Tab**: معلومات المندوب، الصورة، الوثائق، Uber Pro status.
6. **Menu**: Ratings, Earnings, Promotions, Uber Pro, Help, Settings, Inbox.

**استقبال الطلبات**: Push notification + Modal in-app. ليس auto-assign افتراضياً، لكن في بعض الطلبات "Exclusive" قد يكون الإلغاء مؤثراً على acceptance rate.

**تفاصيل الطلب قبل القبول**: 
- المعلومة الأساسية: الأجر، الـ pickup distance، الـ dropoff location/distance، اسم المطعم.
- **مهم**: يخفي بعض التفاصيل (مثل direction التام أو الوجهة) عن المندوبين ذوي الـ acceptance rate المنخفض. من يقبل 5 من آخر 10 طلبات يرى كل التفاصيل upfront.

**معلومات العميل**: الاسم الأول، رقم الهاتف (يظهر بعد قبول الطلب، وغالباً رقم masked)، عنوان التسليم، تعليمات التسليم (delivery instructions).

**معلومات المطعم**: الاسم، العنوان، تعليمات الـ pickup، قائمة الأصناف (items list) للتأكد منها.

## ب. تدفق التوصيل (Delivery Flow)

1. **قبول الطلب** (Accept) → يبدأ navigation للمطعم.
2. **Arrived at restaurant** → المندوب يضغط "Arrived".
3. **Swipe "I have the order"** بعد التأكد من الأصناف (إذا لم يكن الطلب sealed).
4. يبدأ navigation للعميل.
5. **Arrived at customer** → إما:
   - **Hand to customer** + إدخال **PIN code من 4 أرقام** (للطلبات المؤمّنة).
   - **Leave at door** → التقاط **صورة** كإثبات تسليم.
6. **Complete** → الشاشة تعرض الأرباح + طلب التقييم.

**نظام Accept/Reject**: موجود. Reject أو ترك الـ timer ينتهي يؤثر على acceptance rate.

**Timer القبول**: نعم، ~10-15 ثانية.

**الوصول للمطعم/العميل**: خريطة مدمجة (Uber Navigation) + إمكانية التبديل لـ **Google Maps** أو **Waze** من الإعدادات (Settings → Navigation).

**تأكيد التسليم**: PIN code (للطلبات المؤمّنة) أو **صورة** (Leave at Door).

## ج. نظام الأرباح

- **Upfront Fares**: يرى المندوب الأجر **قبل** القبول (بشكل واضح وكبير في الـ offer screen).
- تُحسب بناءً على: base fare + estimated time + distance + pickup distance + surge.
- **Earnings Tab**: عرض يومي/أسبوعي/رحلة برحلة.
- **الدفع**: أسبوعي افتراضياً (كل يوم خميس)، مع **Instant Pay** (حتى 5 مرات/يوم برسوم ~$0.85).
- **Bonuses**: 
  - **Surge** (أوقات الذروة).
  - **Quest promotions** (أنجز X رحلة واحصل على $Y).
  - **Consecutive trips** bonuses.

## د. التتبع والـ GPS

- **Live tracking** كامل. العميل يرى موقع المندوب على الخريطة بشكل لحظي.
- المندوب يرى موقع العميل على الخريطة بعد القبول.
- التنقل: Uber Navigation (مدمج) أو **Google Maps** أو **Waze** (اختيار المندوب).

## هـ. التقييم

- العميل يقيم المندوب (1-5 نجوم) بعد كل توصيلة.
- المندوب يقيم العميل (thumbs up/down) بعد كل رحلة.
- **التأثير**: إذا انخفض التقييم تحت ~4.6 قد يُوقف الحساب. التقييم جزء من **Uber Eats Pro**.

## و. الإشعارات

- **Push notification** قوي (full-screen على Android للـ VoIP calls).
- **صوت "Ping"** مميز وقابل للتخصيص (Settings → Sounds and voice).
- **Vibration** pattern.
- يعمل حتى لو كان التطبيق في الخلفية (شرط أن يكون المندوب online).

## ز. حالات المندوب

- **Offline** (غير متصل).
- **Online** (متصل وينتظر الطلبات).
- **Busy/On Trip** (في مهمة).
- يمكن **رفض أي طلب** بلا حد رسمي، لكن الرفض المتكرر يخفض acceptance rate ويُفقد المندوب مزايا Uber Pro.

## ح. الملف الشخصي

- **بيانات مطلوبة**: الاسم، الصورة، رقم الهاتف، البريد، رخصة القيادة، تسجيل المركبة، تأمين.
- **Background check** إلزامي (Checkr عادةً).
- **تحقق الهوية**: صورة selfie + رفع وثيقة.
- **Uber Pro Tiers (4 مستويات)**:
  - **Blue** (الأساسي).
  - **Gold**: acceptance ≥ 30%, cancellation ≤ 8%, satisfaction ≥ 90%, on-time ≥ 70%.
  - **Platinum**: شروط أعلى + 5% زيادة على trip fares + Costco membership مجاني.
  - **Diamond**: أعلى مستوى + 6% cash back على الوقود + دعم 24/7 + breakdown assistance.

---

# 2️⃣ DoorDash Dasher

## أ. الشاشات الرئيسية

1. **Login/Splash** → موافقة على الشروط + tutorial للمبتدئين.
2. **Home (Dasher Tab)** - الشاشة الأهم:
   - خريطة + مؤشر "Dash Now" أو "Schedule".
   - زر **"Dash Now"** كبير (إذا كانت المنطقة مشغولة) أو **"Schedule a Dash"**.
   - **اختيار نمط الكسب** (في الإصدار الجديد 2025):
     - **Earn per Offer** (تقليدي).
     - **Earn by Time** (أجر بالساعة مضمون).
3. **عند استقبال offer**: يظهر **offer modal** مع:
   - **الأجر الإجمالي** (Total Earnings) - أبرز رقم.
   - مسافة الـ pickup.
   - مسافة الـ dropoff.
   - اسم المطعم.
   - متطلبات خاصة (alcohol, large order).
   - **Timer ~15 ثانية**.
   - زر **Accept** / **Decline**.
4. **Earnings Tab**: breakdown يومي/أسبوعي (base pay + tips + incentives).
5. **Dasher Rewards Tab**: مستوى المندوب (Silver, Gold, Platinum) ومتطلباته.
6. **Profile/Account Tab**.

**استقبال الطلبات**: Push notification + Modal. في Earn by Time يحدث auto-assign مع إمكانية decline محدودة (رفض اثنين بالساعة ينهي الـ dash).

**معلومات الطلب قبل القبول**: الأجر (يتضمن part of the tip غالباً)، pickup/dropoff distance، اسم المطعم. **لا يُعرض البقشيش الكامل** - يخفي DoorDash جزءاً من البقشيش الكبير في الـ offer screen (نقطة جدلية كبيرة).

## ب. تدفق التوصيل

1. **Accept** offer.
2. **Navigation للمطعم** (in-app navigation مدعوم بـ Google Maps).
3. **Arrived at store** → قد يتطلب:
   - **QR code scan** للإيصال (Merchant to Dasher Pickup Verification).
   - تأكيد رقم الطلب.
4. **Confirm pickup** → "Swipe to start delivery".
5. **Navigation للعميل**.
6. **Arrived at customer** → 
   - **التقاط صورة** للطلب عند الباب (Drop-off Photo) - **إلزامي** للـ contactless.
   - أو تسليم يدوي + PIN (في بعض الحالات).
7. **Complete** → شاشة "You earned $X" + طلب تقييم.

**نظام Accept/Reject**: قوي جداً، يمكنك رفض أي طلب. لكن:
- **Top Dasher**: يتطلب acceptance ≥ 70% (يمنح أولوية scheduling).
- **Dasher Rewards Program** (2024): Gold/Platinum يتطلب **80% acceptance** (مثير للجدل).

**Timer**: نعم.

**الوصول**: In-app navigation (Google Maps powered) مع إمكانية فتح Google Maps/Waze الخارجي.

## ج. نظام الأرباح

- **Base pay** ($2-3 كحد أدنى) + **Customer tip** + **Promotions**.
- **Earn by Time**: أجر بالساعة مضمون (مثل $15-20/ساعة) أثناء الـ dash النشط.
- **Earnings Tab**: تفصيل واضح.
- **الدفع**: أسبوعي + **Fast Pay** (يومي، رسوم $1.99).
- **Bonuses**: Peak Pay, Challenges (أنجز X رحلة), Dasher Rewards.

## د. التتبع والـ GPS

- العميل يرى موقع المندوب **live** على الخريطة.
- **SafeDash**: مشاركة الموقع مع جهات اتصال موثوقة لمزيد من الأمان.
- المندوب يرى موقع العميل بعد القبول.

## هـ. التقييم

- العميل يقيم المندوب (1-5).
- المندوب يقيم المطعم والعميل.
- التأثير: Customer rating < 4.2 قد يؤدي لإيقاف. Completion rate < 80% يُوقف.

## و. الإشعارات

- Push notification قوي.
- صوت مميز + vibration.
- في الإصدار الجديد (2025): ثيمات لونية (Dark/Light) قابلة للتبديل.

## ز. حالات المندوب

- Offline.
- Online (Available).
- On Delivery (Busy).
- Scheduled (حجز block مسبقاً).
- يمكن رفض الطلبات بلا حد صريح، لكن **repeated low acceptance** يمنع الوصول لمزايا Top Dasher / Rewards.

## ح. الملف الشخصي

- بيانات: ID، رخصة، تأمين، Social Security Number (للـ background check).
- Background check إلزامي.
- **Dasher Rewards Tiers**: Silver, Gold, Platinum بناءً على acceptance + completion + customer rating + عدد التوصيلات.
- **ميزة فريدة**: يمكن العمل بدون سيارة (دراجة، مشي).

---

# 3️⃣ Deliveroo Rider

## أ. الشاشات الرئيسية

1. **Login**.
2. **Home/Onboarding Tab**: 
   - عرض **الجدول الأسبوعي** (Weekly Schedule) - ميزة أساسية!
   - في المنطقة المجدولة، زر **"Go Online"**.
3. **عند استقبال طلب**: 
   - **Order notification** مع التفاصيل.
   - المندوب يرى: الأجر، المسافة، المطعم، مدة التوصيل المتوقعة.
   - **Free flow** (نظام مفتوح): المندوب يمكنه رفض الطلب بحرية.
4. **Schedule Tab**: 
   - اختيار **Shifts** (فترات) مسبقاً.
   - **Zones** (مناطق): كل منطقة لها مجالس shift وجدول خاص.
5. **Earnings Tab**: تتبع الأرباح + تحليلات.
6. **Help/Support**.

**استقبال الطلبات**: يتم إرسال الطلبات تلقائياً بعد قبول المطعم لها بحوالي 5 دقائق. **Free flow** - المندوب حر في القبول/الرفض.

**معلومات الطلب**: الأجر، المسافة، المطعم، العميل (الاسم والعنوان)، رقم الطلب.

## ب. تدفق التوصيل

1. **Accept**.
2. Navigation للمطعم.
3. **Rider Check-in** عبر **NFC tag** عند بعض المطاعم (ميزة فريدة!).
4. استلام الطلب.
5. Navigation للعميل.
6. التسليم (يدوي أو leave at door).
7. تأكيد التسليم.

**Accept/Reject**: حر (free flow)، لا يوجد timer ضاغط.

**Timer**: أقل ضغطاً من Uber/DoorDash.

## ج. نظام الأرباح

- **أجر بالطلب** + **Boost** (مضاعف الأجر في أوقات الذروة، مثل 1.4x أو 1.5x).
- **Onboarding fee** للمناطق الجديدة.
- **Earnings tracker** داخل التطبيق.
- **الدفع**: أسبوعي (every Tuesday).
- **Bonuses**: Boost zones، weekend bonuses، referral.

## د. التتبع والـ GPS

- Live tracking كامل.
- العميل يرى المندوب.
- مدمج خرائط.

## هـ. التقييم

- تقييم العميل للمندوب.
- **Deliveroo Riders** يطالبون بإضافة نظام تقييم من المندوب للعميل (مثل UberEats).

## و. الإشعارات

- Push notifications + صوت.
- أقل توتراً من Uber.

## ز. حالات المندوب

- Offline.
- Online (داخل shift).
- On Order.
- Outside Zone (خارج المنطقة المجدولة).

## ح. الملف الشخصي

- بيانات: ID، الحق في العمل في البلد، دراجة نارية/هوائية صالحة.
- لا يوجد نظام tiers بنفس شمولية Uber Pro، لكن يوجد "Rider Levels" في بعض الأسواق.

**مميزات فريدة**:
- **جدول Shifts** (ميزة قوية للمندوبين المنظمين).
- **Zones** (مناطق عمل محددة).
- **Boost multiplier** (واضح وشفاف).
- **NFC check-in** في المطاعم الكبيرة.
- **AI route optimization** + **safety alerts**.

---

# 4️⃣ Talabat Rider

## أ. الشاشات الرئيسية (الأقرب للسوق العربي!)

1. **Login** (يدعم عدة دول: الكويت، الإمارات، قطر، البحرين، السعودية، عُمان، الأردن، مصر، العراق).
2. **Home/Shifts Tab**:
   - **اختيار الـ Shifts** (ميزة أساسية مثل Deliveroo) - يختار المندوب فتراته.
   - عرض المنطقة (zone) المحددة.
3. **عند استقبال طلب**: 
   - **Auto-assign** في الغالب (مثل الـ dispatch system).
   - المندوب يرى: المطعم، العميل، العنوان، رقم الطلب، الأجر.
   - **Talabat يبدأ بتعيين طلبات متعددة لنفس المندوب** (batched orders).
4. **Navigation**: يدعم **Google Maps** و **2GIS** (اختيار المندوب).
5. **Earnings Tab**: عرض الأرباح والبقشيش في محفظة (wallet) بشكل **real-time**.

**استقبال الطلبات**: غالباً **auto-assign / dispatch** (المندوب لا يرى قائمة طلبات يختار منها، بل تُعين عليه). يمكن رفض لكن مع مخاطرة.

**معلومات الطلب**: المطعم، العميل، العنوان، رقم الطلب، رقم هاتف العميل (للاتصال)، الموقع على الخريطة.

## ب. تدفق التوصيل

1. استقبال الطلب المعيَّن.
2. الذهاب للمطعم (navigation).
3. استلام الطلب.
4. الذهاب للعميل.
5. التسليم + تأكيد.
6. إذا متعدد (batched): تكرار للتوصيلات.

**Accept/Reject**: ممكن الرفض لكن نظام الت dispatch يعاقب على الرفض المتكرر.

## ج. نظام الأرباح

- **Pay per delivery** (مثلاً 9 دراهم/توصيل في دبي + 1 درهم وقود).
- **بقشيش فوري**: يظهر في محفظة المندوب **real-time** (ميزة فريدة - Talabat نفسها تروج لها).
- **الدفع**: حسب الدولة، أسبوعي أو كل أسبوعين.
- **Bonuses**: حسب عدد الطلبات ("Deliver a lot, earn a lot").

## د. التتبع والـ GPS

- Live tracking.
- العميل يرى المندوب على الخريطة.
- المندوب يختار بين Google Maps و 2GIS (مهم للمناطق ذات الـ addressing الضعيف في الخليج).

## هـ. التقييم

- تقييم العميل للمندوب.
- تقييم المطعم.

## و. الإشعارات

- Push + صوت.

## ز. حالات المندوب

- Offline (خارج shift).
- Online (داخل shift).
- On Delivery.
- Busy (متعدد الطلبات).

## ح. الملف الشخصي

- بيانات: ID، تأشيرة عمل، رخصة (إن وُجدت - للـ cyclist/walker لا تُشترط)، صورة.
- **No car needed** للـ cyclist و walker.
- التحقق من الهوية إلزامي.
- لا نظام tiers معروف علناً، لكن يوجد نظام أداء داخلي.

**مميزات فريدة**:
- **Shift-based system** (مثل Deliveroo).
- **Auto-dispatch** (مثل سيارات الأجرة).
- **Batched orders** (متعدد لكل راكب).
- **دعم 2GIS** (مهم للخليج).
- **Tips real-time in wallet**.

---

# 5️⃣ Swiggy Delivery / Zomato Delivery (تطبيقات هندية)

## Swiggy Delivery Partner

### الشاشات الرئيسية
1. **Onboarding سريع**: download → تعبئة بيانات → رفع وثائق → online training → بدء فوري.
2. **Home**: حالة المندوب (online/offline) + zone المحددة.
3. **عند استقبال طلب**: 
   - **Auto-assign** في الغالب (مثل Talabat).
   - عرض الطلب مع التفاصيل.
4. **Earnings Tab**: عرض الأرباح + **daily incentives** (مهم جداً في الهند).
5. **Payout**: **Daily payout** + **Instant withdrawal** + **Early Payout** (مميزات قوية).

### نظام الأرباح
- **Pay per delivery** + **daily incentive** (مثلاً 550 INR لـ 10 طلبات).
- **Performance bonuses**.
- **Joining bonus** (up to ₹10,000).
- **Refer & earn**.
- يمكن كسب **₹60,000/شهر** (حسب التطبيق).
- **ملاحظة**: يوجد **penalty** (غرامة) في بعض الحالات (مثلاً -₹30 لتأخير).
- **الدفع**: أسبوعي + daily payout + instant.

### مميزات فريدة
- **Daily payout** (يومي).
- **Onboarding فوري** (تدريب online).
- **Incentive targets** (slabs) - مثل 5/10/15 طلب للحصول على bonus.
- **Blinkit integration** (grocery delivery).

## Zomato Delivery Partner

### الشاشات الرئيسية
1. **Onboarding فوري** (instant joining + easy verification).
2. **Home**: حالة + zone.
3. **عند استقبال طلب**: auto-assign + تفاصيل.
4. **Earnings Tab**: 
   - **Daily OR weekly payout** (اختيار المندوب!).
   - **Instant withdrawal**.
5. **Ratings**: المندوب يقيم المطعم **والعميل** (ميزة قوية).

### نظام الأرباح
- **Pay per order** (minimum ₹20).
- **Surge pay** (15-20% إضافي في المطر/الذروة).
- **LDRP** (Long Distance Return Pay): 5-45 روبية للعودة من توصيلة بعيدة.
- **₹102/ساعة** متوسط 2025.
- **التقييم**: المندوبون يطلبون 5-star rating من العملاء (هذا جزء من نظام الحساب).

### مميزات فريدة
- **اختيار frequency الدفع** (daily/weekly).
- **تقييم ثنائي الاتجاه** (المندوب يقيم العميل والمطعم).
- **Design thumb-centric** (تصميم محسّن للإبهام - ملاحظة UX مهمة من LinkedIn).
- **خريطة "S" pin** بسيطة وواضحة.

### الاختلافات بين Swiggy و Zomato
- Swiggy: **daily wage minimum** + **incentive slabs** واضحة + penalty system.
- Zomato: **اختيار frequency الدفع** + **surge pay** + **تقييم من المندوب للعميل** + **LDRP** (دفع العودة).
- كلاهما: **auto-assign** + **pay per delivery** + **daily payout متاح**.

---

# 6️⃣ Grubhub Driver

## أ. الشاشات الرئيسية

1. **Login**.
2. **Home/Scheduling Tab**: 
   - **Block Scheduling** هو **جوهر** Grubhub (ميزة فريدة!).
   - المندوب يحجز **blocks** (فترات زمنية) مسبقاً.
   - **"Available blocks"** يظهر للـ scheduling.
3. **عند استقبال offer** (أثناء block):
   - Offer modal مع: الأجر المتوقع (يتضمن البقشيش)، المسافة، المطعم.
   - **Grubhub يعرض الـ total payment** (شامل البقشيش) على عكس DoorDash (نقطة خلافية - يقال إنه أحياناً يخفي part of tip).
4. **Earnings Tab**: breakdown واضح (base pay + tips + bonuses).
5. **Schedule Tab**: إدارة الـ blocks.

**استقبال الطلبات**: 
- **أثناء الـ block المجدول**: offer يأتي تلقائياً.
- **خارج block (open availability)**: offers أقل، لكن ممكنة في الأسواق المشغولة.

## ب. تدفق التوصيل

1. **Accept** offer.
2. Navigation للمطعم.
3. استلام + تأكيد (أحياناً photo للإيصال).
4. Navigation للعميل.
5. التسليم + photo / signature في بعض الحالات.
6. Complete.

**Accept/Reject**: 
- لا حد رسمي، لكن:
- **Schedule Restriction**: إذا تلاعب المندوب لتفادي offers أثناء block (للحصول على hourly guarantee)، يُعاقب.
- **Program Levels** (مهم!): Entry → Partner → Pro → Premier بناءً على acceptance rate و block scheduling.

## ج. نظام الأرباح

- **Delivery pay**: base + mileage + time + delivery type + bonuses.
- **Hourly Minimum Guarantee** (في الأسواق التي تدعم): إذا لم تأتِ offers كافية أثناء block، تُدفع الحد الأدنى.
- **Drivers keep 100% of tips**.
- **Instant Cash Out**: حتى $500/day (مجاني لـ Chase Bank customers، $0.50 لغيرهم).
- **الدفع**: أسبوعي افتراضياً.
- متوسط: $12-18/ساعة.

## د. التتبع والـ GPS

- Live tracking.
- In-app navigation.

## هـ. التقييم

- العميل يقيم المندوب.
- Acceptance rate + completion rate يؤثران على Program Level.

## و. الإشعارات

- Push notifications.

## ز. حالات المندوب

- Offline.
- On Block (مجدول).
- Open (غير مجدول لكن متاح).
- On Delivery.
- Schedule Restricted (مُعاقب).

## ح. الملف الشخصي

- بيانات: ID، رخصة، تأمين، Social Security Number.
- Background check.
- **Driver Recognition & Rewards Levels** (4 مستويات):
  - **Entry**: <20 توصيلة.
  - **Partner**: ≥20 توصيلة (يفتح block scheduling).
  - **Pro**: مستوى أعلى.
  - **Premier**: أعلى مستوى (priority scheduling + offers أفضل).
- **ميزة فريدة**: لا سيارة مطلوبة (مثل DoorDash).

**مميزات فريدة**:
- **Block Scheduling** قوي ومحوري.
- **Hourly Minimum Guarantee** (في بعض الأسواق).
- **Program Levels** شفافة.
- **Instant Cash Out** بسخاء ($500/day).
- **Live Activity tracking** على iOS (للعملاء).

---

# 📊 جدول مقارنة سريع

| الميزة | Uber Eats | DoorDash | Deliveroo | Talabat | Swiggy | Zomato | Grubhub |
|---|---|---|---|---|---|---|---|
| **استقبال الطلبات** | Manual accept | Manual accept | Free flow | Auto-dispatch | Auto-assign | Auto-assign | Manual (in block) |
| **Upfront fare** | ✅ واضح | ⚠️ جزئي | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| **Timer القبول** | ✅ 10-15s | ✅ ~15s | ⚠️ أقل | ⚠️ | ⚠️ | ⚠️ | ✅ |
| **PIN code** | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **صورة تسليم** | ✅ (Leave at door) | ✅ إلزامي | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| **QR code pickup** | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **Live tracking** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **NFC check-in** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Tiers/Levels** | ✅ Uber Pro (4) | ✅ Dasher Rewards | ⚠️ | ❌ | ❌ | ❌ | ✅ (4) |
| **Boost/Surge** | ✅ Surge | ✅ Peak Pay | ✅ Boost 1.x | ⚠️ | ✅ | ✅ Surge | ✅ |
| **Instant Payout** | ✅ Instant Pay | ✅ Fast Pay | ❌ | ❌ | ✅ Daily | ✅ Daily/Weekly | ✅ Cash Out |
| **Shift scheduling** | ❌ | ✅ Schedule | ✅ Shifts + Zones | ✅ Shifts | ⚠️ | ⚠️ | ✅ Blocks |
| **Earn by Time** | ❌ | ✅ | ⚠️ | ❌ | ❌ | ❌ | ✅ (Hourly Min) |
| **Batched orders** | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **تقييم من المندوب للعميل** | ✅ | ✅ | ⚠️ (مطلوب) | ⚠️ | ⚠️ | ✅ | ⚠️ |
| **Background check** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **دعم RTL/عربي** | ⚠️ | ❌ | ⚠️ | ✅ | ❌ | ❌ | ❌ |

---

# 🎯 توصيات ملموسة لتطبيق AVEX Driver

بناءً على فحص التطبيق الحالي في `apps/driver/src/app/page.tsx`، إليك خارطة الطريق المقترحة مرتبة حسب الأولوية:

## 🔴 أولوية عالية (Critical - أضف فوراً)

### 1. **شاشة Offer مع Upfront Fare + Timer**
التطبيق الحالي يعرض الطلبات في قائمة بدون timer وبدون upfront fare واضح. يجب:
- إظهار **offer modal** يظهر فجأة مع صوت + vibration عند ورود طلب.
- عرض واضح: **الأجر** (delivery fee) + **pickup distance** + **dropoff distance** + اسم المطعم.
- **Timer دائري 15 ثانية** للقبول.
- زر **Accept** (أخضر) + **Decline** (رمادي).

```tsx
// مثال هيكل
<OfferModal
  visible={!!incomingOffer}
  fare={incomingOffer.deliveryFee}
  pickupDistance="1.2 km"
  dropoffDistance="3.4 km"
  restaurant="برجر هاوس"
  timerSeconds={15}
  onAccept={...}
  onDecline={...}
/>
```

### 2. **Acceptance Rate + Completion Rate**
أضف تتبع acceptance rate (كم طلب قبلت من آخر 100) و completion rate (كم أنهيت من قبلت). اعرضها في الـ Profile. هذه مقاييس قياسية في كل التطبيقات.

### 3. **PIN Code للتسليم** (مثل Uber)
أضف حقل إدخال PIN 4 أرقام يُطلب من العميل تقديمه عند التسليم (للطلبات المؤمّنة أو العادية). هذا يقلل النزاعات بشكل كبير.

### 4. **صورة تسليم (Drop-off Photo)**
عند اختيار "Leave at door"، اطلب من المندوب التقاط صورة كإثبات. احفظها مع سجل الطلب.

### 5. **In-app Navigation مع خيار Google Maps**
التطبيق الحالي يفتح Google Maps برابط خارجي فقط. أضف:
- خريطة مدمجة (Mapbox أو Google Maps Embed).
- زر "Open in Google Maps" و "Open in Waze" كبدائل.
- بالنسبة للسوق العربي (الخليج): أضف دعم **2GIS** مثل Talabat (مهم جداً لأن العناوين في الخليج غالباً ما تكون ضعيفة في Google Maps).

### 6. **Push Notifications + Sound + Vibration**
استخدم **Web Push API** (أو OneSignal / Firebase Cloud Messaging) لإرسال إشعارات الطلبات. أضف صوتاً مميزاً (mp3 قصير) و vibration pattern. التطبيق الحالي يعتمد على polling داخلي فقط.

## 🟡 أولوية متوسطة (Important - أضف في الإصدار التالي)

### 7. **Earnings Tab منفصل**
أنشئ تبويب منفصل يعرض:
- أرباح اليوم/الأسبوع/الشهر.
- Breakdown لكل رحلة (base fare + tip + bonus).
- Earnings Estimator (أوقات الذروة).
- إجمالي البقشيش.

### 8. **نظام Tiers / Levels (مثل Uber Pro / Grubhub Levels)**
أضف 4 مستويات:
- **Bronze** (الأساسي).
- **Silver**: ≥30% acceptance, ≥90% completion, ≥4.5 rating.
- **Gold**: ≥50% acceptance, ≥95% completion, ≥4.7 rating + 5% bonus على كل توصيلة.
- **Platinum**: ≥70% acceptance, ≥98% completion, ≥4.8 rating + 10% bonus + priority offers.

اعرض شارة المستوى بشكل بارز في الـ Header وفي الـ Profile.

### 9. **Shift Scheduling (مثل Deliveroo / Talabat / Grubhub)**
التطبيق الحالي يبدأ بـ "Go Online" فوري فقط. أضف:
- جدول أسبوعي للـ shifts.
- اختيار **Zone** (منطقة عمل).
- حجز blocks مسبقاً (مثل Grubhub).
- هذا مناسب جداً للسوق العربي (Talabat يعمل هكذا).

### 10. **Batched Orders (طلبات متعددة)**
مثل Talabat / Uber / DoorDash: اسمح بتعيين طلبين-ثلاثة لنفس المندوب إذا كانوا في نفس المسار. اعرضهم كـ "stack" في الـ Active Delivery.

### 11. **Boost / Surge Zones**
اعرض على الخريطة مناطق بها boost (مثل 1.5x fee) لجذب المندوبين. مثل Deliveroo Boost.

### 12. **تقييم ثنائي الاتجاه**
بعد كل توصيلة:
- العميل يقيم المندوب (1-5 نجوم).
- المندوب يقيم العميل (thumbs up/down) والمطعم.
- مثل Uber و Zomato.

### 13. **Restaurant Pickup Instructions**
اعرض تعليمات الـ pickup بشكل واضح (مثل: "ادخل من الباب الجانبي، اسأل عن أحمد"). أضف زر "Arrived at restaurant" يُعلِم المطعم.

### 14. **QR Code Pickup Verification** (مثل DoorDash)
أضف خيار scan QR code على الإيصال للتأكد من الطلب الصحيح. يقلل الأخطاء.

## 🟢 أولوية منخفضة (Nice to Have - للإصدارات المستقبلية)

### 15. **Instant Payout**
أضف خيار **Instant Cash Out** (سحب فوري برسوم صغير) + **Daily Payout** (مثل Swiggy/Zomato/Grubhub). السوق العربي يفضل الدفع اليومي.

### 16. **Earnings Estimator**
اعرض heatmap للأوقات المربحة في منطقتك (مثل Uber).

### 17. **SafeDash-like Safety Feature**
ميزة "شارك موقعي مع أحد جهات الاتصال" أثناء التوصيل. مهم للأمان.

### 18. **Multi-language Support**
التطبيق الحالي RTL/عربي فقط. أضف دعم إنجليزي/أردو/هندي/فلبيني (لأن الكثير من المندوبين في الخليج/mENA هم عمالة وافدة).

### 19. **In-app Chat مع العميل**
بدلاً من المكالمة المباشرة فقط، أضف chat آمن (رقم masked) مثل Uber.

### 20. **NFC Check-in** (مثل Deliveroo)
للمطاعم الكبيرة، استخدم NFC tags لتأكيد وصول المندوب.

### 21. **Proof of Pickup Photo** (للطلبات الكبيرة)
اطلب صورة عند الـ pickup للطلبات فوق مبلغ معين.

### 22. **Daily Incentive Slabs** (مثل Swiggy)
"أنجز 10 طلبات اليوم واحصل على +50 ج.م". اعرض progress bar.

### 23. **Referral System**
"ادعُ صديق واحصل على 100 ج.م بعد أول 10 توصيلات له".

---

# 📐 تحسينات UX/UI مقترحة على الواجهة الحالية

التطبيق الحالي (`page.tsx`) يستخدم:
- ✅ RTL صحيح (`dir="rtl"`).
- ✅ Header مع زر online/offline.
- ✅ Stats bar (3 بطاقات).
- ✅ Active delivery card.
- ✅ Available orders list.
- ✅ Framer Motion للأنيميشن.

### تحسينات مقترحة:

1. **Bottom Tab Bar**: أضف شريط سفلي بـ 4 تبويبات (Home / Earnings / Orders History / Profile) بدلاً من الاعتماد على شاشة واحدة. التطبيقات الكبرى كلها تستخدم هذا النمط.

2. **Map Background**: اجعل الخريطة خلفية الـ Home (مثل Uber) بدلاً من `bg-gray-50` المسطحة.

3. **Stats Bar تفاعلي**: اجعل بطاقات الأرباح قابلة للنقر (تفتح Earnings Tab).

4. **Offer Modal بدلاً من قائمة الطلبات**: التطبيق الحالي يعرض الطلبات في قائمة المستخدم يختار منها. هذا يخالف معايير الصناعة! يجب أن يأتي الطلب كـ **modal واحدة** في كل مرة مع timer.

5. **Status Pill أوضح**: زر "متصل/غير متصل" الحالي صغير. اجعله أكثر بروزاً مع أيقونة دائرية نابضة.

6. **Active Delivery Stepper**: اعرض **progress steps** واضحة:
   ```
   ● قبول → ● وصلت للمطعم → ● استلمت الطلب → ● في الطريق → ● تم التسليم
   ```
   بدلاً من مجرد نص الحالة الحالي.

7. **Timer in Offer**: مؤقت دائري مرئي في الـ offer modal.

8. **Thumb-zone Optimization** (مثل Zomato): ضع الأزرار الأساسية في الجزء السفلي القابل للوصول بالإبهام.

9. **Dark Mode**: أضف ثيم داكن (DoorDash أضافه 2025).

10. **Haptic Feedback** على الـ accept/decline (عبر Web Vibration API على الأجهزة المدعومة).

---

# 🔧 تطبيق مقترح على الـ Code الحالي

الملف `apps/driver/src/app/page.tsx` يحتاج refactor رئيسي:

```tsx
// مقترح إعادة هيكلة
type DriverState = 'offline' | 'online' | 'busy'  // ✅ موجود
type OrderStatus = 'pending' | 'accepted' | 'arrived_restaurant' 
                 | 'picked_up' | 'arrived_customer' | 'delivering' | 'delivered'
// ✅ أضف: arrived_restaurant, arrived_customer

interface DeliveryOrder {
  // ... الحقول الحالية
  pickupDistance: number      // جديد
  dropoffDistance: number     // جديد
  pickupInstructions?: string // جديد
  deliveryInstructions?: string // جديد
  pinCode?: string            // جديد (للتسليم المؤمّن)
  requiresPhoto?: boolean     // جديد
  isBatched?: boolean         // جديد
  batchedOrders?: string[]    // جديد
  boostMultiplier?: number    // جديد (1.5x مثلاً)
}

interface DriverStats {
  earningsToday: number
  deliveriesToday: number
  acceptanceRate: number      // جديد
  completionRate: number      // جديد
  rating: number              // جديد
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'  // جديد
}

interface IncomingOffer {
  order: DeliveryOrder
  timerSeconds: number        // جديد
  expiresAt: number           // جديد
}
```

---

# 📚 مصادر البحث (38+ مصدر)

### Uber Driver / Uber Eats
- uber.com/us/en/deliver/driver-app
- uber.com/us/en/drive/driver-app
- uber.com/us/en/blog/uber-eats-pro-preferred-deliveries
- help.uber.com - acceptance/cancellation rates, PIN code auth, audio settings, navigation
- uber.com/us/en/drive/uber-pro
- medium.com/uber-under-the-hood - Upfront Fares
- developer.uber.com - Pincode guide
- YouTube: Uber Driver App tutorials 2023/2024/2025

### DoorDash Dasher
- help.doordash.com - Dasher Guide, Ratings, Earn by Time, Drop-off Photos, Pickup Verification, In-app Navigation, SafeDash
- dasher.doordash.com - blog (new app, earn by time)
- medium.com - DoorDash Visions: Redesigning Dasher homescreen
- triplog.net - Top Dasher requirements

### Deliveroo Rider
- apps.apple.com - Deliveroo Rider
- play.google.com - Deliveroo Rider
- miracuves.com - How Deliveroo works
- cloud.b2b.deliveroo.com - Rider Check-in (NFC)
- reddit.com/r/deliveroos - FAQ

### Talabat Rider
- play.google.com - Talabat Rider (com.logistics.rider.talabat)
- apps.apple.com - Talabat Rider (multiple regions: eg, gh, ly)
- rider-jo.talabat.com
- terms.talabat.com/iq - data collected
- reddit.com/r/qatar - batched orders

### Swiggy & Zomato
- play.google.com - Swiggy Delivery Partner (in.swiggy.deliveryapp)
- play.google.com - Zomato Delivery Partner (com.zomato.delivery)
- ride.swiggy.com
- zomato.com/deliver-food
- alphareach.tech - Swiggy weekly bonus 2026
- linkedin.com - Zomato thumb-centric design

### Grubhub Driver
- driver.grubhub.com - FAQ, pay, scheduling, recognition rewards
- driver-support.grubhub.com - Schedule Restriction
- gridwise.io - Grubhub driver requirements 2026
- businessofapps.com - Grubhub statistics

### UX/UI Reference
- mobbin.com/explore/mobile/app-categories/food-delivery-app
- dribbble.com - delivery app case studies, Arabic RTL designs
- behance.net - Food delivery driver app UI/UX case study (GoFoodie)
- medium.com - Redesigning Delivery Driver App (Orderin case study)

### Arabic Market Context
- dribbble.com/shots/27269642 - Food Delivery App UI Arabic RTL
- Jahez (jahez.net) - Saudi delivery app
- HungerStation (Delivery Hero Saudi arm)
- Careem, Noon, Keeta in MENA

---

# ✅ خلاصة الخطوات التالية لـ AVEX Driver

1. **أسبوع 1-2**: أضف Offer Modal مع Timer + Upfront Fare + Accept/Decline. هذا أكبر تحسين ممكن.
2. **أسبوع 3-4**: أضف PIN code + Drop-off Photo + In-app map.
3. **أسبوع 5-6**: أضف Earnings Tab منفصل + Acceptance/Completion rates.
4. **أسبوع 7-8**: أضف Tiers system + Boost zones.
5. **أسبوع 9-10**: أضف Shift Scheduling + Zones + Batched orders.
6. **أسبوع 11-12**: أضف Daily Payout + Incentive slabs + Referral.

بعد هذه الخطوات، سيكون AVEX Driver مواكباً لأفضل تطبيقات المندوبين عالمياً مع تخصص للسوق العربي (RTL + 2GIS + Shift system مثل Talabat).
