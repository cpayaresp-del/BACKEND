const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'gemini-1.5';
const GOOGLE_MODEL_FALLBACK = process.env.GOOGLE_MODEL_FALLBACK || 'text-bison-001';

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
    return `${name} es un producto versátil y de alta calidad, diseñado para destacar por sus características y comodidad. Perfecto para quienes buscan una opción confiable y con estilo.`;
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

  const prompt = `Eres un redactor experto en descripciones comerciales para e-commerce en español. Genera una descripción de producto larga, atractiva y orientada a la venta. Usa al menos 3 oraciones completas y enfócate únicamente en el producto, sus características y por qué debe comprarse. No menciones la categoría, subcategoría ni el contexto de la tienda.

Nombre del producto: ${name}
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

  const callGemini = async (model, endpoint) => {
    const url = `https://generativelanguage.googleapis.com/v1beta2/models/${model}:${endpoint}?key=${GOOGLE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    if (!response.ok) {
      const error = new Error(
        `Gemini API error ${response.status} ${response.statusText}: ${responseText}`
      );
      error.status = response.status;
      throw error;
    }

    let json;
    try {
      json = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      throw new Error(
        `Gemini JSON parse error: ${parseError.message}. Raw body: ${responseText}`
      );
    }

    const output = json?.candidates?.[0]?.output || json?.output?.[0]?.content?.[0]?.text;
    if (typeof output === 'string' && output.trim().length > 0) {
      return output.trim();
    }

    throw new Error(`Gemini response did not contain a valid output. Raw body: ${responseText}`);
  };

  const tryAlternateEndpoints = async (model) => {
    try {
      return await callGemini(model, 'generateText');
    } catch (primaryError) {
      if (primaryError.status === 404) {
        return await callGemini(model, 'generate');
      }
      throw primaryError;
    }
  };

  try {
    return await tryAlternateEndpoints(GOOGLE_MODEL);
  } catch (error) {
    if (GOOGLE_MODEL_FALLBACK && GOOGLE_MODEL_FALLBACK !== GOOGLE_MODEL) {
      return await tryAlternateEndpoints(GOOGLE_MODEL_FALLBACK);
    }
    throw error;
  }
};

module.exports = { generateProductDescription };
