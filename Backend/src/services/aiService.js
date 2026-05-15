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

  const prompt = `Eres un redactor experto en descripciones comerciales para e-commerce en español. Genera una descripción de producto larga, atractiva y orientada a la venta. Usa al menos 3 oraciones completas y menciona, características del producto, talles disponibles y variantes de color cuando haya.

Nombre del producto: ${name}
Categoría: ${categoryName}
Subcategoría: ${subcategoryName || 'No aplica'}
${sizeText}
${variantText}
${discountText}

Entrega un solo párrafo de texto fluido, sin listas ni viñetas, y no comiences con "Producto".`;

  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
    max_output_tokens: 300,
  });

  const output = response.output?.[0]?.content?.[0]?.text;
  if (typeof output === 'string' && output.trim().length > 0) {
    return output.trim();
  }

  return `Producto ${name} en la categoría ${categoryName}${subcategoryName ? `, ${subcategoryName}` : ''}. Calidad y estilo para tu compra.`;
};

module.exports = { generateProductDescription };
