const mongoose = require('mongoose');
const Post = require('../src/models/Post.model');
const PostComment = require('../src/models/PostComment.model');
const logger = require('../src/config/logger');

// Configuración de conexión (Ajustar según .env si es necesario)
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/degadersocial';

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🚀 Iniciando migración de comentarios (Fase 5)...');

    const posts = await Post.find({
      $or: [
        { "comentarios.0": { $exists: true } },
        { "comentariosRecientes.0": { $exists: false } }
      ]
    });

    console.log(`📦 Encontrados ${posts.length} posts para procesar.`);

    for (const post of posts) {
      console.log(`📄 Procesando post: ${post._id}`);

      // 1. Migrar comentarios embebidos a PostComment si no existen
      if (post.comentarios && post.comentarios.length > 0) {
        for (const comm of post.comentarios) {
          const exists = await PostComment.findById(comm._id);
          if (!exists) {
            await PostComment.create({
              _id: comm._id,
              post: post._id,
              usuario: comm.usuario,
              contenido: comm.contenido,
              image: comm.image,
              parentComment: comm.parentComment,
              likesCount: comm.likes ? comm.likes.length : 0,
              createdAt: comm.createdAt || post.createdAt
            });
          }
        }
      }

      // 2. Poblar comentariosRecientes (Snapshots)
      const latestComments = await PostComment.find({ post: post._id })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      post.comentariosRecientes = latestComments.map(c => ({
        _id: c._id,
        usuario: c.usuario,
        contenido: c.contenido,
        image: c.image,
        likesCount: c.likesCount || 0,
        createdAt: c.createdAt
      }));

      // No borramos post.comentarios por seguridad inmediata, pero los snapshots ya estarán listos
      await post.save();
    }

    console.log('✅ Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

migrate();
