'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/franks/Header'
import { Hero } from '@/components/franks/Hero'
import { MenuSection } from '@/components/franks/MenuSection'
import { OffersSection } from '@/components/franks/OffersSection'
import { AboutSection } from '@/components/franks/AboutSection'
import { Footer } from '@/components/franks/Footer'
import { CartDrawer } from '@/components/franks/CartDrawer'
import { CheckoutDialog } from '@/components/franks/CheckoutDialog'
import { OrderSuccessDialog } from '@/components/franks/OrderSuccessDialog'
import { FloatingCartButton } from '@/components/franks/FloatingCartButton'
import { OrderTracking } from '@/components/franks/OrderTracking'
import { MyOrders } from '@/components/franks/MyOrders'
import { AccountPage } from '@/components/franks/AccountPage'
import { AuthDialog } from '@/components/franks/AuthDialog'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

export default function Home() {
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  const searchParams = useSearchParams()
  const router = useRouter()

  const adminMode = searchParams.get('admin') === '1'
  const trackOrderNumber = searchParams.get('track')
  const myOrdersMode = searchParams.get('myorders') === '1'
  const accountMode = searchParams.get('account') === '1'
  const authParam = searchParams.get('auth')

  useEffect(() => {
    if (authParam === 'login' || authParam === 'register') {
      const timer = setTimeout(() => {
        setAuthMode(authParam)
        setAuthOpen(true)
        const url = new URL(window.location.href)
        url.searchParams.delete('auth')
        window.history.replaceState({}, '', url.toString())
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [authParam])

  const handleExitAdmin = () => router.push('/')
  const handleExitTracking = () => router.push('/')
  const handleExitMyOrders = () => router.push('/')
  const handleLoginRequired = () => { setAuthMode('login'); setAuthOpen(true) }
  const handleCheckout = () => setCheckoutOpen(true)
  const handleOrderSuccess = (num: string) => { setOrderNumber(num); setSuccessOpen(true) }

  if (adminMode) return <AdminDashboard onExit={handleExitAdmin} />
  if (trackOrderNumber !== null) return <OrderTracking initialOrderNumber={trackOrderNumber || undefined} onBack={handleExitTracking} />
  if (myOrdersMode) return <><MyOrders onBack={handleExitMyOrders} onLoginRequired={handleLoginRequired} /><AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode={authMode} /></>
  if (accountMode) return <><AccountPage onBack={() => router.push('/')} onLoginRequired={handleLoginRequired} /><AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode={authMode} /></>

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Hero />
        <MenuSection />
        <OffersSection />
        <AboutSection />
      </main>
      <Footer />
      <CartDrawer onCheckout={handleCheckout} />
      <FloatingCartButton />
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} onSuccess={handleOrderSuccess} />
      <OrderSuccessDialog key={orderNumber} open={successOpen} onOpenChange={setSuccessOpen} orderNumber={orderNumber} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode={authMode} />
    </div>
  )
}
