const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // Make sure to import jwt

const JyotishSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  mobileNo: { type: String, required: true, unique: true },
  residentialAddress: { type: String, required: false },
  area: { type: String, required: false },
  experience: {
    type: String,  // Changed to String to handle range values like '1-3', '5+', etc.
    required: false,
  },
  state: { type: String, required: true },
  city: { type: String, required: true },
  jyotishServices: { type: [String], required: true },
  profilePhoto: { type: String, required: false },
  additionalPhotos: { type: [String], validate: [arrayLimit, 'Cannot exceed 5 photos'] },
  ratings: { type: [mongoose.Schema.Types.ObjectId], ref: 'Rating', default: [] }, // Linked Ratings
  repostCount: { type: Number, default: 0 }, // Feed repost count
  isEnabled: { type: Boolean, default: true },
  jyotishId: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        // Validate that userId matches the pattern of two letters followed by four digits
        return /^[A-Z]{2}[0-9]{4}$/.test(v);
      },
      message: props => `${props.value} is not a valid jyotishId! It should be in the format 'XX0001' to 'ZZ9999'.`
    }
  },
  //profileType
  profileType: {
    type: String,
    default: "Jyotish"
  },
  // websiteUrl
  websiteUrl: {
    type: String,
    required: false,
  },
  // Facebook URL validation
  facebookUrl: {
    type: String,
    required: false,
  },
  youtubeUrl: {
    type: String,
    required: false,
  },
  instagramUrl: {
    type: String,
    required: false,
  },
  whatsapp: {
    type: String,
    required: false,
  },
  description: { type: String, required: false },
}, { timestamps: true });

function arrayLimit(val) {
  return val.length <= 5;
}

// Add JWT Token Method to Biodata Schema
JyotishSchema.methods.jwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn: "10d" });
};

const Jyotish = mongoose.model('Jyotish', JyotishSchema);

module.exports = Jyotish;