const mongoose = require("mongoose");

const successStoryRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    groomName: { type: String, required: true, trim: true },
    groomBiodataId: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          // Validate that userId matches the pattern of two letters followed by four digits
          return /^[A-Z]{2}[0-9]{4}$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid bioDataId! It should be in the format 'XX0001' to 'ZZ9999'.`,
      },
    },
    brideName: { type: String, required: true, trim: true },
    brideBiodataId: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          // Validate that userId matches the pattern of two letters followed by four digits
          return /^[A-Z]{2}[0-9]{4}$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid bioDataId! It should be in the format 'XX0001' to 'ZZ9999'.`,
      },
    },
    thought: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    photoUrl: { type: String, required: false },
    weddingDate: { type: Date, required: false },
    groomDetails: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      bioDataId: { type: String },
      name: { type: String },
      profileImage: { type: String },
      contactNo: { type: String },
    },
    brideDetails: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      bioDataId: { type: String },
      name: { type: String },
      profileImage: { type: String },
      contactNo: { type: String },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const SuccessStoryRequest = mongoose.model(
  "SuccessStoryRequest",
  successStoryRequestSchema
);
module.exports = SuccessStoryRequest;
