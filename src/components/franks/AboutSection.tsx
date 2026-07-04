'use client'

import { motion } from 'framer-motion'
import { Award, Heart, Leaf, Users, Zap } from 'lucide-react'

const VALUES = [
  { icon: Zap, title: 'سرعة فائقة', desc: 'توصيل خلال 20-45 دقيقة بأحدث التقنيات' },
  { icon: Heart, title: 'شغف بالخدمة', desc: 'كل طلب يُحضّر ويُوصل بحب وشغف' },
  { icon: Award, title: 'جودة عالمية', desc: 'نلتزم بأعلى معايير الجودة والنظافة' },
  { icon: Users, title: 'رضا العملاء', desc: 'أكثر من 5000 عميل سعيد يثقون بنا' },
]

export function AboutSection() {
  return (
    <section id="about" className="py-12 md:py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square max-w-md mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-purple-700 rounded-[3rem] rotate-6 opacity-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-purple-50 rounded-[3rem] flex items-center justify-center border border-violet-100">
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-xl avex-glow">
                      <span className="text-7xl font-extrabold text-white">A</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-400 border-4 border-white shadow-lg" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900">AVEX</h3>
                  <p className="text-sm text-gray-500 mt-1">أفكس - توصيل بسرعة الصاروخ</p>
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-8 right-0 bg-white rounded-2xl shadow-xl p-3 border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="font-extrabold text-lg leading-none text-violet-600">20د</p>
                    <p className="text-[10px] text-gray-500">توصيل سريع</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="absolute bottom-8 left-0 bg-white rounded-2xl shadow-xl p-3 border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <p className="font-extrabold text-lg leading-none text-violet-600">4.8</p>
                    <p className="text-[10px] text-gray-500">تقييم العملاء</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-5"
          >
            <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-sm font-bold">
              من نحن
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight text-gray-900">
              قصة <span className="text-violet-600">AVEX</span>
            </h2>
            <p className="text-gray-600 leading-relaxed">
              AVEX هي منصة توصيل عالمية وُلدت لثورة في تجربة التوصيل. نجمع بين السرعة والجودة والابتكار
              لنقدم لك تجربة طلب لا مثيل لها. من الطعام إلى البقالة، نوصل كل ما تحتاجه بسرعة الصاروخ.
            </p>
            <p className="text-gray-600 leading-relaxed">
              نؤمن أن التوصيل الجيد يبدأ بالتفاصيل الصغيرة - من واجهة سهلة الاستخدام، إلى دفع آمن،
              إلى تتبع مباشر لطلبك. كل هذا مع التزامنا بأعلى معايير الجودة.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {VALUES.map((value, idx) => {
                const Icon = value.icon
                return (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.03 }}
                    className="bg-white rounded-xl p-4 border border-gray-100"
                  >
                    <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-2">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm mb-1 text-gray-900">{value.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{value.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
