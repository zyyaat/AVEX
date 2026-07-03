'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Loader2, MapPin, ExternalLink, Phone, User, Clock,
  CheckCircle2, ChefHat, Bike, Home, Search, Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  locationLat: number | null
  locationLng: number | null
  locationUrl: string | null
  locationAddress: string | null
  subtotal: number
  deliveryFee: number
  total: number
  paymentMethod: string
  status: string
  createdAt: string
  items: OrderItem[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700', icon: Clock },
  confirmed: { label: 'مؤكد', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  preparing: { label: 'قيد التحضير', color: 'bg-purple-100 text-purple-700', icon: ChefHat },
  delivering: { label: 'في الطريق', color: 'bg-orange-100 text-orange-700', icon: Bike },
  delivered: { label: 'تم التوصيل', color: 'bg-green-100 text-green-700', icon: Home },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700', icon: Package },
}

const STATUS_FLOW = ['confirmed', 'preparing', 'delivering', 'delivered']

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch {
      toast.error('فشل تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('تم تحديث حالة الطلب')
      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      )
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status })
      }
    } catch {
      toast.error('فشل تحديث الحالة')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchStatus = statusFilter === 'all' || order.status === statusFilter
    const matchSearch = !searchQuery ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.includes(searchQuery) ||
      order.phone.includes(searchQuery)
    return matchStatus && matchSearch
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('ar', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold mb-1 flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          إدارة الطلبات
        </h2>
        <p className="text-sm text-muted-foreground">{orders.length} طلب إجمالي</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الطلب، الاسم، الهاتف..."
            className="pr-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 ml-1" />
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredOrders.map((order) => {
              const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
              const StatusIcon = statusCfg.icon
              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${statusCfg.color}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-base" dir="ltr">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">العميل</p>
                      <p className="font-medium flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {order.customerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">الهاتف</p>
                      <p className="font-medium flex items-center gap-1" dir="ltr">
                        <Phone className="w-3 h-3" />
                        {order.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">الأصناف</p>
                      <p className="font-medium">{order.items.length} صنف</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">الإجمالي</p>
                      <p className="font-bold text-primary">{order.total.toFixed(2)} د.أ</p>
                    </div>
                  </div>

                  {order.locationUrl && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-green-700">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>تم تحديد الموقع</span>
                      <a
                        href={order.locationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-primary hover:underline mr-auto"
                      >
                        عرض على الخريطة
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2">
                  <span>تفاصيل الطلب</span>
                  <span dir="ltr" className="text-sm font-mono text-muted-foreground">
                    {selectedOrder.orderNumber}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {formatDate(selectedOrder.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status badge */}
                <div className="flex items-center justify-center">
                  <Badge className={`${STATUS_CONFIG[selectedOrder.status]?.color} text-sm px-4 py-1.5`}>
                    {STATUS_CONFIG[selectedOrder.status]?.label}
                  </Badge>
                </div>

                {/* Customer info */}
                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                  <h4 className="font-bold text-sm mb-2">معلومات العميل</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">الاسم</p>
                      <p className="font-medium flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {selectedOrder.customerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">الهاتف</p>
                      <a
                        href={`tel:${selectedOrder.phone}`}
                        className="font-medium flex items-center gap-1 text-primary"
                        dir="ltr"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {selectedOrder.phone}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Location */}
                {selectedOrder.locationUrl && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h4 className="font-bold text-sm mb-2 text-green-800">موقع التوصيل</h4>
                    <p className="text-xs text-green-700 mb-2" dir="ltr">
                      {selectedOrder.locationLat?.toFixed(6)}, {selectedOrder.locationLng?.toFixed(6)}
                    </p>
                    <a
                      href={selectedOrder.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 bg-white rounded-lg p-2.5 border border-green-200 hover:border-green-400 transition-colors"
                    >
                      <span className="text-sm font-medium text-green-800 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        فتح الموقع على خرائط جوجل
                      </span>
                      <ExternalLink className="w-4 h-4 text-green-600" />
                    </a>
                  </div>
                )}

                {/* Order items */}
                <div className="bg-muted/50 rounded-xl p-4">
                  <h4 className="font-bold text-sm mb-3">عناصر الطلب</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="min-w-7 justify-center">
                            {item.quantity}x
                          </Badge>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="font-bold">{(item.price * item.quantity).toFixed(2)} د.أ</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment summary */}
                <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>المجموع الفرعي</span>
                    <span>{selectedOrder.subtotal.toFixed(2)} د.أ</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>رسوم التوصيل</span>
                    <span>
                      {selectedOrder.deliveryFee === 0
                        ? <span className="text-green-600 font-bold">مجاني</span>
                        : `${selectedOrder.deliveryFee.toFixed(2)} د.أ`}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>طريقة الدفع</span>
                    <span>{selectedOrder.paymentMethod === 'cash' ? 'نقداً' : 'بطاقة'}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-bold">
                    <span>الإجمالي</span>
                    <span className="text-primary text-lg">{selectedOrder.total.toFixed(2)} د.أ</span>
                  </div>
                </div>

                {/* Status management */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <h4 className="font-bold text-sm mb-3">إدارة الحالة</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_FLOW.map((status) => {
                      const cfg = STATUS_CONFIG[status]
                      const Icon = cfg.icon
                      const isActive = selectedOrder.status === status
                      return (
                        <button
                          key={status}
                          onClick={() => updateStatus(selectedOrder.id, status)}
                          disabled={updatingStatus || isActive}
                          className={`flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? `${cfg.color} ring-2 ring-current`
                              : 'bg-muted hover:bg-muted/70 text-muted-foreground'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'cancelled')}
                    disabled={updatingStatus || selectedOrder.status === 'cancelled'}
                    className="w-full mt-2 flex items-center justify-center gap-2 p-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    إلغاء الطلب
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
