'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Copy, Package, ChefHat, Bike, Home, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface OrderSuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumber: string
}

const STEPS = [
  { id: 'confirmed', label: 'تم تأكيد الطلب', icon: Package, description: 'استلمنا طلبك بنجاح' },
  { id: 'preparing', label: 'قيد التحضير', icon: ChefHat, description: 'الشيف يحضّر طلبك الآن' },
  { id: 'delivering', label: 'في الطريق إليك', icon: Bike, description: 'المندوب في طريقه إليك' },
  { id: 'delivered', label: 'تم التوصيل', icon: Home, description: 'وصل طلبك! بالهناء والشفاء' },
]

// Simulated status progression
const STATUS_TIMELINE: Record<string, number> = {
  confirmed: 0,
  preparing: 1,
  delivering: 2,
  delivered: 3,
}

export function OrderSuccessDialog({ open, onOpenChange, orderNumber }: OrderSuccessDialogProps) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!open || !orderNumber) return

    let step = 0
    let interval: ReturnType<typeof setInterval> | null = null

    // First fetch the order, then start the simulated status progression
    fetch('/api/orders')
      .then((r) => r.json())
      .then(() => {
        // Start interval only after fetch resolves
        interval = setInterval(() => {
          step += 1
          if (step >= STEPS.length) {
            if (interval) clearInterval(interval)
            return
          }
          setCurrentStep(step)
        }, 4000)
      })
      .catch(() => {})

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [open, orderNumber])

  const handleCopy = () => {
    navigator.clipboard.writeText(orderNumber)
    toast.success('تم نسخ رقم الطلب')
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">تأكيد الطلب</DialogTitle>
          <DialogDescription className="sr-only">
            تم استلام طلبك بنجاح، يمكنك متابعة حالة الطلب
          </DialogDescription>
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success animation */}
          <div className="flex flex-col items-center text-center space-y-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
            >
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-extrabold text-foreground">تم استلام طلبك! 🎉</h2>
              <p className="text-sm text-muted-foreground mt-1">
                شكراً لك، طلبك قيد المعالجة الآن
              </p>
            </div>
          </div>

          {/* Order number */}
          <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">رقم الطلب</p>
              <p className="font-bold text-lg tracking-wider" dir="ltr">{orderNumber}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="rounded-lg"
            >
              <Copy className="w-4 h-4 ml-1" />
              نسخ
            </Button>
          </div>

          {/* Estimated time */}
          <div className="flex items-center justify-center gap-2 text-sm bg-primary/5 rounded-lg p-3">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">الوقت المتوقع للتوصيل:</span>
            <span className="font-bold text-primary">30 - 45 دقيقة</span>
          </div>

          {/* Tracking steps */}
          <div className="space-y-1">
            <h3 className="font-bold text-sm mb-3">حالة الطلب</h3>
            <div className="relative">
              {STEPS.map((step, idx) => {
                const Icon = step.icon
                const isDone = idx <= currentStep
                const isCurrent = idx === currentStep
                return (
                  <div key={step.id} className="flex gap-3 pb-6 last:pb-0 relative">
                    {/* Vertical line */}
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`absolute right-5 top-10 w-0.5 h-full ${
                          idx < currentStep ? 'bg-primary' : 'bg-border'
                        }`}
                      />
                    )}

                    {/* Icon */}
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isCurrent ? [1, 1.15, 1] : 1,
                        backgroundColor: isDone ? 'var(--primary)' : 'var(--muted)',
                      }}
                      transition={{ duration: 0.4, repeat: isCurrent ? Infinity : 0, repeatDelay: 1 }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        isDone ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </motion.div>

                    {/* Text */}
                    <div className="flex-1 pt-1.5">
                      <p className={`font-bold text-sm ${isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 rounded-xl"
            >
              متابعة التسوق
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            للاستفسار عن طلبك اتصل على: <span className="font-bold" dir="ltr">+962 6 555 1234</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
