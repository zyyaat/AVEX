'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, Phone, MapPin, Clock, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/store/cart'

export function Header() {
  const { getTotalItems, setOpen } = useCart()
  const itemCount = getTotalItems()

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Top bar */}
      <div className="bg-foreground text-background text-xs">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              <span dir="ltr">+962 6 555 1234</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              عمّان، الأردن
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>يومياً 10ص - 12م</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-md">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl leading-none">
                Frank<span className="text-primary">'</span>s
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                مطعم و توصيل سريع
              </p>
            </div>
          </motion.div>

          {/* Nav (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <a href="#menu">القائمة</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#offers">العروض</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#about">من نحن</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#contact">تواصل معنا</a>
            </Button>
          </nav>

          {/* Cart button */}
          <Button
            onClick={() => setOpen(true)}
            className="relative rounded-full h-11 px-4 shadow-md hover:shadow-lg transition-shadow"
            size="sm"
          >
            <ShoppingBag className="w-5 h-5 ml-1" />
            <span className="hidden sm:inline">السلة</span>
            {itemCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1"
              >
                <Badge className="bg-orange-500 text-white min-w-5 h-5 flex items-center justify-center p-0 px-1 text-[10px] font-bold border-2 border-card">
                  {itemCount}
                </Badge>
              </motion.div>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
