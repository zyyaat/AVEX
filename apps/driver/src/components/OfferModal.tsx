'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, User, Phone, Package, Clock, Navigation, TrendingUp, Loader2, Store } from 'lucide-react'
import type { Offer } from '@/lib/api'
import { useDriver } from '@/store/driver'
import { toast } from 'sonner'

interface OfferModalProps {
  offer: Offer
  onClose: () => void
}

export function OfferModal({ offer, onClose }: OfferModalProps) {
  const { acceptOffer, rejectOffer } = useDriver()
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(15)

  // Countdown
  useEffect(() => {
    const expiry = new Date(offer.expiresAt).getTime()
    const tick = () => {
      const left = Math.max(0, Math.ceil((expiry - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left <= 0) {
        toast.warning('انتهت صلاحية العرض')
        onClose()
      }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [offer.expiresAt, onClose])

  const handleAccept = async () => {
    setAccepting(true)
    try {
      const orderId = await acceptOffer(offer.offerId)
      toast.success('تم قبول الطلب — اذهب للمطعم')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'فشل القبول')
      onClose()
    } finally {
      setAccepting(false)
    }
  }

  const handleReject = async () => {
    setRejecting(true)
    try {
      await rejectOffer(offer.offerId)
      toast.info('تم رفض الطلب')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'فشل الرفض')
      onClose()
    } finally {
      setRejecting(false)
    }
  }

  // Progress circle
  const progress = secondsLeft / 15
  const circumference = 2 * Math.PI * 28
  const offset = circumference * (1 - progress)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-fluent-lg overflow-hidden"
          dir="rtl"
        >
          {/* Header with countdown */}
          <div className="bg-black text-white px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-300">طلب جديد</p>
              <p className="font-bold text-lg" dir="ltr">{offer.orderNumber}</p>
            </div>
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.15)" strokeWidth="3" fill="none" />
                <circle
                  cx="32" cy="32" r="28"
                  stroke="white" strokeWidth="3" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="transition-all duration-200"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                {secondsLeft}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Restaurant + Zone */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Store className="w-4 h-4 text-gray-600" />
                <span className="font-bold text-sm">{offer.restaurantName}</span>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {offer.zoneName}
              </p>
            </div>

            {/* Items summary */}
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 text-gray-400 mt-0.5" />
              <p className="text-sm text-gray-700 flex-1">{offer.itemsSummary}</p>
            </div>

            {/* Customer */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{offer.customerName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 text-xs flex-1">{offer.locationAddress}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Navigation className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 text-xs">المسافة للمطعم: {Math.round(offer.distanceM)} م</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-600 text-xs">للعميل: {Math.round(offer.estimatedDeliveryDistanceM)} م</span>
              </div>
            </div>

            {/* Earnings */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                <TrendingUp className="w-4 h-4 mx-auto mb-1 text-black" />
                <p className="text-lg font-bold">{offer.driverFee.toFixed(2)}</p>
                <p className="text-[10px] text-gray-500">أرباحك (ج.م)</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                <Clock className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                <p className="text-lg font-bold">{offer.total.toFixed(2)}</p>
                <p className="text-[10px] text-gray-500">قيمة الطلب</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 pt-1 grid grid-cols-2 gap-3">
            <button
              onClick={handleReject}
              disabled={accepting || rejecting}
              className="h-12 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-fluent disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'رفض'}
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting || rejecting}
              className="h-12 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-fluent disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'قبول الطلب'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
