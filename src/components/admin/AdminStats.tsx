'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Package, DollarSign, Clock, ShoppingBag, Award, UtensilsCrossed } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Stats {
  totalOrders: number
  totalRevenue: number
  totalItems: number
  totalCategories: number
  pendingOrders: number
  deliveredOrders: number
  recentOrdersCount: number
  topItems: { name: string; quantity: number }[]
}

export function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => setStats(data.stats))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    )
  }

  const CARDS = [
    { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: ShoppingBag, color: 'from-blue-500 to-blue-600', textColor: 'text-blue-600' },
    { label: 'الإيرادات', value: `${stats.totalRevenue.toFixed(2)} د.أ`, icon: DollarSign, color: 'from-green-500 to-emerald-600', textColor: 'text-green-600' },
    { label: 'طلبات قيد التنفيذ', value: stats.pendingOrders, icon: Clock, color: 'from-amber-500 to-orange-600', textColor: 'text-amber-600' },
    { label: 'طلبات مكتملة', value: stats.deliveredOrders, icon: Package, color: 'from-purple-500 to-pink-600', textColor: 'text-purple-600' },
    { label: 'أصناف الطعام', value: stats.totalItems, icon: UtensilsCrossed, color: 'from-rose-500 to-red-600', textColor: 'text-rose-600' },
    { label: 'الفئات', value: stats.totalCategories, icon: Award, color: 'from-indigo-500 to-blue-600', textColor: 'text-indigo-600' },
    { label: 'طلبات آخر 7 أيام', value: stats.recentOrdersCount, icon: TrendingUp, color: 'from-teal-500 to-cyan-600', textColor: 'text-teal-600' },
    { label: 'متوسط الطلب', value: `${stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : '0'} د.أ`, icon: DollarSign, color: 'from-orange-500 to-amber-600', textColor: 'text-orange-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold mb-1">نظرة عامة</h2>
        <p className="text-sm text-muted-foreground">إحصائيات شاملة عن أداء مطعمك</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CARDS.map((card, idx) => {
          const Icon = card.icon
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-extrabold text-foreground mb-1">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Top items */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">الأكثر مبيعاً</h3>
        </div>

        {stats.topItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات بعد</p>
        ) : (
          <div className="space-y-3">
            {stats.topItems.map((item, idx) => {
              const maxQty = stats.topItems[0].quantity
              const percentage = (item.quantity / maxQty) * 100
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      {item.name}
                    </span>
                    <span className="font-bold text-primary">{item.quantity} طلب</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.1 }}
                      className="h-full bg-gradient-to-l from-primary to-orange-400"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
