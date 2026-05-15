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

    return `${name} combina comodidad, estilo y excelente calidad en un diseño pensado para destacar en cualquier ocasión. Su apariencia moderna y materiales resistentes lo convierten en una opción ideal para quienes buscan una experiencia cómoda y atractiva al mismo tiempo.`;
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
Actúa como un copywriter profesional especializado en moda y calzado para e-commerce.

Genera una descripción comercial larga, profesional y natural para este producto.

La descripción debe:
- sonar completamente humana
- transmitir calidad, comodidad y estilo
- resaltar diseño, elegancia y versatilidad
- explicar por qué vale la pena comprarlo
- tener entre 120 y 180 palabras
- escribirse en un único párrafo
- terminar correctamente
- evitar frases exageradas o fantasiosas
- NO usar frases típicas de IA como:
  "sumérgete en un universo"
  "descubre una experiencia única"
  "lleva tu estilo al siguiente nivel"
- NO usar listas ni viñetas
- NO repetir palabras constantemente
- NO mencionar categorías ni subcategorías
- NO inventar características inexistentes

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
      temperature: 0.4,
      maxOutputTokens: 1200,
      topP: 0.8,
      topK: 40,
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
    output.trim().length > 30
  ) {
    return output.trim();
  }

  return `${name} ofrece una combinación ideal entre diseño moderno, comodidad y calidad, convirtiéndose en una excelente opción para quienes buscan un producto atractivo y funcional. Su estilo versátil permite adaptarlo fácilmente a diferentes ocasiones, brindando una apariencia elegante y cómoda en el día a día.`;
};

module.exports = {
  generateProductDescription,
};
