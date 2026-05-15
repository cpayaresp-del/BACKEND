const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'gemini-1.5';

const generateProductDescription = async ({
  name,
  categoryName,
  subcategoryName,
  availableSizes,
  colorVariants,
  discountPercent,
}) => {
  if (!GOOGLE_API_KEY) {
    console.warn('GOOGLE_API_KEY no está configurada. Se devolverá una descripción genérica.');
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

  const prompt = `Eres un redactor experto en descripciones comerciales para e-commerce en español. Genera una descripción de producto larga, atractiva y orientada a la venta. Usa al menos 3 oraciones completas y menciona categoría, subcategoría, características del producto, talles disponibles y variantes de color cuando haya.

Nombre del producto: ${name}
Categoría: ${categoryName}
Subcategoría: ${subcategoryName || 'No aplica'}
${sizeText}
${variantText}
${discountText}

Entrega un solo párrafo de texto fluido, sin listas ni viñetas, y no comiences con "Producto".`;

  const requestBody = {
    prompt: {
      text: prompt,
    },
    temperature: 0.7,
    maxOutputTokens: 300,
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta2/models/${GOOGLE_MODEL}:generate?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  const json = await response.json();
  const output = json?.candidates?.[0]?.output;
  if (typeof output === 'string' && output.trim().length > 0) {
    return output.trim();
  }

  return `Producto ${name} en la categoría ${categoryName}${subcategoryName ? `, ${subcategoryName}` : ''}. Calidad y estilo para tu compra.`;
};

module.exports = { generateProductDescription };
