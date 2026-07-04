'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, UtensilsCrossed, FolderTree, Package, ArrowRight, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminStats } from './AdminStats'
import { AdminCategories } from './AdminCategories'
import { AdminMenuItems } from './AdminMenuItems'
import { AdminOrders } from './AdminOrders'

type Tab = 'stats' | 'categories' | 'menu' | 'orders'

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'stats', label: 'الإحصائيات', icon: LayoutDashboard },
  { id: 'orders', label: 'الطلبات', icon: Package },
  { id: 'menu', label: 'أصناف الطعام', icon: UtensilsCrossed },
  { id: 'categories', label: 'الفئات', icon: FolderTree },
]

interface AdminDashboardProps {
  onExit: () => void
}

export function AdminDashboard({ onExit }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('stats')

  return (
    <div className="min-h-dvh bg-muted/30" dir="rtl">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-foreground text-background shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg leading-none">
                Frank<span className="text-primary">'</span>s <span className="text-primary">Admin</span>
              </h1>
              <p className="text-[10px] text-background/60 leading-none mt-0.5">لوحة التحكم</p>
            </div>
          </div>
          <Button
            onClick={onExit}
            variant="outline"
            size="sm"
            className="bg-transparent border-background/30 text-background hover:bg-background/10 hover:text-background rounded-full"
          >
            عرض المتجر
            <ArrowRight className="w-4 h-4 mr-1" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 mb-6 bg-card p-1.5 rounded-2xl border border-border overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'stats' && <AdminStats />}
          {activeTab === 'orders' && <AdminOrders />}
          {activeTab === 'menu' && <AdminMenuItems />}
          {activeTab === 'categories' && <AdminCategories />}
        </motion.div>
      </div>
    </div>
  )
}
