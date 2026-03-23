const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  deviceId: {
    type: String,
    index: true // Para identificar el dispositivo físico
  },
  isPWA: {
    type: Boolean,
    default: false
  },
  platform: {
    type: String,
    enum: ['web', 'android', 'ios'],
    default: 'web'
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice para limpieza rápida de tokens antiguos
deviceTokenSchema.index({ lastUsedAt: 1 });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
