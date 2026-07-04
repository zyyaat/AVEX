'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2, CreditCard, Banknote, User, Phone,
  MapPin, CheckCircle2, Navigation, ExternalLink, RefreshCw, MapPinOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/store/cart'
import { toast } from 'sonner'

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (orderNumber: string) => void
}

type LocationState = 'idle' | 'loading' | 'success' | 'error'

export function CheckoutDialog({ open, onOpenChange, onSuccess }: CheckoutDialogProps) {
  const { items, getSubtotal, getDeliveryFee, getTotal, clearCart } = useCart()
  const [loading, setLoading] = useState(false)

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  // Location state
  const [locationState, setLocationState] = useState<LocationState>('idle')
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null)
  const [locationError, setLocationError] = useState<string>('')

  const subtotal = getSubtotal()
  const deliveryFee = getDeliveryFee()
  const total = getTotal()

  const googleMapsUrl = location
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
    : null

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationError('المتصفح لا يدعم تحديد الموقع')
      setLocationState('error')
      toast.error('المتصفح لا يدعم تحديد الموقع')
      return
    }

    setLocationState('loading')
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLocation({ lat: latitude, lng: longitude })
        setLocationState('success')
        toast.success('تم تحديد موقعك بنجاح! 📍')
      },
      (error) => {
        let msg = 'تعذر تحديد موقعك'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'تم رفض إذن الوصول للموقع. فعّل الإذن من إعدادات المتصفح'
            break
          case error.POSITION_UNAVAILABLE:
            msg = 'الموقع غير متاح حالياً'
            break
          case error.TIMEOUT:
            msg = 'انتهت مهلة تحديد الموقع. حاول مرة أخرى'
            break
        }
        setLocationError(msg)
        setLocationState('error')
        toast.error(msg)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  const handleResetLocation = () => {
    setLocation(null)
    setLocationState('idle')
    setLocationError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerName || !phone) {
      toast.error('يرجى ملء الاسم ورقم الهاتف')
      return
    }

    // التحقق من رقم الهاتف المصري: 11 رقم بالضبط
    // يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015
    const cleanPhone = phone.replace(/[\s\-+]/g, '')
    if (!/^01[0125][0-9]{8}$/.test(cleanPhone)) {
      toast.error('رقم الهاتف يجب أن يكون 11 رقماً مصرياً ويبدأ بـ 010 أو 011 أو 012 أو 015')
      return
    }

    if (!location) {
      toast.error('يرجى تحديد موقعك أولاً عبر زر "تحديد موقعي"')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          phone,
          paymentMethod,
          locationLat: location.lat,
          locationLng: location.lng,
          locationAddress: location.address,
          items: items.map((i) => ({
            menuItemId: i.id,
            quantity: i.quantity,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create order')
      }

      const data = await response.json()
      clearCart()
      // Reset form
      setCustomerName('')
      setPhone('')
      setPaymentMethod('cash')
      handleResetLocation()
      onOpenChange(false)
      onSuccess(data.order.orderNumber)
    } catch (error) {
      console.error(error)
      const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الطلب'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92dvh] overflow-hidden rounded-2xl p-0 flex flex-col gap-0">
        {/* Scrollable content */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1">
          <DialogHeader className="flex-shrink-0 mb-4">
            <DialogTitle className="text-xl flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              إتمام الطلب
            </DialogTitle>
            <DialogDescription>
              أدخل بياناتك وحدد موقعك لإكمال الطلب
            </DialogDescription>
          </DialogHeader>

          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Customer info - only name and phone */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="customerName" className="text-sm font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  الاسم الكامل <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  required
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  رقم الهاتف <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    let val = e.target.value
                    val = val.replace(/[^\d+]/g, '')
                    if (val.startsWith('+20')) {
                      val = '0' + val.slice(3)
                    } else if (val.startsWith('20') && val.length === 13 && val[2] === '1') {
                      val = '0' + val.slice(2)
                    } else if (val.startsWith('+')) {
                      val = val.replace(/\+/g, '')
                    }
                    val = val.replace(/[^0-9]/g, '').slice(0, 11)
                    setPhone(val)
                  }}
                  placeholder="01012345678"
                  required
                  className={`rounded-lg ${
                    phone && !/^01[0125][0-9]{8}$/.test(phone)
                      ? 'border-destructive'
                      : phone.length === 11 && /^01[0125][0-9]{8}$/.test(phone)
                      ? 'border-green-500'
                      : ''
                  }`}
                  dir="ltr"
                  inputMode="tel"
                />
              </div>
            </div>

            <Separator />

            {/* Location section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                موقع التوصيل <span className="text-destructive">*</span>
              </Label>

              {/* Locate Me button - changes color based on state */}
              {locationState !== 'success' && (
                <Button
                  type="button"
                  onClick={handleLocateMe}
                  disabled={locationState === 'loading'}
                  variant={locationState === 'error' ? 'destructive' : 'outline'}
                  className={`w-full h-12 rounded-xl font-bold transition-all ${
                    locationState === 'error'
                      ? 'bg-destructive text-white hover:bg-destructive/90'
                      : 'border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  {locationState === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      جاري تحديد موقعك...
                    </>
                  ) : locationState === 'error' ? (
                    <>
                      <MapPinOff className="w-5 h-5 ml-2" />
                      إعادة محاولة تحديد الموقع
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5 ml-2" />
                      تحديد موقعي الحالي
                    </>
                  )}
                </Button>
              )}

              {/* Success state - green with location info */}
              {locationState === 'success' && location && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border-2 border-green-500 bg-green-50 p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 text-green-700">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">تم تحديد موقعك بنجاح</p>
                      <p className="text-xs text-green-600" dir="ltr">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetLocation}
                      className="text-green-600 hover:text-green-800 p-1"
                      aria-label="إعادة تحديد الموقع"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Google Maps preview link */}
                  <a
                    href={googleMapsUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 bg-white rounded-lg p-2.5 border border-green-200 hover:border-green-400 hover:bg-green-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800">عرض الموقع على خرائط جوجل</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-green-600 group-hover:translate-x-[-2px] transition-transform" />
                  </a>
                </motion.div>
              )}

              {/* Error message */}
              {locationState === 'error' && locationError && (
                <p className="text-xs text-destructive bg-destructive/5 rounded-lg p-2">
                  {locationError}
                </p>
              )}

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                💡 سيتم فتح خرائط جوجل لعرض موقعك بدقة. تأكد من تفعيل GPS والسماح بالوصول للموقع.
              </p>
            </div>

            <Separator />

            {/* Payment method */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">طريقة الدفع</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                className="grid grid-cols-2 gap-2"
              >
                <label
                  htmlFor="cash"
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <RadioGroupItem value="cash" id="cash" />
                  <Banknote className="w-4 h-4" />
                  <span className="text-sm font-medium">نقداً</span>
                </label>
                <label
                  htmlFor="card"
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'card'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <RadioGroupItem value="card" id="card" />
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm font-medium">بطاقة</span>
                </label>
              </RadioGroup>
            </div>

            <Separator />

            {/* Order summary */}
            <div className="space-y-2 bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>عدد الأصناف</span>
                <span className="font-medium text-foreground">{items.length}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>المجموع الفرعي</span>
                <span className="font-medium text-foreground">{subtotal.toFixed(2)} د.أ</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>رسوم التوصيل</span>
                <span className="font-medium text-foreground">
                  {deliveryFee === 0 ? (
                    <span className="text-green-600 font-bold">مجاني</span>
                  ) : (
                    `${deliveryFee.toFixed(2)} د.أ`
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold">الإجمالي</span>
                <span className="font-extrabold text-lg text-primary">{total.toFixed(2)} د.أ</span>
              </div>
            </div>
          </form>
        </div>

        {/* Fixed footer with submit button - always visible */}
        <div
          className="border-t border-border p-4 bg-card flex-shrink-0"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <Button
            type="submit"
            form="checkout-form"
            disabled={loading || items.length === 0 || !location}
            className="w-full h-12 text-base font-bold rounded-xl shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                جاري إنشاء الطلب...
              </>
            ) : !location ? (
              'حدد موقعك أولاً للمتابعة'
            ) : (
              `تأكيد الطلب • ${total.toFixed(2)} د.أ`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
