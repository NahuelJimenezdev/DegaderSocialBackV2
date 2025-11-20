const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
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
    enum: ['administrative', 'training', 'community', 'personal'],
    default: 'personal',
  },
  status: {
    type: String,
    enum: ['upcoming', 'in-progress', 'completed', 'cancelled'],
    default: 'upcoming',
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
}, {
  timestamps: true,
});

MeetingSchema.index({ date: 1, type: 1 });

module.exports = mongoose.model('Meeting', MeetingSchema);
