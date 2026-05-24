const mongoose = require('mongoose');

// Regular expression for validating phone numbers and emails
const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
const phoneNumberRegex = /^[0-9]{10}$/; // Assuming phone number is 10 digits

const advertiseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, 'User ID is required'],
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true, // Trimming extra spaces
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        match: [emailRegex, 'Please enter a valid email address'],
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        match: [phoneNumberRegex, 'Please enter a valid phone number'],
    },
    message: {
        type: String,
        required: false,
        default: '', // Default to an empty string if no message is provided
        maxlength: [500, 'Message should not exceed 500 characters'],
    },
}, { timestamps: true });

// Create model
const Advertise = mongoose.model('Advertise', advertiseSchema);

module.exports = Advertise;
