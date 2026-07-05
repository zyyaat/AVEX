'use client'
import { useState, useEffect } from 'react'
import { Clock, Loader2, Save } from 'lucide-react'
import { merchantAPI } from '@/lib/api'
import { toast } from 'sonner'

const days = [
  { n: 0, label: 'الأحد' }, { n: 1, label: 'الإثنين' }, { n: 2, label: 'الثلاثاء' },
  { n: 3, label: 'الأربعاء' }, { n: 4, label: 'الخميس' }, { n: 5, label: 'الجمعة' }, { n: 6, label: 'السبت' },
]

export default function MerchantHoursPage() {
  const [hours, setHours] = useState<Record<number, { openTime: string; closeTime: string; isOpen: boolean }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    merchantAPI.getHours().then((r) => {
      const init: Record<number, any> = {}
      days.forEach((d) => { init[d.n] = { openTime: '10:00', closeTime: '23:00', isOpen: true } })
      ;(r.hours || []).forEach((h: any) => {
        init[h.dayOfWeek] = { openTime: h.openTime || '10:00', closeTime: h.closeTime || '23:00', isOpen: h.isOpen }
      })
      setHours(init)
    }).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await merchantAPI.updateHours(
        days.map((d) => ({ dayOfWeek: d.n, openTime: hours[d.n].openTime, closeTime: hours[d.n].closeTime, isOpen: hours[d.n].isOpen }))
      )
      toast.success('تم حفظ ساعات العمل')
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>

  return (
    <div dir="rtl">
      <h1 className="text-xl font-bold mb-1">ساعات العمل</h1>
      <p className="text-xs text-gray-500 mb-4">حدد ساعات الفتح والإغلاق لكل يوم. يمكنك إغلاق أيام معينة.</p>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {days.map((d) => {
          const h = hours[d.n] || { openTime: '10:00', closeTime: '23:00', isOpen: true }
          return (
            <div key={d.n} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-0">
              <button onClick={() => setHours({ ...hours, [d.n]: { ...h, isOpen: !h.isOpen } })}
                className={`w-12 h-7 rounded-full p-1 transition-fluent flex-shrink-0 ${h.isOpen ? 'bg-black' : 'bg-gray-200'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-fluent ${h.isOpen ? 'translate-x-0' : '-translate-x-5'}`} />
              </button>
              <span className="font-bold text-sm w-20">{d.label}</span>
              <div className="flex items-center gap-2 flex-1">
                <input type="time" value={h.openTime} disabled={!h.isOpen} onChange={(e) => setHours({ ...hours, [d.n]: { ...h, openTime: e.target.value } })}
                  className="h-9 px-2 rounded border border-gray-200 text-sm disabled:bg-gray-50 disabled:text-gray-400" />
                <span className="text-gray-400">-</span>
                <input type="time" value={h.closeTime} disabled={!h.isOpen} onChange={(e) => setHours({ ...hours, [d.n]: { ...h, closeTime: e.target.value } })}
                  className="h-9 px-2 rounded border border-gray-200 text-sm disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
              <span className={`text-xs ${h.isOpen ? 'text-black' : 'text-gray-400'}`}>{h.isOpen ? 'مفتوح' : 'مغلق'}</span>
            </div>
          )
        })}
      </div>

      <button onClick={save} disabled={saving}
        className="w-full mt-4 h-11 rounded-lg bg-black text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
      </button>
    </div>
  )
}
