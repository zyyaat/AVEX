'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, Search, User, LogOut, Package, ChevronDown, MapPin, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/store/cart'
import { useAuth } from '@/store/auth'
import { useRouter } from 'next/navigation'

export function Header() {
  const { getTotalItems, setOpen } = useCart()
  const { user, isAuthenticated, logout, initialize } = useAuth()
  const itemCount = getTotalItems()
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    initialize()
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [initialize])

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Main header - أبيض مع backdrop-blur مثل Uber Eats */}
      <div className={`bg-white/95 backdrop-blur-lg border-b transition-all ${
        scrolled ? 'border-gray-200 shadow-sm' : 'border-gray-100'
      }`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo + Location */}
          <div className="flex items-center gap-4">
            <motion.a
              href="/"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              {/* AVEX Logo - gradient circle */}
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-md avex-glow">
                <span className="text-lg font-extrabold text-white tracking-tight">A</span>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-yellow-400 border-2 border-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-extrabold text-xl leading-none text-gray-900 tracking-tight">
                  AVEX
                </h1>
                <p className="text-[9px] text-gray-400 leading-none mt-0.5 flex items-center gap-0.5">
                  <Zap className="w-2 h-2 text-yellow-500" />
                  توصيل بسرعة الصاروخ
                </p>
              </div>
            </motion.a>

            {/* Location selector - like Uber Eats */}
            <button className="hidden md:flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 rounded-full px-3 py-1.5 transition-colors group">
              <MapPin className="w-3.5 h-3.5 text-violet-600" />
              <span className="text-sm font-medium text-gray-700">توصيل إلى</span>
              <span className="text-sm font-bold text-gray-900 max-w-[100px] truncate">منزلك</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* Search bar - desktop */}
          <div className="hidden lg:flex flex-1 max-w-md relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن مطاعم، أطباق..."
              className="w-full h-10 bg-gray-50 border border-gray-200 rounded-full pr-9 pl-4 text-sm placeholder:text-gray-400 focus:bg-white focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all"
              onClick={() => router.push('/#menu')}
              readOnly
            />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* User menu / Auth */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-full px-2 py-1.5 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[80px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
                    >
                      <div className="p-3 border-b border-gray-100">
                        <p className="font-bold text-sm text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500" dir="ltr">{user.phone}</p>
                        {user.loyaltyPoints > 0 && (
                          <p className="text-[10px] text-violet-600 mt-1">🎁 {user.loyaltyPoints} نقطة ولاء</p>
                        )}
                      </div>
                      <button
                        onClick={() => { setUserMenuOpen(false); router.push('/?myorders=1') }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-right"
                      >
                        <Package className="w-4 h-4" />
                        طلباتي
                      </button>
                      <button
                        onClick={() => { setUserMenuOpen(false); router.push('/?account=1') }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-right"
                      >
                        <User className="w-4 h-4" />
                        حسابي
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-right"
                      >
                        <LogOut className="w-4 h-4" />
                        تسجيل الخروج
                      </button>
                    </motion.div>
                  </>
                )}
              </div>
            ) : (
              <Button
                onClick={() => router.push('/?auth=login')}
                variant="outline"
                size="sm"
                className="rounded-full h-10 px-4 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-violet-300"
              >
                <User className="w-4 h-4 ml-1" />
                <span className="hidden sm:inline">دخول</span>
              </Button>
            )}

            {/* Cart button - violet with yellow badge */}
            <Button
              onClick={() => setOpen(true)}
              className="relative bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white rounded-full h-10 px-4 shadow-sm hover:shadow-md transition-all"
              size="sm"
            >
              <ShoppingBag className="w-5 h-5 ml-1.5" />
              <span className="hidden sm:inline font-semibold">السلة</span>
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold border-2 border-white shadow-sm"
                >
                  {itemCount}
                </motion.span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
