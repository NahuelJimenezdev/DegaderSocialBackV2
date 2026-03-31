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

        // DESIGN STRATEGY: "STYLIZED BIRTHDAY CARD"
        // We draw a recognizable birthday cake icon using only SVG shapes.
        const svgImage = `
        <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
            <!-- Background institutional cream -->
            <rect width="100%" height="100%" fill="#fffdf7"/>
            
            <!-- Branded Header & Footer Decoration -->
            <path d="M0 0 H1200 V80 Q600 120 0 80 Z" fill="#1e3a5f" />
            <path d="M0 630 H1200 V550 Q600 510 0 550 Z" fill="#1e3a5f" />
            
            <!-- Central Branded Badge -->
            <circle cx="600" cy="315" r="220" fill="#4f46e5" opacity="0.05" />
            
            <!-- STYLIZED BIRTHDAY CAKE (Geometric Shapes) -->
            <!-- Cake Base -->
            <rect x="450" y="320" width="300" height="120" rx="10" fill="#1e3a5f" />
            <rect x="470" y="240" width="260" height="80" rx="10" fill="#4f46e5" />
            <!-- Frosting / Decoration lines -->
            <rect x="450" y="320" width="300" height="15" fill="#4f46e5" opacity="0.5" />
            <rect x="470" y="240" width="260" height="10" fill="#1e3a5f" opacity="0.3" />
            
            <!-- Candles -->
            <rect x="520" y="190" width="10" height="50" fill="#1e3a5f" />
            <circle cx="525" cy="175" r="8" fill="#eab308" /> <!-- Flame 1 -->
            
            <rect x="595" y="180" width="10" height="60" fill="#4f46e5" />
            <circle cx="600" cy="165" r="10" fill="#ef4444" /> <!-- Flame 2 -->
            
            <rect x="670" y="190" width="10" height="50" fill="#1e3a5f" />
            <circle cx="675" cy="175" r="8" fill="#eab308" /> <!-- Flame 3 -->

            <!-- Festive Confetti & Balloons (Paths for more "real" look) -->
            <!-- Balloon 1 (Left) -->
            <circle cx="200" cy="250" r="70" fill="#1e3a5f" opacity="0.9" />
            <path d="M200 320 Q200 400 180 430" stroke="#4f46e5" stroke-width="4" fill="none" />
            
            <!-- Balloon 2 (Right) -->
            <circle cx="1000" cy="250" r="80" fill="#4f46e5" opacity="0.8" />
            <path d="M1000 330 Q1000 420 1020 450" stroke="#1e3a5f" stroke-width="4" fill="none" />
            
            <!-- Confetti (Brand Colors) -->
            <rect x="350" y="150" width="15" height="5" fill="#eab308" transform="rotate(45 350 150)" />
            <rect x="850" y="150" width="15" height="5" fill="#ef4444" transform="rotate(-30 850 150)" />
            <circle cx="300" cy="500" r="8" fill="#4f46e5" opacity="0.6" />
            <circle cx="900" cy="500" r="10" fill="#1e3a5f" opacity="0.4" />
            <circle cx="600" cy="100" r="6" fill="#3b82f6" />
            
            <!-- Branded Logo Space (Minimalist) -->
            <circle cx="600" cy="565" r="45" fill="#fffdf7" />
            <circle cx="600" cy="565" r="35" fill="#1e3a5f" />
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
