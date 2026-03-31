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
            return res.redirect(`https://${frontDomain}/post/${id}`);
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
    <meta http-equiv="refresh" content="0;url=https://degadersocial.com/post/${id}">
</head>
<body>
    <script>window.location.href = "https://degadersocial.com/post/${id}";</script>
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
            logger.warn(`⚠️ [SHARE_IMAGE] Image request for non-existent post: ${id}`);
            return res.redirect('https://degadersocial.com/assets/logo.png');
        }

        const titleText = post.metadatos?.title || '¡Feliz Cumpleaños!';
        
        const svgImage = `
        <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#fffdf7"/>
            <circle cx="100" cy="500" r="60" fill="#3b82f6" opacity="0.6" />
            <circle cx="200" cy="550" r="50" fill="#eab308" opacity="0.6" />
            <circle cx="1050" cy="150" r="80" fill="#ef4444" opacity="0.6" />
            <circle cx="1150" cy="100" r="40" fill="#ec4899" opacity="0.6" />
            <circle cx="50" cy="100" r="70" fill="#8b5cf6" opacity="0.5" />
            <text x="50%" y="45%" text-anchor="middle" font-family="sans-serif" font-size="70" font-weight="bold" fill="#0f172a">${titleText}</text>
            <text x="50%" y="60%" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#475569">Degader Social - Tarjeta de Cumpleaños</text>
        </svg>`;

        const imageBuffer = await sharp(Buffer.from(svgImage))
            .jpeg({ quality: 90 })
            .toBuffer();

        res.set('Content-Type', 'image/jpeg');
        return res.send(imageBuffer);

    } catch (error) {
        logger.error('❌ [SHARE_IMAGE] Error:', error.message);
        res.status(500).send('Error');
    }
});

module.exports = router;
