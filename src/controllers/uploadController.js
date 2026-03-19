const { processAndUploadImage } = require('../services/imageOptimizationService');
const axios = require('axios');

const uploadOptimizedImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se ha proporcionado ninguna imagen o el archivo no es válido.'
            });
        }

        const { buffer, originalname } = req.file;
        const folder = req.body.folder || 'optimized'; // Enable custom folder via body

        // Process and upload the image versions
        const result = await processAndUploadImage(buffer, originalname, folder);

        return res.status(200).json({
            success: true,
            message: 'Imagen procesada y subida correctamente.',
            data: result
        });

    } catch (error) {
        console.error('Error en uploadOptimizedImage:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al procesar la imagen.',
            error: error.message
        });
    }
};

const proxyImage = async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const contentType = response.headers['content-type'];
        
        res.set('Content-Type', contentType);
        res.set('Access-Control-Allow-Origin', '*');
        res.send(response.data);
    } catch (error) {
        console.error('Error in proxyImage:', error);
        res.status(500).json({ error: 'Error fetching image', details: error.message });
    }
};

module.exports = {
    uploadOptimizedImage,
    proxyImage
};
