import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [totalOrders, totalItems, totalCategories, orders] = await Promise.all([
      db.order.count(),
      db.menuItem.count(),
      db.category.count(),
      db.order.findMany({
        select: {
          total: true,
          status: true,
          createdAt: true,
          items: { select: { name: true, quantity: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ])

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
    const pendingOrders = orders.filter((o) => ['confirmed', 'preparing', 'delivering'].includes(o.status)).length
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length

    // Top items by quantity
    const itemCounts: Record<string, number> = {}
    orders.forEach((order) => {
      order.items.forEach((item) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity
      })
    })
    const topItems = Object.entries(itemCounts)
      .map(([name, qty]) => ({ name, quantity: qty }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    // Recent orders (last 7 days count)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentOrdersCount = orders.filter((o) => o.createdAt >= sevenDaysAgo).length

    return NextResponse.json({
      stats: {
        totalOrders,
        totalRevenue,
        totalItems,
        totalCategories,
        pendingOrders,
        deliveredOrders,
        recentOrdersCount,
        topItems,
      },
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
