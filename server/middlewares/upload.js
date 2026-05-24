const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Multer storage using Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: process.env.FOLDER_NAME || "upload", // Folder name in Cloudinary
    allowed_formats: ["jpeg", "png", "jpg"], // Allow specific formats
  },
});

const upload = multer({ storage });

module.exports = upload;