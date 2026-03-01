const sharp = require('sharp');
const { uploadToR2 } = require('./r2Service');

/**
 * Optimizes an image and uploads multiple versions to Cloudflare R2
 * @param {Buffer} fileBuffer - The original image buffer
 * @param {string} originalName - Original filename
 * @param {string} folder - Destination folder in R2 (e.g., 'optimized')
 * @returns {Promise<Object>} Object containing R2 URLs and base64 blur placeholder
 */
const processAndUploadImage = async (fileBuffer, originalName, folder = 'optimized') => {
    try {
        // We instantiate sharp once for metadata, and use clones for processing
        const image = sharp(fileBuffer);
        const metadata = await image.metadata();

        // Generate ultra-small blur placeholder (20px width) as base64
        const blurBuffer = await image.clone()
            .resize({ width: 20 })
            .webp({ quality: 20 })
            .toBuffer();

        // Create base64 string for the blur-up effect
        const blurHash = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

        // Define resolutions
        const sizes = [
            { name: 'small', width: 200, keySuffix: '-200px.webp' },
            { name: 'medium', width: 600, keySuffix: '-600px.webp' },
            { name: 'large', width: 1200, keySuffix: '-1200px.webp' }
        ];

        const uploadPromises = sizes.map(async (size) => {
            // Don't upscale if original is smaller than the target size, just compress
            const targetWidth = metadata.width && metadata.width < size.width ? metadata.width : size.width;

            const processedBuffer = await image.clone()
                .resize({ width: targetWidth, withoutEnlargement: true })
                .webp({ quality: 80, effort: 6 }) // High compression effort for web
                .toBuffer();

            // Create a specific name for R2 with the size suffix
            const newName = originalName.replace(/\.[^/.]+$/, "") + size.keySuffix;
            const url = await uploadToR2(processedBuffer, newName, folder);

            return { [size.name]: url };
        });

        // Wait for all 3 uploads to complete
        const uploadedUrls = await Promise.all(uploadPromises);

        // Combine results
        const result = {
            blurHash,
            // uploadUrls is an array of objects e.g. [{ small: url }, { medium: url }, { large: url }]
            ...Object.assign({}, ...uploadedUrls)
        };

        return result;

    } catch (error) {
        console.error('Error in image optimization service:', error);
        throw new Error(`Failed to process and upload image: ${error.message}`);
    }
};

module.exports = {
    processAndUploadImage
};
