'use client'

import { motion } from 'framer-motion'
import { Plus, Star, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/store/cart'
import { toast } from 'sonner'

interface MenuItemType {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  price: number
  image: string
  imageUrl: string | null
  isPopular: boolean
  rating: number
  ratingCount?: number
  prepTime: number
  calories: number
}

export function MenuCard({ item }: { item: MenuItemType }) {
  const addItem = useCart((s) => s.addItem)

  const handleAdd = () => {
    addItem({
      id: item.id,
      name: item.name,
      nameAr: item.nameAr,
      price: item.price,
      image: item.imageUrl || item.image,
    })
    toast.success(`تمت إضافة ${item.nameAr} إلى السلة`, {
      description: `${item.price.toFixed(2)} ج.م`,
      duration: 2000,
    })
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -6 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100 shadow-sm hover:shadow-xl hover:ring-gray-200 transition-all"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.nameAr}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center">
            <span className="text-7xl group-hover:scale-110 transition-transform duration-300">
              {item.image}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent opacity-60" />

        {/* Popular badge */}
        {item.isPopular && (
          <div className="absolute top-2.5 right-2.5">
            <Badge className="bg-yellow-400 text-yellow-900 shadow-md gap-1 border-0 font-bold">
              <Flame className="w-3 h-3" />
              الأكثر طلباً
            </Badge>
          </div>
        )}

        {/* Rating badge */}
        <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow-md">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-bold text-gray-900">{item.rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{item.nameAr}</h3>

        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed min-h-[2rem]">
          {item.descriptionAr}
        </p>

        {/* Price + Add button */}
        <div className="flex items-center justify-between pt-1 mt-auto">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-extrabold text-violet-600 leading-none">
              {item.price.toFixed(2)}
            </span>
            <span className="text-[10px] text-gray-400">ج.م</span>
          </div>
          <Button
            onClick={handleAdd}
            size="sm"
            className="rounded-full h-9 w-9 p-0 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800"
            aria-label={`إضافة ${item.nameAr} إلى السلة`}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.article>
  )
}
