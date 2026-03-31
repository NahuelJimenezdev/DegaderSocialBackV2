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

        // DESIGN: "SQUARE PREMIUM BALLOON CARD" (1000x1000 Optimized for WhatsApp)
        const svgImage = `
        <svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <!-- Pattern for the golden balloon -->
                <pattern id="dots" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
                    <circle cx="7" cy="7" r="2.5" fill="#ffffff" opacity="0.5"/>
                </pattern>
                <!-- Shadow for balloons -->
                <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
                    <feOffset dx="6" dy="6" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.4"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            <!-- Background institutional cream -->
            <rect width="1000" height="1000" fill="#fdfcf0"/>
            
            <!-- Confetti Scattered in Square Area -->
            <circle cx="150" cy="150" r="10" fill="#ff85a2" />
            <circle cx="850" cy="100" r="8" fill="#1e3a5f" />
            <circle cx="900" cy="850" r="12" fill="#eab308" />
            <circle cx="100" cy="900" r="10" fill="#4f46e5" />
            <circle cx="500" cy="50" r="6" fill="#ff85a2" />

            <!-- PINK BALLOON (Upper Left) -->
            <g filter="url(#shadow)">
                <ellipse cx="220" cy="220" rx="100" ry="120" fill="#ff85a2" />
                <ellipse cx="220" cy="220" rx="100" ry="120" fill="url(#dots)" />
                <path d="M220 340 Q220 450 180 500" stroke="#1e3a5f" stroke-width="3" fill="none" opacity="0.2"/>
            </g>

            <!-- GOLDEN BALLOON (Upper Right) -->
            <g filter="url(#shadow)">
                <ellipse cx="780" cy="220" rx="100" ry="120" fill="#eab308" />
                <ellipse cx="780" cy="220" rx="100" ry="120" fill="url(#dots)" />
                <path d="M780 340 Q780 450 820 500" stroke="#1e3a5f" stroke-width="3" fill="none" opacity="0.2"/>
            </g>

            <!-- BLUE BALLOON (Lower Right) -->
            <g filter="url(#shadow)">
                <ellipse cx="800" cy="780" rx="100" ry="120" fill="#4a9eff" />
                <path d="M800 900 Q800 950 820 1000" stroke="#1e3a5f" stroke-width="3" fill="none" opacity="0.2"/>
            </g>

            <!-- DARK BALLOON (Lower Left) -->
            <g filter="url(#shadow)">
                <ellipse cx="200" cy="780" rx="100" ry="120" fill="#1e3a5f" />
                <ellipse cx="200" cy="780" rx="100" ry="120" fill="url(#dots)" opacity="0.2" />
                <path d="M200 900 Q200 950 180 1000" stroke="#1e3a5f" stroke-width="3" fill="none" opacity="0.2"/>
            </g>

            <!-- CENTER MESSAGE AREA (Always visible in square crop) -->
            <text x="500" y="440" text-anchor="middle" font-family="DejaVu Sans, Liberation Serif, serif" font-size="70" font-weight="900" letter-spacing="10" fill="#1e3a5f">HAPPY</text>
            <text x="500" y="560" text-anchor="middle" font-family="DejaVu Sans, Liberation Serif, serif" font-size="110" font-style="italic" fill="#1e3a5f">Birthday</text>
            
            <rect x="300" y="620" width="400" height="3" fill="#1e3a5f" opacity="0.1" />
            <text x="500" y="680" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="24" font-weight="bold" fill="#6b7280" letter-spacing="3">DEGADER SOCIAL</text>
            
            <circle cx="500" cy="150" r="15" fill="#4f46e5" opacity="0.3" />
            <circle cx="500" cy="850" r="20" fill="#1e3a5f" opacity="0.2" />
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
