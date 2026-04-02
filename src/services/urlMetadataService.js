const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Servicio para extraer metadatos de una URL (Open Graph, Meta Tags)
 */
const getUrlMetadata = async (url) => {
  try {
    // Validar URL básica
    if (!url || (!url.startsWith('http') && !url.startsWith('www'))) {
      return null;
    }

    const targetUrl = url.startsWith('www') ? `https://${url}` : url;

    // Fetch HTML del sitio
    const response = await axios.get(targetUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      },
      maxRedirects: 5,
      // Desactivar validación SSL si es necesario para sitios problemáticos
      // httpsAgent: new require('https').Agent({ rejectUnauthorized: false })
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extraer Título
    const title = 
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      $('meta[name="title"]').attr('content') ||
      targetUrl;

    // Extraer Descripción
    const description = 
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';

    // Extraer Imagen
    let image = 
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') ||
      '';

    // Asegurar que la URL de la imagen sea absoluta
    if (image && !image.startsWith('http')) {
      try {
        const urlOrigin = new URL(targetUrl).origin;
        image = new URL(image, urlOrigin).href;
      } catch (e) {
        image = '';
      }
    }

    // Extraer Nombre del Sitio / Favicon
    const siteName = 
      $('meta[property="og:site_name"]').attr('content') || 
      '';

    return {
      title: title.substring(0, 200).trim(),
      description: description.substring(0, 500).trim(),
      image,
      siteName,
      url: targetUrl
    };
  } catch (error) {
    console.error(`⚠️ Error fetching metadata for ${url}:`, error.message);
    return null;
  }
};

module.exports = {
  getUrlMetadata
};
