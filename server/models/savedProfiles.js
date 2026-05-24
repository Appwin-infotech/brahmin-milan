const mongoose = require("mongoose");

const savedProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference to the User model
    required: true,
  },
  saveProfile: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'profileType',  // Dynamically reference the profile type
  },
  profileType: {
    type: String,
    required: true,  // Specify the type of profile (e.g., pandit, jyotish, kathavachak etc.)
  },
  savedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const SavedProfile = mongoose.model("SavedProfile", savedProfileSchema);

module.exports = SavedProfile;
