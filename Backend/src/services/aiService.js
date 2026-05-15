const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const generateProductDescription = async ({
  name,
  categoryName,
  subcategoryName,
  availableSizes,
  colorVariants,
  discountPercent,
}) => {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY no está configurada. Se devolverá una descripción genérica.');
    return `Producto ${name} en la categoría ${categoryName}${subcategoryName ? `, ${subcategoryName}` : ''}. Ideal para quienes buscan calidad y versatilidad.`;
  }

  const sizeText = Array.isArray(availableSizes) && availableSizes.length > 0
    ? `Tallas disponibles: ${availableSizes.join(', ')}.`
    : '';

  const variantText = Array.isArray(colorVariants) && colorVariants.length > 0
    ? `Variantes: ${colorVariants
        .map((variant) => `${variant.name}${variant.price != null ? ` a ${variant.price} unidades` : ''}`)
        .join(', ')}.`
    : '';

  const discountText = discountPercent ? ` Actualmente con descuento del ${discountPercent}%.` : '';

  const prompt = `Escribe una descripción de producto en español para un sitio de e-commerce. Usa un tono atractivo, directo y enfocado en venta. Incluye la categoría, subcategoría si está disponible, y menciona características relevantes.

Nombre del producto: ${name}
Categoría: ${categoryName}
Subcategoría: ${subcategoryName || 'No aplica'}
${sizeText}
${variantText}
${discountText}

Devuelve sólo la descripción en un párrafo conciso.`;

  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
    max_output_tokens: 200,
  });

  const output = response.output?.[0]?.content?.[0]?.text;
  if (typeof output === 'string' && output.trim().length > 0) {
    return output.trim();
  }

  return `Producto ${name} en la categoría ${categoryName}${subcategoryName ? `, ${subcategoryName}` : ''}. Calidad y estilo para tu compra.`;
};

module.exports = { generateProductDescription };