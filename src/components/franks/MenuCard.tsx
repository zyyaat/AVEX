'use client'

import { motion } from 'framer-motion'
import { Star, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/store/cart'
import { toast } from 'sonner'

interface MenuItemType {
  id: string; name: string; nameAr: string; description: string; descriptionAr: string
  price: number; image: string; imageUrl: string | null; isPopular: boolean
  rating: number; ratingCount?: number; prepTime: number; calories: number
}

export function MenuCard({ item }: { item: MenuItemType }) {
  const addItem = useCart((s) => s.addItem)

  const handleAdd = () => {
    addItem({ id: item.id, name: item.name, nameAr: item.nameAr, price: item.price, image: item.imageUrl || item.image })
    toast.success(`تمت إضافة ${item.nameAr}`, { duration: 1500 })
  }

  return (
    <div className="group flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-fluent transition-fluent">
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.nameAr} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <span className="text-5xl text-gray-300">{item.image}</span>
          </div>
        )}
        {/* Rating */}
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-md px-1.5 py-0.5 flex items-center gap-1 shadow-fluent border border-gray-100">
          <Star className="w-3 h-3 fill-black text-black" />
          <span className="text-xs font-medium text-black">{item.rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="font-medium text-sm text-black line-clamp-1">{item.nameAr}</h3>
        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed min-h-[2rem] mt-0.5">{item.descriptionAr}</p>

        <div className="flex items-center justify-between pt-2.5 mt-auto">
          <div className="flex items-baseline gap-0.5">
            <span className="text-base font-bold text-black">{item.price.toFixed(2)}</span>
            <span className="text-[10px] text-gray-400">ج.م</span>
          </div>
          <Button onClick={handleAdd} size="sm" className="bg-black hover:bg-gray-800 text-white rounded-md h-8 w-8 p-0 transition-fluent">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
