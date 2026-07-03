'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/store/cart'

interface CartDrawerProps {
  onCheckout: () => void
}

export function CartDrawer({ onCheckout }: CartDrawerProps) {
  const {
    items,
    isOpen,
    setOpen,
    updateQuantity,
    removeItem,
    getSubtotal,
    getDeliveryFee,
    getTotal,
    getTotalItems,
  } = useCart()

  const subtotal = getSubtotal()
  const deliveryFee = getDeliveryFee()
  const total = getTotal()
  const remainingForFree = Math.max(0, 30 - subtotal)
  const freeDeliveryProgress = Math.min(100, (subtotal / 30) * 100)

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-md flex flex-col p-0 h-[100dvh] sm:h-full max-h-[100dvh]"
      >
        <SheetHeader className="px-5 py-4 border-b border-border bg-gradient-to-l from-primary/5 to-transparent flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <ShoppingBag className="w-5 h-5 text-primary" />
              سلة التسوق
              {getTotalItems() > 0 && (
                <Badge className="bg-primary text-primary-foreground">
                  {getTotalItems()}
                </Badge>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg">سلتك فارغة</h3>
              <p className="text-sm text-muted-foreground">
                أضف بعض الأطباق الشهية لتبدأ طلبك
              </p>
            </div>
            <Button
              onClick={() => setOpen(false)}
              variant="outline"
              className="mt-2"
            >
              تصفح القائمة
            </Button>
          </div>
        ) : (
          <>
            {/* Free delivery progress */}
            <div className="px-5 py-3 bg-accent/50 border-b border-border">
              {remainingForFree > 0 ? (
                <p className="text-xs text-center text-muted-foreground mb-2">
                  أضف بقيمة{' '}
                  <span className="font-bold text-primary">
                    {remainingForFree.toFixed(2)} د.أ
                  </span>{' '}
                  للحصول على توصيل مجاني! 🚀
                </p>
              ) : (
                <p className="text-xs text-center text-green-600 font-bold mb-2">
                  🎉 رائع! حصلت على توصيل مجاني
                </p>
              )}
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-l from-primary to-orange-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${freeDeliveryProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-3">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      className="flex gap-3 bg-card rounded-xl border border-border p-3"
                    >
                      {/* Image */}
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl">{item.image}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm line-clamp-1">
                          {item.nameAr}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {item.price.toFixed(2)} د.أ
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5 bg-muted rounded-full p-1">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 rounded-full bg-background flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                              aria-label="تقليل الكمية"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center text-sm font-bold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-full bg-background flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                              aria-label="زيادة الكمية"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-primary">
                              {(item.price * item.quantity).toFixed(2)} د.أ
                            </span>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="w-7 h-7 rounded-full hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                              aria-label="حذف المنتج"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>

            <SheetFooter className="border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3 flex-shrink-0 bg-card">
              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>المجموع الفرعي</span>
                  <span className="font-medium text-foreground">
                    {subtotal.toFixed(2)} د.أ
                  </span>
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
                  <span className="font-bold text-base">الإجمالي</span>
                  <span className="font-extrabold text-xl text-primary">
                    {total.toFixed(2)} د.أ
                  </span>
                </div>
              </div>

              <Button
                onClick={onCheckout}
                className="w-full h-12 text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                size="lg"
              >
                متابعة إلى الدفع
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
