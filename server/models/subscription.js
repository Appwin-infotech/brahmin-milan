const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'SubscriptionPlan',
  required: true
},
  service: { 
    serviceType: {
      type: String,
      required: true,
      enum: ['Pandit', 'Kathavachak', 'Jyotish', 'Biodata']
    },
    amount: {
      type: Number,
      required: true
    },
    duration: {
      type: Number,
      required: true // in months
    },
    isTrial: {
      type: Boolean,
      default: false
    },
    trialPeriod: {
      type: Number,
      default: 0 // in days
    },
    status: {
      type: String,
      enum: ['Pending', 'Active', 'Expired','WaitingForApproval'],
      default: 'Pending'
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    }
  },
  discountApplied: {
    type: Number,
    default: 0
  },
  promocode: {
    type: String
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  paymentDetails: {
    razorpay_payment_id: { type: String },
    razorpay_order_id: { type: String },
    razorpay_signature: { type: String }
  },
  paymentDate: {
    type: Date
  },
  associatedUser:{
     type:Boolean,
     required:true,
     default:false
  }
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', SubscriptionSchema);
module.exports = Subscription;
