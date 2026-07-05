'use client'
import { useState, useEffect } from 'react'
import { UtensilsCrossed, Loader2, Plus, Power, Pencil, X, Save, Star } from 'lucide-react'
import { merchantAPI } from '@/lib/api'
import { toast } from 'sonner'

export default function MerchantMenuPage() {
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)

  const emptyForm = { name: '', nameAr: '', description: '', descriptionAr: '', price: 0, image: '🍽️', imageUrl: '', categoryId: '', prepTime: 15, calories: 0, isPopular: false, isAvailable: true }
  const [form, setForm] = useState<any>(emptyForm)

  const load = () => {
    setLoading(true)
    merchantAPI.getMenu().then((r) => { setItems(r.items || []); setCategories(r.categories || []) }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await merchantAPI.updateMenuItem(editing, form)
        toast.success('تم التحديث')
      } else {
        await merchantAPI.createMenuItem(form)
        toast.success('تمت الإضافة')
      }
      setEditing(null); setShowCreate(false); setForm(emptyForm); load()
    } catch (err: any) { toast.error(err.message) }
  }

  const toggleAvailable = async (it: any) => {
    try { await merchantAPI.updateMenuItem(it.id, { IsAvailable: !it.isAvailable } as any); load() }
    catch (e: any) { toast.error(e.message) }
  }
  const del = async (it: any) => {
    if (!confirm(`حذف "${it.nameAr}"؟`)) return
    try { await merchantAPI.deleteMenuItem(it.id); toast.success('تم الحذف'); load() }
    catch (e: any) { toast.error(e.message) }
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">المنيو ({items.length})</h1>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowCreate(true) }}
          className="px-3 h-9 rounded-lg bg-black text-white text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> صنف جديد
        </button>
      </div>

      {loading ? <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> :
       <div className="grid md:grid-cols-2 gap-3">
         {items.map((it) => (
           <div key={it.id} className="bg-white rounded-lg border border-gray-200 p-3 flex gap-3">
             <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
               {it.imageUrl ? <img src={it.imageUrl} alt={it.nameAr} className="w-full h-full object-cover" /> :
                 <div className="w-full h-full flex items-center justify-center text-2xl">{it.image || '🍽️'}</div>}
             </div>
             <div className="flex-1">
               <div className="flex items-start justify-between">
                 <div>
                   <p className="font-bold text-sm flex items-center gap-1">{it.nameAr} {it.isPopular && <Star className="w-3 h-3 text-black fill-black" />}</p>
                   <p className="text-xs text-gray-500">{it.descriptionAr}</p>
                 </div>
                 <span className={`text-[10px] px-2 py-0.5 rounded-full ${it.isAvailable ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>
                   {it.isAvailable ? 'متاح' : 'غير متاح'}
                 </span>
               </div>
               <div className="flex items-center justify-between mt-1.5">
                 <p className="font-bold text-sm">{it.price.toFixed(2)} ج.م</p>
                 <p className="text-[10px] text-gray-500">وقت التحضير: {it.prepTime} دقيقة</p>
               </div>
               <div className="flex gap-1 mt-2">
                 <button onClick={() => { setEditing(it.id); setForm({ name: it.name, nameAr: it.nameAr, description: it.description, descriptionAr: it.descriptionAr, price: it.price, image: it.image, imageUrl: it.imageUrl, categoryId: it.categoryId, prepTime: it.prepTime, calories: it.calories, isPopular: it.isPopular, isAvailable: it.isAvailable }); setShowCreate(true) }}
                   className="flex-1 h-7 rounded border border-gray-200 text-xs flex items-center justify-center gap-1"><Pencil className="w-3 h-3" /> تعديل</button>
                 <button onClick={() => toggleAvailable(it)} className="flex-1 h-7 rounded border border-gray-200 text-xs flex items-center justify-center gap-1"><Power className="w-3 h-3" /> {it.isAvailable ? 'إخفاء' : 'إتاحة'}</button>
                 <button onClick={() => del(it)} className="w-7 h-7 rounded border border-gray-200 text-xs flex items-center justify-center text-gray-500 hover:bg-gray-50"><X className="w-3 h-3" /></button>
               </div>
             </div>
           </div>
         ))}
       </div>}

      {(showCreate || editing) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && (setShowCreate(false), setEditing(null))}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{editing ? 'تعديل صنف' : 'صنف جديد'}</h3>
              <button onClick={() => { setShowCreate(false); setEditing(null) }} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <input required placeholder="الاسم بالعربية" value={form.nameAr} onChange={(e) => setForm({...form, nameAr: e.target.value})}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:border-black" />
              <input placeholder="الاسم بالإنجليزية" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:border-black" />
              <textarea placeholder="الوصف بالعربية" value={form.descriptionAr} onChange={(e) => setForm({...form, descriptionAr: e.target.value})} rows={2}
                className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:border-black resize-none" />
              <input type="number" step="0.01" required placeholder="السعر (ج.م)" value={form.price} onChange={(e) => setForm({...form, price: +e.target.value})}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:border-black" />
              <input placeholder="رابط الصورة" value={form.imageUrl} onChange={(e) => setForm({...form, imageUrl: e.target.value})}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:border-black" />
              <select value={form.categoryId} onChange={(e) => setForm({...form, categoryId: e.target.value})}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-black">
                <option value="">اختر الفئة</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="وقت التحضير (دقيقة)" value={form.prepTime} onChange={(e) => setForm({...form, prepTime: +e.target.value})}
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:border-black" />
                <input type="number" placeholder="السعرات" value={form.calories} onChange={(e) => setForm({...form, calories: +e.target.value})}
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:outline-none focus:border-black" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({...form, isPopular: e.target.checked})} /> شائع</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({...form, isAvailable: e.target.checked})} /> متاح للطلب</label>
              </div>
              <button type="submit" className="w-full h-11 rounded-lg bg-black text-white font-medium flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> {editing ? 'حفظ' : 'إضافة'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
