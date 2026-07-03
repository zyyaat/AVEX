'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, FolderTree, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  nameAr: string
  icon: string
  order: number
  _count?: { items: number }
}

const EMOJI_OPTIONS = ['🍔', '🍕', '🍟', '🥤', '🍰', '🍗', '🥗', '🌮', '🍝', '🥘', '🍜', '🧀', '🧅', '🍫', '🥧', '🧋', '🧃', '💧', '☕', '🍦']

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', nameAr: '', icon: '🍽️', order: 0 })

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch {
      toast.error('فشل تحميل الفئات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const openCreate = () => {
    setEditingCategory(null)
    setForm({ name: '', nameAr: '', icon: '🍽️', order: 0 })
    setDialogOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditingCategory(cat)
    setForm({ name: cat.name, nameAr: cat.nameAr, icon: cat.icon, order: cat.order })
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.nameAr) {
      toast.error('يرجى ملء الحقول المطلوبة')
      return
    }
    setSaving(true)
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories'
      const method = editingCategory ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      toast.success(editingCategory ? 'تم تحديث الفئة' : 'تمت إضافة الفئة')
      setDialogOpen(false)
      fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteCategory) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/categories/${deleteCategory.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      toast.success('تم حذف الفئة')
      setDeleteCategory(null)
      fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold mb-1 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-primary" />
            إدارة الفئات
          </h2>
          <p className="text-sm text-muted-foreground">{categories.length} فئة</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl shadow-md">
          <Plus className="w-4 h-4 ml-1" />
          فئة جديدة
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <FolderTree className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد فئات بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {categories.map((cat) => (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center text-3xl flex-shrink-0">
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{cat.nameAr}</h3>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">{cat.name}</p>
                  <p className="text-xs text-primary mt-0.5">
                    {cat._count?.items || 0} صنف
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => openEdit(cat)}
                    className="w-8 h-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors"
                    aria-label="تعديل"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteCategory(cat)}
                    className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                    aria-label="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'عدّل بيانات الفئة' : 'أدخل بيانات الفئة الجديدة'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>الاسم بالعربية *</Label>
              <Input
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder="مثال: برغر"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>الاسم بالإنجليزية *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: Burgers"
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>الأيقونة</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm({ ...form, icon: emoji })}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      form.icon === emoji
                        ? 'bg-primary ring-2 ring-primary scale-110'
                        : 'bg-card hover:bg-primary/10'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>الترتيب</Label>
              <Input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
                {editingCategory ? 'حفظ التغييرات' : 'إضافة الفئة'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف فئة &quot;{deleteCategory?.nameAr}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
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
