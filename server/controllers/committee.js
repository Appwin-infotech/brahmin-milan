const Activist = require("../models/activist");
const Committee = require("../models/committee");
const Report = require("../models/report");
const SavedProfile = require("../models/savedProfiles");

//create committee profile
const createCommittee = async (req, res) => {
  try {
    const userId = req?.user?._id;

    const {
      committeeTitle,
      presidentName,
      subCaste,
      city,
      area,
      mobileNo,
    } = req?.body;

    if (
      !committeeTitle ||
      !presidentName ||
      !subCaste ||
      !city ||
      !mobileNo
    ) {
      return res.status(400).json({
        status: false,
        message: "Please Enter Required Fields!",
      });
    }

    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNo)) {
      return res.status(400).json({
        status: false,
        message: "Invalid mobile number! Please enter a valid mobile number.",
      });
    }

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
          "Uploading committee data is temporarily disabled as your activist profile access is restricted. Please try again later or contact support.",
      });
    }

    // Handle photo upload via req.files
    let photoUrlPath = null;
    if (req.files?.photoUrl && req.files.photoUrl.length > 0) {
      photoUrlPath = req.files.photoUrl[0].path.replace(/\\/g, "/");
    }

    const newCommitteeProfile = new Committee({
      userId,
      activistId: activistProfile?._id,
      committeeTitle,
      presidentName,
      subCaste,
      city,
      area,
      photoUrl: photoUrlPath,  // Saved file path from multer
      mobileNo,
    });

    await newCommitteeProfile.save();

    return res.status(200).json({
      status: true,
      message: "Committee Profile Created Successfully!",
      data: newCommitteeProfile,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};


const updateCommittee = async (req, res) => {
  try {
    const { committeeId } = req?.params;
    const dataForUpdate = req?.body;

    if (!dataForUpdate) {
      return res.status(400).json({
        status: false,
        message: "Data is required for updating Committee Profile!",
      });
    }

    // Validate mobile number format
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (dataForUpdate.mobileNo && !mobileRegex.test(dataForUpdate.mobileNo)) {
      return res.status(400).json({
        status: false,
        message: "Invalid mobile number. Please enter a valid 10-digit mobile number.",
      });
    }

    // Handle photoUrl upload via multer (req.files.photoUrl)
    if (req.files?.photoUrl && req.files.photoUrl.length > 0) {
      const uploadedPath = req.files.photoUrl[0].path.replace(/\\/g, "/");
      dataForUpdate.photoUrl = uploadedPath;
    }

    // Check if committee profile exists
    const existingCommitteeProfile = await Committee.findById(committeeId);
    if (!existingCommitteeProfile) {
      return res.status(404).json({
        status: false,
        message: "Committee Profile Not Found!",
      });
    }

    // Update committee profile and return the updated document
    const updatedCommittee = await Committee.findByIdAndUpdate(
      committeeId,
      { $set: dataForUpdate },
      { new: true } // Return the updated document
    );

    if (!updatedCommittee) {
      return res.status(400).json({
        status: false,
        message: "No changes were made to the Committee.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Committee profile updated successfully.",
      data: updatedCommittee,  // Return updated document here
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};


//view Committee Profile
const viewCommittee = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const committees = await Committee.find({ userId: userId }).populate(
      "activistId"
    );

    //if Committee Profile is not exists then
    if (!committees || !committees.length) {
      return res
        .status(400)
        .json({ status: false, message: "Committees Not Found!" });
    }

    return res.status(200).json({
      status: true,
      message: "Committee Profiles Data Fetched Successfully.",
      data: committees,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

//getAllCommittee
const getAllCommittee = async (req, res) => {
  try {
    const userId = req?.user?._id || req?.admin?._id;
    // Extract filters from query params
    const { locality, subCaste } = req.query;

    // Prepare filter conditions for committee profiles
    let filterConditions = {
      // userId: { $ne: userId }, // Exclude the logged-in user's profile
    };

    // Apply locality filter (check both area and city)
    if (locality) {
      filterConditions.$or = [
        { city: { $regex: locality, $options: "i" } }, // Match locality with city
        { area: { $regex: locality, $options: "i" } }, // Match locality with area
      ];
    }
    // Apply subCaste filter (case-insensitive search)
    if (subCaste) {
      filterConditions.subCaste = { $regex: `^${subCaste}`, $options: "i" };
      // Case-insensitive search for subCaste
    }

    // Fetch all committee profiles that match the filter conditions
    const committees = await Committee.find(filterConditions)
      .populate("activistId")
      .sort({ createdAt: -1 });

    // if no committee profiles match the filter conditions then
    if (!committees.length) {
      return res
        .status(400)
        .json({ status: false, message: "No Committee profiles available" });
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
    const committeeWithFlag = committees.map((profile) => {
      const isSaved = savedProfilesMap[profile._id.toString()] ? true : false;
      return { ...profile.toObject(), isSaved };
    });

    return res.status(200).json({
      status: true,
      message: "Committee Profiles Data Fetched Successfully.",
      data: committeeWithFlag,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

//delete Committee Profile
const deleteCommitteeProfile = async (req, res) => {
  try {
    const { committeeId } = req?.params;

    const exitsCommittee = await Committee.findOne({ _id: committeeId });

    //if Committee Profile is not exists then
    if (!exitsCommittee) {
      return res
        .status(400)
        .json({ status: false, message: "Committee Profile Not Found!" });
    }

    // Run deletion tasks in parallel using Promise.all
    const deletionPromises = [
      SavedProfile.deleteMany({ saveProfile: exitsCommittee._id }),
      Report.deleteMany({
        profileId: exitsCommittee._id,
        profileType: exitsCommittee.profileType,
      }),
      Committee.deleteOne({ _id: exitsCommittee._id }),
    ];

    const results = await Promise.allSettled(deletionPromises); // Use Promise.allSettled to handle each promise result

    // Collect failed deletions
    const failedDeletions = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (failedDeletions.length > 0) {
      console.error("Some deletions failed:", failedDeletions);
    }

    return res.status(200).json({
      status: true,

      message: "Committee Account Deleted Successfully.",
      data: results.map((result) => result.value),
      failedDeletions,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

module.exports = {
  createCommittee,
  updateCommittee,
  viewCommittee,
  getAllCommittee,
  deleteCommitteeProfile,
};
