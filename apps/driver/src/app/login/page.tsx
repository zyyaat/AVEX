'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bike, Phone, Lock, ArrowLeft, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading, initialize } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    initialize().then(() => {
      if (useAuth.getState().isAuthenticated) router.replace('/')
    })
  }, [router, initialize])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!phone || !password) { setError('ادخل رقم الهاتف وكلمة المرور'); return }
    try {
      const { mustChangePassword } = await login(phone, password)
      if (mustChangePassword) {
        toast.info('يجب تغيير كلمة المرور')
        router.replace('/?change-password=1')
      } else {
        router.replace('/')
      }
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول')
    }
  }

  return (
    <div className="min-h-dvh bg-white flex flex-col" dir="rtl">
      {/* Header */}
      <div className="px-4 h-14 flex items-center">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-fluent"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Logo + Title */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-20 h-20 rounded-2xl bg-black flex items-center justify-center mb-5"
        >
          <Bike className="w-10 h-10 text-white" strokeWidth={2} />
        </motion.div>
        <h1 className="text-2xl font-bold mb-1">AVEX Driver</h1>
        <p className="text-sm text-gray-500 mb-8">تطبيق المندوب — سجّل دخولك للبدء</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
          {error && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-black flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">{error}</span>
            </div>
          )}

          {/* Phone */}
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              className="w-full h-12 pr-10 pl-4 rounded-lg border border-gray-200 bg-white text-right focus:outline-none focus:border-black transition-fluent"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              className="w-full h-12 pr-10 pl-10 rounded-lg border border-gray-200 bg-white text-right focus:outline-none focus:border-black transition-fluent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-fluent disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تسجيل الدخول'}
          </button>
        </form>

        {/* Demo hint */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>حسابات تجريبية:</p>
          <p dir="ltr" className="mt-1">01100000001 / 01100000002 — كلمة المرور: 123456</p>
        </div>
      </div>
    </div>
  )
}
