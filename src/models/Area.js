const { Schema, model } = require('mongoose');

const areaSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  descripcion: {
    type: String,
    maxlength: 1000
  },
  responsable: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  miembros: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  color: {
    type: String,
    default: '#3b82f6'
  },
  icono: {
    type: String
  },
  activa: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = model('Area', areaSchema);
