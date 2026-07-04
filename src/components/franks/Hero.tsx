'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Zap, Star, Truck, Clock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

const SLIDES = [
  {
    badge: '🔥 عرض الإطلاق',
    title: 'خصم 30% على أول طلب',
    subtitle: 'استخدم الكود AVEX30 عند الدفع',
    cta: 'اطلب الآن',
    gradient: 'from-violet-700 via-purple-700 to-fuchsia-700',
    emoji: '🚀',
  },
  {
    badge: '⚡ AVEX Express',
    title: 'توصيل خلال 20 دقيقة',
    subtitle: 'اطلب من مطاعم مختارة واستمتع بأسرع توصيل',
    cta: 'جرّب الآن',
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    emoji: '⚡',
  },
  {
    badge: '🍔 AVEX Club',
    title: 'توصيل مجاني غير محدود',
    subtitle: 'اشترك في AVEX Club ووفّر على كل طلب',
    cta: 'اشترك الآن',
    gradient: 'from-violet-600 via-blue-600 to-cyan-600',
    emoji: '👑',
  },
]

const FEATURES = [
  { icon: Truck, title: 'توصيل سريع', desc: 'خلال 20-45 دقيقة' },
  { icon: Clock, title: '7 أيام في الأسبوع', desc: 'من 10ص حتى 12م' },
  { icon: ShieldCheck, title: 'دفع آمن', desc: 'بطاقاتك محمية 100%' },
  { icon: Star, title: 'تقييم 4.8', desc: 'من أكثر من 5000 عميل' },
]

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)

  // Auto-rotate slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)

  return (
    <section className="relative bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Hero Carousel */}
        <div className="relative overflow-hidden rounded-3xl mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${SLIDES[currentSlide].gradient} p-6 md:p-10`}
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3 blur-2xl" />

              <div className="relative z-10 max-w-lg">
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {SLIDES[currentSlide].badge}
                </motion.span>

                <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-white leading-tight">
                  {SLIDES[currentSlide].title}
                </h2>

                <p className="mt-2 text-white/90 text-sm md:text-base">
                  {SLIDES[currentSlide].subtitle}
                </p>

                <div className="mt-5 flex items-center gap-3">
                  <Button
                    size="lg"
                    className="bg-white text-violet-700 hover:bg-white/90 rounded-full font-bold shadow-lg px-6 h-11"
                    asChild
                  >
                    <a href="#menu">
                      {SLIDES[currentSlide].cta}
                      <ChevronLeft className="w-4 h-4 mr-1" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Emoji */}
              <div className="absolute top-1/2 left-8 -translate-y-1/2 hidden md:block">
                <motion.div
                  key={currentSlide + '-emoji'}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="text-7xl"
                >
                  {SLIDES[currentSlide].emoji}
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          <button
            onClick={prevSlide}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="السابق"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="التالي"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                }`}
                aria-label={`الشريحة ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Features bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -3 }}
                className="bg-white rounded-2xl border border-gray-100 p-3.5 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-gray-900">{feature.title}</p>
                  <p className="text-[11px] text-gray-500">{feature.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
