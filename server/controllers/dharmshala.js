const { default: mongoose } = require("mongoose");
const Activist = require("../models/activist");
const Dharmshala = require("../models/dharmshala");
const Report = require("../models/report");
const SavedProfile = require("../models/savedProfiles");
const fs = require("fs");
const path = require("path");
const { BASE_URL } = require("../utils/constants");

const buildImageUrl = (filename) => `${BASE_URL}/uploads/${filename}`;

const deleteLocalImage = (imageUrl) => {
  if (typeof imageUrl !== "string" || !imageUrl.includes("/uploads/")) return;
  const filename = imageUrl.split("/uploads/")[1];
  if (!filename) return;
  const filePath = path.join(__dirname, "..", "uploads", filename);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error(`Failed to delete ${filePath}:`, err.message);
    }
  });
};

//create dharmshala profile
const createDharmshala = async (req, res) => {
  try {
    // Get user id from logged-in User
    const userId = req?.user?._id;

    const { dharmshalaName, subCaste, city, description, mobileNo } = req.body;

    // Validate required fields
    if (!dharmshalaName || !subCaste || !city || !mobileNo) {
      return res.status(400).json({
        status: false,
        message: "Please Enter Required Fields!",
      });
    }

    // Validate mobile number format
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNo)) {
      return res.status(400).json({
        status: false,
        message: "Invalid mobile number! Please enter a valid mobile number.",
      });
    }

    // Check if the User is Activist or not
    const activistProfile = await Activist.findOne({ userId: userId });
    if (!activistProfile) {
      return res.status(400).json({
        status: false,
        message:
          "Not a Valid Activist! Please First Register or Create Activist Profile!",
      });
    }

    if (activistProfile.access === "disable") {
      return res.status(400).json({
        status: false,
        message:
          "Dharmshala upload is temporarily disabled as your activist profile access is restricted. Please try again later or contact support.",
      });
    }

    // Ensure images are uploaded (Multer populates req.files as an array)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Please provide at least one photo!",
      });
    }

    if (req.files.length > 5) {
      // clean up the files Multer already wrote before rejecting the request
      req.files.forEach((f) => fs.unlink(f.path, () => { }));
      return res.status(400).json({
        status: false,
        message: "You can only upload a maximum of 5 images.",
      });
    }

    // 🔹 Build local image URLs from the files Multer already saved to /uploads
    const imagesUrls = req.files.map((file) => buildImageUrl(file.filename));

    // Create new Dharmshala profile
    const newDharmshala = new Dharmshala({
      userId,
      activistId: activistProfile?._id,
      dharmshalaName,
      subCaste,
      city,
      description,
      images: imagesUrls,
      mobileNo,
    });

    await newDharmshala.save();

    return res.status(200).json({
      status: true,
      message: "Dharmshala Created Successfully!",
      data: newDharmshala,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

const updateDharmshala = async (req, res) => {
  try {
    const { dharmshalaId } = req?.params;
    const dataForUpdate = req?.body;

    if (!dataForUpdate) {
      return res.status(400).json({
        status: false,
        message: "Data is required for updating Dharmshala Profile!",
      });
    }

    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (dataForUpdate.mobileNo && !mobileRegex.test(dataForUpdate.mobileNo)) {
      return res.status(400).json({
        status: false,
        message: "Invalid mobile number. Please enter a valid 10-digit mobile number.",
      });
    }

    const existingDharmshalaProfile = await Dharmshala.findById(dharmshalaId);

    if (!existingDharmshalaProfile) {
      return res
        .status(400)
        .json({ status: false, message: "Dharmshala Profile Not Found!" });
    }

    let imagesUrls = existingDharmshalaProfile.images || [];

    // Parse removeImages properly
    let removeImages = req.body.removeImages;
    if (typeof removeImages === 'string') {
      try {
        removeImages = JSON.parse(removeImages);
      } catch (err) {
        return res.status(400).json({
          status: false,
          message: "Invalid format for removeImages. It should be a JSON array of image URLs.",
        });
      }
    }
    if (!Array.isArray(removeImages)) removeImages = [];

    // Remove specified images — and delete the actual local files from disk,
    // since we're now responsible for storage (Cloudinary used to handle this).
    imagesUrls = imagesUrls.filter((imgUrl) => {
      const shouldRemove = removeImages.includes(imgUrl);
      if (shouldRemove) deleteLocalImage(imgUrl);
      return !shouldRemove;
    });

    // 🔹 Build local image URLs from newly uploaded files
    const newUploadedImages = (req.files || []).map((file) => buildImageUrl(file.filename));

    // Replace removed images with new ones
    while (removeImages.length > 0 && newUploadedImages.length > 0) {
      imagesUrls.push(newUploadedImages.shift());
      removeImages.shift();
    }

    // Append remaining new images (limit total to 5)
    imagesUrls = [...imagesUrls, ...newUploadedImages];
    if (imagesUrls.length > 5) {
      // delete files for any images being dropped due to the 5-image cap
      const overflow = imagesUrls.slice(0, imagesUrls.length - 5);
      overflow.forEach(deleteLocalImage);
      imagesUrls = imagesUrls.slice(-5);
    }

    dataForUpdate.images = imagesUrls;

    const updatedDharmshala = await Dharmshala.findByIdAndUpdate(
      dharmshalaId,
      { $set: dataForUpdate },
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: "Dharmshala profile updated successfully.",
      data: updatedDharmshala,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

//view Activist Profile
const viewDharmshala = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const dharmshala = await Dharmshala.find({ userId: userId }).populate(
      "activistId"
    );

    //if Dharmshala Profile is not exists then
    if (!dharmshala) {
      return res
        .status(400)
        .json({ status: false, message: "Dharmshala Profile Not Found!" });
    }

    return res.status(200).json({
      status: true,
      message: "Dharmshala Profiles Data Fetched Successfully.",
      data: dharmshala,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

//getAllDharmshala
const getAllDharmshala = async (req, res) => {
  try {
    const userId = req?.user?._id || req?.admin?._id;
    // Extract filters from query params
    const { locality, subCaste } = req.query;

    // Prepare filter conditions for dharmshala profiles
    let filterConditions = {
      // userId: { $ne: userId }, // Exclude the logged-in user's profile
    };

    // Apply locality filter (check both area and city)
    if (locality) {
      filterConditions.city = { $regex: locality, $options: "i" };
    }

    // Apply subCaste filter (case-insensitive search)
    if (subCaste) {
      filterConditions.subCaste = { $regex: `^${subCaste}`, $options: "i" }; // Case-insensitive search for subCaste
    }

    // Fetch all dharmshala profiles that match the filter conditions
    const dharmshalas = await Dharmshala.find(filterConditions)
      .populate("activistId")
      .sort({ createdAt: -1 });

    // if no dharmshala profiles match the filter conditions then
    if (!dharmshalas.length) {
      return res
        .status(400)
        .json({ status: false, message: "No Dharmshala profiles available" });
    }

    // Step 1: Fetch the saved profiles of the logged-in user
    const savedProfiles = await SavedProfile.find({ userId }).select(
      "saveProfile profileType"
    );

    // Create a map for fast lookup of saved profiles
    const savedProfilesMap = savedProfiles.reduce((map, saved) => {
      const key = saved.saveProfile.toString(); // Use saveProfile as the key
      map[key] = saved.profileType; // Store profileType for each saved profile
      return map;
    }, {});

    // Step 2: Add `isSaved` flag to each profile based on saved profiles
    const dharmshalaWithFlag = dharmshalas.map((profile) => {
      const isSaved = savedProfilesMap[profile._id.toString()] ? true : false;
      return { ...profile.toObject(), isSaved };
    });

    return res.status(200).json({
      status: true,
      message: "Dharmshala Profiles Data Fetched Successfully.",
      data: dharmshalaWithFlag,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

//getDharmshalaById
const getDharmshalaById = async (req, res) => {
  try {

    const userId = req?.user?._id || req?.admin?._id;

    const { dharmshalaId } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(dharmshalaId)) {
      return res.status(400).json({ status: false, message: "Invalid ID" });
    }

    // Find the dharmshala profile by ID
    const dharmshala = await Dharmshala.findById(dharmshalaId).populate("activistId");

    if (!dharmshala) {
      return res.status(400).json({ status: false, message: "Dharmshala not found" });
    }

    // Check if the profile is saved by the user
    const saved = await SavedProfile.findOne({
      userId,
      saveProfile: dharmshalaId,
      profileType: "Dharmshala",
    });

    const dharmshalaWithFlag = {
      ...dharmshala.toObject(),
      isSaved: saved ? true : false,
    };

    return res.status(200).json({
      status: true,
      message: "Dharmshala profile fetched successfully.",
      data: dharmshalaWithFlag,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};


//delete Dharmshala Profile
const deleteDharmshalaProfile = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const { dharmshalaId } = req?.params;

    const exitsDharmshala = await Dharmshala.findOne({ _id: dharmshalaId });

    //if Dharmshala Profile is not exists then
    if (!exitsDharmshala) {
      return res
        .status(400)
        .json({ status: false, message: "Dharmshala Profile Not Found!" });
    }

    // Run deletion tasks in parallel using Promise.all
    const deletionPromises = [
      SavedProfile.deleteMany({ saveProfile: exitsDharmshala._id }),
      Report.deleteMany({
        profileId: exitsDharmshala._id,
        profileType: exitsDharmshala.profileType,
      }),
      Dharmshala.deleteOne({ _id: exitsDharmshala._id }),
    ];

    const results = await Promise.allSettled(deletionPromises); // Use Promise.allSettled to handle each promise result

    // Collect failed deletions
    const failedDeletions = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (failedDeletions.length > 0) {
      console.error("Some deletions failed:", failedDeletions);
    }

    // Clean up local image files now that we own storage
    if (Array.isArray(exitsDharmshala.images)) {
      exitsDharmshala.images.forEach(deleteLocalImage);
    }

    return res.status(200).json({
      status: true,
      message: "Dharmshala Account Deleted Successfully.",
      data: results.map((result) => result.value),
      failedDeletions,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

module.exports = {
  createDharmshala,
  updateDharmshala,
  viewDharmshala,
  getAllDharmshala,
  getDharmshalaById,
  deleteDharmshalaProfile,
};