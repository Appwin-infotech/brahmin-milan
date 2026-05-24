const mongoose = require('mongoose');

const defaultAdSchema = new mongoose.Schema({

  targetProfileType: {
    type: String,
    enum: ["HomePage", "Pandit", "Jyotish", "Kathavachak", "Activist", "Dharmshala", "Committee", "Biodata", "EventPost"],
    required: true,
  },
  section: {
    type: String,
    enum: ["Top", "Bottom"],
    required: true,
  },
  media: [
    {
      mediaType: {
        type: String,
        enum: ["image", "video"],
        required: true,
      },
      mediaUrl: {
        type: String,
        required: true,
      },
      resolution: {
        width: Number,
        height: Number,
      },
      duration: {
        type: Number, // in seconds
        default: 5, // default display time for images
      },
      hyperlink: {
        type: String, // Optional: For image click redirection
        default: null,
      },
    },
  ],
}, { timestamps: true });

const DefaultAdvertisementImage = mongoose.model("DefaultAdvertisementImage", defaultAdSchema);

module.exports = DefaultAdvertisementImage;