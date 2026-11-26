'use strict'

const crypto = require('crypto')

const Product = use('App/Models/Product')
const Client = use('App/Models/Client')
const Category = use('App/Models/Category')
const Order = use('App/Models/Order')
const OrderProduct = use('App/Models/OrderProduct')
const Coupon = use('App/Models/Coupon')
const Env = use('Env')
const Logger = use('Logger')
const { formatCop, withCopPrices } = use('App/Services/Money')
const { resolveCartLines } = use('App/Services/Cart')

const SORTS = {
  pricedesc: ['price', 'desc'],
  priceasc: ['price', 'asc'],
  alphadesc: ['name', 'desc'],
  alphaasc: ['name', 'asc']
}

const PRICE_RANGES = {
  1: [0, 50000],
  2: [50000, 150000],
  3: [150000, 300000]
}

function safeDecode (value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

class ProductController {
  async index ({ params, view }) {
    const product = await Product.findOrFail(params.id)

    const [relateds, categories] = await Promise.all([
      Product.query()
        .where('category', '=', product.category)
        .where('id', '!=', product.id)
        .limit(6)
        .fetch(),
      Category.all()
    ])

    return view.render('product_detail', {
      product: { ...product.toJSON(), price: formatCop(product.price) },
      relateds: withCopPrices(relateds.toJSON()),
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

    return this.renderList(view, products, category ? category.toJSON() : { name: 'Catálogo' })
  }

  async bycatmenu ({ params, view }) {
    const categoryName = safeDecode(params.name || '')

    const products = await Product.query()
      .where('category', 'LIKE', `%${categoryName}%`)
      .orWhere('father', 'LIKE', `%${categoryName}%`)
      .fetch()

    const category = await Category.query()
      .where('name', 'LIKE', `%${categoryName}%`)
      .first()

    return this.renderList(view, products, category ? category.toJSON() : { name: categoryName })
  }

  async search ({ request, view }) {
    const { sort, name, category, prices } = request.get()
    const [sortColumn, sortDirection] = SORTS[sort] || SORTS.alphaasc

    const query = Product.query().orderBy(sortColumn, sortDirection)

    if (name) {
      query.where('name', 'LIKE', `%${name}%`)
    }

    if (category) {
      query.where('category', '=', category)
    }

    const priceFilter = parseInt(prices, 10)
    if (PRICE_RANGES[priceFilter]) {
      query.whereBetween('price', PRICE_RANGES[priceFilter])
    } else if (priceFilter === 4) {
      query.where('price', '>', 300000)
    }

    const products = await query.fetch()

    return this.renderList(view, products, { name: name ? `Búsqueda: "${name}"` : 'Todos los productos' })
  }

  async get ({ request, response }) {
    const product = await Product.find(request.input('id'))
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
    const lines = await resolveCartLines(rawCart)
    const total = lines.reduce((sum, line) => sum + line.total, 0)
    const shipping = 0

    return view.render('checkout', {
      cart: lines.map(({ product, quantity, total: lineTotal }) => ({
        id: product.id,
        name: product.name,
        code: product.code,
        quantity,
        price: lineTotal,
        prettyprice: formatCop(lineTotal)
      })),
      prices: { subtotal: total, shipping, total: total + shipping },
      prettyprices: {
        subtotal: formatCop(total),
        shipping: formatCop(shipping),
        total: formatCop(total + shipping)
      },
      originalcart: rawCart
    })
  }

  async pay ({ request, response, view, session }) {
    const email = (request.input('EMAIL') || '').trim().toLowerCase()
    const lines = await resolveCartLines(request.input('CART'))

    if (!email || lines.length === 0) {
      session.flash({ error: 'Ingresa tu correo y agrega al menos un producto al carrito.' })

      return response.redirect('/cart')
    }

    const client = await this.upsertClient(email, request)
    const paymentType = request.input('payment_type') || 'cash_on_delivery'

    const order = await Order.create({
      client_id: client.id,
      status: 'pending',
      value: '0',
      gateway: paymentType === 'payu' ? 'PayU' : 'Contraentrega'
    })

    let orderTotal = 0
    let summary = ''
    for (const line of lines) {
      await OrderProduct.create({ order_id: order.id, product_id: line.product.id, quantity: line.quantity })
      orderTotal += line.total
      summary += `${line.product.name} (x${line.quantity}) - `
    }

    const coupon = await this.redeemCoupon(request.input('COUPON'))
    if (coupon) {
      orderTotal -= Math.round((orderTotal * coupon.discount) / 100)
      summary += ` [Cupón: ${coupon.code} -${coupon.discount}%]`
    }

    order.value = String(orderTotal)
    order.details = summary
    await order.save()

    await this.sendConfirmation(email, order, summary)

    if (paymentType === 'payu' && Env.get('ENABLE_PAYU') === 'true') {
      return view.render('order_completed_payu', { payu: this.payuForm(order, summary, email, request) })
    }

    return response.redirect('/confirm')
  }

  async pay2 ({ view }) {
    return view.render('order_completed')
  }

  async renderList (view, products, category) {
    const categories = await Product.query().pluck('father').groupBy('father')

    return view.render('products_list', {
      products: withCopPrices(products.toJSON()),
      category,
      categories
    })
  }

  async upsertClient (email, request) {
    const data = {
      name: request.input('NAME'),
      phone: request.input('PHONE'),
      address: request.input('ADDRESS'),
      city: request.input('CITY'),
      country: request.input('COUNTRY')
    }

    const client = await Client.findBy('email', email)
    if (!client) {
      return Client.create({ ...data, email })
    }

    for (const [key, value] of Object.entries(data)) {
      if (value) {
        client[key] = value
      }
    }
    await client.save()

    return client
  }

  async redeemCoupon (code) {
    if (!code) {
      return null
    }

    const coupon = await Coupon.query().where('code', code).where('status', 'active').first()
    if (!coupon) {
      return null
    }

    coupon.status = 'used'
    await coupon.save()

    return coupon
  }

  async sendConfirmation (email, order, summary) {
    try {
      const Mail = use('Mail')
      await Mail.send('emails.order', { order: order.toJSON(), prods: summary }, (message) => {
        message
          .to(email)
          .from(Env.get('MAIL_FROM', 'no-reply@example.com'))
          .subject(`Confirmación de pedido #${order.id}`)
      })
    } catch (error) {
      Logger.warning('order confirmation email not sent: %s', error.message)
    }
  }

  payuForm (order, summary, email, request) {
    const apiKey = Env.getOrFail('PAYU_API_KEY')
    const merchantId = Env.getOrFail('PAYU_MERCHANT_ID')
    const referenceCode = String(order.id)
    const currency = 'COP'
    const signature = crypto
      .createHash('md5')
      .update(`${apiKey}~${merchantId}~${referenceCode}~${order.value}~${currency}`)
      .digest('hex')
    const appUrl = Env.get('APP_URL', 'http://127.0.0.1:3333')

    return {
      url: Env.get('PAYU_URL', 'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/'),
      merchantId,
      accountId: Env.getOrFail('PAYU_ACCOUNT_ID'),
      description: summary,
      referenceCode,
      amount: order.value,
      tax: '0',
      taxReturnBase: '0',
      currency,
      signature,
      test: Env.get('PAYU_TEST_MODE', '1'),
      buyerEmail: email,
      responseUrl: `${appUrl}/confirm`,
      confirmationUrl: `${appUrl}/confirm`,
      shippingAddress: request.input('ADDRESS') || 'Bogotá',
      shippingCity: request.input('CITY') || 'Bogotá',
      shippingCountry: 'CO'
    }
  }
}

module.exports = ProductController
