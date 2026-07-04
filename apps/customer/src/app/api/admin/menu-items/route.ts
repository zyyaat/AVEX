import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')

    const items = await db.menuItem.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: { category: true },
      orderBy: [{ categoryId: 'asc' }, { price: 'asc' }],
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to fetch menu items:', error)
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, nameAr, description, descriptionAr,
      price, image, isPopular, isAvailable,
      rating, prepTime, calories, categoryId,
    } = body

    if (!name || !nameAr || price == null || !categoryId) {
      return NextResponse.json(
        { error: 'Name, Arabic name, price, and category are required' },
        { status: 400 }
      )
    }

    const item = await db.menuItem.create({
      data: {
        name,
        nameAr,
        description: description || '',
        descriptionAr: descriptionAr || '',
        price: parseFloat(price),
        image: image || '🍽️',
        isPopular: Boolean(isPopular),
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        rating: rating ? parseFloat(rating) : 4.5,
        prepTime: prepTime ? parseInt(prepTime) : 15,
        calories: calories ? parseInt(calories) : 0,
        categoryId,
      },
      include: { category: true },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Failed to create menu item:', error)
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 })
  }
}
