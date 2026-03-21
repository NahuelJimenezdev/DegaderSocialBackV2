const mongoose = require('mongoose');

const postLikeSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// 🔒 Idempotencia a nivel DB: un usuario solo puede dar un like por post
postLikeSchema.index({ post: 1, usuario: 1 }, { unique: true });

module.exports = mongoose.model('PostLike', postLikeSchema);
