const express = require('express');
const router = express.Router();
const Post = require('../models/Post.model');
const User = require('../models/User.model');
const path = require('path');
const logger = require('../config/logger');

/**
 * Route: GET /api/share/post/:id
 * Purpose: Provides SEO Metadata (Open Graph) for social networks (WhatsApp, FB, etc.)
 */
router.get('/post/:id', async (req, res) => {
    try {
        const id = req.params.id.trim(); // Trim whitespace
        const userAgent = req.headers['user-agent'] || '';
        const protocol = req.protocol;
        const host = req.get('host');
        
        logger.info(`🔍 [SHARE_ROUTE] Request for post ID: [${id}] from agent: ${userAgent.substring(0, 50)}`);

        // Detect if it's a crawler (WhatsApp, Facebook, Twitter, etc.)
        const isCrawler = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|bingbot|Googlebot|Discordbot|SkypeShell/i.test(userAgent);

        // Fetch post using Mongoose
        const post = await Post.findById(id).populate('usuario');

        if (!post) {
            logger.error(`❌ [SHARE_ROUTE] Post with ID ${id} NOT FOUND in database.`);
            const frontDomain = host.includes('api.') ? host.replace('api.', '') : 'degadersocial.com';
            return res.redirect(`https://${frontDomain}`);
        }

        logger.info(`✅ [SHARE_ROUTE] Post found: ${post.tipo} - Author: ${post.usuario?.email || 'unknown'}`);

        // If it's a REAL user (not a bot), redirect to the actual React app
        if (!isCrawler) {
            const frontDomain = host.includes('api.') ? host.replace('api.', '') : 'degadersocial.com';
            return res.redirect(`https://${frontDomain}/publicacion/${id}`);
        }

        // --- SEO DATA FOR BOT ---
        let ogTitle = 'Publicación en Degader Social';
        let ogDesc = post.contenido ? post.contenido.substring(0, 150) : 'Echa un vistazo a este post en Degader Social.';
        let ogImage = `https://degadersocial.com/assets/logo.png`; 

        if (post.tipo === 'cumpleaños') {
            const birthdayTitle = post.metadatos?.title || '¡Feliz Cumpleaños!';
            ogTitle = `${birthdayTitle} 🎈`;
            ogDesc = `Mira la tarjeta especial enviada para este cumpleaños en Degader Social.`;
            ogImage = `${protocol}://${host}/api/share/post/${id}/image`;
        } else if (post.images && post.images.length > 0) {
            ogImage = post.images[0].url || post.images[0];
        } else if (post.imagen) {
            ogImage = `https://degadersocial.com${post.imagen}`;
        }

        // --- SERVE MINI-HTML WITH OG TAGS ---
        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${ogTitle}</title>
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Degader Social">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDesc}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:secure_url" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${ogTitle}">
    <meta name="twitter:description" content="${ogDesc}">
    <meta name="twitter:image" content="${ogImage}">
    <meta http-equiv="refresh" content="0;url=https://degadersocial.com/publicacion/${id}">
</head>
<body>
    <script>window.location.href = "https://degadersocial.com/publicacion/${id}";</script>
</body>
</html>`;

        res.set('Content-Type', 'text/html');
        return res.send(html);

    } catch (error) {
        logger.error('❌ [SHARE_ROUTE] Critical error:', error.message);
        return res.redirect('https://degadersocial.com');
    }
});

/**
 * Route: GET /api/share/post/:id/image
 * Purpose: Generates a 1200x630 image.
 */
router.get('/post/:id/image', async (req, res) => {
    try {
        const id = req.params.id.trim();
        const sharp = require('sharp');
        const post = await Post.findById(id);

        if (!post) {
            return res.redirect('https://degadersocial.com/assets/logo.png');
        }

        // DESIGN STRATEGY: 
        // Since the server lacks fonts, we use a 100% geometric SVG design. 
        // Personalization resides in the metadata (og:title), avoiding "tofu" icons.
        const svgImage = `
        <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
            <!-- Institutional Background -->
            <rect width="100%" height="100%" fill="#fffdf7"/>
            
            <!-- Branded Header Pattern -->
            <rect width="100%" height="120" fill="#1e3a5f" />
            <rect width="100%" height="10" y="120" fill="#4f46e5" />
            
            <!-- Festive Decorations (Always work, no fonts needed) -->
            <circle cx="200" cy="350" r="140" fill="#4f46e5" opacity="0.1" />
            <circle cx="1000" cy="350" r="180" fill="#1e3a5f" opacity="0.05" />
            
            <!-- "Floating" Balloons shapes -->
            <circle cx="1070" cy="200" r="60" fill="#4f46e5" opacity="0.8" />
            <path d="M1070 260 Q1070 300 1090 320" stroke="#1e3a5f" stroke-width="3" fill="none" opacity="0.4"/>
            
            <circle cx="150" cy="450" r="80" fill="#1e3a5f" opacity="0.9" />
            <path d="M150 530 Q150 570 130 590" stroke="#4f46e5" stroke-width="3" fill="none" opacity="0.4"/>
            
            <circle cx="1120" cy="520" r="50" fill="#3b82f6" opacity="0.7" />
            <circle cx="80" cy="180" r="40" fill="#6366f1" opacity="0.6" />
            
            <!-- Confetti (Brand Colors) -->
            <circle cx="300" cy="250" r="8" fill="#4f46e5" />
            <circle cx="900" cy="450" r="6" fill="#1e3a5f" />
            <circle cx="500" cy="480" r="5" fill="#3b82f6" />
            <circle cx="700" cy="200" r="7" fill="#eab308" />
            
            <!-- Center Symbol (Branding) -->
            <circle cx="600" cy="350" r="100" fill="#1e3a5f" />
            <circle cx="600" cy="350" r="85" stroke="#ffffff" stroke-width="6" fill="none" />
            <circle cx="600" cy="350" r="40" fill="#4f46e5" />
            
            <!-- Footer Branding -->
            <rect width="100%" height="80" y="550" fill="#f3f4f6" />
            <circle cx="50" cy="590" r="15" fill="#1e3a5f" />
        </svg>`;

        const imageBuffer = await sharp(Buffer.from(svgImage))
            .jpeg({ quality: 90 })
            .toBuffer();

        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=3600');
        return res.send(imageBuffer);

    } catch (error) {
        logger.error('❌ [SHARE_IMAGE] Error:', error.message);
        res.status(500).send('Error');
    }
});

module.exports = router;
