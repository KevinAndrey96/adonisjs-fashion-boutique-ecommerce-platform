'use strict'

/*
|--------------------------------------------------------------------------
| FashionBoutiqueSeeder
|--------------------------------------------------------------------------
|
| Seeds categories, products, admin user, coupons, and demo orders
| for the Fashion Boutique e-commerce platform & backoffice.
|
*/

const User = use('App/Models/User')
const Category = use('App/Models/Category')
const Product = use('App/Models/Product')
const Client = use('App/Models/Client')
const Order = use('App/Models/Order')
const OrderProduct = use('App/Models/OrderProduct')
const Coupon = use('App/Models/Coupon')

class FashionBoutiqueSeeder {
  async run () {
    // 1. Seed Admin User
    const adminExists = await User.findBy('email', 'admin@boutique-platform.com')
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: 'admin@boutique-platform.com',
        password: 'BoutiqueAdmin2026!'
      })
    }

    // 2. Seed Categories
    const categoriesData = [
      { name: 'Vestidos y Bodys', image: '/img/cat_bodys.jpg' },
      { name: 'Lencería y Pantyes', image: '/img/cat_pantyes.jpg' },
      { name: 'Tops y Bras', image: '/img/cat_bras.jpg' },
      { name: 'Colección Especial', image: '/img/cat_especial.jpg' },
      { name: 'Accesorios y Calzado', image: '/img/cat_accesorios.jpg' }
    ]

    for (const cat of categoriesData) {
      const exists = await Category.findBy('name', cat.name)
      if (!exists) {
        await Category.create(cat)
      }
    }

    // 3. Seed Realistic Fashion Products
    const productsData = [
      // Bodys & Vestidos
      {
        name: 'Body Encaje Elegance Noir',
        code: 'BQT-BD-001',
        category: 'BODYS',
        price: 89000,
        short_description: 'Body confeccionado en fino encaje floral elastizado con forro de microfibra suave.',
        long_description: 'Diseño sensual y sofisticado con escote profundo en V, broches inferiores ajustables de tres posiciones y acabado invisible bajo cualquier prenda exterior.',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=80',
        father: 'Vestidos y Bodys'
      },
      {
        name: 'Body Asimétrico Silk Velvet',
        code: 'BQT-BD-002',
        category: 'BODYS',
        price: 95000,
        short_description: 'Body de terciopelo con manga asimétrica para eventos nocturnos y cóctel.',
        long_description: 'Confección premium en terciopelo sedoso con brillo sutil. Corte ergonómico que estiliza la silueta con broches reforzados en la entrepierna.',
        image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&auto=format&fit=crop&q=80',
        father: 'Vestidos y Bodys'
      },
      {
        name: 'Vestido Midi Lino Santorini',
        code: 'BQT-VS-003',
        category: 'BODYS',
        price: 135000,
        short_description: 'Vestido midi en lino 100% natural con escote halter y espalda descubierta.',
        long_description: 'Estilo veraniego y fresco con cinturón extraíble en la misma tela, bolsillos laterales invisibles y abertura lateral sutil que facilita el movimiento.',
        image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&auto=format&fit=crop&q=80',
        father: 'Vestidos y Bodys'
      },

      // Pantyes & Lencería Diaria
      {
        name: 'Panty Cheeky Seamless Nude Pack x3',
        code: 'BQT-PT-004',
        category: 'PANTYES',
        price: 54000,
        short_description: 'Set de 3 pantyes corte cheeky sin costuras, invisibles bajo vestidos ajustados.',
        long_description: 'Tecnología de corte láser termofusionado sin elásticos que marquen. Refuerzo íntimo en 100% algodón hipoalergénico transpirable.',
        image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500&auto=format&fit=crop&q=80',
        father: 'Lencería y Pantyes'
      },
      {
        name: 'Tanga Brasilera Encaje Chantilly',
        code: 'BQT-PT-005',
        category: 'PANTYES',
        price: 28000,
        short_description: 'Tanga brasilera delicada con encaje floral suave y detalles en satén.',
        long_description: 'Cintura elástica ultrasuave que no talla ni se enrolla. Detalle de lazo frontal en satén y costuras ultraplanas de alta costura.',
        image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=80',
        father: 'Lencería y Pantyes'
      },

      // Bras & Tops
      {
        name: 'Bralette Encaje Triángulo Boreal',
        code: 'BQT-BR-006',
        category: 'BRAS',
        price: 65000,
        short_description: 'Bralette sin varilla con copa triangular en encaje elástico francés.',
        long_description: 'Máxima comodidad sin aros metálicos. Base ancha elastizada que ofrece soporte natural y tirantes graduables de espalda múltiple.',
        image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500&auto=format&fit=crop&q=80',
        father: 'Tops y Bras'
      },
      {
        name: 'Bra Balconet Push-Up Couture',
        code: 'BQT-BR-007',
        category: 'BRAS',
        price: 78000,
        short_description: 'Brasier balconet con copa estructurada y realce medio para escotes rectos.',
        long_description: 'Copas prehormadas con almohadilla interior suave que centra y realza el busto de forma armónica. Contorno ancho con triple corchete.',
        image: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=500&auto=format&fit=crop&q=80',
        father: 'Tops y Bras'
      },

      // Lencería Especial & Bridal
      {
        name: 'Babi Doll Seda & Tul Romantic Rose',
        code: 'BQT-LC-008',
        category: 'LENCERÌA ESPECIAL',
        price: 110000,
        short_description: 'Babi doll en satén de seda brillante con copas en tul bordado y espalda cruzada.',
        long_description: 'Caída fluida en corte imperio que favorece cualquier silueta. Incluye panty tipo hilo a juego confeccionado en satén suave.',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&auto=format&fit=crop&q=80',
        father: 'Colección Especial'
      },
      {
        name: 'Kimono Bata Seda Ivory Bridal',
        code: 'BQT-LC-009',
        category: 'LENCERÌA ESPECIAL',
        price: 125000,
        short_description: 'Bata kimono de satén marfil con mangas amplias y ribete de encaje en puños.',
        long_description: 'Prenda icónica para mañanas de boda o descanso de lujo. Incluye lazo interior de seguridad y cinturón exterior amplio en satén.',
        image: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=500&auto=format&fit=crop&q=80',
        father: 'Colección Especial'
      },

      // Accesorios
      {
        name: 'Cinturón Corset de Cuero Vegano',
        code: 'BQT-AC-010',
        category: 'ACCESORIOS',
        price: 49000,
        short_description: 'Cinturón ancho ajustable con cordones estilo corset para ceñir vestidos y camisas.',
        long_description: 'Fabricado en cuero ecológico con ojales metálicos antioxidables y elástico posterior de alta tensión con cierre de botones a presión.',
        image: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=500&auto=format&fit=crop&q=80',
        father: 'Accesorios y Calzado'
      },
      {
        name: 'Aretes Perla Barroca & Oro Laminado',
        code: 'BQT-AC-011',
        category: 'ACCESORIOS',
        price: 42000,
        short_description: 'Aretes colgantes artesanales con perla barroca natural cultivada en agua dulce.',
        long_description: 'Base en plata 925 con baño de oro amarillo 18k hipoalergénico. Cada perla cuenta con forma orgánica única certificada.',
        image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&auto=format&fit=crop&q=80',
        father: 'Accesorios y Calzado'
      }
    ]

    for (const prod of productsData) {
      const exists = await Product.findBy('code', prod.code)
      if (!exists) {
        await Product.create(prod)
      }
    }

    // 4. Seed Coupons
    const couponsData = [
      { code: 'BIENVENIDA10', discount: 10, status: 'active' },
      { code: 'BLACKFRIDAY20', discount: 20, status: 'active' },
      { code: 'VIPFASHION15', discount: 15, status: 'active' }
    ]

    for (const coup of couponsData) {
      const exists = await Coupon.findBy('code', coup.code)
      if (!exists) {
        await Coupon.create(coup)
      }
    }

    // 5. Seed Demo Client
    let client = await Client.findBy('email', 'cliente@boutique-platform.com')
    if (!client) {
      client = await Client.create({
        name: 'Valentina Restrepo',
        email: 'cliente@boutique-platform.com',
        phone: '+57 301 234 5678',
        address: 'Carrera 7 # 116-50, Apto 804',
        city: 'Bogotá',
        country: 'Colombia'
      })
    }

    // 6. Seed Sample Orders
    const existingOrders = await Order.all()
    if (existingOrders.rows.length === 0) {
      const allProducts = await Product.all()
      const prodsList = allProducts.toJSON()

      if (prodsList.length >= 3) {
        const order1 = await Order.create({
          client_id: client.id,
          status: 'delivered',
          value: String(prodsList[0].price + prodsList[3].price),
          gateway: 'Contraentrega',
          details: `${prodsList[0].name} (x1) - ${prodsList[3].name} (x1)`
        })
        await OrderProduct.create({ order_id: order1.id, product_id: prodsList[0].id, quantity: 1 })
        await OrderProduct.create({ order_id: order1.id, product_id: prodsList[3].id, quantity: 1 })

        const order2 = await Order.create({
          client_id: client.id,
          status: 'processing',
          value: String(prodsList[2].price),
          gateway: 'payu',
          details: `${prodsList[2].name} (x1) [Cupón: BIENVENIDA10 -10%]`
        })
        await OrderProduct.create({ order_id: order2.id, product_id: prodsList[2].id, quantity: 1 })
      }
    }

    console.log('Fashion Boutique catalog seeded successfully.')
  }
}

module.exports = FashionBoutiqueSeeder
