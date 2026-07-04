import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'avex-secret-key'

function generateToken(user: any) {
  return jwt.sign(
    { userId: user.id, phone: user.phone, name: user.name, admin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function cleanPhone(phone: string): string {
  let v = phone.replace(/[^\d+]/g, '')
  if (v.startsWith('+20')) return '0' + v.slice(3)
  if (v.length === 13 && v.startsWith('20') && v[2] === '1') return '0' + v.slice(2)
  if (v.startsWith('+')) v = v.replace(/\+/g, '')
  return v.replace(/[^0-9]/g, '').slice(0, 11)
}

function validPhone(phone: string): boolean {
  return /^01[0125][0-9]{8}$/.test(phone)
}

// Register
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const pathStr = path.join('/')

  try {
    // ===== AUTH ROUTES =====
    if (pathStr === 'auth/register') {
      const body = await req.json()
      const phone = cleanPhone(body.phone)
      if (!validPhone(phone)) return NextResponse.json({ error: 'رقم الهاتف يجب أن يكون 11 رقماً مصرياً (010/011/012/015)' }, { status: 400 })
      if (!body.name || body.name.length < 2) return NextResponse.json({ error: 'الاسم قصير جداً' }, { status: 400 })
      if (!body.password || body.password.length < 6) return NextResponse.json({ error: 'كلمة المرور 6 أحرف على الأقل' }, { status: 400 })

      const existing = await db.user.findUnique({ where: { phone } })
      if (existing) return NextResponse.json({ error: 'رقم الهاتف مسجل' }, { status: 409 })

      const hash = await bcrypt.hash(body.password, 10)
      const user = await db.user.create({ data: { name: body.name, phone, email: body.email || null, passwordHash: hash } })
      const token = generateToken(user)
      return NextResponse.json({ token, user: { id: user.id, name: user.name, phone: user.phone, email: user.email, loyaltyPoints: user.loyaltyPoints, isAdmin: user.isAdmin } }, { status: 201 })
    }

    if (pathStr === 'auth/login') {
      const body = await req.json()
      const phone = cleanPhone(body.phone)
      const user = await db.user.findUnique({ where: { phone } })
      if (!user || !await bcrypt.compare(body.password, user.passwordHash)) {
        return NextResponse.json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' }, { status: 401 })
      }
      const token = generateToken(user)
      return NextResponse.json({ token, user: { id: user.id, name: user.name, phone: user.phone, email: user.email, loyaltyPoints: user.loyaltyPoints, isAdmin: user.isAdmin, createdAt: user.createdAt.toISOString() } })
    }

    // ===== COUPONS =====
    if (pathStr === 'coupons/validate') {
      const body = await req.json()
      const coupon = await db.coupon.findFirst({ where: { code: body.code.toUpperCase(), isActive: true } })
      if (!coupon) return NextResponse.json({ error: 'كوبون غير صالح' }, { status: 404 })
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return NextResponse.json({ error: 'تم استخدام الكوبون للحد الأقصى' }, { status: 400 })
      if (body.subtotal < coupon.minOrder) return NextResponse.json({ error: `الحد الأدنى ${coupon.minOrder} ج.م` }, { status: 400 })

      let discount = 0
      if (coupon.type === 'percentage') {
        discount = (body.subtotal * coupon.value) / 100
        if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount
      } else {
        discount = Math.min(coupon.value, body.subtotal)
      }
      return NextResponse.json({ valid: true, code: coupon.code, discount, descriptionAr: coupon.descriptionAr })
    }

    // ===== ORDERS =====
    if (pathStr === 'orders') {
      const body = await req.json()
      const phone = cleanPhone(body.phone)
      if (!validPhone(phone)) return NextResponse.json({ error: 'رقم الهاتف يجب أن يكون 11 رقماً مصرياً (010/011/012/015)' }, { status: 400 })
      if (!body.locationLat || !body.locationLng) return NextResponse.json({ error: 'الموقع مطلوب' }, { status: 400 })

      // Get settings
      const settings = await db.setting.findMany()
      const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]))
      const threshold = parseFloat(settingsMap.free_shipping_threshold || '30')
      const deliveryFeeBase = parseFloat(settingsMap.delivery_fee || '3.99')

      // Calculate subtotal
      const menuItemIds = body.items.map((i: any) => i.menuItemId)
      const menuItems = await db.menuItem.findMany({ where: { id: { in: menuItemIds } } })
      let subtotal = 0
      const itemsData = body.items.map((i: any) => {
        const mi = menuItems.find(m => m.id === i.menuItemId)
        if (mi) { subtotal += mi.price * i.quantity; return { menuItemId: mi.id, name: mi.nameAr, price: mi.price, quantity: i.quantity } }
        return null
      }).filter(Boolean)

      if (subtotal === 0) return NextResponse.json({ error: 'لا توجد عناصر صالحة' }, { status: 400 })

      const deliveryFee = subtotal >= threshold ? 0 : deliveryFeeBase

      // Coupon
      let discount = 0, couponCode = null
      if (body.couponCode) {
        const coupon = await db.coupon.findFirst({ where: { code: body.couponCode.toUpperCase(), isActive: true } })
        if (coupon && subtotal >= coupon.minOrder) {
          if (coupon.type === 'percentage') { discount = (subtotal * coupon.value) / 100; if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount }
          else { discount = Math.min(coupon.value, subtotal) }
          couponCode = coupon.code
          await db.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } })
        }
      }

      const total = Math.max(0, subtotal + deliveryFee - discount)
      const orderNumber = `AV${Date.now().toString().slice(-9)}`
      const locationUrl = `https://www.google.com/maps?q=${body.locationLat},${body.locationLng}`

      // Get user from token
      let userId = null
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        try { const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any; userId = decoded.userId } catch {}
      }

      const order = await db.order.create({
        data: {
          orderNumber, userId, customerName: body.customerName, phone,
          locationLat: body.locationLat, locationLng: body.locationLng, locationUrl, locationAddress: body.locationAddress || null,
          subtotal, deliveryFee, discount, couponCode, total,
          paymentMethod: body.paymentMethod || 'cash', status: 'new',
          items: { create: itemsData }
        }
      })

      // Loyalty points
      if (userId) { await db.user.update({ where: { id: userId }, data: { loyaltyPoints: { increment: Math.floor(total / 10) } } }) }

      return NextResponse.json({ order: { id: order.id, orderNumber: order.orderNumber, status: order.status, total: order.total } }, { status: 201 })
    }

    // ===== ADMIN: Create Category =====
    if (pathStr === 'admin/categories') {
      const body = await req.json()
      const cat = await db.category.create({ data: { name: body.name, nameAr: body.nameAr, icon: body.icon || '🍽️', order: body.order || 0, imageUrl: body.imageUrl || null } })
      return NextResponse.json({ id: cat.id }, { status: 201 })
    }

    // ===== ADMIN: Create Menu Item =====
    if (pathStr === 'admin/menu-items') {
      const body = await req.json()
      const item = await db.menuItem.create({ data: { name: body.name, nameAr: body.nameAr, description: body.description || '', descriptionAr: body.descriptionAr || '', price: parseFloat(body.price), image: body.image || '🍽️', imageUrl: body.imageUrl || null, isPopular: body.isPopular || false, isAvailable: body.isAvailable !== false, rating: parseFloat(body.rating) || 4.5, prepTime: parseInt(body.prepTime) || 15, calories: parseInt(body.calories) || 0, categoryId: body.categoryId } })
      return NextResponse.json({ id: item.id }, { status: 201 })
    }

    // ===== ADMIN: Create Coupon =====
    if (pathStr === 'admin/coupons') {
      const body = await req.json()
      const coupon = await db.coupon.create({ data: { code: body.code.toUpperCase(), descriptionAr: body.descriptionAr, type: body.type || 'percentage', value: parseFloat(body.value), minOrder: parseFloat(body.minOrder) || 0, maxDiscount: body.maxDiscount ? parseFloat(body.maxDiscount) : null, isActive: body.isActive !== false } })
      return NextResponse.json({ id: coupon.id }, { status: 201 })
    }

    // ===== ADMIN: Settings =====
    if (pathStr === 'admin/settings') {
      const body = await req.json()
      await db.setting.upsert({ where: { key: body.key }, create: { key: body.key, value: body.value }, update: { value: body.value } })
      return NextResponse.json({ success: true, key: body.key, value: body.value })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// GET, PATCH, DELETE handler
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const pathStr = path.join('/')
  const url = new URL(req.url)

  try {
    if (pathStr === 'health') return NextResponse.json({ service: 'avex-api', status: 'ok' })

    if (pathStr === 'menu') {
      const categories = await db.category.findMany({ orderBy: { order: 'asc' }, include: { items: { where: { isAvailable: true }, orderBy: { price: 'asc' } } } })
      return NextResponse.json({ categories })
    }

    if (pathStr === 'settings') {
      const settings = await db.setting.findMany()
      return NextResponse.json({ settings: Object.fromEntries(settings.map(s => [s.key, s.value])) })
    }

    if (pathStr === 'orders/track') {
      const number = url.searchParams.get('number')
      if (!number) return NextResponse.json({ error: 'رقم الطلب مطلوب' }, { status: 400 })
      const order = await db.order.findUnique({ where: { orderNumber: number }, include: { items: true } })
      if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
      return NextResponse.json({ order: { ...order, createdAt: order.createdAt.toISOString(), items: order.items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })) } })
    }

    // Auth required routes
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    let decoded: any
    try { decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any } catch { return NextResponse.json({ error: 'رمز غير صالح' }, { status: 401 }) }

    if (pathStr === 'auth/me') {
      const user = await db.user.findUnique({ where: { id: decoded.userId } })
      if (!user) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
      return NextResponse.json({ id: user.id, name: user.name, phone: user.phone, email: user.email, loyaltyPoints: user.loyaltyPoints, isAdmin: user.isAdmin, createdAt: user.createdAt.toISOString() })
    }

    if (pathStr === 'orders') {
      const where = decoded.admin ? {} : { userId: decoded.userId }
      const orders = await db.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: { items: true } })
      return NextResponse.json({ orders: orders.map(o => ({ ...o, createdAt: o.createdAt.toISOString(), items: o.items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })) })) })
    }

    if (pathStr === 'addresses') {
      const addresses = await db.address.findMany({ where: { userId: decoded.userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] })
      return NextResponse.json({ addresses })
    }

    if (pathStr === 'cards') {
      const cards = await db.savedCard.findMany({ where: { userId: decoded.userId, isActive: true }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] })
      return NextResponse.json({ cards })
    }

    // Admin routes
    if (!decoded.admin) return NextResponse.json({ error: 'غير مصرح - مطلوب مسؤول' }, { status: 403 })

    if (pathStr === 'admin/categories') {
      const cats = await db.category.findMany({ orderBy: { order: 'asc' } })
      return NextResponse.json({ categories: cats })
    }
    if (pathStr === 'admin/menu-items') {
      const items = await db.menuItem.findMany({ include: { category: true }, orderBy: [{ categoryId: 'asc' }, { price: 'asc' }] })
      return NextResponse.json({ items })
    }
    if (pathStr === 'admin/coupons') {
      const coupons = await db.coupon.findMany({ orderBy: { createdAt: 'desc' } })
      return NextResponse.json({ coupons })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const pathStr = path.join('/')
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  let decoded: any
  try { decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any } catch { return NextResponse.json({ error: 'رمز غير صالح' }, { status: 401 }) }

  try {
    // Update order status
    if (pathStr.startsWith('orders/')) {
      if (!decoded.admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      const id = pathStr.split('/')[1]
      const body = await req.json()
      await db.order.update({ where: { id }, data: { status: body.status } })
      return NextResponse.json({ success: true, status: body.status })
    }

    // Update menu item
    if (pathStr.startsWith('admin/menu-items/')) {
      if (!decoded.admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      const id = pathStr.split('/')[2]
      const body = await req.json()
      const data: any = {}
      if (body.name !== undefined) data.name = body.name
      if (body.nameAr !== undefined) data.nameAr = body.nameAr
      if (body.price !== undefined) data.price = parseFloat(body.price)
      if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl
      if (body.isPopular !== undefined) data.isPopular = body.isPopular
      if (body.isAvailable !== undefined) data.isAvailable = body.isAvailable
      if (body.categoryId !== undefined) data.categoryId = body.categoryId
      await db.menuItem.update({ where: { id }, data })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const pathStr = path.join('/')
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  let decoded: any
  try { decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any } catch { return NextResponse.json({ error: 'رمز غير صالح' }, { status: 401 }) }

  try {
    if (pathStr.startsWith('admin/menu-items/')) {
      if (!decoded.admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      await db.menuItem.delete({ where: { id: pathStr.split('/')[2] } })
      return NextResponse.json({ success: true })
    }
    if (pathStr.startsWith('admin/coupons/')) {
      if (!decoded.admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      await db.coupon.delete({ where: { id: pathStr.split('/')[2] } })
      return NextResponse.json({ success: true })
    }
    if (pathStr.startsWith('addresses/')) {
      await db.address.deleteMany({ where: { id: pathStr.split('/')[1], userId: decoded.userId } })
      return NextResponse.json({ success: true })
    }
    if (pathStr.startsWith('cards/')) {
      await db.savedCard.updateMany({ where: { id: pathStr.split('/')[1], userId: decoded.userId }, data: { isActive: false } })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const pathStr = path.join('/')
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  let decoded: any
  try { decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any } catch { return NextResponse.json({ error: 'رمز غير صالح' }, { status: 401 }) }

  try {
    if (pathStr === 'admin/settings') {
      if (!decoded.admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      const body = await req.json()
      await db.setting.upsert({ where: { key: body.key }, create: { key: body.key, value: body.value }, update: { value: body.value } })
      return NextResponse.json({ success: true, key: body.key, value: body.value })
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
