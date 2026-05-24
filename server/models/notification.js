const mongoose = require("mongoose");
const { Schema } = mongoose;

// General Notification Schema with Mixed type for relatedData
const notificationSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "userType",
      required: true,
    },
    userType: {
      type: String,
      required: true,
      enum: ["User", "Admin"], // Can be 'User' or 'Admin' based on who is triggering the notification
    },
    notificationType: {
      type: String,
      required: true,
      enum: [
        "general",
        "like",
        "comment",
        "connectionRequest",
        "connectionRequestResponse",
        "biodataCreated",
        "eventPostCreated",
        "activistRequest",
        "panditCreated",
        "kathavachakCreated",
        "jyotishCreated",
        "kathavachakApproved",
        "jyotishApproved",
        "activistApproved",
        "panditRejected",
        "jyotishRejected",
        "kathavachakRejected",
        "activistRejected",
        "successStoryRequest",
        "successStoryApproved",
        "successStoryRejected",
        "respondOnFeedBackByAdmin"
      ],
    },
    relatedData: {
      type: Schema.Types.Mixed, // Use Mixed type to allow arbitrary data
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    seen: { type: Boolean, default: false },
    seenAt: { type: Date }, // Timestamp to track when the notification was marked as seen
    expiresAt: { type: Date }, // Timestamp when notification should expire
    message: {
      type: String,
      required: true, // This can be a dynamic message based on notification type
    },
  },
  { timestamps: true }
);

// Create a TTL index on the expiresAt field
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create and export the notification model
const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
