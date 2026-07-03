'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MenuCard } from './MenuCard'

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

interface Category {
  id: string
  name: string
  nameAr: string
  icon: string
  items: MenuItemType[]
}

export function MenuSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

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

  return (
    <section id="menu" className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-bold mb-3"
          >
            <span>🍽️</span>
            قائمة الطعام
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-2">
            اختر ما يشتهيه قلبك
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            تشكيلة واسعة من الأطباق الشهية المحضّرة بعناية من أجود المكونات
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-6 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن طبقك المفضل..."
            className="pr-10 rounded-full"
          />
        </div>

        {/* Category tabs */}
        <div className="flex justify-center mb-10">
          <div className="flex flex-wrap gap-2 justify-center bg-muted/50 p-2 rounded-2xl">
            <Button
              variant={activeCategory === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory('all')}
              className="rounded-xl"
            >
              الكل
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveCategory(cat.id)}
                className="rounded-xl"
              >
                <span className="ml-1">{cat.icon}</span>
                {cat.nameAr}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          /* Menu items grouped by category */
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory + searchQuery}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-12"
            >
              {filteredCategories.map((category) => (
                <div key={category.id} id={`cat-${category.id}`} className="scroll-mt-32">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-accent flex items-center justify-center text-2xl">
                      {category.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold">{category.nameAr}</h3>
                      <p className="text-sm text-muted-foreground">
                        {category.items.length} أصناف
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {category.items.map((item) => (
                      <MenuCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* No results */}
        {!loading && filteredCategories.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2">لا توجد نتائج</h3>
            <p className="text-muted-foreground">
              لم نجد أطباقاً تطابق بحثك. جرّب كلمات أخرى.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
