import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `FK${timestamp}${random}`
}

export async function GET() {
  try {
    const orders = await db.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
      take: 50,
    })
    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerName, phone, address, city, notes, items, paymentMethod } = body

    // Validate required fields
    if (!customerName || !phone || !address || !city || !items?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch menu items to validate prices
    const menuItemIds = items.map((i: { menuItemId: string }) => i.menuItemId)
    const menuItems = await db.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    })

    const subtotal = items.reduce((sum: number, item: { menuItemId: string; quantity: number }) => {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId)
      return sum + (menuItem ? menuItem.price * item.quantity : 0)
    }, 0)

    const deliveryFee = subtotal >= 30 ? 0 : 3.99
    const total = subtotal + deliveryFee

    const order = await db.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerName,
        phone,
        address,
        city,
        notes: notes || null,
        subtotal,
        deliveryFee,
        total,
        paymentMethod: paymentMethod || 'cash',
        status: 'confirmed',
        items: {
          create: items.map((item: { menuItemId: string; quantity: number }) => {
            const menuItem = menuItems.find((m) => m.id === item.menuItemId)!
            return {
              menuItemId: item.menuItemId,
              name: menuItem.nameAr,
              price: menuItem.price,
              quantity: item.quantity,
            }
          }),
        },
      },
      include: { items: true },
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('Failed to create order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
