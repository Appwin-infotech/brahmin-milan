const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    profileId: { type: mongoose.Schema.Types.ObjectId, refPath: 'profileType',required:true},//type of profile like "pandit","kathavachak","jyotish" and etc..
    profileType: { type:String, required:true, enum: ["Pandit", "Kathavachak", "Jyotish","Biodata"]},
    reportReason: { type: String, required: true },
    additionalDetails: { type: String, required: false },
    reportDate: { type: Date, default: Date.now },
},{timestamps: true});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;