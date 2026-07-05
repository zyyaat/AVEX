'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, Calendar, Loader2, Package } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { useDriver } from '@/store/driver'
import { driverAPI } from '@/lib/api'
import { BottomTabBar } from '@/components/BottomTabBar'

export default function EarningsPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { driver } = useDriver()
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [data, setData] = useState<{ totalEarnings: number; completedOrders: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return }
  }, [isAuthenticated, router])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      driverAPI.getEarnings(period),
      driverAPI.getHistory(1),
    ]).then(([e, h]) => {
      setData({ totalEarnings: e.totalEarnings, completedOrders: e.completedOrders })
      setHistory(h.orders || [])
    }).finally(() => setLoading(false))
  }, [period])

  const periodLabels = { today: 'اليوم', week: 'الأسبوع', month: 'الشهر' }

  return (
    <div className="min-h-dvh bg-gray-50" dir="rtl">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">أرباحي</h1>
      </header>

      <div className="container mx-auto px-4 py-4 max-w-md pb-20 sm:pb-4">
        {/* Period tabs */}
        <div className="grid grid-cols-3 gap-1 bg-gray-100 rounded-lg p-1 mb-4">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`py-2 rounded-md text-xs font-bold transition-fluent ${
                period === p ? 'bg-white text-black shadow-fluent' : 'text-gray-500'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {/* Total earnings card */}
        <div className="bg-black text-white rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-300">إجمالي الأرباح — {periodLabels[period]}</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <p className="text-3xl font-bold">{data?.totalEarnings.toFixed(2) ?? '0.00'} <span className="text-base">ج.م</span></p>
              <p className="text-xs text-gray-300 mt-1">{data?.completedOrders ?? 0} طلب مكتمل</p>
            </>
          )}
        </div>

        {/* Lifetime stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1">إجمالي الأرباح (تراكمي)</p>
            <p className="text-lg font-bold">{driver?.stats.totalEarnings.toFixed(2) ?? '0.00'} ج.م</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1">طلبات مكتملة (تراكمي)</p>
            <p className="text-lg font-bold">{driver?.stats.completedOrders ?? 0}</p>
          </div>
        </div>

        {/* Recent orders */}
        <h3 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" /> آخر الطلبات
        </h3>
        {loading ? (
          <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">لا توجد طلبات بعد</div>
        ) : (
          <div className="space-y-2">
            {history.map((o) => (
              <div key={o.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{o.restaurantName || 'مطعم'}</p>
                  <p className="text-[10px] text-gray-400" dir="ltr">{o.orderNumber}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-black">{o.earnings.toFixed(2)} ج.م</p>
                  <p className="text-[10px] text-gray-400">{o.status === 'delivered' ? 'مكتمل' : o.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  )
}
