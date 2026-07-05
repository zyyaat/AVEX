'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Package, Loader2 } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { driverAPI } from '@/lib/api'
import { BottomTabBar } from '@/components/BottomTabBar'

export default function HistoryPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return }
  }, [isAuthenticated, router])

  useEffect(() => {
    setLoading(true)
    driverAPI.getHistory(page).then((h) => {
      setOrders(h.orders || [])
    }).finally(() => setLoading(false))
  }, [page])

  const statusLabels: Record<string, string> = {
    delivered: 'مكتمل',
    on_the_way: 'في الطريق',
    delivering: 'في الطريق',
    picked_up: 'تم الاستلام',
    assigned: 'مُسند',
    cancelled: 'ملغي',
    new: 'جديد',
    accepted: 'مقبول',
  }

  return (
    <div className="min-h-dvh bg-gray-50" dir="rtl">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">سجلّ الطلبات</h1>
      </header>

      <div className="container mx-auto px-4 py-4 max-w-md pb-20 sm:pb-4">
        {loading ? (
          <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-500">لا توجد طلبات في سجلّك بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{o.restaurantName || 'مطعم'}</p>
                  <p className="text-[10px] text-gray-400" dir="ltr">{o.orderNumber}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {new Date(o.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-black">{o.earnings.toFixed(2)} ج.م</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    o.status === 'delivered' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {statusLabels[o.status] || o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {orders.length === 20 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 h-9 rounded-lg border border-gray-200 bg-white text-sm disabled:opacity-50"
            >السابق</button>
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-4 h-9 rounded-lg border border-gray-200 bg-white text-sm"
            >التالي</button>
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  )
}
