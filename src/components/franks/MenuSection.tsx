'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Search, ChevronLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { MenuCard } from './MenuCard'

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

interface Category {
  id: string
  name: string
  nameAr: string
  icon: string
  imageUrl: string | null
  items: MenuItemType[]
}

export function MenuSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    fetch('/api/menu')
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) =>
        activeCategory === 'all' || cat.id === activeCategory
      ).filter((item) =>
        searchQuery === '' ||
        item.nameAr.includes(searchQuery) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.descriptionAr.includes(searchQuery)
      ),
    }))
    .filter((cat) => cat.items.length > 0)

  // Popular items for "Featured" carousel
  const popularItems = categories
    .flatMap(cat => cat.items)
    .filter(item => item.isPopular)
    .slice(0, 8)

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId)
    if (catId === 'all') {
      document.getElementById('menu-items-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      sectionRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section id="menu" className="py-8 md:py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Search bar - prominent */}
        <div className="max-w-lg mx-auto mb-6 relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن أطباقك المفضلة..."
            className="pr-10 h-12 rounded-full bg-white border-gray-200 focus:border-violet-500 focus:ring-violet-500/10 text-base shadow-sm"
          />
        </div>

        {/* ===== Categories - horizontal scroll like Uber Eats ===== */}
        <div className="mb-8 -mx-4 px-4">
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
            {/* All button */}
            <button
              onClick={() => scrollToCategory('all')}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 snap-start group"
            >
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-2 transition-all group-hover:scale-105 ${
                activeCategory === 'all'
                  ? 'ring-violet-500 bg-violet-50'
                  : 'ring-transparent bg-white border border-gray-100'
              }`}>
                <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl bg-gradient-to-br from-violet-50 to-purple-50">
                  🍽️
                </div>
              </div>
              <span className={`text-xs sm:text-sm font-medium max-w-[72px] truncate ${
                activeCategory === 'all' ? 'text-violet-600' : 'text-gray-700'
              }`}>
                الكل
              </span>
            </button>

            {categories.map((cat) => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 snap-start group"
                >
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-2 transition-all group-hover:scale-105 ${
                    isActive ? 'ring-violet-500' : 'ring-transparent border border-gray-100'
                  }`}>
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.nameAr} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl bg-gradient-to-br from-violet-50 to-purple-50">
                        {cat.icon}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs sm:text-sm font-medium max-w-[72px] truncate ${
                    isActive ? 'text-violet-600' : 'text-gray-700'
                  }`}>
                    {cat.nameAr}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div id="menu-items-start" />

        {/* ===== Featured Items - carousel ===== */}
        {!searchQuery && activeCategory === 'all' && popularItems.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="w-1 h-5 bg-violet-600 rounded-full" />
                الأكثر طلباً 🔥
              </h3>
              <button
                onClick={() => scrollToCategory('all')}
                className="text-sm text-violet-600 font-medium hover:underline flex items-center gap-0.5"
              >
                عرض الكل
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {popularItems.map((item) => (
                <div key={item.id} className="w-64 flex-shrink-0">
                  <MenuCard item={item} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Menu items by category ===== */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory + searchQuery}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-10"
            >
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  ref={(el) => { sectionRefs.current[category.id] = el }}
                  className="scroll-mt-32"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-xl overflow-hidden">
                      {category.imageUrl ? (
                        <img src={category.imageUrl} alt={category.nameAr} className="w-full h-full object-cover" />
                      ) : (
                        category.icon
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900">{category.nameAr}</h3>
                      <p className="text-xs text-gray-500">{category.items.length} أصناف</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {category.items.map((item) => (
                      <MenuCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {!loading && filteredCategories.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">لا توجد نتائج</h3>
            <p className="text-gray-500">لم نجد أطباقاً تطابق بحثك</p>
          </div>
        )}
      </div>
    </section>
  )
}
