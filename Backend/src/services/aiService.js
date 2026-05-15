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

    return `${name} es un producto versátil y de alta calidad, diseñado para destacar por su comodidad, diseño moderno y excelente estilo. Ideal para quienes buscan una opción elegante y funcional para cualquier ocasión.`;
  }

  const sizeText =
    Array.isArray(availableSizes) &&
    availableSizes.length > 0
      ? `Tallas disponibles: ${availableSizes.join(', ')}.`
      : '';

  const variantText =
    Array.isArray(colorVariants) &&
    colorVariants.length > 0
      ? `Variantes disponibles: ${colorVariants
          .map(
            (variant) =>
              `${variant.name}${
                variant.price != null
                  ? ` con precio de ${variant.price}`
                  : ''
              }`
          )
          .join(', ')}.`
      : '';

  const discountText = discountPercent
    ? `Actualmente cuenta con un descuento del ${discountPercent}%.`
    : '';

  const prompt = `
Actúa como un copywriter experto en moda y calzado premium para e-commerce.

Tu tarea es crear una descripción comercial EXTENSA, elegante, moderna y altamente persuasiva para este producto.

La descripción debe:
- sonar natural y profesional
- transmitir calidad y comodidad
- resaltar diseño, estilo y versatilidad
- hacer que el cliente quiera comprar el producto
- tener entre 120 y 200 palabras
- escribirse en un único párrafo
- NO usar listas
- NO usar viñetas
- NO repetir frases
- NO mencionar categorías ni subcategorías
- NO comenzar con el nombre del producto

Información del producto:

Nombre: ${name}

${sizeText}

${variantText}

${discountText}

Genera únicamente la descripción final.
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
      temperature: 0.5,
      maxOutputTokens: 500,
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
    output.trim().length > 20
  ) {
    return output.trim();
  }

  return `${name} combina diseño moderno, excelente comodidad y materiales de calidad para brindar una experiencia ideal en el día a día. Su estilo versátil permite adaptarlo fácilmente a diferentes ocasiones, ofreciendo una apariencia atractiva y funcional al mismo tiempo.`;
};

module.exports = {
  generateProductDescription,
};
