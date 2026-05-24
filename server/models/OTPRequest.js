const mongoose = require('mongoose');

const otpRequestSchema = new mongoose.Schema({
  mobileNo: {
    type: String,
    required: true,
    unique: true,
  },
  otp: {
    type: String,
    required: true,
  },
  otpExpires: {
    type: Date,
    required: true,
  }
});

otpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTPRequest = mongoose.model('OTPRequest', otpRequestSchema);

module.exports = OTPRequest;
