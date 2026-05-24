const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ID of Pandit, Jyotish, or Kathavachak
    entityType: { type: String, enum: ['Pandit', 'Jyotish', 'Kathavachak'], required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String },
}, { timestamps: true });

const Rating = mongoose.model('Rating', RatingSchema);
 
module.exports = Rating;