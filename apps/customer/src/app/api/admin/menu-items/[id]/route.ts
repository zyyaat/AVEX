import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      name, nameAr, description, descriptionAr,
      price, image, isPopular, isAvailable,
      rating, prepTime, calories, categoryId,
    } = body

    const item = await db.menuItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(description !== undefined && { description }),
        ...(descriptionAr !== undefined && { descriptionAr }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(image !== undefined && { image }),
        ...(isPopular !== undefined && { isPopular: Boolean(isPopular) }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(rating !== undefined && { rating: parseFloat(rating) }),
        ...(prepTime !== undefined && { prepTime: parseInt(prepTime) }),
        ...(calories !== undefined && { calories: parseInt(calories) }),
        ...(categoryId !== undefined && { categoryId }),
      },
      include: { category: true },
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Failed to update menu item:', error)
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.menuItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete menu item:', error)
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 })
  }
}
