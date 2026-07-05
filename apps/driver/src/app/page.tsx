'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bike, Power, MapPin, Clock, TrendingUp, Star, Package,
  Zap, AlertCircle, Loader2, Navigation
} from 'lucide-react'
import { useAuth } from '@/store/auth'
import { useDriver } from '@/store/driver'
import { driverAPI } from '@/lib/api'
import { BottomTabBar } from '@/components/BottomTabBar'
import { TierBadge } from '@/components/TierBadge'
import { OfferModal } from '@/components/OfferModal'
import { ActiveDelivery } from '@/components/ActiveDelivery'
import { toast } from 'sonner'

export default function DriverHome() {
  const router = useRouter()
  const { isAuthenticated, mustChangePassword, setMustChangePassword, logout } = useAuth()
  const {
    driver, offers, activeOrder,
    fetchMe, setOnline, updateLocation, refreshOffers, refreshActiveOrder, clear,
  } = useDriver()
  const [bootChecked, setBootChecked] = useState(false)
  const [togglingOnline, setTogglingOnline] = useState(false)
  const [activeOffer, setActiveOffer] = useState<string | null>(null)
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const offersIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const activeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Boot: check auth + load driver
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    setBootChecked(true)
    fetchMe()
  }, [isAuthenticated, router, fetchMe])

  // Change password prompt
  useEffect(() => {
    if (mustChangePassword) {
      router.push('/profile?change-password=1')
    }
  }, [mustChangePassword, router])

  // Watch GPS + send to backend when online
  useEffect(() => {
    if (!driver?.isOnline) {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current)
        locationIntervalRef.current = null
      }
      return
    }
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع')
      return
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        updateLocation(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        // silent
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    // Fallback interval in case watchPosition doesn't fire
    locationIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateLocation(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
      )
    }, 5000)
    return () => {
      navigator.geolocation.clearWatch(watchId)
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current)
    }
  }, [driver?.isOnline, updateLocation])

  // Poll offers when online and no active order
  useEffect(() => {
    if (!driver?.isOnline || activeOrder) {
      if (offersIntervalRef.current) {
        clearInterval(offersIntervalRef.current)
        offersIntervalRef.current = null
      }
      return
    }
    refreshOffers()
    offersIntervalRef.current = setInterval(refreshOffers, 3000)
    return () => {
      if (offersIntervalRef.current) clearInterval(offersIntervalRef.current)
    }
  }, [driver?.isOnline, activeOrder, refreshOffers])

  // Poll active order
  useEffect(() => {
    if (!activeOrder) {
      if (activeIntervalRef.current) {
        clearInterval(activeIntervalRef.current)
        activeIntervalRef.current = null
      }
      return
    }
    activeIntervalRef.current = setInterval(refreshActiveOrder, 5000)
    return () => {
      if (activeIntervalRef.current) clearInterval(activeIntervalRef.current)
    }
  }, [activeOrder, refreshActiveOrder])

  const handleToggleOnline = async () => {
    setTogglingOnline(true)
    try {
      const next = !driver?.isOnline
      await setOnline(next)
      toast.success(next ? 'أنت الآن متصل — استقبال الطلبات مفعّل' : 'تم إيقاف الاستقبال')
    } catch (err: any) {
      toast.error(err.message || 'تعذّر التبديل')
    } finally {
      setTogglingOnline(false)
    }
  }

  const handleLogout = () => {
    clear()
    logout()
    router.replace('/login')
  }

  // Pick the most recent offer to show in modal
  const currentOffer = activeOffer ? offers.find(o => o.offerId === activeOffer) : offers[0]
  useEffect(() => {
    if (offers.length > 0 && !activeOffer) {
      setActiveOffer(offers[0].offerId)
    }
    if (offers.length === 0) setActiveOffer(null)
  }, [offers, activeOffer])

  if (!bootChecked) {
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bike className="w-5 h-5 text-black" />
          <span className="font-bold text-lg">AVEX Driver</span>
          {driver?.tier && (
            <TierBadge
              nameAr={driver.tier.nameAr}
              color={driver.tier.color}
              sortOrder={driver.tier.sortOrder}
              size="sm"
            />
          )}
        </div>
        <button
          onClick={handleToggleOnline}
          disabled={togglingOnline}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-fluent disabled:opacity-50 ${
            driver?.isOnline ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {togglingOnline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
            <div className={`w-2 h-2 rounded-full ${driver?.isOnline ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
          )}
          {driver?.isOnline ? 'متصل' : 'غير متصل'}
          <Power className="w-3.5 h-3.5" />
        </button>
      </header>

      <div className="container mx-auto px-4 py-4 max-w-md pb-20 sm:pb-4">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center">
            <p className="text-base font-bold text-black">{driver?.stats.completedOrders ?? 0}</p>
            <p className="text-[9px] text-gray-400">مكتمل</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center">
            <p className="text-base font-bold text-black">{driver?.stats.acceptanceRate.toFixed(0) ?? 0}%</p>
            <p className="text-[9px] text-gray-400">قبول</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center">
            <p className="text-base font-bold text-black">{driver?.stats.rating.toFixed(1) ?? '0.0'}</p>
            <p className="text-[9px] text-gray-400">تقييم</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-center">
            <p className="text-base font-bold text-black">{driver?.stats.totalEarnings.toFixed(0) ?? 0}</p>
            <p className="text-[9px] text-gray-400">ج.م</p>
          </div>
        </div>

        {/* Active delivery */}
        {activeOrder && <ActiveDelivery />}

        {/* Available offers (only when no active order) */}
        {!activeOrder && driver?.isOnline && (
          <div>
            <h3 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              طلبات متاحة ({offers.length})
            </h3>
            {offers.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">في انتظار الطلبات...</p>
                <p className="text-xs text-gray-400 mt-1">سيظهر أي طلب جديد هنا فور قبول المطعم</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => (
                  <motion.button
                    key={offer.offerId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setActiveOffer(offer.offerId)}
                    className="w-full text-right bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-400 transition-fluent"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-sm">{offer.restaurantName}</p>
                        <p className="text-xs text-gray-400" dir="ltr">{offer.orderNumber}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm">{offer.driverFee.toFixed(2)} ج.م</p>
                        <p className="text-[10px] text-gray-400">عمولة التوصيل</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {offer.zoneName} — {Math.round(offer.distanceM)} م منك
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> {offer.itemsSummary}
                      </div>
                    </div>
                    <div className="bg-black text-white text-center py-2 rounded-lg text-xs font-bold">
                      اضغط لعرض التفاصيل والقبول
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Offline state */}
        {!driver?.isOnline && !activeOrder && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Power className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-bold text-black mb-1">أنت غير متصل</h3>
            <p className="text-sm text-gray-400 mb-4">اضغط للاتصال وبدء استقبال الطلبات</p>
            <button
              onClick={handleToggleOnline}
              disabled={togglingOnline}
              className="px-6 h-11 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-fluent inline-flex items-center gap-2"
            >
              {togglingOnline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              ابدأ العمل
            </button>
          </div>
        )}

        {/* Next tier progress */}
        {driver?.nextTier && (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">مستواك الحالي</span>
              <TierBadge
                nameAr={driver.tier.nameAr}
                color={driver.tier.color}
                sortOrder={driver.tier.sortOrder}
                size="sm"
              />
            </div>
            <p className="text-sm font-bold mb-2">المستوى التالي: {driver.nextTier.nameAr}</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">الطلبات المكتملة</span>
                <span className="font-bold">{driver.stats.completedOrders} / {driver.nextTier.minLifetimeOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">نسبة القبول</span>
                <span className="font-bold">{driver.stats.acceptanceRate.toFixed(0)}% / {driver.nextTier.minAcceptanceRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">التقييم</span>
                <span className="font-bold">{driver.stats.rating.toFixed(1)} / {driver.nextTier.minCustomerRating}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Offer Modal */}
      {currentOffer && (
        <OfferModal
          offer={currentOffer}
          onClose={() => setActiveOffer(null)}
        />
      )}

      <BottomTabBar />
    </div>
  )
}
