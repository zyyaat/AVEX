'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, ChevronLeft } from 'lucide-react'
import { useCart } from '@/store/cart'

export function FloatingCartButton() {
  const { getTotalItems, getTotal, setOpen } = useCart()
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
          className="fixed left-3 right-3 z-50 sm:hidden"
          style={{
            bottom: 'max(60px, env(safe-area-inset-bottom, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <button
            onClick={() => setOpen(true)}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-2xl shadow-2xl px-4 py-3.5 flex items-center justify-between gap-3 hover:from-violet-700 hover:to-purple-800 active:scale-[0.98] transition-all pointer-events-auto"
          >
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-yellow-400 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-yellow-900" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-white text-violet-700 text-[11px] font-bold flex items-center justify-center border-2 border-violet-700 shadow-sm">
                {count}
              </span>
            </div>

            <div className="flex-1 text-right min-w-0">
              <p className="text-[11px] text-white/70 leading-none mb-0.5">عرض السلة</p>
              <p className="font-bold text-base leading-none truncate">{total.toFixed(2)} ج.م</p>
            </div>

            <div className="flex items-center gap-1 bg-white/15 rounded-full px-3 py-1.5 flex-shrink-0">
              <span className="text-xs font-bold">متابعة</span>
              <ChevronLeft className="w-4 h-4" />
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
