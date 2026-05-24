const mongoose = require("mongoose");

const SubscriptionPlanSchema = new mongoose.Schema({
    profileType: {
        type: String,
        enum: ["Biodata", "Pandit", "Kathavachak", "Jyotish"], // Predefined plans
        required: true
    },
    trialPeriod: {
        type: Number, // Trial period in days
        required: true
    },
    duration: {
        type: Number, // Subscription duration in months
        required: true
    },
    amount: {
        type: Number, // Price of the plan
        required: true
    },
    description: {
        type: String, // Description of the plan
        required: true
    },
    photoUrl: {
        type: String,
        required: true
    }
}, { timestamps: true });

const SubscriptionPlan = mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);

module.exports = SubscriptionPlan;