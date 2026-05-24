const mongoose = require("mongoose");

// Updated Event Schema
const eventPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  activistId: { type: String, ref: "Activist", required: true },
  activistName: { type: String, required: true },
  title: { type: String, required: false },
  description: { type: String, required: true },
  images: {
    type: [String],
    validate: {
      validator: function (v) {
        return Array.isArray(v) && v.length <= 5;
      },
      message: 'You can only upload a maximum of 5 images.'
    },
    required: false
  },
  likes: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [], timestamps: true },
  comments: [
    { user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, comment: String, date: { type: Date, default: Date.now } }
  ],
  shares: [
    { userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: { type: Date, default: Date.now } }
  ]
}, { timestamps: true });

const EventPost = mongoose.model('EventPost', eventPostSchema);

module.exports = EventPost;
