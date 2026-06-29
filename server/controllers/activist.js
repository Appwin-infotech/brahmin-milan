const Activist = require("../models/activist");
const moment = require("moment");
const cloudinary = require("cloudinary").v2;
const ActivistRequest = require("../models/activistRequest");
const User = require("../models/user");
const Biodata = require("../models/biodata");
const Committee = require("../models/committee");
const Dharmshala = require("../models/dharmshala");
const EventPost = require("../models/eventPost");
const SavedProfile = require("../models/savedProfiles");
const Admin = require("../models/admin");
const { sendNotificationToAdmin } = require("../socket/socket.server");
const Notification = require("../models/notification");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

const createActivistProfileRequest = async (req, res) => {
  try {

    const { _id: userId, userId: activistId } = req?.user;
    let {
      fullname,
      subCaste,
      dob,
      state,
      city,
      mobileNo,
      knownActivistId,
      engagedWithCommittee,
    } = req.body;

    // Validate required fields
    if (
      !fullname ||
      !subCaste ||
      !dob ||
      !state ||
      !city ||
      !mobileNo
    ) {
      return res
        .status(400)
        .json({ status: false, message: "Please Enter Required Fields!" });
    }

    // Validate that profilePhoto file is present
    if (!req.files?.profilePhoto) {
      return res.status(400).json({
        status: false,
        message: "Profile Photo is required!",
      });
    }

    // 🔹 Enforce exactly 1 profile photo
    const profilePhotoFiles = Array.isArray(req.files.profilePhoto)
      ? req.files.profilePhoto
      : [req.files.profilePhoto];

    if (profilePhotoFiles.length > 1) {
      return res.status(400).json({
        status: false,
        message: "Only 1 profile photo is allowed.",
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

    // Check if the mobileNo already exists in the ActivistRequest collection
    const existingMobileNoInRequest = await ActivistRequest.findOne({
      mobileNo,
    });
    if (existingMobileNoInRequest) {
      return res.status(400).json({
        status: false,
        message: "Your request for activist profile is pending for Admin approval please wait for sometime.",
      });
    }

    // Check if the mobileNo already exists in the Activist collection
    const existingMobileNo = await Activist.findOne({ mobileNo });
    if (existingMobileNo) {
      return res.status(400).json({
        status: false,
        message: "A Activist Profile already exists with the provided details.",
      });
    }

    // Handle date of birth (dob) if provided
    if (dob) {
      const parsedDob = moment(dob, "DD/MM/YYYY", true); // Strict parsing with moment.js

      if (!parsedDob.isValid()) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid date format for 'dob'. Expected format is DD/MM/YYYY.",
        });
      }

      dob = parsedDob.toDate(); // Convert to JavaScript Date object
    }

    // Validate the knownActivistId - Ensure it matches the pattern 'XX0001' to 'ZZ9999'
    if (knownActivistId) {
      const regex = /^[A-Z]{2}[0-9]{4}$/;
      if (!regex.test(knownActivistId)) {
        return res.status(400).json({
          status: false,
          message: `Invalid knownActivistId: ${knownActivistId}. It should be in the format 'XX0001' to 'ZZ9999'.`,
        });
      }
    }

    if (knownActivistId) {
      const isValidknownActivist = await Activist.findOne({ activistId: knownActivistId });

      if (!isValidknownActivist) {
        return res.status(400).json({ status: false, message: "Invalid KnownActivistId! Activist not Found!" })
      }
    }

    // Check if the user has already registered as an activist
    const existingActivist = await ActivistRequest.findOne({ userId });
    if (existingActivist) {
      return res.status(400).json({
        status: false,
        message: "You have already Registered as Activist!",
      });
    }

    // 🔹 Handle profilePhoto upload via Cloudinary
    const upload = await uploadImageToCloudinary(
      profilePhotoFiles[0],
      process.env.FOLDER_NAME || "activist",
      1200,
      600
    );

    if (!upload?.secure_url) {
      return res.status(500).json({
        status: false,
        message: "Image upload failed.",
      });
    }

    const photoUrlPath = upload.secure_url;

    // Create new ActivistRequest object
    const newActivistRequest = new ActivistRequest({
      userId,
      activistId,
      fullname,
      subCaste,
      dob,

      state,
      city,
      mobileNo,
      knownActivistId, // Directly store the knownActivistIds as an array of objects with activistId strings
      engagedWithCommittee,
      status: "pending",
      profilePhoto: photoUrlPath, // Store the uploaded photo URL
    });

    // Save the new activist request to the database
    await newActivistRequest.save();

    // 1. Send notification to all admins about the request
    const admins = await Admin.find(); // Get all admins

    if (admins.length > 0) {
      const notificationMessage = `${newActivistRequest?.fullname} has requested a Activist profile.`;

      // Loop through each admin and create a notification for them
      for (const admin of admins) {
        sendNotificationToAdmin("activistRequest", admin._id, notificationMessage, newActivistRequest?.profilePhoto, newActivistRequest);
        // Create notification object for each admin
        const notification = new Notification({
          userId: admin._id, // Set the admin's _id as the userId of the notification
          userType: "Admin", // Specify that the notification is for an admin
          notificationType: "activistRequest",
          relatedData: {
            activistRequestId: newActivistRequest?._id,
            requestBy: newActivistRequest?.fullname,
            photoUrl: newActivistRequest?.profilePhoto,
          },
          message: notificationMessage,
          seen: false, // Admin will see it later
        });

        // Save notification for the admin
        await notification.save();
      }
    }

    return res.status(200).json({
      status: true,
      message: "Successfully submitted your Activist profile request for approval.",
      data: newActivistRequest,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

//update Activist profile
const updateActivistProfile = async (req, res) => {
  try {

    const userId = req?.user?._id;
    const dataForUpdate = req.body;
    const { knownActivistId, dob } = dataForUpdate;

    // Ensure there is at least some data to update or a file
    if (Object.keys(dataForUpdate).length === 0 && !req.files?.profilePhoto) {
      return res.status(400).json({
        status: false,
        message: "No data provided for updating the profile!",
      });
    }

    // Validate mobile number format
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (dataForUpdate.mobileNo && !mobileRegex.test(dataForUpdate.mobileNo)) {
      return res.status(400).json({
        status: false,
        message:
          "Invalid mobile number. Please enter a valid 10-digit mobile number.",
      });
    }

    // Validate knownActivistId format
    if (knownActivistId) {
      const regex = /^[A-Z]{2}[0-9]{4}$/;
      if (!regex.test(knownActivistId)) {
        return res.status(400).json({
          status: false,
          message: `Invalid knownActivistId: ${knownActivistId}. It should be in the format 'XX0001' to 'ZZ9999'.`,
        });
      }

      const isValidknownActivist = await Activist.findOne({ activistId: knownActivistId });
      if (!isValidknownActivist) {
        return res.status(400).json({ status: false, message: "Invalid KnownActivistId! Activist not Found!" });
      }
    }

    // Parse DOB if provided
    if (dob) {
      const parsedDob = moment(dob, "DD/MM/YYYY", true);
      if (!parsedDob.isValid()) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid date format for 'dob'. Expected format is DD/MM/YYYY.",
        });
      }
      dataForUpdate.dob = parsedDob.toDate();
    }

    // Check if activist profile exists
    const existingActivist = await Activist.findOne({ userId });
    if (!existingActivist) {
      return res.status(400).json({
        status: false,
        message: "Invalid request! Activist profile not found!",
      });
    }

    // 🔹 Handle profilePhoto upload via Cloudinary (optional, but max 1 if provided)
    if (req.files?.profilePhoto) {
      const files = Array.isArray(req.files.profilePhoto)
        ? req.files.profilePhoto
        : [req.files.profilePhoto];

      if (files.length > 1) {
        return res.status(400).json({
          status: false,
          message: "Only 1 profile photo is allowed.",
        });
      }

      const upload = await uploadImageToCloudinary(
        files[0],
        process.env.FOLDER_NAME || "activist",
        1200,
        600
      );

      if (!upload?.secure_url) {
        return res.status(500).json({
          status: false,
          message: "Image upload failed.",
        });
      }

      dataForUpdate.profilePhoto = upload.secure_url;
    }

    // Perform the update
    const updatedActivist = await Activist.updateOne(
      { userId },
      { $set: dataForUpdate }
    );

    if (updatedActivist.modifiedCount === 0) {
      return res.status(400).json({
        status: false,
        message: "No changes were made to the profile.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Activist profile updated successfully.",
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

const verifyMetrimonialProfile = async (req, res) => {
  try {
    const { _id: userId, role } = req.user; // ✅ extract role from token (e.g. "admin" or "user")
    const { bioDataId } = req.params;

    // ✅ Check if caller is admin or activist
    const isAdmin = role === "admin"; // adjust "admin" to match your actual role value in JWT

    let activistId = null;
    let verifierName = "Admin";

    if (!isAdmin) {
      // ✅ Not admin — must be a valid activist
      const validActivist = await Activist.findOne({ userId });

      if (!validActivist) {
        return res.status(400).json({
          status: false,
          message: "Invalid Action! Please first create Activist Profile!",
        });
      }

      activistId = validActivist._id;
      verifierName = validActivist.fullname;
    }

    // Check if the matrimonial profile exists
    const matrimonialProfile = await Biodata.findOne({ bioDataId });

    if (!matrimonialProfile) {
      return res.status(400).json({
        status: false,
        message: "Matrimonial Profile Not Found!",
      });
    }

    // ✅ If already verified by an activist, only that activist OR admin can unverify
    if (
      matrimonialProfile.verified === true &&
      matrimonialProfile.verifiedBy &&
      !isAdmin
    ) {
      const verifiedById = matrimonialProfile.verifiedBy.toString();
      const callerActivistId = activistId?.toString();

      if (verifiedById !== callerActivistId) {
        return res.status(400).json({
          status: false,
          message: "Only the activist who verified the profile can disapprove it!",
        });
      }
    }

    // ✅ Toggle verify status
    if (matrimonialProfile.verified === false) {
      matrimonialProfile.verified = true;
      // Admin verifiedBy stays null (admins don't have activist profiles)
      matrimonialProfile.verifiedBy = isAdmin ? null : activistId;
      await matrimonialProfile.save();

      return res.status(200).json({
        status: true,
        message: `Matrimonial Profile verified by ${verifierName}!`,
      });
    }

    if (matrimonialProfile.verified === true) {
      matrimonialProfile.verified = false;
      matrimonialProfile.verifiedBy = null;
      await matrimonialProfile.save();

      return res.status(200).json({
        status: true,
        message: `Matrimonial Profile disapproved by ${verifierName}!`,
      });
    }
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

//view Activist Profile
const viewActivist = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const activist = await Activist.findOne({ userId });

    //if Activist Profile is not exists then
    if (!activist) {
      return res
        .status(400)
        .json({ status: false, message: "Activist Profile Not Found!" });
    }

    return res.status(200).json({
      status: true,
      message: "Activist Profile Data Fetched Successfully.",
      data: activist,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

//getAllActivistProfiles
const getAllActivist = async (req, res) => {
  try {
    const userId = req?.user?._id;
    // Extract filters from query params
    const { locality, subCaste } = req.query;

    // Prepare filter conditions for the Pandit profiles
    let filterConditions = {
      // userId: { $ne: userId }, // Exclude the logged-in user's profile
    };

    // Apply locality filter (check both state and city)
    if (locality) {
      filterConditions.$or = [
        { state: { $regex: locality, $options: "i" } }, // Match locality with state
        { city: { $regex: locality, $options: "i" } }, // Match locality with city
      ];
    }
    // Apply subCaste filter (case-insensitive search)
    if (subCaste) {
      filterConditions.subCaste = { $regex: `^${subCaste}`, $options: "i" }; // Case-insensitive search for subCaste
    }

    // Fetch all Pandit profiles that match the filter conditions
    const activists = await Activist.find(filterConditions).sort({
      createdAt: -1,
    });

    // if no Pandit profiles match the filter conditions then
    if (!activists.length) {
      return res
        .status(400)
        .json({ status: false, message: "No Activist profiles available" });
    }

    return res.status(200).json({
      status: true,
      message: "Activist Profiles Data Fetched Successfully.",
      data: activists,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};



const fetchActivistForAdmin = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const { search, locality, gender, status, subCaste, startDate, endDate } =
      req.query;

    let filterConditions = {
      userId: { $ne: userId },
    };

    if (search) {
      filterConditions.$or = [
        { state: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { activistId: { $regex: search, $options: "i" } },
        { fullname: { $regex: search, $options: "i" } },
        { subCaste: { $regex: search, $options: "i" } },
        { mobileNo: { $regex: search, $options: "i" } },
      ];
    }
    if (gender) {
      const usersWithGender = await User.find({ gender }).select("_id");
      const userIds = usersWithGender.map((user) => user._id);
      if (userIds.length) {
        filterConditions.userId = { $in: userIds, $ne: userId };
      }
    }

    // Apply locality filter (check both state and city)
    if (locality) {
      filterConditions.$or = [
        { state: { $regex: locality, $options: "i" } }, // Match locality with state
        { city: { $regex: locality, $options: "i" } }, // Match locality with city
      ];
    }

    if (status !== undefined) {
      const usersWithStatus = await User.find({
        access: status === "true" ? "enable" : "disable",
      }).select("_id");
      const userIdsWithStatus = usersWithStatus.map((user) => user._id);
      if (userIdsWithStatus.length) {
        filterConditions.userId = { $in: userIdsWithStatus, $ne: userId };
      }
    }

    if (subCaste) {
      filterConditions.subCaste = { $regex: subCaste, $options: "i" }
    }

    if (startDate && endDate) {
      filterConditions.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const activists = await Activist.find(filterConditions)
      .populate("userId", "gender")
      .sort({ createdAt: -1 });

    if (!activists.length) {
      return res
        .status(400)
        .json({ status: false, message: "No Activist profiles available" });
    }

    return res.status(200).json({
      status: true,
      message: "Activist Profiles Data Fetched Successfully.",
      data: activists,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

module.exports = {
  createActivistProfileRequest,
  verifyMetrimonialProfile,
  updateActivistProfile,
  getAllActivist,
  viewActivist,
  fetchActivistForAdmin,
};
