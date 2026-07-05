'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, User, Phone, Lock, Zap, LogOut, Eye, EyeOff, Loader2, Award, Star
} from 'lucide-react'
import { useAuth } from '@/store/auth'
import { useDriver } from '@/store/driver'
import { driverAuthAPI } from '@/lib/api'
import { BottomTabBar } from '@/components/BottomTabBar'
import { TierBadge } from '@/components/TierBadge'
import { toast } from 'sonner'

function ProfileContent() {
  const router = useRouter()
  const search = useSearchParams()
  const { isAuthenticated, driverName, driverPhone, logout } = useAuth()
  const { driver, fetchMe, setAutoAccept, clear } = useDriver()
  const [showChangePwd, setShowChangePwd] = useState(search.get('change-password') === '1')
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return }
    fetchMe()
  }, [isAuthenticated, router, fetchMe])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd.length < 6) { toast.error('كلمة المرور الجديدة 6 أحرف على الأقل'); return }
    setChanging(true)
    try {
      await driverAuthAPI.changePassword({ oldPassword: oldPwd, newPassword: newPwd })
      toast.success('تم تغيير كلمة المرور')
      setShowChangePwd(false)
      setOldPwd('')
      setNewPwd('')
    } catch (err: any) {
      toast.error(err.message || 'فشل التغيير')
    } finally {
      setChanging(false)
    }
  }

  const handleLogout = () => {
    clear()
    logout()
    router.replace('/login')
  }

  return (
    <div className="min-h-dvh bg-gray-50" dir="rtl">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">حسابي</h1>
      </header>

      <div className="container mx-auto px-4 py-4 max-w-md pb-20 sm:pb-4">
        {/* Profile header */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center text-xl font-bold">
            {driverName?.charAt(0) || 'م'}
          </div>
          <div className="flex-1">
            <p className="font-bold text-base">{driverName}</p>
            <p className="text-xs text-gray-500" dir="ltr">{driverPhone}</p>
          </div>
          {driver?.tier && (
            <TierBadge
              nameAr={driver.tier.nameAr}
              color={driver.tier.color}
              sortOrder={driver.tier.sortOrder}
              size="md"
            />
          )}
        </div>

        {/* Stats summary */}
        {driver && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
              <Star className="w-4 h-4 mx-auto mb-1 text-gray-500" />
              <p className="text-sm font-bold">{driver.stats.rating.toFixed(1)}</p>
              <p className="text-[9px] text-gray-400">التقييم</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
              <Award className="w-4 h-4 mx-auto mb-1 text-gray-500" />
              <p className="text-sm font-bold">{driver.stats.acceptanceRate.toFixed(0)}%</p>
              <p className="text-[9px] text-gray-400">القبول</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
              <Zap className="w-4 h-4 mx-auto mb-1 text-gray-500" />
              <p className="text-sm font-bold">{driver.stats.completedOrders}</p>
              <p className="text-[9px] text-gray-400">مكتمل</p>
            </div>
          </div>
        )}

        {/* Auto-accept toggle */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <div>
              <p className="font-bold text-sm">القبول التلقائي</p>
              <p className="text-xs text-gray-500">قبول الطلبات فور وصولها بدون انتظار</p>
            </div>
          </div>
          <button
            onClick={() => setAutoAccept(!driver?.autoAccept)}
            className={`w-12 h-7 rounded-full p-1 transition-fluent ${driver?.autoAccept ? 'bg-black' : 'bg-gray-200'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-fluent ${driver?.autoAccept ? 'translate-x-0' : '-translate-x-5'}`} />
          </button>
        </div>

        {/* Change password */}
        <button
          onClick={() => setShowChangePwd(!showChangePwd)}
          className="w-full bg-white rounded-lg border border-gray-200 p-4 mb-2 flex items-center gap-3 hover:bg-gray-50 transition-fluent"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Lock className="w-5 h-5 text-black" />
          </div>
          <p className="font-bold text-sm flex-1 text-right">تغيير كلمة المرور</p>
        </button>

        {showChangePwd && (
          <form onSubmit={handleChangePassword} className="bg-white rounded-lg border border-gray-200 p-4 mb-4 space-y-3">
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                placeholder="كلمة المرور الحالية"
                className="w-full h-11 pr-4 pl-10 rounded-lg border border-gray-200 text-right focus:outline-none focus:border-black"
              />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="كلمة المرور الجديدة"
                className="w-full h-11 pr-4 pl-10 rounded-lg border border-gray-200 text-right focus:outline-none focus:border-black"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={changing}
              className="w-full h-11 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-800 transition-fluent disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
            </button>
          </form>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3 hover:bg-gray-50 transition-fluent"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-black" />
          </div>
          <p className="font-bold text-sm flex-1 text-right">تسجيل الخروج</p>
        </button>
      </div>

      <BottomTabBar />
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <ProfileContent />
    </Suspense>
  )
}
