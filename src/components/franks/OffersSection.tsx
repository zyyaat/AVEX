'use client'

import { motion } from 'framer-motion'
import { Gift, Percent, Truck, Clock, Sparkles, Crown, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const OFFERS = [
  {
    icon: Truck,
    title: 'توصيل مجاني',
    desc: 'للطلبات فوق 30 ج.م',
    gradient: 'from-violet-600 to-purple-700',
    code: 'FREEDEL',
  },
  {
    icon: Percent,
    title: 'خصم 30%',
    desc: 'على طلبك الأول',
    gradient: 'from-amber-500 to-orange-600',
    code: 'AVEX30',
  },
  {
    icon: Gift,
    title: 'وجبة عائلية',
    desc: '4 برغر + 4 مشروبات بـ 99 ج.م',
    gradient: 'from-pink-600 to-rose-700',
    code: 'FAMILY99',
  },
  {
    icon: Clock,
    title: 'ساعة الغداء',
    desc: 'خصم 15% من 12ظ - 3م',
    gradient: 'from-cyan-600 to-blue-700',
    code: 'LUNCH15',
  },
]

export function OffersSection() {
  return (
    <section id="offers" className="py-8 md:py-12 bg-white">
      <div className="container mx-auto px-4">
        {/* AVEX Club Banner - like DashPass/talabat Pro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-700 p-6 md:p-8 mb-8"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3 blur-2xl" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl md:text-2xl font-extrabold text-white">AVEX Club</h3>
              </div>
              <p className="text-white/90 text-sm md:text-base mb-3">
                توصيل مجاني غير محدود + خصومات حصرية على كل طلب
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {['توصيل مجاني', 'خصم 10%', 'دعم مميز', 'أولوية الطلب'].map((perk, i) => (
                  <span key={i} className="text-[11px] bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 text-white">
                    ✓ {perk}
                  </span>
                ))}
              </div>
              <Button
                className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 rounded-full font-bold shadow-lg px-5 h-10"
                asChild
              >
                <a href="#menu">
                  اشترك بـ 49 ج.م/شهر
                  <ArrowLeft className="w-4 h-4 mr-1" />
                </a>
              </Button>
            </div>
            <div className="text-6xl md:text-7xl">👑</div>
          </div>
        </motion.div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-5 bg-violet-600 rounded-full" />
              <Sparkles className="w-5 h-5 text-violet-600" />
              عروض حصرية
            </h3>
            <p className="text-sm text-gray-500 mt-1">استفد من أفضل العروض والخصومات</p>
          </div>
        </div>

        {/* Offers grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {OFFERS.map((offer, idx) => {
            const Icon = offer.icon
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${offer.gradient} text-white p-4 shadow-sm hover:shadow-lg transition-shadow cursor-pointer group`}
              >
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/10 rounded-full" />
                <div className="absolute -bottom-3 -right-3 w-16 h-16 bg-white/10 rounded-full" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold">
                      {offer.code}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm mb-0.5">{offer.title}</h4>
                  <p className="text-xs text-white/80 leading-snug">{offer.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
