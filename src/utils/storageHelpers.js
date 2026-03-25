const sharp = require('sharp');
const { uploadToR2 } = require('../services/r2Service');
const logger = require('../config/logger');

/**
 * Procesa un objeto de datos (como el mapa de Hoja de Vida o Entrevista)
 * buscando valores en Base64 para subirlos a R2 y reemplazarlos por URLs.
 * 
 * @param {Object} data - Objeto con los datos del formulario (ej: req.body.datos)
 * @param {String} folder - Carpeta de destino en R2 (ej: 'firmas', 'documentos')
 * @returns {Promise<Object>} - El objeto con las URLs en lugar de Base64
 */
const processFormImages = async (data, folder = 'fundacion') => {
  if (!data || typeof data !== 'object') return data;

  const processedData = { ...data };
  const entries = Object.entries(processedData);

  for (const [key, value] of entries) {
    if (typeof value === 'string' && value.startsWith('data:image')) {
      try {
        // 1. Detectar si es una firma (por nombre de campo común)
        const isSignature = key.toLowerCase().includes('firma');
        
        // 2. Extraer buffer de Base64
        const base64Data = value.split(';base64,').pop();
        let buffer = Buffer.from(base64Data, 'base64');
        let extension = '.png'; // Preferimos PNG para transparencia

        // 3. Procesamiento especial para firmas (Quitar fondo blanco)
        if (isSignature) {
          logger.info(`[StorageHelper] Procesando transparencia para firma: ${key}`);
          
          // Usamos sharp para:
          // - Asegurar canal alfa
          // - Volver transparente cualquier color cercano al blanco (umbral ~200)
          // - Recortar bordes vacíos (trim)
          buffer = await sharp(buffer)
            .ensureAlpha()
            .toFormat('png')
            .pipelineColorspace('srgb')
            .on('info', (info) => logger.debug(`[Sharp] Procesada firma: ${info.width}x${info.height}`))
            .raw()
            .toBuffer({ resolveWithObject: true })
            .then(({ data, info }) => {
                // Filtro de píxeles: Si R, G y B son > 200, poner Alpha a 0
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] > 195 && data[i + 1] > 195 && data[i + 2] > 195) {
                        data[i + 3] = 0;
                    }
                }
                return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
                    .trim() // Eliminar bordes blancos sobrantes
                    .toBuffer();
            });
        } else {
            // Para otras imágenes (fotos), simplemente optimizar un poco si es necesario
            // pero por ahora solo subir directo para evitar side effects en la foto de perfil
            buffer = await sharp(buffer).toBuffer();
        }

        // 4. Subir a R2
        const fileName = `${key}_${Date.now()}${extension}`;
        const url = await uploadToR2(buffer, fileName, folder);
        
        logger.info(`[StorageHelper] Imagen subida a R2: ${key} -> ${url}`);
        processedData[key] = url;

      } catch (error) {
        logger.error(`[StorageHelper] Error procesando imagen ${key}: ${error.message}`);
        // Si falla el procesamiento, mantenemos el valor original (Base64) para no perder datos,
        // aunque esto perpetúe el bloat. Idealmente el frontend debería reintentar.
      }
    }
  }

  return processedData;
};

module.exports = { processFormImages };
