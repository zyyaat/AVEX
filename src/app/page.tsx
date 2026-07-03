'use client'

import { useState } from 'react'
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
import { AdminDashboard } from '@/components/admin/AdminDashboard'

export default function Home() {
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const adminMode = searchParams.get('admin') === '1'

  const handleExitAdmin = () => {
    router.push('/')
  }

  const handleCheckout = () => {
    setCheckoutOpen(true)
  }

  const handleOrderSuccess = (num: string) => {
    setOrderNumber(num)
    setSuccessOpen(true)
  }

  // Admin mode: render admin dashboard only
  if (adminMode) {
    return <AdminDashboard onExit={handleExitAdmin} />
  }

  // Customer mode: render the store
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

      {/* Floating elements */}
      <CartDrawer onCheckout={handleCheckout} />
      <FloatingCartButton />
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onSuccess={handleOrderSuccess}
      />
      <OrderSuccessDialog
        key={orderNumber}
        open={successOpen}
        onOpenChange={setSuccessOpen}
        orderNumber={orderNumber}
      />
    </div>
  )
}
