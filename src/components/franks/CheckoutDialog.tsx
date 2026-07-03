'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, CreditCard, Banknote, MapPin, User, Phone, Building2, StickyNote, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/store/cart'
import { toast } from 'sonner'

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (orderNumber: string) => void
}

export function CheckoutDialog({ open, onOpenChange, onSuccess }: CheckoutDialogProps) {
  const { items, getSubtotal, getDeliveryFee, getTotal, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    address: '',
    city: '',
    notes: '',
    paymentMethod: 'cash',
  })

  const subtotal = getSubtotal()
  const deliveryFee = getDeliveryFee()
  const total = getTotal()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.customerName || !form.phone || !form.address || !form.city) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    if (!/^[0-9+\-\s]{8,15}$/.test(form.phone)) {
      toast.error('يرجى إدخال رقم هاتف صحيح')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({
            menuItemId: i.id,
            quantity: i.quantity,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create order')
      }

      const data = await response.json()
      clearCart()
      onOpenChange(false)
      onSuccess(data.order.orderNumber)
    } catch (error) {
      console.error(error)
      toast.error('حدث خطأ أثناء إنشاء الطلب. حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            إتمام الطلب
          </DialogTitle>
          <DialogDescription>
            أدخل معلومات التوصيل لإكمال طلبك
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer info */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="customerName" className="text-sm font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                الاسم الكامل <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customerName"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="مثال: أحمد محمد"
                required
                className="rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                رقم الهاتف <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="07XXXXXXXX"
                required
                className="rounded-lg"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-sm font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                المدينة <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="مثال: عمّان"
                required
                className="rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                العنوان التفصيلي <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="الحي، الشارع، رقم المبنى، الطابق..."
                required
                className="rounded-lg min-h-[80px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" />
                ملاحظات إضافية (اختياري)
              </Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="مثال: بدون بصل، اطرق الباب مرتين..."
                className="rounded-lg min-h-[60px]"
              />
            </div>
          </div>

          <Separator />

          {/* Payment method */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">طريقة الدفع</Label>
            <RadioGroup
              value={form.paymentMethod}
              onValueChange={(v) => setForm({ ...form, paymentMethod: v })}
              className="grid grid-cols-2 gap-2"
            >
              <label
                htmlFor="cash"
                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  form.paymentMethod === 'cash'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <RadioGroupItem value="cash" id="cash" />
                <Banknote className="w-4 h-4" />
                <span className="text-sm font-medium">نقداً</span>
              </label>
              <label
                htmlFor="card"
                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  form.paymentMethod === 'card'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <RadioGroupItem value="card" id="card" />
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">بطاقة</span>
              </label>
            </RadioGroup>
          </div>

          <Separator />

          {/* Order summary */}
          <div className="space-y-2 bg-muted/50 rounded-lg p-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>عدد الأصناف</span>
              <span className="font-medium text-foreground">{items.length}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>المجموع الفرعي</span>
              <span className="font-medium text-foreground">{subtotal.toFixed(2)} د.أ</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>رسوم التوصيل</span>
              <span className="font-medium text-foreground">
                {deliveryFee === 0 ? (
                  <span className="text-green-600 font-bold">مجاني</span>
                ) : (
                  `${deliveryFee.toFixed(2)} د.أ`
                )}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center pt-1">
              <span className="font-bold">الإجمالي</span>
              <span className="font-extrabold text-lg text-primary">{total.toFixed(2)} د.أ</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || items.length === 0}
            className="w-full h-12 text-base font-bold rounded-xl shadow-lg mb-[env(safe-area-inset-bottom)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                جاري إنشاء الطلب...
              </>
            ) : (
              `تأكيد الطلب • ${total.toFixed(2)} د.أ`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
