// Seed script for Frank's Restaurant
import { db } from '../src/lib/db'

async function seed() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await db.orderItem.deleteMany()
  await db.order.deleteMany()
  await db.menuItem.deleteMany()
  await db.category.deleteMany()

  // Create categories
  const burgers = await db.category.create({
    data: {
      name: 'Burgers',
      nameAr: 'برغر',
      icon: '🍔',
      order: 1,
    },
  })

  const pizza = await db.category.create({
    data: {
      name: 'Pizza',
      nameAr: 'بيتزا',
      icon: '🍕',
      order: 2,
    },
  })

  const sides = await db.category.create({
    data: {
      name: 'Sides',
      nameAr: 'مقبلات',
      icon: '🍟',
      order: 3,
    },
  })

  const drinks = await db.category.create({
    data: {
      name: 'Drinks',
      nameAr: 'مشروبات',
      icon: '🥤',
      order: 4,
    },
  })

  const desserts = await db.category.create({
    data: {
      name: 'Desserts',
      nameAr: 'حلويات',
      icon: '🍰',
      order: 5,
    },
  })

  // Burgers
  await db.menuItem.createMany({
    data: [
      {
        name: 'Frank\'s Classic Burger',
        nameAr: 'برغر فرانك الكلاسيكي',
        description: 'Juicy beef patty with lettuce, tomato, onion, and our signature sauce',
        descriptionAr: 'قطعة لحم بقري طازجة مع خس وطماطم وبصل وصوصنا الخاص',
        price: 12.99,
        image: '🍔',
        isPopular: true,
        rating: 4.8,
        prepTime: 15,
        calories: 650,
        categoryId: burgers.id,
      },
      {
        name: 'Double Cheese Burger',
        nameAr: 'دبل تشيز برغر',
        description: 'Two beef patties, double cheddar cheese, pickles, and smoky BBQ sauce',
        descriptionAr: 'قطعتان من اللحم البقري، جبن شيدر مزدوج، مخلل، وصوص باربيكيو مدخن',
        price: 16.99,
        image: '🍔',
        isPopular: true,
        rating: 4.9,
        prepTime: 18,
        calories: 890,
        categoryId: burgers.id,
      },
      {
        name: 'Spicy Chicken Burger',
        nameAr: 'برغر الدجاج الحار',
        description: 'Crispy chicken fillet with jalapeños, pepper jack cheese, and spicy mayo',
        descriptionAr: 'فيليه دجاج مقرمش مع فلفل حار، جبن ببر جاك، ومايونيز حار',
        price: 13.49,
        image: '🍔',
        rating: 4.7,
        prepTime: 16,
        calories: 720,
        categoryId: burgers.id,
      },
      {
        name: 'Mushroom Swiss Burger',
        nameAr: 'برغر المشروم السويسري',
        description: 'Beef patty topped with sautéed mushrooms and melted Swiss cheese',
        descriptionAr: 'قطعة لحم بقري مع مشروم سوتيه وجبن سويسري ذائب',
        price: 14.99,
        image: '🍔',
        rating: 4.6,
        prepTime: 17,
        calories: 700,
        categoryId: burgers.id,
      },
    ],
  })

  // Pizza
  await db.menuItem.createMany({
    data: [
      {
        name: 'Margherita Pizza',
        nameAr: 'بيتزا مارغريتا',
        description: 'Fresh mozzarella, tomato sauce, basil, and olive oil',
        descriptionAr: 'موزاريلا طازجة، صوص طماطم، ريحان، وزيت زيتون',
        price: 15.99,
        image: '🍕',
        isPopular: true,
        rating: 4.7,
        prepTime: 20,
        calories: 850,
        categoryId: pizza.id,
      },
      {
        name: 'Pepperoni Pizza',
        nameAr: 'بيتزا بيبروني',
        description: 'Loaded with pepperoni slices and extra mozzarella cheese',
        descriptionAr: 'محشوة بشرائح البيبروني وجبن الموزاريلا الإضافي',
        price: 17.99,
        image: '🍕',
        isPopular: true,
        rating: 4.8,
        prepTime: 22,
        calories: 980,
        categoryId: pizza.id,
      },
      {
        name: 'BBQ Chicken Pizza',
        nameAr: 'بيتزا دجاج باربيكيو',
        description: 'Grilled chicken, red onions, cilantro, and BBQ sauce',
        descriptionAr: 'دجاج مشوي، بصل أحمر، كزبرة، وصوص باربيكيو',
        price: 18.99,
        image: '🍕',
        rating: 4.6,
        prepTime: 22,
        calories: 920,
        categoryId: pizza.id,
      },
      {
        name: 'Veggie Supreme Pizza',
        nameAr: 'بيتزا الخضار الفاخرة',
        description: 'Bell peppers, mushrooms, olives, onions, and tomatoes',
        descriptionAr: 'فلفل ملون، مشروم، زيتون، بصل، وطماطم',
        price: 16.49,
        image: '🍕',
        rating: 4.5,
        prepTime: 20,
        calories: 780,
        categoryId: pizza.id,
      },
    ],
  })

  // Sides
  await db.menuItem.createMany({
    data: [
      {
        name: 'French Fries',
        nameAr: 'بطاطس مقلية',
        description: 'Crispy golden fries seasoned with sea salt',
        descriptionAr: 'بطاطس ذهبية مقرمشة مملحة بملح البحر',
        price: 4.99,
        image: '🍟',
        isPopular: true,
        rating: 4.7,
        prepTime: 8,
        calories: 365,
        categoryId: sides.id,
      },
      {
        name: 'Onion Rings',
        nameAr: 'حلقات البصل',
        description: 'Crispy battered onion rings with dip sauce',
        descriptionAr: 'حلقات بصل مقرمشة مع صوص غمس',
        price: 5.49,
        image: '🧅',
        rating: 4.5,
        prepTime: 10,
        calories: 410,
        categoryId: sides.id,
      },
      {
        name: 'Chicken Wings (8 pcs)',
        nameAr: 'أجنحة دجاج (8 قطع)',
        description: 'Spicy buffalo wings with blue cheese dip',
        descriptionAr: 'أجنحة بافالو حارة مع صوص الجبن الأزرق',
        price: 9.99,
        image: '🍗',
        isPopular: true,
        rating: 4.8,
        prepTime: 15,
        calories: 580,
        categoryId: sides.id,
      },
      {
        name: 'Mozzarella Sticks',
        nameAr: 'أصابع الموزاريلا',
        description: 'Golden fried mozzarella sticks with marinara sauce',
        descriptionAr: 'أصابع موزاريلا مقلية ذهبية مع صوص مارينارا',
        price: 6.49,
        image: '🧀',
        rating: 4.6,
        prepTime: 10,
        calories: 450,
        categoryId: sides.id,
      },
    ],
  })

  // Drinks
  await db.menuItem.createMany({
    data: [
      {
        name: 'Coca-Cola',
        nameAr: 'كوكا كولا',
        description: 'Chilled 330ml can of Coca-Cola',
        descriptionAr: 'علبة كوكا كولا 330مل مثلجة',
        price: 2.49,
        image: '🥤',
        rating: 4.5,
        prepTime: 2,
        calories: 140,
        categoryId: drinks.id,
      },
      {
        name: 'Fresh Orange Juice',
        nameAr: 'عصير برتقال طازج',
        description: 'Freshly squeezed orange juice, 400ml',
        descriptionAr: 'عصير برتقال طازج معصور، 400مل',
        price: 4.49,
        image: '🧃',
        isPopular: true,
        rating: 4.7,
        prepTime: 5,
        calories: 165,
        categoryId: drinks.id,
      },
      {
        name: 'Iced Coffee',
        nameAr: 'قهوة مثلجة',
        description: 'Cold brew coffee with milk and caramel syrup',
        descriptionAr: 'قهوة كولد برو مع حليب وشراب الكراميل',
        price: 5.49,
        image: '🧋',
        isPopular: true,
        rating: 4.8,
        prepTime: 5,
        calories: 220,
        categoryId: drinks.id,
      },
      {
        name: 'Mineral Water',
        nameAr: 'مياه معدنية',
        description: '500ml bottle of natural mineral water',
        descriptionAr: 'زجاجة مياه معدنية طبيعية 500مل',
        price: 1.49,
        image: '💧',
        rating: 4.4,
        prepTime: 1,
        calories: 0,
        categoryId: drinks.id,
      },
    ],
  })

  // Desserts
  await db.menuItem.createMany({
    data: [
      {
        name: 'Chocolate Brownie',
        nameAr: 'براوني الشوكولاتة',
        description: 'Warm chocolate brownie with vanilla ice cream',
        descriptionAr: 'براوني شوكولاتة دافئ مع آيس كريم الفانيليا',
        price: 6.99,
        image: '🍫',
        isPopular: true,
        rating: 4.9,
        prepTime: 8,
        calories: 520,
        categoryId: desserts.id,
      },
      {
        name: 'New York Cheesecake',
        nameAr: 'تشيز كيك نيويورك',
        description: 'Classic creamy cheesecake with berry compote',
        descriptionAr: 'تشيز كيك كريمي كلاسيكي مع صوص التوت',
        price: 7.49,
        image: '🍰',
        rating: 4.8,
        prepTime: 5,
        calories: 480,
        categoryId: desserts.id,
      },
      {
        name: 'Vanilla Milkshake',
        nameAr: 'ميلك شيك الفانيليا',
        description: 'Thick vanilla milkshake topped with whipped cream',
        descriptionAr: 'ميلك شيك فانيليا كثيف مع كريمة مخفوقة',
        price: 5.99,
        image: '🥤',
        rating: 4.7,
        prepTime: 5,
        calories: 380,
        categoryId: desserts.id,
      },
      {
        name: 'Apple Pie',
        nameAr: 'فطيرة التفاح',
        description: 'Warm apple pie with cinnamon and a scoop of ice cream',
        descriptionAr: 'فطيرة تفاح دافئة مع قرفة وكرة آيس كريم',
        price: 5.49,
        image: '🥧',
        rating: 4.6,
        prepTime: 6,
        calories: 410,
        categoryId: desserts.id,
      },
    ],
  })

  const counts = await Promise.all([
    db.category.count(),
    db.menuItem.count(),
  ])
  console.log(`✅ Seeded ${counts[0]} categories and ${counts[1]} menu items`)
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
