const { processAndUploadImage } = require('../services/imageOptimizationService');

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

module.exports = {
    uploadOptimizedImage
};
