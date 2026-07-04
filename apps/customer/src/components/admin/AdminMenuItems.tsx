'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, UtensilsCrossed, Loader2, Search, Star, Eye, EyeOff, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface MenuItem {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  price: number
  image: string
  isPopular: boolean
  isAvailable: boolean
  rating: number
  prepTime: number
  calories: number
  categoryId: string
  category?: { id: string; nameAr: string; icon: string }
}

interface Category {
  id: string
  nameAr: string
  icon: string
}

const EMOJI_OPTIONS = ['🍔', '🍕', '🍟', '🥤', '🍰', '🍗', '🥗', '🌮', '🍝', '🥘', '🍜', '🧀', '🧅', '🍫', '🥧', '🧋', '🧃', '💧', '☕', '🍦']

const EMPTY_FORM = {
  name: '', nameAr: '', description: '', descriptionAr: '',
  price: '', image: '🍽️', isPopular: false, isAvailable: true,
  rating: '4.5', prepTime: '15', calories: '0', categoryId: '',
}

export function AdminMenuItems() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsRes, catsRes] = await Promise.all([
        fetch('/api/admin/menu-items'),
        fetch('/api/admin/categories'),
      ])
      const itemsData = await itemsRes.json()
      const catsData = await catsRes.json()
      setItems(itemsData.items || [])
      setCategories(catsData.categories || [])
    } catch {
      toast.error('فشل تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditingItem(null)
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || '' })
    setDialogOpen(true)
  }

  const openEdit = (item: MenuItem) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      nameAr: item.nameAr,
      description: item.description,
      descriptionAr: item.descriptionAr,
      price: item.price.toString(),
      image: item.image,
      isPopular: item.isPopular,
      isAvailable: item.isAvailable,
      rating: item.rating.toString(),
      prepTime: item.prepTime.toString(),
      calories: item.calories.toString(),
      categoryId: item.categoryId,
    })
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.nameAr || !form.price || !form.categoryId) {
      toast.error('يرجى ملء الحقول المطلوبة')
      return
    }
    setSaving(true)
    try {
      const url = editingItem
        ? `/api/admin/menu-items/${editingItem.id}`
        : '/api/admin/menu-items'
      const method = editingItem ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      toast.success(editingItem ? 'تم تحديث الصنف' : 'تمت إضافة الصنف')
      setDialogOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/menu-items/${deleteItem.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success('تم حذف الصنف')
      setDeleteItem(null)
      fetchData()
    } catch {
      toast.error('فشل الحذف')
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailable = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/admin/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(item.isAvailable ? 'تم إخفاء الصنف' : 'تم إتاحة الصنف')
      fetchData()
    } catch {
      toast.error('فشل التحديث')
    }
  }

  const togglePopular = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/admin/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPopular: !item.isPopular }),
      })
      if (!res.ok) throw new Error('Failed')
      fetchData()
    } catch {
      toast.error('فشل التحديث')
    }
  }

  const filteredItems = items.filter((item) => {
    const matchCategory = filterCategory === 'all' || item.categoryId === filterCategory
    const matchSearch = !searchQuery ||
      item.nameAr.includes(searchQuery) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold mb-1 flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-primary" />
            إدارة أصناف الطعام
          </h2>
          <p className="text-sm text-muted-foreground">{items.length} صنف</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl shadow-md" disabled={categories.length === 0}>
          <Plus className="w-4 h-4 ml-1" />
          صنف جديد
        </Button>
      </div>

      {categories.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          ⚠️ يجب إضافة فئة أولاً قبل إضافة أصناف الطعام. اذهب إلى تبويب &quot;الفئات&quot;.
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن صنف..."
            className="pr-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="كل الفئات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفئات</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.nameAr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد أصناف</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-card rounded-2xl border border-border p-4 ${!item.isAvailable ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center text-3xl flex-shrink-0">
                    {item.image}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-base truncate">{item.nameAr}</h3>
                      {item.isPopular && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] gap-0.5 px-1.5">
                          <Flame className="w-2.5 h-2.5" /> مميز
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate" dir="ltr">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.category?.icon} {item.category?.nameAr}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2rem]">
                  {item.descriptionAr || '—'}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <span className="font-extrabold text-primary text-lg">{item.price.toFixed(2)} د.أ</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {item.rating}
                    </span>
                    <span>•</span>
                    <span>{item.prepTime}د</span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1.5 pt-3 border-t border-border">
                  <button
                    onClick={() => toggleAvailable(item)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      item.isAvailable
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                    title={item.isAvailable ? 'متاح' : 'مخفي'}
                  >
                    {item.isAvailable ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {item.isAvailable ? 'متاح' : 'مخفي'}
                  </button>
                  <button
                    onClick={() => togglePopular(item)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      item.isPopular
                        ? 'bg-primary/10 text-primary hover:bg-primary/20'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                    title="مميز"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    مميز
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="w-9 h-8 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors"
                    aria-label="تعديل"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteItem(item)}
                    className="w-9 h-8 rounded-lg bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                    aria-label="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'عدّل بيانات الصنف' : 'أدخل بيانات الصنف الجديد'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الاسم بالعربية *</Label>
                <Input
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  placeholder="برغر فرانك"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>الاسم بالإنجليزية *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Frank's Burger"
                  required
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>الوصف بالعربية</Label>
              <Textarea
                value={form.descriptionAr}
                onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
                placeholder="قطعة لحم بقري طازجة..."
                className="min-h-[60px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label>الوصف بالإنجليزية</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Juicy beef patty..."
                className="min-h-[60px]"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>السعر (د.أ) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="12.99"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>وقت التحضير (د)</Label>
                <Input
                  type="number"
                  value={form.prepTime}
                  onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
                  placeholder="15"
                />
              </div>
              <div className="space-y-1.5">
                <Label>السعرات</Label>
                <Input
                  type="number"
                  value={form.calories}
                  onChange={(e) => setForm({ ...form, calories: e.target.value })}
                  placeholder="650"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>التقييم (1-5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>الفئة *</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>الأيقونة</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm({ ...form, image: emoji })}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      form.image === emoji ? 'bg-primary ring-2 ring-primary scale-110' : 'bg-card hover:bg-primary/10'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={form.isAvailable}
                  onCheckedChange={(v) => setForm({ ...form, isAvailable: v })}
                />
                <span className="text-sm font-medium">متاح للطلب</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={form.isPopular}
                  onCheckedChange={(v) => setForm({ ...form, isPopular: v })}
                />
                <span className="text-sm font-medium">صنف مميز</span>
              </label>
            </div>

            <div className="flex gap-2 pt-2 sticky bottom-0 bg-card">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
                {editingItem ? 'حفظ التغييرات' : 'إضافة الصنف'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف &quot;{deleteItem?.nameAr}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
