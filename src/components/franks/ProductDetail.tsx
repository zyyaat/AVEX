'use client'

import { motion } from 'framer-motion'
import { X, Star, Plus, Minus, Clock, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { useCart } from '@/store/cart'
import { toast } from 'sonner'
import { useState } from 'react'

interface MenuItemType {
  id: string; name: string; nameAr: string; description: string; descriptionAr: string
  price: number; image: string; imageUrl: string | null; isPopular: boolean
  rating: number; ratingCount?: number; prepTime: number; calories: number
}

interface ProductDetailProps {
  item: MenuItemType | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductDetail({ item, open, onOpenChange }: ProductDetailProps) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)

  if (!item) return null

  const handleAdd = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({ id: item.id, name: item.name, nameAr: item.nameAr, price: item.price, image: item.imageUrl || item.image })
    }
    toast.success(`تمت إضافة ${quantity}× ${item.nameAr}`, { duration: 1500 })
    setQuantity(1)
    onOpenChange(false)
  }

  const totalPrice = item.price * quantity

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh] rounded-t-2xl">
        <div className="mx-auto w-full max-w-md overflow-y-auto">
          {/* Image */}
          <div className="relative aspect-[4/3] w-full bg-gray-50">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.nameAr} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl text-gray-300">{item.image}</span>
              </div>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-fluent"
            >
              <X className="w-4 h-4 text-black" />
            </button>
            {item.isPopular && (
              <div className="absolute top-3 left-3 bg-black text-white text-xs font-medium px-2 py-1 rounded">
                الأكثر طلباً
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Title + rating */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-black">{item.nameAr}</h2>
                <div className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1">
                  <Star className="w-3.5 h-3.5 fill-black text-black" />
                  <span className="text-sm font-medium">{item.rating}</span>
                  {item.ratingCount && <span className="text-xs text-gray-400">({item.ratingCount})</span>}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.descriptionAr}</p>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {item.prepTime} دقيقة</span>
              <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> {item.calories} سعرة</span>
            </div>

            {/* Quantity + Add */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold text-base">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button
                onClick={handleAdd}
                className="bg-black hover:bg-gray-800 text-white rounded-lg h-11 px-5 text-sm font-medium flex items-center gap-2"
              >
                إضافة • {totalPrice.toFixed(2)} ج.م
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
