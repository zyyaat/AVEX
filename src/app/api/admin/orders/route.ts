import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Admin endpoint: returns full order data including location for the restaurant owner
export async function GET() {
  try {
    const orders = await db.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            menuItem: {
              select: { name: true, nameAr: true, price: true }
            }
          }
        },
      },
      take: 100,
    })

    // Format the orders with all data clearly visible to admin
    const formattedOrders = orders.map((order) => ({
      orderNumber: order.orderNumber,
      customer: {
        name: order.customerName,
        phone: order.phone,
      },
      location: {
        lat: order.locationLat,
        lng: order.locationLng,
        googleMapsUrl: order.locationUrl,
        address: order.locationAddress,
      },
      items: order.items.map((item) => ({
        name: item.menuItem?.nameAr || item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      payment: {
        method: order.paymentMethod,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
      },
      status: order.status,
      createdAt: order.createdAt,
    }))

    return NextResponse.json({
      count: orders.length,
      orders: formattedOrders,
    })
  } catch (error) {
    console.error('Failed to fetch admin orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
