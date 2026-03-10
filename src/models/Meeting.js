const mongoose = require('mongoose');

const attendanceRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending',
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  }
}, { _id: false });

const MeetingSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2',
    required: true,
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null,
  },
  iglesia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Iglesia',
    default: null,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  date: {
    type: Date,
    required: true,
  },
  time: String,
  duration: String,
  meetLink: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      // Nuevos tipos globales
      'publica', 'privado', 'grupal',
      // Tipos de iglesia
      'administrative', 'training', 'community', 'oracion',
      'estudio_biblico', 'culto', 'escuela_dominical', 'personal',
    ],
    default: 'publica',
  },
  // Visibilidad derivada del tipo
  visibility: {
    type: String,
    enum: ['public', 'private', 'group'],
    default: 'public',
  },
  status: {
    type: String,
    enum: ['upcoming', 'in-progress', 'completed', 'cancelled'],
    default: 'upcoming',
  },
  targetMinistry: {
    type: String,
    default: 'todos',
  },
  // Usuarios confirmados/aprobados (pueden Unirse)
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  // Usuarios invitados por el creador (reciben notificación, deben pedir "Asistiré")
  invitedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserV2'
  }],
  // Solicitudes de asistencia (pendiente / aprobado / denegado)
  attendanceRequests: [attendanceRequestSchema],
  startsAt: {
    type: Date,
    required: true,
  },
  timezone: {
    type: String,
    required: true,
    default: 'UTC'
  }
}, {
  timestamps: true,
});

MeetingSchema.index({ startsAt: 1 });
MeetingSchema.index({ date: 1, type: 1 });
MeetingSchema.index({ creator: 1 });
MeetingSchema.index({ group: 1 });

module.exports = mongoose.model('Meeting', MeetingSchema);
