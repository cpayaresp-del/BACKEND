const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const GOOGLE_MODEL =
  process.env.GOOGLE_MODEL || 'gemini-2.5-flash';

const generateProductDescription = async ({
  name,
  categoryName,
  subcategoryName,
  availableSizes,
  colorVariants,
  discountPercent,
}) => {
  if (!GOOGLE_API_KEY) {
    console.warn(
      'GOOGLE_API_KEY no está configurada. Se devolverá una descripción genérica.'
    );

    return `${name} es un producto versátil y de alta calidad, diseñado para destacar por sus características y comodidad. Perfecto para quienes buscan una opción confiable y con estilo.`;
  }

  const sizeText =
    Array.isArray(availableSizes) &&
    availableSizes.length > 0
      ? `Tallas disponibles: ${availableSizes.join(', ')}.`
      : '';

  const variantText =
    Array.isArray(colorVariants) &&
    colorVariants.length > 0
      ? `Variantes: ${colorVariants
          .map(
            (variant) =>
              `${variant.name}${
                variant.price != null
                  ? ` a ${variant.price} unidades`
                  : ''
              }`
          )
          .join(', ')}.`
      : '';

  const discountText = discountPercent
    ? ` Actualmente con descuento del ${discountPercent}%.`
    : '';

  const prompt = `
Eres un redactor experto en descripciones comerciales para e-commerce en español.

Genera una descripción larga y persuasiva para este producto.
Escribe un solo párrafo de al menos 90 palabras, con al menos 4 oraciones completas.
Enfócate en los beneficios del producto, cómo se siente, y por qué el cliente debe comprarlo.
No uses listas, viñetas ni numeraciones.
No menciones la categoría, subcategoría ni el contexto de la tienda.
No comiences con "Producto" y no termines la descripción de forma abrupta.

Nombre del producto: ${name}

${sizeText}

${variantText}

${discountText}

Entrega un texto fluido y atractivo que invite a la compra.
`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 750,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Gemini API error ${response.status} ${response.statusText}: ${responseText}`
    );
  }

  let json;

  try {
    json = responseText
      ? JSON.parse(responseText)
      : null;
  } catch (parseError) {
    throw new Error(
      `Gemini JSON parse error: ${parseError.message}. Raw body: ${responseText}`
    );
  }

  const output =
    json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (
    typeof output === 'string' &&
    output.trim().length > 0
  ) {
    return output.trim();
  }

  return `Producto ${name} en la categoría ${categoryName}${
    subcategoryName ? `, ${subcategoryName}` : ''
  }. Calidad y estilo para tu compra.`;
};

module.exports = {
  generateProductDescription,
};
