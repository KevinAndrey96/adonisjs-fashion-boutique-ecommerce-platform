'use strict'

const Product = use('App/Models/Product')
const Client = use('App/Models/Client')
const Category = use('App/Models/Category')
const Order = use('App/Models/Order')
const OrderProduct = use('App/Models/OrderProduct')
const Coupon = use('App/Models/Coupon')
const Env = use('Env')
const crypto = require('crypto')

class ProductController {
  formatCurrency (locales, currency, fractionDigits, number) {
    return new Intl.NumberFormat(locales, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: fractionDigits
    }).format(number || 0)
  }

  async index ({ params, view }) {
    const product = await Product.findOrFail(params.id)
    const productData = product.toJSON()
    productData.price = this.formatCurrency('es-CO', 'COP', 0, product.price)

    const relateds = await Product.query()
      .where('category', '=', product.category)
      .where('id', '!=', product.id)
      .limit(6)
      .fetch()

    const categories = await Category.all()

    return view.render('product_detail', {
      product: productData,
      relateds: relateds.toJSON().map((r) => ({
        ...r,
        price: this.formatCurrency('es-CO', 'COP', 0, r.price)
      })),
      categories: categories.toJSON()
    })
  }

  async bycat ({ params, view }) {
    const category = await Category.find(params.id)
    const categoryName = category ? category.name : ''

    const products = await Product.query()
      .where('father', '=', categoryName)
      .orWhere('category', 'LIKE', `%${categoryName}%`)
      .fetch()

    const categories2 = await Product.query().pluck('father').groupBy('father')

    const productsFormatted = products.toJSON().map((p) => ({
      ...p,
      price: this.formatCurrency('es-CO', 'COP', 0, p.price)
    }))

    return view.render('products_list', {
      products: productsFormatted,
      category: category ? category.toJSON() : { name: 'Catálogo' },
      categories: categories2
    })
  }

  async bycatmenu ({ params, view }) {
    const categoryName = (params.name || '').replace(/%20/g, ' ')
    const products = await Product.query()
      .where('category', 'LIKE', `%${categoryName}%`)
      .orWhere('father', 'LIKE', `%${categoryName}%`)
      .fetch()

    const category = await Category.query()
      .where('name', 'LIKE', `%${categoryName}%`)
      .first()

    const categories2 = await Product.query().pluck('father').groupBy('father')

    const productsFormatted = products.toJSON().map((p) => ({
      ...p,
      price: this.formatCurrency('es-CO', 'COP', 0, p.price)
    }))

    return view.render('products_list', {
      products: productsFormatted,
      category: category ? category.toJSON() : { name: categoryName },
      categories: categories2
    })
  }

  async search ({ request, view }) {
    const searchParams = request.get()
    let sortparam = 'asc'
    let sortname = 'name'

    if (searchParams.sort) {
      switch (searchParams.sort) {
        case 'pricedesc':
          sortparam = 'desc'
          sortname = 'price'
          break
        case 'priceasc':
          sortparam = 'asc'
          sortname = 'price'
          break
        case 'alphadesc':
          sortparam = 'desc'
          sortname = 'name'
          break
        case 'alphaasc':
          sortparam = 'asc'
          sortname = 'name'
          break
        default:
          sortparam = 'asc'
          sortname = 'name'
          break
      }
    }

    let query = Product.query().orderBy(sortname, sortparam)

    if (searchParams.name) {
      query = query.where('name', 'LIKE', `%${searchParams.name}%`)
    }

    if (searchParams.category) {
      query = query.where('category', '=', searchParams.category)
    }

    if (searchParams.prices) {
      const priceFilter = parseInt(searchParams.prices, 10)
      switch (priceFilter) {
        case 1:
          query = query.whereBetween('price', [0, 50000])
          break
        case 2:
          query = query.whereBetween('price', [50000, 150000])
          break
        case 3:
          query = query.whereBetween('price', [150000, 300000])
          break
        case 4:
          query = query.where('price', '>', 300000)
          break
      }
    }

    const products = await query.fetch()
    const categories2 = await Product.query().pluck('father').groupBy('father')

    const productsFormatted = products.toJSON().map((p) => ({
      ...p,
      price: this.formatCurrency('es-CO', 'COP', 0, p.price)
    }))

    return view.render('products_list', {
      products: productsFormatted,
      category: { name: searchParams.name ? `Búsqueda: "${searchParams.name}"` : 'Todos los productos' },
      categories: categories2
    })
  }

  async get ({ request, response }) {
    const id = request.input('id')
    const product = await Product.find(id)
    if (!product) {
      return response.status(404).json({ error: 'Producto no encontrado' })
    }
    return response.json(product)
  }

  async cart ({ view }) {
    return view.render('cart')
  }

  async checkout ({ request, view }) {
    const rawCart = request.input('CART') || '{"cart":[]}'
    let parsedCart = { cart: [] }
    try {
      parsedCart = typeof rawCart === 'string' ? JSON.parse(rawCart) : rawCart
    } catch (e) {
      parsedCart = { cart: [] }
    }

    const items = []
    let total = 0

    if (Array.isArray(parsedCart.cart)) {
      for (const item of parsedCart.cart) {
        const product = await Product.find(parseInt(item.Product, 10))
        if (product) {
          const qty = parseInt(item.Quantity, 10) || 1
          const linePrice = qty * parseInt(product.price, 10)
          total += linePrice
          items.push({
            id: product.id,
            name: product.name,
            code: product.code,
            quantity: qty,
            price: linePrice,
            prettyprice: this.formatCurrency('es-CO', 'COP', 0, linePrice)
          })
        }
      }
    }

    const shipping = 0
    const prettyprices = {
      subtotal: this.formatCurrency('es-CO', 'COP', 0, total),
      shipping: this.formatCurrency('es-CO', 'COP', 0, shipping),
      total: this.formatCurrency('es-CO', 'COP', 0, total + shipping)
    }

    const prices = {
      subtotal: total,
      shipping: shipping,
      total: total + shipping
    }

    return view.render('checkout', {
      cart: items,
      prices: prices,
      prettyprices: prettyprices,
      originalcart: rawCart
    })
  }

  async pay ({ request, response, view }) {
    const email = request.input('EMAIL')
    let client

    try {
      client = await Client.findBy('email', email)
      if (client) {
        client.name = request.input('NAME') || client.name
        client.phone = request.input('PHONE') || client.phone
        client.address = request.input('ADDRESS') || client.address
        client.city = request.input('CITY') || client.city
        client.country = request.input('COUNTRY') || client.country
        await client.save()
      } else {
        client = await Client.create({
          name: request.input('NAME'),
          email: email,
          phone: request.input('PHONE'),
          address: request.input('ADDRESS'),
          city: request.input('CITY'),
          country: request.input('COUNTRY')
        })
      }
    } catch (e) {
      client = await Client.create({
        name: request.input('NAME') || 'Cliente',
        email: email || `cliente_${Date.now()}@boutique-platform.com`,
        phone: request.input('PHONE'),
        address: request.input('ADDRESS'),
        city: request.input('CITY'),
        country: request.input('COUNTRY')
      })
    }

    const rawCart = request.input('CART') || '{"cart":[]}'
    let parsedCart = { cart: [] }
    try {
      parsedCart = typeof rawCart === 'string' ? JSON.parse(rawCart) : rawCart
    } catch (e) {
      parsedCart = { cart: [] }
    }

    const order = await Order.create({
      client_id: client.id,
      status: 'pending',
      value: '0',
      gateway: request.input('payment_type') || 'Contraentrega'
    })

    let orderTotal = 0
    let prodsSummary = ''

    if (Array.isArray(parsedCart.cart)) {
      for (const item of parsedCart.cart) {
        const product = await Product.find(parseInt(item.Product, 10))
        if (product) {
          const qty = parseInt(item.Quantity, 10) || 1
          const lineTotal = parseInt(product.price, 10) * qty
          orderTotal += lineTotal

          await OrderProduct.create({
            order_id: order.id,
            product_id: product.id,
            quantity: qty
          })

          prodsSummary += `${product.name} (x${qty}) - `
        }
      }
    }

    // Process coupon discount if provided
    if (request.input('COUPON')) {
      try {
        const coupon = await Coupon.query()
          .where('code', request.input('COUPON'))
          .where('status', 'active')
          .firstOrFail()

        coupon.status = 'used'
        await coupon.save()

        const discountAmount = Math.round((orderTotal * coupon.discount) / 100)
        orderTotal -= discountAmount
        prodsSummary += ` [Cupón: ${coupon.code} -${coupon.discount}%]`
      } catch (couponErr) {
        // Continue without discount if coupon is invalid
      }
    }

    order.value = String(orderTotal)
    order.details = prodsSummary
    await order.save()

    // Transactional confirmation email
    try {
      const Mail = use('Mail')
      await Mail.send('emails.order', { order: order.toJSON(), prods: prodsSummary }, (message) => {
        message
          .to(email)
          .from(Env.get('MAIL_FROM', 'no-reply@boutique-platform.com'))
          .subject(`Confirmación de pedido #${order.id} - Fashion Boutique`)
      })
    } catch (mailError) {
      // Graceful fallback when mail server is unreachable
    }

    // PayU Web Gateway Integration (Sandbox / Production)
    if (request.input('payment_type') === 'payu' && Env.get('ENABLE_PAYU', false)) {
      const apiKey = Env.get('PAYU_API_KEY', 'SANDBOX_PAYU_KEY')
      const merchantId = Env.get('PAYU_MERCHANT_ID', 'SANDBOX_MERCHANT')
      const referenceCode = String(order.id)
      const amount = order.value
      const currency = 'COP'
      const signature = crypto
        .createHash('md5')
        .update(`${apiKey}~${merchantId}~${referenceCode}~${amount}~${currency}`)
        .digest('hex')

      const payu = {
        url: Env.get('PAYU_URL', 'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/'),
        merchantId: merchantId,
        accountId: Env.get('PAYU_ACCOUNT_ID', 'SANDBOX_ACCOUNT'),
        description: prodsSummary,
        referenceCode: order.id,
        amount: order.value,
        tax: '0',
        taxReturnBase: '0',
        currency: currency,
        signature: signature,
        test: Env.get('PAYU_TEST_MODE', '1'),
        buyerEmail: email,
        responseUrl: `${Env.get('APP_URL', 'http://127.0.0.1:3333')}/confirm`,
        confirmationUrl: `${Env.get('APP_URL', 'http://127.0.0.1:3333')}/confirm`,
        shippingAddress: request.input('ADDRESS') || 'Bogotá',
        shippingCity: request.input('CITY') || 'Bogotá',
        shippingCountry: 'CO'
      }

      return view.render('order_completed_payu', { payu })
    }

    return response.redirect('/confirm')
  }

  async pay2 ({ view }) {
    return view.render('order_completed')
  }
}

module.exports = ProductController
