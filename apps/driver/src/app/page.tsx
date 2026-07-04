'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Package, Clock, MapPin, Navigation, CheckCircle2, Bike,
  TrendingUp, Star, Power, User, ArrowRight, Loader2, X
} from 'lucide-react'

// Mock driver state - will be replaced with real API
type DriverState = 'offline' | 'online' | 'delivering'
type OrderStatus = 'pending' | 'accepted' | 'picked_up' | 'delivering' | 'delivered'

interface DeliveryOrder {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  restaurantName: string
  address: string
  locationUrl: string
  items: { name: string; quantity: number }[]
  total: number
  deliveryFee: number
  status: OrderStatus
  createdAt: string
}

// Mock data - will be replaced with real API calls
const MOCK_ORDERS: DeliveryOrder[] = [
  {
    id: '1', orderNumber: 'AV123456789', customerName: 'أحمد محمد', phone: '01012345678',
    restaurantName: 'برجر هاوس', address: 'حي الزهور، شارع 5، مبنى 12',
    locationUrl: 'https://www.google.com/maps?q=30.0444,31.2357',
    items: [{ name: 'برغر كلاسيكي', quantity: 2 }, { name: 'بطاطس مقلية', quantity: 1 }],
    total: 30.97, deliveryFee: 3.99, status: 'pending', createdAt: new Date().toISOString(),
  },
  {
    id: '2', orderNumber: 'AV123456790', customerName: 'سارة علي', phone: '01098765432',
    restaurantName: 'بيتزا بالاس', address: 'المعادي، شارع 9، عمارة 45',
    locationUrl: 'https://www.google.com/maps?q=30.0500,31.2400',
    items: [{ name: 'بيتزا مارغريتا', quantity: 1 }, { name: 'كوكا كولا', quantity: 2 }],
    total: 20.97, deliveryFee: 4.99, status: 'pending', createdAt: new Date().toISOString(),
  },
]

