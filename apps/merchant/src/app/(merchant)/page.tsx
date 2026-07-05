'use client'
import { useState, useEffect } from 'react'
import { Package, TrendingUp, CheckCircle2, Power, Loader2, Clock } from 'lucide-react'
import { merchantAPI } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function MerchantDashboard() {
  const router = useRouter()
  const { merchant, fetchMe } = useAuth() as any
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    merchantAPI.getStats().then(setStats).finally(() => setLoading(false))
    const id = setInterval(() => merchantAPI.getStats().then(setStats), 30000)
    return () => clearInterval(id)
  }, [])

  const togglePause = async () => {
    setToggling(true)
    try {
      const next = !merchant?.restaurant?.isActive
      await merchantAPI.togglePause(next)
      if (fetchMe) await fetchMe()
      else window.location.reload()
      toast.success(next ? 'تم فتح المطعم' : 'تم إغلاق المطعم مؤقتاً')
    } catch (e: any) { toast.error(e.message) }
    finally { setToggling(false) }
  }

  if (loading || !stats) return <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>

  const kpis = [
    { label: 'طلبات اليوم', value: stats.todayCount, icon: Package },
    { label: 'طلبات نشطة', value: stats.activeCount, icon: Clock },
    { label: 'مكتملة', value: stats.completedCount, icon: CheckCircle2 },
    { label: 'إيرادات اليوم', value: `${stats.todayRevenue.toFixed(2)} ج.م`, icon: TrendingUp },
  ]

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">لوحة المعلومات</h1>
        <button onClick={togglePause} disabled={toggling}
          className={`px-4 h-9 rounded-lg text-sm font-medium flex items-center gap-2 transition-fluent ${
            merchant?.restaurant?.isActive ? 'bg-white border border-gray-200 text-gray-700' : 'bg-black text-white'
          }`}>
          {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
          {merchant?.restaurant?.isActive ? 'إيقاف مؤقت' : 'فتح المطعم'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{k.label}</span>
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-xl font-bold">{k.value}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-bold text-sm mb-3">إيرادات آخر 7 أيام</h3>
        {stats.daily && stats.daily.length > 0 ? (
          <div className="space-y-2">
            {stats.daily.map((d: any) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20">{d.date}</span>
                <div className="flex-1 bg-gray-100 rounded h-6 overflow-hidden relative">
                  <div className="absolute inset-y-0 right-0 bg-black" style={{ width: `${Math.min(100, d.count * 10)}%` }} />
                </div>
                <span className="text-xs font-bold w-8 text-left">{d.count}</span>
                <span className="text-xs text-gray-500 w-20 text-left">{d.revenue.toFixed(0)} ج.م</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400 text-center py-6">لا توجد بيانات بعد</p>}
      </div>

      <button onClick={() => router.push('/orders')} className="w-full mt-4 h-11 rounded-lg bg-black text-white text-sm font-medium flex items-center justify-center gap-2">
        <Package className="w-4 h-4" /> عرض كل الطلبات
      </button>
    </div>
  )
}
