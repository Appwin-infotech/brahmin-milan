const mongoose = require('mongoose');

const committeeSchema = new mongoose.Schema({
    committeeTitle: {
        type: String,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId, ref: "User", required: true
    },
    activistId: { type: mongoose.Schema.Types.ObjectId, ref: "Activist", required: true },
    presidentName: {
        type: String,
        required: true,
    },
    subCaste: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    area: {
        type: String,
        required: false,
    },
    photoUrl: {
        type: String,
        required: false
    },
    mobileNo: {
        type: String,
        required: true,
        unique: false,
    },
    profileType: {
        type: String,
        default: "Committee"
    },
    hideDetails: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

const Committee = mongoose.model('Committee', committeeSchema);

module.exports = Committee;