'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Headphones, Phone, Lock, Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import { useAuth } from '@/store/auth'

export default function AgentLoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading, initialize } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    initialize().then(() => {
      if (useAuth.getState().isAuthenticated) router.replace('/')
    })
  }, [router, initialize])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try { await login(phone, password); router.replace('/') }
    catch (err: any) { setError(err.message) }
  }

  return (
    <div className="min-h-dvh bg-white flex flex-col" dir="rtl">
      <div className="px-4 h-14 flex items-center">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
        <div className="w-20 h-20 rounded-2xl bg-black flex items-center justify-center mb-5">
          <Headphones className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-1">AVEX Support</h1>
        <p className="text-sm text-gray-500 mb-8">لوحة موظف الدعم</p>
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
          {error && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-black flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">{error}</span>
            </div>
          )}
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx"
              className="w-full h-12 pr-10 pl-4 rounded-lg border border-gray-200 bg-white text-right focus:outline-none focus:border-black" />
          </div>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور"
              className="w-full h-12 pr-10 pl-4 rounded-lg border border-gray-200 bg-white text-right focus:outline-none focus:border-black" />
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full h-12 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-fluent disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'دخول'}
          </button>
        </form>
        <p className="mt-8 text-center text-xs text-gray-400">حسابات تجريبية: 01500000001 / 01500000002 — كلمة المرور: 123456</p>
      </div>
    </div>
  )
}
