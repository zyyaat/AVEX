'use client'

import { motion } from 'framer-motion'
import { Gift, Percent, Truck, Clock } from 'lucide-react'

const OFFERS = [
  {
    icon: Truck,
    title: 'توصيل مجاني',
    desc: 'للطلبات فوق 30 د.أ',
    color: 'from-green-500 to-emerald-600',
    badge: 'مستمر',
  },
  {
    icon: Percent,
    title: 'خصم 20%',
    desc: 'على طلبك الأول',
    color: 'from-orange-500 to-red-600',
    badge: 'جديد',
  },
  {
    icon: Gift,
    title: 'وجبة عائلية',
    desc: '4 برغر + 4 مشروبات بسعر 39 د.أ',
    color: 'from-purple-500 to-pink-600',
    badge: 'وفّر 25%',
  },
  {
    icon: Clock,
    title: 'ساعة الغداء',
    desc: 'خصم 15% من 12ظ - 3م يومياً',
    color: 'from-amber-500 to-orange-600',
    badge: 'يومي',
  },
]

export function OffersSection() {
  return (
    <section id="offers" className="py-12 md:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-bold mb-3"
          >
            <Gift className="w-4 h-4" />
            عروض خاصة
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-2">
            عروض لا تُفوّت
          </h2>
          <p className="text-muted-foreground">
            استفدد من أفضل العروض والخصومات الحصرية
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {OFFERS.map((offer, idx) => {
            const Icon = offer.icon
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${offer.color} text-white p-6 shadow-lg`}
              >
                {/* Decorative circle */}
                <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-bold">
                      {offer.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold mb-1">{offer.title}</h3>
                  <p className="text-sm text-white/90">{offer.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
