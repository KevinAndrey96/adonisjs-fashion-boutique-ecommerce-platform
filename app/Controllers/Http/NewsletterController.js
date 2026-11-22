'use strict'

const Newsletter = use('App/Models/Newsletter')
const Coupon = use('App/Models/Coupon')
const Env = use('Env')

class NewsletterController {
  async store ({ request, response, session }) {
    try {
      const userData = request.only(['email', 'first_name', 'last_name', 'phone'])
      await Newsletter.create(userData)

      const randomCode =
        Math.random().toString(36).substring(2, 6).toUpperCase() +
        Math.random().toString(36).substring(2, 6).toUpperCase()

      const coupon = await Coupon.create({ code: randomCode, discount: 10, status: 'active' })

      try {
        const Mail = use('Mail')
        await Mail.send('emails.coupon', { coupon: coupon.toJSON() }, (message) => {
          message
            .to(userData.email)
            .from(Env.get('MAIL_FROM', 'no-reply@boutique-platform.com'))
            .subject('¡Bienvenida a Fashion Boutique! Tu cupón de descuento')
        })
      } catch (mailError) {
        // Fallback when mail server is offline
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
