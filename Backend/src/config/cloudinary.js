const ImageKit = require('imagekit');
require('dotenv').config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

console.log("IMAGEKIT PUBLIC KEY:", process.env.IMAGEKIT_PUBLIC_KEY);
console.log("IMAGEKIT URL ENDPOINT:", process.env.IMAGEKIT_URL_ENDPOINT);

module.exports = imagekit;