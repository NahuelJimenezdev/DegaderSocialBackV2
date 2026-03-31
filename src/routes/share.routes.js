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
        const { id } = req.params;
        const userAgent = req.headers['user-agent'] || '';
        
        // Detect if it's a crawler (WhatsApp, Facebook, Twitter, etc.)
        const isCrawler = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|bingbot|Googlebot|Discordbot/i.test(userAgent);

        // Fetch post and populate author
        const post = await Post.findById(id).populate('usuario', 'nombres apellidos username social.fotoPerfil');

        if (!post) {
            return res.redirect('https://degadersocial.com');
        }

        // If it's a REAL user (not a bot), redirect to the actual React app
        if (!isCrawler) {
            return res.redirect(`https://degadersocial.com/post/${id}`);
        }

        // --- SEO DATA FOR BOT ---
        const authorName = post.usuario ? `${post.usuario.nombres.primero} ${post.usuario.apellidos.primero}` : 'Alguien';
        let ogTitle = 'Publicación en Degader Social';
        let ogDesc = post.contenido ? post.contenido.substring(0, 150) : 'Echa un vistazo a este post en Degader Social.';
        let ogImage = `https://degadersocial.com/assets/logo.png`; // Fallback image

        if (post.tipo === 'cumpleaños') {
            const birthdayTitle = post.metadatos?.title || '¡Feliz Cumpleaños!';
            ogTitle = `${birthdayTitle} 🎈`;
            ogDesc = `Mira la tarjeta especial enviada para este cumpleaños en Degader Social.`;
            // Dynamic image endpoint
            ogImage = `https://api.degadersocial.com/api/share/post/${id}/image`;
        } else if (post.images && post.images.length > 0) {
            ogImage = post.images[0];
        } else if (post.imagen) {
            ogImage = `https://degadersocial.com${post.imagen}`;
        }

        // --- SERVE MINI-HTML WITH OG TAGS ---
        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${ogTitle}</title>
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://degadersocial.com/post/${id}">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDesc}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Degader Social">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://degadersocial.com/post/${id}">
    <meta property="twitter:title" content="${ogTitle}">
    <meta property="twitter:description" content="${ogDesc}">
    <meta property="twitter:image" content="${ogImage}">

    <meta http-equiv="refresh" content="1;url=https://degadersocial.com/post/${id}">
</head>
<body>
    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>Redirigiendo a Degader Social...</h2>
        <p>Si no eres redirigido automáticamente, <a href="https://degadersocial.com/post/${id}">haz clic aquí</a>.</p>
    </div>
    <script>window.location.href = "https://degadersocial.com/post/${id}";</script>
</body>
</html>
        `;

        res.set('Content-Type', 'text/html');
        return res.send(html);

    } catch (error) {
        logger.error('❌ [SHARE_ROUTE] Error processing share metadata:', error.message);
        return res.redirect('https://degadersocial.com');
    }
});

/**
 * Route: GET /api/share/post/:id/image
 * Purpose: Generates a 1200x630 image with festive balloons and the post title.
 */
router.get('/post/:id/image', async (req, res) => {
    try {
        const { id } = req.params;
        const sharp = require('sharp');
        const post = await Post.findById(id);

        if (!post || post.tipo !== 'cumpleaños') {
            // Default image if not a birthday post
            return res.sendFile(path.join(__dirname, '../../uploads/logo.png'), (err) => {
                if (err) res.status(404).send('Image not found');
            });
        }

        const titleText = post.metadatos?.title || '¡Feliz Cumpleaños!';
        
        // SVG Design for the Birthday Card
        const svgImage = `
        <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#fffdf7"/>
            
            <!-- Balloons Decorations -->
            <circle cx="100" cy="500" r="60" fill="#3b82f6" opacity="0.6" />
            <circle cx="200" cy="550" r="50" fill="#eab308" opacity="0.6" />
            <circle cx="1050" cy="150" r="80" fill="#ef4444" opacity="0.6" />
            <circle cx="1150" cy="100" r="40" fill="#ec4899" opacity="0.6" />
            <circle cx="50" cy="100" r="70" fill="#8b5cf6" opacity="0.5" />
            
            <!-- Dots Confetti -->
            <circle cx="300" cy="100" r="4" fill="#6366f1" />
            <circle cx="800" cy="500" r="4" fill="#10b981" />
            <circle cx="150" cy="300" r="4" fill="#f59e0b" />
            <circle cx="1000" cy="400" r="4" fill="#f43f5e" />

            <!-- Text Content (SVG Text) -->
            <text x="50%" y="45%" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="70" font-weight="bold" fill="#0f172a">${titleText}</text>
            <text x="50%" y="60%" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#475569">Degader Social - Tarjeta Especial de Cumpleaños</text>
        </svg>
        `;

        const imageBuffer = await sharp(Buffer.from(svgImage))
            .jpeg({ quality: 90 })
            .toBuffer();

        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        return res.send(imageBuffer);

    } catch (error) {
        logger.error('❌ [SHARE_IMAGE_ROUTE] Error generating dynamic image:', error.message);
        res.status(500).send('Error generating image');
    }
});

module.exports = router;
