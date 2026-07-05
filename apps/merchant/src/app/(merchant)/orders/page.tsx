'use client'
import { useState, useEffect } from 'react'
import { Package, Loader2, Phone, MapPin, Filter, ChefHat, CheckCircle2, X } from 'lucide-react'
import { merchantAPI } from '@/lib/api'
import { toast } from 'sonner'

const statusLabels: Record<string, string> = {
  accepted: 'جديد - بانتظار التحضير', preparing: 'قيد التحضير', ready: 'جاهز للاستلام',
  assigned: 'بانتظار المندوب', picked_up: 'خرج مع المندوب', on_the_way: 'في الطريق',
  delivering: 'في الطريق', delivered: 'تم التوصيل', cancelled: 'ملغي',
}
const filters = ['', 'accepted', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled']

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])

  const load = () => {
    setLoading(true)
    merchantAPI.getOrders(filter).then((r) => setOrders(r.orders || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id) }, [filter])

  const open = async (o: any) => {
    setSelected(o)
    try { const r = await merchantAPI.getOrderItems(o.id); setItems(r.items || []) } catch {}
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await merchantAPI.updateOrderStatus(id, status)
      toast.success(status === 'preparing' ? 'بدأ التحضير' : status === 'ready' ? 'الطلب جاهز' : 'تم التحديث')
      load()
      if (selected?.id === id) {
        setSelected(null)
      }
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div dir="rtl">
      <h1 className="text-xl font-bold mb-4">الطلبات</h1>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {filters.map((s) => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-fluent ${
              filter === s ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}>{s ? statusLabels[s].split(' - ')[0] : 'الكل'}</button>
        ))}
      </div>

      {loading ? <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> :
       orders.length === 0 ? <p className="text-center text-gray-400 py-20">لا توجد طلبات</p> :
       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
         {orders.map((o) => (
           <div key={o.id} className={`bg-white rounded-lg border p-4 ${
             o.status === 'accepted' ? 'border-black' : 'border-gray-200'
           }`}>
             <div className="flex items-start justify-between mb-2">
               <div>
                 <p className="font-bold text-sm" dir="ltr">{o.orderNumber}</p>
                 <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
               </div>
               <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                 o.status === 'delivered' ? 'bg-black text-white' :
                 o.status === 'cancelled' ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-700'
               }`}>{statusLabels[o.status] || o.status}</span>
             </div>
             <p className="text-sm font-bold mb-1">{o.customerName}</p>
             <p className="text-xs text-gray-500 mb-1" dir="ltr">{o.phone}</p>
             <p className="text-xs text-gray-600 line-clamp-1 mb-2">{o.itemsSummary}</p>
             <p className="text-xs text-gray-500 mb-3">{o.itemsCount} أصناف • {o.total.toFixed(2)} ج.م</p>
             <div className="flex gap-1.5">
               <button onClick={() => open(o)} className="flex-1 h-8 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50">تفاصيل</button>
               {o.status === 'accepted' && <button onClick={() => updateStatus(o.id, 'preparing')} className="flex-1 h-8 rounded-lg bg-black text-white text-xs font-medium flex items-center justify-center gap-1"><ChefHat className="w-3 h-3" /> تحضير</button>}
               {o.status === 'preparing' && <button onClick={() => updateStatus(o.id, 'ready')} className="flex-1 h-8 rounded-lg bg-black text-white text-xs font-medium flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> جاهز</button>}
             </div>
           </div>
         ))}
       </div>}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">طلب {selected.orderNumber}</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> <a href={`tel:${selected.phone}`} className="font-bold" dir="ltr">{selected.phone}</a></div>
              <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-gray-400 mt-0.5" /> <span className="text-xs flex-1">{selected.locationAddress}</span></div>
              <a href={selected.locationUrl} target="_blank" className="text-xs underline">فتح الخريطة</a>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-xs font-bold mb-2">الأصناف:</p>
              <div className="space-y-1">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm">
                    <span>{it.quantity}× {it.name}</span>
                    <span className="text-gray-500">{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-sm">
                <span>الإجمالي</span>
                <span>{selected.total.toFixed(2)} ج.م</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {selected.status === 'accepted' && <button onClick={() => updateStatus(selected.id, 'preparing')} className="h-10 rounded-lg bg-black text-white text-sm font-medium flex items-center justify-center gap-1.5"><ChefHat className="w-4 h-4" /> بدء التحضير</button>}
              {selected.status === 'preparing' && <button onClick={() => updateStatus(selected.id, 'ready')} className="h-10 rounded-lg bg-black text-white text-sm font-medium flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> جاهز للاستلام</button>}
              <button onClick={() => setSelected(null)} className="h-10 rounded-lg border border-gray-200 text-sm font-medium">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
