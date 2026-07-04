'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, ArrowRight, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MenuCard } from './MenuCard'

interface MenuItemType {
  id: string; name: string; nameAr: string; description: string; descriptionAr: string
  price: number; image: string; imageUrl: string | null; isPopular: boolean
  rating: number; ratingCount?: number; prepTime: number; calories: number
  category?: { nameAr: string; icon: string }
}
interface Category { id: string; name: string; nameAr: string; icon: string; items: MenuItemType[] }

interface SearchPageProps { onBack: () => void }

export function SearchPage({ onBack }: SearchPageProps) {
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [allItems, setAllItems] = useState<MenuItemType[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/menu').then(r => r.json()).then(data => {
      setCategories(data.categories || [])
      const items = (data.categories || []).flatMap((c: Category) =>
        c.items.map((i: MenuItemType) => ({ ...i, category: { nameAr: c.nameAr, icon: c.icon } }))
      )
      setAllItems(items)
      setLoading(false)
    }).catch(() => setLoading(false))
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const results = query.trim() === ''
    ? []
    : allItems.filter(i =>
        i.nameAr.includes(query) ||
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.descriptionAr.includes(query) ||
        (i.category?.nameAr || '').includes(query)
      )

  // Popular searches when empty
  const popularItems = allItems.filter(i => i.isPopular).slice(0, 6)

  return (
    <div className="min-h-dvh bg-white" dir="rtl">
      {/* Search header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50">
          <ArrowRight className="w-5 h-5 text-black" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن أطباق، مطاعم..."
            className="pr-9 h-10 rounded-lg bg-gray-50 border-gray-200 focus:bg-white text-sm"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-4 max-w-2xl pb-20">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-20 rounded-lg bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : query.trim() === '' ? (
          /* Empty state - show popular + categories */
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-black mb-3">الأكثر طلباً</h3>
              <div className="grid grid-cols-2 gap-3">
                {popularItems.map(item => <MenuCard key={item.id} item={item} />)}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-black mb-3">التصنيفات</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setQuery(cat.nameAr)}
                    className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 transition-fluent"
                  >
                    {cat.icon} {cat.nameAr}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : results.length > 0 ? (
          /* Results */
          <div>
            <p className="text-xs text-gray-400 mb-3">{results.length} نتيجة</p>
            <div className="grid grid-cols-2 gap-3">
              {results.map(item => <MenuCard key={item.id} item={item} />)}
            </div>
          </div>
        ) : (
          /* No results */
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-black">لا توجد نتائج لـ &quot;{query}&quot;</p>
            <p className="text-xs text-gray-400 mt-1">جرّب كلمات بحث أخرى</p>
          </div>
        )}
      </div>
    </div>
  )
}
