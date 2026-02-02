const { deleteFromR2 } = require('../services/r2Service');

/**
 * Extrae todas las URLs de R2 de una publicación
 * @param {Object} post - Objeto de publicación
 * @returns {Array<string>} - Array de URLs de R2
 */
const extractR2UrlsFromPost = (post) => {
  const urls = [];
  const PUBLIC_URL = process.env.R2_PUBLIC_URL;

  // Verificar que PUBLIC_URL esté definido
  if (!PUBLIC_URL) {
    console.warn('⚠️ [R2 HELPER] R2_PUBLIC_URL no está definido en las variables de entorno');
    return urls;
  }

  // Extraer de campo legacy 'imagen'
  if (post.imagen && post.imagen.includes(PUBLIC_URL)) {
    urls.push(post.imagen);
  }

  // Extraer de array 'images'
  if (Array.isArray(post.images)) {
    post.images.forEach(img => {
      if (img.url && img.url.includes(PUBLIC_URL)) {
        urls.push(img.url);
      }
    });
  }

  // Extraer de array 'videos'
  if (Array.isArray(post.videos)) {
    post.videos.forEach(vid => {
      if (vid.url && vid.url.includes(PUBLIC_URL)) {
        urls.push(vid.url);
      }
      // También thumbnail si existe
      if (vid.thumbnail && vid.thumbnail.includes(PUBLIC_URL)) {
        urls.push(vid.thumbnail);
      }
    });
  }

  // Extraer de comentarios
  if (Array.isArray(post.comentarios)) {
    post.comentarios.forEach(comment => {
      if (comment.image && comment.image.includes(PUBLIC_URL)) {
        urls.push(comment.image);
      }
    });
  }

  return urls;
};

/**
 * Extrae la URL de R2 de un comentario
 * @param {Object} comment - Objeto de comentario
 * @returns {string|null} - URL de R2 o null
 */
const extractR2UrlFromComment = (comment) => {
  const PUBLIC_URL = process.env.R2_PUBLIC_URL;

  if (!PUBLIC_URL) {
    console.warn('⚠️ [R2 HELPER] R2_PUBLIC_URL no está definido en las variables de entorno');
    return null;
  }

  if (comment.image && comment.image.includes(PUBLIC_URL)) {
    return comment.image;
  }

  return null;
};

/**
 * Extrae todas las URLs de R2 de un usuario
 * @param {Object} user - Objeto de usuario
 * @returns {Array<string>} - Array de URLs de R2
 */
const extractR2UrlsFromUser = (user) => {
  const urls = [];
  const PUBLIC_URL = process.env.R2_PUBLIC_URL;

  if (!PUBLIC_URL) {
    console.warn('⚠️ [R2 HELPER] R2_PUBLIC_URL no está definido en las variables de entorno');
    return urls;
  }

  // Foto de perfil
  if (user.social?.fotoPerfil && user.social.fotoPerfil.includes(PUBLIC_URL)) {
    urls.push(user.social.fotoPerfil);
  }

  // Foto de portada
  if (user.social?.fotoPortada && user.social.fotoPortada.includes(PUBLIC_URL)) {
    urls.push(user.social.fotoPortada);
  }

  return urls;
};

/**
 * Extrae todas las URLs de R2 de una iglesia
 * @param {Object} iglesia - Objeto de iglesia
 * @returns {Array<string>} - Array de URLs de R2
 */
const extractR2UrlsFromIglesia = (iglesia) => {
  const urls = [];
  const PUBLIC_URL = process.env.R2_PUBLIC_URL;

  if (!PUBLIC_URL) {
    console.warn('⚠️ [R2 HELPER] R2_PUBLIC_URL no está definido en las variables de entorno');
    return urls;
  }

  // Foto de perfil
  if (iglesia.fotoPerfil && iglesia.fotoPerfil.includes(PUBLIC_URL)) {
    urls.push(iglesia.fotoPerfil);
  }

  // Foto de portada
  if (iglesia.fotoPortada && iglesia.fotoPortada.includes(PUBLIC_URL)) {
    urls.push(iglesia.fotoPortada);
  }

  // Multimedia
  if (Array.isArray(iglesia.multimedia)) {
    iglesia.multimedia.forEach(media => {
      if (media.url && media.url.includes(PUBLIC_URL)) {
        urls.push(media.url);
      }
    });
  }

  return urls;
};

/**
 * Extrae todas las URLs de R2 de un grupo
 * @param {Object} group - Objeto de grupo
 * @returns {Array<string>} - Array de URLs de R2
 */
const extractR2UrlsFromGroup = (group) => {
  const urls = [];
  const PUBLIC_URL = process.env.R2_PUBLIC_URL;

  if (!PUBLIC_URL) {
    console.warn('⚠️ [R2 HELPER] R2_PUBLIC_URL no está definido en las variables de entorno');
    return urls;
  }

  // Foto de portada
  if (group.fotoPortada && group.fotoPortada.includes(PUBLIC_URL)) {
    urls.push(group.fotoPortada);
  }

  // Foto de perfil
  if (group.fotoPerfil && group.fotoPerfil.includes(PUBLIC_URL)) {
    urls.push(group.fotoPerfil);
  }

  return urls;
};

/**
 * Elimina múltiples archivos de R2 en paralelo
 * @param {Array<string>} urls - Array de URLs a eliminar
 * @returns {Promise<Object>} - Resultado con éxitos y errores
 */
const deleteMultipleFromR2 = async (urls) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  console.log(`🗑️ [R2 HELPER] Eliminando ${urls.length} archivo(s) de R2...`);

  const results = await Promise.allSettled(
    urls.map(url => deleteFromR2(url))
  );

  const summary = {
    success: 0,
    failed: 0,
    errors: []
  };

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      summary.success++;
      console.log(`✅ [R2 HELPER] Eliminado: ${urls[index]}`);
    } else {
      summary.failed++;
      summary.errors.push({
        url: urls[index],
        error: result.reason.message
      });
      console.error(`❌ [R2 HELPER] Error eliminando ${urls[index]}:`, result.reason.message);
    }
  });

  console.log(`📊 [R2 HELPER] Resultado: ${summary.success} éxitos, ${summary.failed} fallos`);

  return summary;
};

module.exports = {
  extractR2UrlsFromPost,
  extractR2UrlFromComment,
  extractR2UrlsFromUser,
  extractR2UrlsFromIglesia,
  extractR2UrlsFromGroup,
  deleteMultipleFromR2
};
