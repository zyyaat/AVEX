'use client'

import { useState } from 'react'
import { MapPin, Clock, Mail, Facebook, Instagram, Twitter, Send, Apple, Play, Zap, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function Footer() {
  const [email, setEmail] = useState('')

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('يرجى إدخال بريدك الإلكتروني')
      return
    }
    toast.success('تم الاشتراك بنجاح! 🎉')
    setEmail('')
  }

  const FOOTER_LINKS = {
    company: {
      title: 'الشركة',
      links: [
        { label: 'من نحن', href: '#about' },
        { label: 'الوظائف', href: '#' },
        { label: 'AVEX Club', href: '#offers' },
        { label: 'اتصل بنا', href: '#contact' },
      ],
    },
    help: {
      title: 'المساعدة',
      links: [
        { label: 'مركز المساعدة', href: '#' },
        { label: 'تتبع طلبك', href: '?track=' },
        { label: 'سياسة الاسترجاع', href: '#' },
        { label: 'الأسئلة الشائعة', href: '#' },
      ],
    },
    legal: {
      title: 'قانوني',
      links: [
        { label: 'سياسة الخصوصية', href: '#' },
        { label: 'الشروط والأحكام', href: '#' },
        { label: 'سياسة الاستخدام', href: '#' },
        { label: 'ملفات تعريف الارتباط', href: '#' },
      ],
    },
  }

  return (
    <footer id="contact" className="bg-gray-900 text-gray-400">
      {/* Newsletter bar */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-8 md:py-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              اشترك ليصلك كل جديد
            </h3>
            <p className="mt-1 text-sm text-gray-400">عروض حصرية وخصومات أسبوعية على بريدك</p>
          </div>
          <form onSubmit={handleSubscribe} className="flex w-full max-w-md gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="بريدك الإلكتروني"
              className="h-11 flex-1 rounded-full border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <Button
              type="submit"
              className="h-11 shrink-0 rounded-full bg-violet-600 hover:bg-violet-700 px-6 font-semibold text-white"
            >
              <Send className="w-4 h-4 ml-1" />
              اشترك
            </Button>
          </form>
        </div>
      </div>

      {/* Main footer */}
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
                <span className="text-lg font-extrabold text-white">A</span>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-yellow-400 border-2 border-gray-900" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg leading-none text-white">AVEX</h3>
                <p className="text-[10px] text-gray-500 leading-none mt-0.5">أفكس - توصيل سريع</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              منصة توصيل عالمية نقدم أسرع خدمة توصيل للطعام وأكثر. تجربة عالمية بلمسة محلية.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                <a href="mailto:hello@avex.com" className="hover:text-white transition-colors">hello@avex.com</a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                <span>القاهرة، مصر</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                <span>يومياً 10:00ص - 12:00م</span>
              </li>
            </ul>
          </div>

          {/* Links */}
          {Object.values(FOOTER_LINKS).map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-violet-400 mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Apps + Social */}
          <div className="col-span-2 md:col-span-1 md:col-start-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-violet-400 mb-4">حمّل التطبيق</h4>
            <div className="flex flex-col gap-2 mb-5">
              <a href="#" className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors w-fit">
                <Apple className="w-5 h-5 text-white" />
                <div className="text-right">
                  <p className="text-[9px] text-gray-400 leading-none">حمّل من</p>
                  <p className="text-xs font-semibold text-white leading-none mt-0.5">App Store</p>
                </div>
              </a>
              <a href="#" className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors w-fit">
                <Play className="w-5 h-5 text-white" />
                <div className="text-right">
                  <p className="text-[9px] text-gray-400 leading-none">احصل عليه من</p>
                  <p className="text-xs font-semibold text-white leading-none mt-0.5">Google Play</p>
                </div>
              </a>
            </div>
            <div className="flex gap-2">
              {[Facebook, Instagram, Twitter].map((Icon, idx) => (
                <a
                  key={idx}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-violet-600 hover:text-white transition-colors"
                  aria-label="رابط التواصل"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-gray-500">© 2026 AVEX. جميع الحقوق محفوظة.</span>
          <div className="flex gap-5">
            <a href="#" className="text-xs text-gray-500 hover:text-violet-400 transition-colors">سياسة الخصوصية</a>
            <a href="#" className="text-xs text-gray-500 hover:text-violet-400 transition-colors">الشروط والأحكام</a>
            <a href="?admin=1" className="text-xs text-gray-500 hover:text-violet-400 transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              لوحة التحكم
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
