'use client'

import { motion } from 'framer-motion'
import { Star, Truck, Clock, ShieldCheck, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const FEATURES = [
  { icon: Truck, title: 'توصيل سريع', desc: 'خلال 30-45 دقيقة' },
  { icon: Clock, title: '7 أيام في الأسبوع', desc: 'من 10ص حتى 12م' },
  { icon: ShieldCheck, title: 'جودة مضمونة', desc: 'مكونات طازجة 100%' },
  { icon: Star, title: 'تقييم 4.8', desc: 'من أكثر من 5000 عميل' },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-red-600 to-orange-500 text-white">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,white_2px,transparent_2px)] bg-[length:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,white_1px,transparent_2px)] bg-[length:30px_30px]" />
      </div>

      {/* Decorative blurred circles */}
      <div className="absolute top-10 right-10 w-72 h-72 bg-orange-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-red-400/20 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-12 md:py-20 relative">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-5 text-center md:text-right"
          >
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              مفتوح الآن - توصيل سريع
            </div>

            <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
              أشهى الأطباق
              <br />
              <span className="text-orange-200">تصلك لباب منزلك</span>
            </h2>

            <p className="text-lg text-white/90 max-w-md mx-auto md:mr-0">
              استمتع بألذ البرغر والبيتزا والمقبلات المحضّرة بأجود المكونات الطازجة.
              اطلب الآن واستمتع بتجربة طعام لا تُنسى!
            </p>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 rounded-full text-base font-bold shadow-xl px-7 h-13"
                asChild
              >
                <a href="#menu">
                  اطلب الآن
                  <ChevronLeft className="w-5 h-5 mr-1" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white rounded-full text-base px-7 h-13"
                asChild
              >
                <a href="#offers">شاهد العروض</a>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-6 justify-center md:justify-start pt-2">
              <div>
                <p className="text-2xl font-extrabold">+5000</p>
                <p className="text-xs text-white/80">عميل سعيد</p>
              </div>
              <div className="w-px bg-white/30" />
              <div>
                <p className="text-2xl font-extrabold">+50</p>
                <p className="text-xs text-white/80">صنف طعام</p>
              </div>
              <div className="w-px bg-white/30" />
              <div>
                <p className="text-2xl font-extrabold">30د</p>
                <p className="text-xs text-white/80">متوسط التوصيل</p>
              </div>
            </div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden md:flex justify-center items-center relative"
          >
            {/* Big circle with food emojis */}
            <div className="relative w-80 h-80">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-full border-4 border-white/20" />
              <div className="absolute inset-4 bg-white/5 rounded-full" />

              {/* Center emoji */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10rem] animate-float drop-shadow-2xl">🍔</span>
              </div>

              {/* Floating emojis around */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0 }}
                className="absolute top-0 right-12 text-5xl"
              >
                🍕
              </motion.div>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                className="absolute bottom-0 left-12 text-5xl"
              >
                🍟
              </motion.div>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="absolute top-12 left-0 text-4xl"
              >
                🥤
              </motion.div>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
                className="absolute bottom-12 right-0 text-4xl"
              >
                🍰
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12"
        >
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex items-center gap-3 border border-white/10"
              >
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">{feature.title}</p>
                  <p className="text-xs text-white/80">{feature.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
