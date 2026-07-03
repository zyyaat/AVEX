'use client'

import { motion } from 'framer-motion'
import { Award, Heart, Leaf, Users } from 'lucide-react'

const VALUES = [
  { icon: Leaf, title: 'مكونات طازجة', desc: 'نختار أجود المكونات الطازجة يومياً من مصادر موثوقة' },
  { icon: Heart, title: 'شغف بالطهي', desc: 'كل طبق يُحضّر بحب وشغف من قبل طهاتنا المحترفين' },
  { icon: Award, title: 'جودة عالية', desc: 'نلتزم بأعلى معايير الجودة والنظافة في كل مراحل التحضير' },
  { icon: Users, title: 'رضا العملاء', desc: 'أكثر من 5000 عميل سعيد يثقون بنا منذ 2010' },
]

export function AboutSection() {
  return (
    <section id="about" className="py-12 md:py-16 bg-background">
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
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-orange-500 rounded-[3rem] rotate-6 opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent rounded-[3rem] flex items-center justify-center">
                <span className="text-[14rem] md:text-[16rem]">👨‍🍳</span>
              </div>
              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-8 right-0 bg-card rounded-2xl shadow-xl p-3 border border-border"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <p className="font-extrabold text-lg leading-none">4.8</p>
                    <p className="text-[10px] text-muted-foreground">تقييم العملاء</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="absolute bottom-8 left-0 bg-card rounded-2xl shadow-xl p-3 border border-border"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚀</span>
                  <div>
                    <p className="font-extrabold text-lg leading-none">30د</p>
                    <p className="text-[10px] text-muted-foreground">توصيل سريع</p>
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
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-bold">
              من نحن
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">
              قصة <span className="text-primary">Frank&apos;s</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              بدأت رحلتنا في عام 2010 بحلم بسيط: تقديم طعام شهي بجودة عالية وبأسعار مناسبة.
              اليوم، أصبحنا واحداً من أشهر مطاعم عمّان، نخدم آلاف العملاء يومياً بشغف وحماس.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              نؤمن أن الطعام الجيد يجمع الناس. لذلك نحرص على أن يكون كل طبق يخرج من مطبخنا
              تحفة فنية تجمع بين النكهة الأصيلة والمظهر الجذاب. نستخدم فقط أجود المكونات
              الطازجة ونطبخها بحب لتصل إلى مائدتك.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {VALUES.map((value, idx) => {
                const Icon = value.icon
                return (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.03 }}
                    className="bg-muted/50 rounded-xl p-4 border border-border"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{value.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{value.desc}</p>
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
