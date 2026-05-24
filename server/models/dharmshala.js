const mongoose = require('mongoose');

const dharmshalaSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, ref: "User", required: true
    },
    activistId: { type: mongoose.Schema.Types.ObjectId, ref: "Activist", required: true },
    dharmshalaName: {
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
    mobileNo: {
        type: String,
        required: true,
        unique: false,
    },
    description: {
        type: String,
    },
    images: {
        type: [String],
        validate: {
            validator: function (v) {
                return Array.isArray(v) && v.length > 0 && v.length <= 4;
            },
            message: 'You must upload between 1 and 3 images.'
        },
        required: true
    },
    profileType: {
        type: String,
        default: "Dharmshala"
    }
}, { timestamps: true });

const Dharmshala = mongoose.model('Dharmshala', dharmshalaSchema);

module.exports = Dharmshala;