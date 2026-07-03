'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/store/cart'

export function FloatingCartButton() {
  const { getTotalItems, getTotal, setOpen, items } = useCart()
  const count = getTotalItems()
  const total = getTotal()

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="fixed bottom-4 left-4 right-4 sm:hidden z-40"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <button
            onClick={() => setOpen(true)}
            className="w-full bg-primary text-primary-foreground rounded-2xl shadow-2xl px-5 py-4 flex items-center justify-between gap-3 animate-pulse-glow"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-400 text-[10px] font-bold flex items-center justify-center border-2 border-primary">
                  {count}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-primary-foreground/80">عرض السلة</p>
                <p className="font-bold">{total.toFixed(2)} د.أ</p>
              </div>
            </div>
            <div className="bg-white/20 rounded-lg px-3 py-1.5 text-xs font-bold">
              متابعة
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
