const mongoose = require("mongoose");

const advertisementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true
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

    // ⏱️ Optional timing fields
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },

    // New field for repeating schedules
    repeatSchedule: {
      type: {
        daysOfWeek: [Number], // 0 = Sunday, 1 = Monday ... 6 = Saturday
        timeSlots: [
          {
            from: String, // e.g., "08:00"
            to: String, // e.g., "10:00"
          },
        ],
      },
      default: null,
    },

    targetProfileTypes: {
      type: [String],
      enum: ["HomePage", "Pandit", "Jyotish", "Kathavachak", "Activist", "Dharmshala", "Committee", "Biodata", "EventPost"],
      required: true,
    },
    section: {
      type: String,
      enum: ["Top", "Bottom"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Advertisement = mongoose.model("Advertisement", advertisementSchema);

module.exports = Advertisement;