export default function DriverHome() {
  const [driverState, setDriverState] = useState<DriverState>('offline')
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null)
  const [availableOrders, setAvailableOrders] = useState<DeliveryOrder[]>([])
  const [earnings, setEarnings] = useState(0)
  const [deliveredCount, setDeliveredCount] = useState(0)

  // Load available orders when online
  useEffect(() => {
    if (driverState === 'online') {
      const timer = setTimeout(() => setAvailableOrders(MOCK_ORDERS), 0)
      return () => clearTimeout(timer)
    }
  }, [driverState])

  const toggleOnline = () => {
    setDriverState(prev => prev === 'offline' ? 'online' : 'offline')
  }

  const acceptOrder = (order: DeliveryOrder) => {
    setActiveOrder({ ...order, status: 'accepted' })
    setAvailableOrders(prev => prev.filter(o => o.id !== order.id))
    setDriverState('delivering')
  }

  const advanceStatus = () => {
    if (!activeOrder) return
    const flow: Record<OrderStatus, OrderStatus | null> = {
      pending: 'accepted',
      accepted: 'picked_up',
      picked_up: 'delivering',
      delivering: 'delivered',
      delivered: null,
    }
    const next = flow[activeOrder.status]
    if (next === null) {
      // Order delivered
      setEarnings(prev => prev + activeOrder.deliveryFee)
      setDeliveredCount(prev => prev + 1)
      setActiveOrder(null)
      setDriverState('online')
    } else {
      setActiveOrder({ ...activeOrder, status: next })
    }
  }

  const statusLabels: Record<OrderStatus, string> = {
    pending: 'بانتظار القبول',
    accepted: 'تم القبول - اذهب للمطعم',
    picked_up: 'تم الاستلام - في الطريق',
    delivering: 'في الطريق للعميل',
    delivered: 'تم التوصيل',
  }

  return (
    <div className="min-h-dvh bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bike className="w-5 h-5 text-black" />
          <span className="font-bold text-lg">AVEX Driver</span>
        </div>
        <button
          onClick={toggleOnline}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-fluent ${
            driverState === 'offline'
              ? 'bg-gray-100 text-gray-500'
              : 'bg-black text-white'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${driverState === 'offline' ? 'bg-gray-400' : 'bg-green-400 animate-pulse'}`} />
          {driverState === 'offline' ? 'غير متصل' : 'متصل'}
          <Power className="w-3.5 h-3.5" />
        </button>
      </header>

      <div className="container mx-auto px-4 py-4 max-w-md">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <p className="text-lg font-bold text-black">{earnings.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400">الأرباح (ج.م)</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <p className="text-lg font-bold text-black">{deliveredCount}</p>
            <p className="text-[10px] text-gray-400">طلبات مكتملة</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <p className="text-lg font-bold text-black">{availableOrders.length}</p>
            <p className="text-[10px] text-gray-400">طلبات متاحة</p>
          </div>
        </div>

        {/* Active delivery */}
        {activeOrder && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-gray-200 p-4 mb-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">التوصيل الحالي</h3>
              <span className="text-xs font-medium bg-black text-white px-2 py-0.5 rounded">
                {statusLabels[activeOrder.status]}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{activeOrder.customerName}</span>
                <a href={`tel:${activeOrder.phone}`} className="text-gray-400 text-xs mr-auto" dir="ltr">{activeOrder.phone}</a>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500 text-xs">{activeOrder.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <span className="text-gray-500 text-xs flex-1">{activeOrder.address}</span>
              </div>
            </div>

            {/* Map link */}
            <a
              href={activeOrder.locationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-between gap-2 bg-gray-50 rounded-lg p-2.5 border border-gray-200 hover:border-gray-400 transition-fluent"
            >
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Navigation className="w-4 h-4" />
                افتح الخريطة
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </a>

            {/* Action button */}
            <button
              onClick={advanceStatus}
              className="w-full mt-3 h-11 rounded-lg bg-black hover:bg-gray-800 text-white text-sm font-medium flex items-center justify-center gap-2 transition-fluent"
            >
              {activeOrder.status === 'accepted' && <><Package className="w-4 h-4" /> وصلت للمطعم - استلم الطلب</>}
              {activeOrder.status === 'picked_up' && <><Bike className="w-4 h-4" /> بدأت التوصيل</>}
              {activeOrder.status === 'delivering' && <><CheckCircle2 className="w-4 h-4" /> تم التوصيل</>}
            </button>
          </motion.div>
        )}

        {/* Available orders */}
        {driverState === 'online' && !activeOrder && (
          <div>
            <h3 className="text-sm font-bold text-black mb-3">طلبات متاحة</h3>
            {availableOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">لا توجد طلبات متاحة حالياً</p>
                <p className="text-xs text-gray-400 mt-1">سيظهر هنا أي طلب جديد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableOrders.map(order => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-sm">{order.restaurantName}</p>
                        <p className="text-xs text-gray-400" dir="ltr">{order.orderNumber}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm">{order.deliveryFee.toFixed(2)} ج.م</p>
                        <p className="text-[10px] text-gray-400">عمولة التوصيل</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {order.customerName}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {order.address}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {order.items.length} أصناف • {order.total.toFixed(2)} ج.م
                      </div>
                    </div>

                    <button
                      onClick={() => acceptOrder(order)}
                      className="w-full h-10 rounded-lg bg-black hover:bg-gray-800 text-white text-sm font-medium transition-fluent"
                    >
                      قبول الطلب
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Offline state */}
        {driverState === 'offline' && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Power className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-bold text-black mb-1">أنت غير متصل</h3>
            <p className="text-sm text-gray-400 mb-4">اضغط للاتصال وبدء استقبال الطلبات</p>
            <button
              onClick={toggleOnline}
              className="px-6 h-11 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-fluent"
            >
              ابدأ العمل
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
