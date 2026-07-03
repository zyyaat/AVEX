'use client'

import { UtensilsCrossed, Phone, MapPin, Clock, Mail, Facebook, Instagram, Twitter } from 'lucide-react'

export function Footer() {
  return (
    <footer id="contact" className="bg-foreground text-background mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-xl leading-none">
                  Frank<span className="text-primary">'</span>s
                </h3>
                <p className="text-[10px] text-background/60 leading-none mt-0.5">
                  مطعم و توصيل سريع
                </p>
              </div>
            </div>
            <p className="text-sm text-background/70 leading-relaxed">
              نقدّم لكم أشهى الأطباق منذ 2010. جودة عالية، مكونات طازجة، وخدمة توصيل سريعة.
            </p>
            {/* Social */}
            <div className="flex gap-2">
              {[Facebook, Instagram, Twitter].map((Icon, idx) => (
                <a
                  key={idx}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"
                  aria-label="رابط التواصل الاجتماعي"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-3">
            <h4 className="font-bold text-base mb-2">روابط سريعة</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><a href="#menu" className="hover:text-primary transition-colors">القائمة</a></li>
              <li><a href="#offers" className="hover:text-primary transition-colors">العروض</a></li>
              <li><a href="#about" className="hover:text-primary transition-colors">من نحن</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">الأسئلة الشائعة</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <h4 className="font-bold text-base mb-2">الأقسام</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><a href="#menu" className="hover:text-primary transition-colors">🍔 برغر</a></li>
              <li><a href="#menu" className="hover:text-primary transition-colors">🍕 بيتزا</a></li>
              <li><a href="#menu" className="hover:text-primary transition-colors">🍟 مقبلات</a></li>
              <li><a href="#menu" className="hover:text-primary transition-colors">🍰 حلويات</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="font-bold text-base mb-2">تواصل معنا</h4>
            <ul className="space-y-2.5 text-sm text-background/70">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <a href="tel:+96265551234" dir="ltr" className="hover:text-primary transition-colors">
                  +962 6 555 1234
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <a href="mailto:info@franks.com" className="hover:text-primary transition-colors">
                  info@franks.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>شارع الملكة رانيا، عمّان، الأردن</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>يومياً: 10:00 ص - 12:00 م</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-background/60">
          <p>© 2026 Frank&apos;s Restaurant. جميع الحقوق محفوظة.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-primary transition-colors">سياسة الخصوصية</a>
            <a href="#" className="hover:text-primary transition-colors">الشروط والأحكام</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
