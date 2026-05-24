const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { duration } = require("moment");

const userSchema = new mongoose.Schema({
  mobileNo: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
  },
  dob: {
    type: Date,
    required: false,
  },
  city: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    required: true,
    enum: ["male", "female"], // Ensure gender matches valid values
  },
  password: {
    type: String,
    required: true,
  },
  photoUrl: {
    type: [String],
    required: false
  }, 
  userId: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        // Validate that userId matches the pattern of two letters followed by four digits
        return /^[A-Z]{2}[0-9]{4}$/.test(v);
      },
      message: props => `${props.value} is not a valid userId! It should be in the format 'XX0001' to 'ZZ9999'.`
    }
  },  
  fcmToken: {
    type: String,
  },
  connReqNotification:{
    type: Boolean,
    default: true
  },
  eventPostNotification:{
    type: Boolean,
    default: true
  },
  access: {
    type: String,
    enum: ["enable", "disable"],
    default: "enable"
  },
   // Individual service subscription details
   serviceSubscriptions: [{
    serviceType: {
      type: String,
      enum: ["Pandit", "Kathavachak", "Jyotish", "Biodata"], 
      required: true
    },
    subscriptionType: {
      type: String,
      enum: ["Trial", "Paid"], 
      required: true
    },
    startDate: { type: Date},
    endDate: { type: Date},
    status: {
      type: String,
      enum: ["Pending", "Active", "Expired"],
      default: "Pending"
    },
    trialPeriod: {
      type: Number, // Trial period in days
    },
    duration: {
      type: Number,
      required: false // in months
    }
  }],
  isPandit: { type: Boolean, default: false },
  isKathavachak: { type: Boolean, default: false },
  isJyotish: { type: Boolean, default: false },
  isActivist: { type: Boolean, default: false },
  isMatrimonial: { type: Boolean, default: false },
},
  { timestamps: true } // Enable Timestamps
);

userSchema.methods.jwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn: "10d" });
};

// Create the User model
const User = mongoose.model("User", userSchema);

module.exports = User;
