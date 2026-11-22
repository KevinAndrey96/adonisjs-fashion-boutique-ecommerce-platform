'use strict'

const Coupon = use('App/Models/Coupon')

class CouponController {
  async validate ({ request, response }) {
    try {
      const code = request.input('code')
      const coupon = await Coupon.query()
        .where('code', code)
        .where('status', 'active')
        .firstOrFail()
      return response.json(coupon)
    } catch (e) {
      return response.status(404).json({ error: 'Cupón no válido o expirado' })
    }
  }
}

module.exports = CouponController
