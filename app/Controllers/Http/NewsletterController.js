'use strict'

const crypto = require('crypto')

const Newsletter = use('App/Models/Newsletter')
const Coupon = use('App/Models/Coupon')
const Env = use('Env')
const Logger = use('Logger')

class NewsletterController {
  async store ({ request, response, session }) {
    try {
      const userData = request.only(['email', 'first_name', 'last_name', 'phone'])
      await Newsletter.create(userData)

      const coupon = await Coupon.create({
        code: crypto.randomBytes(5).toString('hex').toUpperCase(),
        discount: 10,
        status: 'active'
      })

      try {
        const Mail = use('Mail')
        await Mail.send('emails.coupon', { coupon: coupon.toJSON() }, (message) => {
          message
            .to(userData.email)
            .from(Env.get('MAIL_FROM', 'no-reply@example.com'))
            .subject('¡Bienvenida a Fashion Boutique! Tu cupón de descuento')
        })
      } catch (mailError) {
        Logger.warning('newsletter coupon email not sent: %s', mailError.message)
      }

      session.flash({
        notification:
          '¡Gracias por suscribirte! Te hemos enviado un cupón del 10% de descuento a tu correo.'
      })
    } catch (e) {
      session.flash({ error: 'Este correo ya se encuentra registrado en nuestro boletín.' })
    }
    return response.redirect('/')
  }
}

module.exports = NewsletterController
