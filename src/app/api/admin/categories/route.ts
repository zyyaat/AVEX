import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { items: true } },
      },
    })
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, nameAr, icon, order } = body

    if (!name || !nameAr) {
      return NextResponse.json({ error: 'Name and Arabic name are required' }, { status: 400 })
    }

    // Get max order
    const maxOrder = await db.category.aggregate({ _max: { order: true } })
    const nextOrder = order ?? (maxOrder._max.order ?? 0) + 1

    const category = await db.category.create({
      data: {
        name,
        nameAr,
        icon: icon || '🍽️',
        order: nextOrder,
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Failed to create category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
