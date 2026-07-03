'use client'

import { motion } from 'framer-motion'
import { Plus, Star, Clock, Flame } from 'lucide-react'
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
  isPopular: boolean
  rating: number
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
      image: item.image,
    })
    toast.success(`تمت إضافة ${item.nameAr} إلى السلة`, {
      description: `${item.price.toFixed(2)} د.أ`,
      duration: 2000,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -6 }}
      className="group relative bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
    >
      {/* Image area */}
      <div className="relative h-44 bg-gradient-to-br from-primary/10 via-accent to-secondary/40 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent_70%)]" />
        <span className="text-7xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">
          {item.image}
        </span>

        {/* Popular badge */}
        {item.isPopular && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-primary text-primary-foreground shadow-md gap-1">
              <Flame className="w-3 h-3" />
              الأكثر طلباً
            </Badge>
          </div>
        )}

        {/* Rating badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow-md">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-bold text-foreground">{item.rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-bold text-base text-foreground line-clamp-1">
            {item.nameAr}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.descriptionAr}
          </p>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {item.prepTime} دقيقة
          </span>
          <span className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" />
            {item.calories} سعرة
          </span>
        </div>

        {/* Price + Add */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex flex-col">
            <span className="text-lg font-extrabold text-primary">
              {item.price.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground -mt-1">د.أ</span>
          </div>
          <Button
            onClick={handleAdd}
            size="sm"
            className="rounded-full h-9 w-9 p-0 shadow-md hover:shadow-lg hover:scale-105 transition-all"
            aria-label={`إضافة ${item.nameAr} إلى السلة`}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
