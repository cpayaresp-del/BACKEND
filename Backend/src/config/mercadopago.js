const { MercadoPagoConfig } = require('mercadopago');

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

module.exports = mpClient;
