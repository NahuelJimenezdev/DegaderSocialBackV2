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

        // DESIGN: "PREMIUM BALLOON FESTIVAL" (Inspired by top-left reference)
        const svgImage = `
        <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <!-- Pattern for the golden balloon -->
                <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="3" fill="#ffffff" opacity="0.5"/>
                </pattern>
                <!-- Shadow for balloons -->
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="5"/>
                    <feOffset dx="4" dy="4" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.3"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            <!-- Background institutional cream -->
            <rect width="100%" height="100%" fill="#fdfcf0"/>
            
            <!-- Confetti Scattered -->
            <circle cx="100" cy="100" r="8" fill="#ff85a2" />
            <circle cx="300" cy="50" r="6" fill="#1e3a5f" />
            <circle cx="1000" cy="100" r="10" fill="#eab308" />
            <circle cx="900" cy="550" r="8" fill="#ff85a2" />
            <circle cx="200" cy="580" r="6" fill="#4f46e5" />

            <!-- PINK GLITTER BALLOON (Top Left) -->
            <g filter="url(#shadow)">
                <ellipse cx="200" cy="180" rx="90" ry="110" fill="#ff85a2" />
                <ellipse cx="200" cy="180" rx="90" ry="110" fill="url(#dots)" />
                <path d="M200 290 Q200 350 180 400" stroke="#1e3a5f" stroke-width="2" fill="none" opacity="0.3"/>
            </g>

            <!-- GOLDEN DOT BALLOON (Bottom Right) -->
            <g filter="url(#shadow)">
                <ellipse cx="1000" cy="450" rx="100" ry="120" fill="#eab308" />
                <ellipse cx="1000" cy="450" rx="100" ry="120" fill="url(#dots)" />
                <path d="M1000 570 Q1000 600 980 630" stroke="#1e3a5f" stroke-width="2" fill="none" opacity="0.3"/>
            </g>

            <!-- BLUE SOLID BALLOON (Top Right) -->
            <g filter="url(#shadow)">
                <ellipse cx="1050" cy="150" rx="80" ry="100" fill="#4a9eff" />
                <path d="M1050 250 Q1050 300 1070 350" stroke="#1e3a5f" stroke-width="2" fill="none" opacity="0.3"/>
            </g>

            <!-- BLACK LUXURY BALLOON (Left Edge) -->
            <g filter="url(#shadow)">
                <ellipse cx="40" cy="400" rx="80" ry="100" fill="#1e3a5f" />
                <ellipse cx="40" cy="400" rx="80" ry="100" fill="url(#dots)" opacity="0.2" />
            </g>

            <!-- CENTER MESSAGE AREA -->
            <!-- We will try text rendering one more time but with 10 fallbacks. 
                 If fonts fail, the balloons alone are a strong design. -->
            <text x="50%" y="42%" text-anchor="middle" font-family="DejaVu Sans, Liberation Serif, serif" font-size="65" font-weight="900" letter-spacing="8" fill="#1e3a5f">HAPPY</text>
            <text x="50%" y="54%" text-anchor="middle" font-family="DejaVu Sans, Liberation Serif, serif" font-size="95" font-style="italic" fill="#1e3a5f">Birthday</text>
            
            <rect x="350" y="580" width="500" height="2" fill="#1e3a5f" opacity="0.1" />
            <text x="50%" y="615" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="20" fill="#6b7280" letter-spacing="2">DEGADER SOCIAL SPECIAL CARD</text>
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
