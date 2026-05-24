const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    required: false
  },
  adminReply: {
    message: { type: String },
    repliedAt: { type: Date },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
  },
  isReplied: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;
