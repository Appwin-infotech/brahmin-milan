const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Jyotish = require("../models/jyotish");
const Kathavachak = require("../models/kathavachak");
const Pandit = require("../models/pandit");
const ConnectionRequest = require("../models/connectionRequest");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const Biodata = require("../models/biodata");
const mongoose = require("mongoose");
const { getNextUserId } = require("../utils/getNextUserId");
const { generateOTP, sendOTP } = require("../utils/otpService");
const OTPRequest = require("../models/OTPRequest");
const Rating = require("../models/rating");
const Activist = require("../models/activist");
const SavedProfile = require("../models/savedProfiles");
const Feedback = require("../models/feedback");
const Advertise = require("../models/advertise");
const Dharmshala = require("../models/dharmshala");
const Report = require("../models/report");
const EventPost = require("../models/eventPost");
const Subscription = require("../models/subscription");
const Committee = require("../models/committee");
const KathavachakRequest = require("../models/kathavachakRequest");
const PanditRequest = require("../models/panditRequest");
const JyotishRequest = require("../models/jyotishRequest");
const ActivistRequest = require("../models/activistRequest");
const Notification = require("../models/notification");
const SuccessStory = require("../models/successStory");
const SuccessStoryRequest = require("../models/successStoryRequest");
const { BASE_URL } = require("../utils/constants");
//require data fields
const USER_SAFE_DATA = "username dob mobileNo gender city";
// sign up user
const SignUp = async (req, res) => {
  try {
    const { mobileNo, username, city, gender, password, otp } =
      req.body;

    // Validate required fields
    if (
      !mobileNo ||
      !username ||
      !gender ||
      !city ||
      !password ||
      !otp
    ) {
      return res
        .status(400)
        .send({ status: false, message: "All fields are required." });
    }

    // Validate mobile number format
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNo)) {
      return res.status(400).json({
        status: false,
        message: "Invalid mobile number! Please enter a valid mobile number.",
      });
    }

    // Validate gender
    const validGenders = ["male", "female"];
    if (!validGenders.includes(gender.toLowerCase())) {
      return res
        .status(400)
        .send({ status: false, message: "Invalid gender value." });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ mobileNo });
    if (existingUser) {
      return res.status(400).send({
        status: false,
        message: "User already exists! Please sign in.",
      });
    }

    // Verify OTP
    const userOtpRecord = await OTPRequest.findOne({ mobileNo, otp });
    if (!userOtpRecord || userOtpRecord.otpExpires < Date.now()) {
      return res
        .status(400)
        .send({ status: false, message: "Invalid OTP or OTP expired." });
    }

    // Clear OTP after verification
    await OTPRequest.deleteOne({ mobileNo });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique userId
    const userId = await getNextUserId();

    // Create new user
    const user = new User({
      userId,
      mobileNo,
      username,
      city,
      gender: gender.toLowerCase(),
      password: hashedPassword,
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id, mobileNo: user.mobileNo },
      process.env.JWT_SECRET,
      { expiresIn: "10d" }
    );

    // Set cookie options
    const option = {
      sameSite: "None",
      secure: true,
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
      httpOnly: false,
      expires: new Date(Date.now() + 3600000), // 1 hour
      path: "/",
    };

    const userInfo = {
      token,
      user: {
        id: user._id,
        mobileNo,
        username,
        city,
      },
    };

    if (!userInfo.token || !userInfo.user) {
      throw new Error("User information is incomplete");
    }

    // Set cookie
    res.cookie("userInfo", userInfo, option);
    return res.status(200).send({
      status: true,
      message: "User account created successfully.",
      user: userInfo,
    });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

// sign in user
const SignIn = async (req, res) => {
  const { mobileNo, password } = req.body;

  // Validate required fields
  if (!mobileNo || !password) {
    return res
      .status(400)
      .json({ message: "Mobile number and password are required!" });
  }

  try {
    // Get user by mobileNo
    const user = await User.findOne({ mobileNo }).select("password");
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "User Profile Not Found!" });
    }

    const isValidUser = await bcrypt.compare(password, user.password);
    if (!isValidUser) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid mobile number or password." });
    }

    // Generate token after successful password verification
    const token = jwt.sign(
      { userId: user._id, mobileNo: user.mobileNo }, // payload
      process.env.JWT_SECRET, // secret key for signing the token
      { expiresIn: "10d" } // token expiry time
    );

    // Set cookie options
    const option = {
      sameSite: "None",
      secure: true,
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
      httpOnly: false,
      expires: new Date(Date.now() + 3600000), // 1 hour expiry
      path: "/",
    };

    const userInfo = {
      token,
      user: {
        id: user._id,
        mobileNo,
      },
    };

    if (!userInfo.token || !userInfo.user) {
      throw new Error("User information is incomplete");
    }

    // Set the token in the cookie
    res.cookie("userInfo", userInfo, option);

    // Respond with success and user data
    return res.status(200).json({
      status: true,
      message: "Login successful",
      user: userInfo,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//fetchUserProfiles by taking ref of profileType passed by user in api URL params
const fetchUserProfile = async (req, res) => {
  try {
    const { profileType } = req?.params;
    const { _id: userId } = req?.user; // Extract userId from authenticated user

    // Function to dynamically get the correct model
    const getProfileModel = (profileType) => {
      switch (profileType) {
        case "Pandit":
          return mongoose.model("Pandit");
        case "Kathavachak":
          return mongoose.model("Kathavachak");
        case "Jyotish":
          return mongoose.model("Jyotish");
        case "Biodata":
          return mongoose.model("Biodata");
        case "Activist":
          return mongoose.model("Activist");
        default:
          throw new Error("Invalid profile type");
      }
    };

    // Validate that profileType is provided
    if (!profileType) {
      return res
        .status(400)
        .json({ status: false, message: "Profile type is required!" });
    }

    // Get the correct model based on the profileType
    const ProfileModel = getProfileModel(profileType);

    // Fetch the profile by the userId and populate ratings
    const profileData = await ProfileModel.findOne({ userId }).populate({
      path: "ratings", // Ratings field
      strictPopulate: false, // This disables strict schema checking for population
      select: "-__v", // Exclude the __v field from the populated ratings
      options: {
        sort: { createdAt: -1 }, // Sort ratings by the `createdAt` field in descending order
      },
      populate: {
        path: "userId", // This assumes the Rating model has a reference to 'userId'
        select: "username city photoUrl", // Select fields from the user that you want to include in the populated result
      },
    });

    if (!profileData) {
      return res
        .status(400)
        .json({ status: false, message: "Profile Data not found!" });
    }

    // Calculate the total reviews and average rating with optional chaining
    const totalReviews = profileData?.ratings?.length || 0;
    const averageRating = totalReviews
      ? profileData?.ratings?.reduce((acc, rating) => acc + rating.rating, 0) /
      totalReviews
      : 0;

    // Format response data
    const data = {
      ...profileData?.toObject(),
      totalReviews,
      averageRating: averageRating.toFixed(1), // Round to 1 decimal place
    };

    return res.status(200).json({
      status: true,
      message: `${profileType} profile Details Fetched Successfully.`,
      data: data,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server error", error: error.message });
  }
};

//get user Connections Api
const connections = async (req, res) => {
  try {
    const loggedInUser = req.user;
    const connectionRequest = await ConnectionRequest.find({
      $or: [{ toUserId: loggedInUser._id }, { fromUserId: loggedInUser._id }],
      status: "accepted",
    })
      .populate("fromUserId", USER_SAFE_DATA)
      .populate("toUserId", USER_SAFE_DATA);

    const data = connectionRequest.map((row) => {
      if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return row.toUserId;
      }
      return row.fromUserId;
    });
    if (data.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No Connections Available yet!",
        data: [],
      });
    }
    return res.status(200).json({
      status: true,
      message: "Connections Data Fetched Successfully",
      data: data,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Error While Fetching Connection Request " + err,
    });
  }
};

// view user profile or get loggedInUser Data
const viewProfile = async (req, res) => {
  try {
    const user = req.user; // req.user is set by the verifyToken middleware

    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "User not found." });
    }

    // Exclude the password field from the response
    const { password, ...userWithoutPassword } = user.toObject
      ? user.toObject()
      : user;

    return res.status(200).json({
      status: true,
      message: "User Profile Data Fetched Successfully.",
      data: userWithoutPassword, // Only return non-sensitive fields
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Something went wrong, please try again later.",
    });
  }
};

//to update user Profie
const updateProfile = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const dataForUpdate = req?.body;

    // Invalid fields that cannot be updated
    const invalidRequests = [
      "mobileNo",
      "photoUrl",
      "password",
      "userId",
      "access",
    ];

    // Check if dataForUpdate is present
    if (!dataForUpdate || Object.keys(dataForUpdate).length === 0) {
      return res.status(400).json({
        status: false,
        message: "Data is Required For Updating User Profile!",
      });
    }

    // Check if there are any invalid fields in the request body
    for (let field of invalidRequests) {
      if (dataForUpdate[field]) {
        return res
          .status(400)
          .json({ status: false, message: `${field} cannot be updated.` });
      }
    }

    // Check if the logged-in user profile exists
    const loggedInUser = await User.findById(userId);
    if (!loggedInUser) {
      return res
        .status(400)
        .json({ status: false, message: "User Profile Not Found!" });
    }

    // Update user profile (excluding invalid fields)
    const updatedUser = await User.updateOne(
      { _id: userId },
      { $set: dataForUpdate }
    );

    // Check if the update operation was successful
    if (updatedUser.modifiedCount === 0) {
      return res.status(400).json({
        status: false,
        message: "No changes were made to User Profile.",
      });
    }

    // Return success response
    return res.status(200).json({
      status: true,
      message: "User profile updated successfully.",
    });
  } catch (err) {
    // Handle unexpected errors
    console.error("Error updating profile:", err); // Log the error for debugging
    res.status(500).json({
      status: false,
      status: "failure",
      message: "Server error, please try again later.",
    });
  }
};

const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "No file uploaded!",
        error: "File field is missing",
      });
    }

    const loggedInUser = req.user;
    if (!loggedInUser) {
      return res.status(401).json({ status: false, message: "Unauthorized." });
    }

    // Build relative path to store in DB
    const filePath = `uploads/${req.file.filename}`;

    // Update user's profile image URL
    loggedInUser.photoUrl = filePath;

    await loggedInUser.save();

    return res.status(200).json({
      status: true,
      message: "Profile image updated successfully.",
      data: {
        userId: loggedInUser._id,
        photoUrl: loggedInUser.photoUrl,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

const deleteProfileImage = async (req, res) => {
  try {
    const loggedInUser = req.user; // The authenticated user from verifyToken middleware

    // Ensure the photoUrl exists in the user's array of photos
    const user = await User.findById(loggedInUser._id);

    if (!user) {
      return res.status(400).json({
        status: false,
        message: "User not found!",
      });
    }

    // Check if the photoUrl exists in the user's photoUrl array
    if (!user.photoUrl || !user.photoUrl.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Profile Image not found in your profile!",
      });
    }

    // Remove the image URL from the photoUrl array
    user.photoUrl = [];

    // Save the updated user document
    await user.save();

    return res.status(200).json({
      status: true,
      message: "Profile image deleted successfully.",
      data: {
        userId: user._id,
        photoUrl: user.photoUrl, // Return updated photoUrl array
      },
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Error deleting profile image",
      error: err.message,
    });
  }
};

// get all the matrimonial userProfile and sort them by writing in query like (api/v1/user/feed?gender=female) to show profiles based on gender but if we serch on basis of other data then we use .../feed/searchTerm=input  or male else nothing to show all usersProfile data to show
const feed = async (req, res) => {
  try {

    let limit;
    let skip = 0;
    let page = 1;

    if (req.query.limit) {
      limit = Math.min(Math.max(1, parseInt(req.query.limit)), 50);
      page = Math.max(1, parseInt(req.query.page) || 1);
      skip = (page - 1) * limit;
    }

    const loggedInUser = req.user;

    const loggedInUserBiodata = await Biodata.findOne({
      userId: loggedInUser?._id,
    });

    const connectionRequest = await ConnectionRequest.find({
      $or: [{ toUserId: loggedInUser._id }, { fromUserId: loggedInUser._id }],
    }).select("fromUserId toUserId status");

    // const hideUserFromFeed = new Set();
    // connectionRequest.forEach((req) => {
    //   hideUserFromFeed.add(req.fromUserId.toString());
    //   hideUserFromFeed.add(req.toUserId.toString());
    // });


    // ✅ Create lookup map for connection info
    const connectionMap = {};
    connectionRequest.forEach((req) => {
      const from = req.fromUserId.toString();
      const to = req.toUserId.toString();
      const currentUserId = loggedInUser._id.toString();
      const otherUserId = from === currentUserId ? to : from;

      connectionMap[otherUserId] = {
        requestId: req._id.toString(),
        status: req.status,
        connectionStatus: from === currentUserId ? "sent" : "received",
      };
    });

    const searchTerm = req.query.searchTerm ? req.query.searchTerm.trim() : "";
    const searchGender = {};
    if (req.query.gender) searchGender.gender = req.query.gender;

    const regex = new RegExp(searchTerm, "i");
    const searchQuery = [
      { "personalDetails.fullname": regex },
      { "personalDetails.currentCity": regex },
      { "personalDetails.occupation": regex },
      { "personalDetails.contactNumber1": regex },
      { "personalDetails.contactNumber2": regex },
      { bioDataId: regex },
    ];
    const finalSearchQuery = { $or: searchQuery };

    const sortCriteria = { latestActivityAt: -1 };

    // ✅ Step 1: Get userIds with active Biodata subscription
    const activeBiodataUsers = await User.find({
      serviceSubscriptions: {
        $elemMatch: {
          serviceType: "Biodata",
          status: "Active",
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        },
      },
    }).select("_id");

    const activeUserIds = activeBiodataUsers.map((u) => u._id.toString());

    // ✅ Step 2: Filter biodata based on active subscription users
    const profiles = await Biodata.find({
      $and: [
        searchGender,
        finalSearchQuery,
        loggedInUserBiodata?.gender
          ? {
            gender: loggedInUserBiodata.gender === "male" ? "female" : "male",
          }
          : {},
        { userId: { $ne: loggedInUser._id } },
        { activityStatus: { $ne: "Inactive" } },
        { userId: { $in: activeUserIds } },
      ],
    })
      .skip(skip)
      .limit(limit)
      .sort(sortCriteria);

    if (!profiles || profiles.length === 0) {
      return res.status(200).json({
        status: true,
        message: "No profiles found matching your search",
        feedUsers: [],
      });
    }

    const savedProfiles = await SavedProfile.find({
      userId: loggedInUser._id,
    }).select("saveProfile profileType");

    const savedProfilesMap = savedProfiles.reduce((map, saved) => {
      map[saved.saveProfile.toString()] = saved.profileType;
      return map;
    }, {});

    // ✅ Build final feed with additional connection info
    const feedWithFlag = profiles.map((profile) => {
      const profileUserId = profile.userId.toString();
      const isSaved = !!savedProfilesMap[profile._id.toString()];
      const connectionInfo = connectionMap[profileUserId] || {};

      return {
        ...profile.toObject(),
        isSaved,
        connectionStatus: connectionInfo.connectionStatus || "none",
        status: connectionInfo.status || null,
        requestId: connectionInfo.requestId || null,
      };
    });

    return res.status(200).json({
      status: true,
      message: "Feed Data fetched successfully",
      feedUsers: feedWithFlag,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: `Error fetching feed data: ${err.message}`,
    });
  }
};

// get matrimonialProfile data by user Id
const matchMatrimonialProfile = async (req, res) => {
  try {
    const loggedInUser = req.user;
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user ID format" });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "User not found!" });
    }

    const loggedInUserBiodata = await Biodata.findOne({
      userId: loggedInUser._id,
    });
    if (!loggedInUserBiodata) {
      return res.status(400).json({
        status: false,
        message:
          "You haven't set up your biodata yet. Please complete your biodata profile to proceed.",
      });
    }

    // Check if biodata is deactivated by Brahmin Milan Team
    if (loggedInUserBiodata.activityStatus === "Inactive") {
      return res.status(400).json({
        status: false,
        message:
          "Your biodata has been deactivated by the Brahmin Milan Team. Please contact the support team for assistance or reactivation.",
      });
    }

    const userBiodata = await Biodata.findOne({ userId: userId });
    if (!userBiodata?.personalDetails) {
      return res.status(400).json({
        status: false,
        message: "Target user has not set any biodata or personal details.",
      });
    }

    if (loggedInUserBiodata.gender === userBiodata.gender) {
      return res.status(200).json({
        status: true,
        message: "Both users have the same gender, comparison not possible.",
        data: user,
        loggedInUserBiodata,
        targetUserBioData: userBiodata,
        comparisonResults: {},
        isSaved: false,
        requestStatus: null,
        requestId: null,
      });
    }

    // ✅ Check if the target user's profile is saved by the logged-in user
    const savedProfile = await SavedProfile.findOne({
      userId: loggedInUser._id,
      saveProfile: userBiodata._id,
    });

    const isSaved = !!savedProfile;

    // ✅ Check if a connection request exists between loggedInUser and target user
    const existingRequest = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: loggedInUser._id, toUserId: userId },
        { fromUserId: userId, toUserId: loggedInUser._id },
      ],
    });

    const connectionStatus = existingRequest
      ? existingRequest.fromUserId.toString() === loggedInUser._id.toString()
        ? "sent"
        : "received"
      : "none";

    const requestStatus = existingRequest?.status || null;
    const requestId = existingRequest?._id || null;

    // ✅ If no preferences are set
    if (!loggedInUserBiodata.partnerPreferences) {
      return res.status(200).json({
        status: true,
        message: "Partner preferences not set by logged-in user.",
        data: user,
        loggedInUserBiodata,
        targetUserBioData: userBiodata,
        comparisonResults: {},
        isSaved,
        requestStatus,
        isVisible: requestStatus === "accepted" ? true : false,
        requestId,
      });
    }

    // 🔍 Comparison helpers
    const compareField = (prefValue, targetValue) => {
      if (
        typeof prefValue === "string" &&
        prefValue.replace(/[‘’]/g, "'").trim().toLowerCase() ===
        "doesn't matter"
      ) {
        return true;
      }

      if (prefValue === undefined || prefValue === null || prefValue === "") {
        return false;
      }

      if (typeof prefValue === "string" && typeof targetValue === "string") {
        return (
          prefValue.trim().toLowerCase() === targetValue.trim().toLowerCase()
        );
      }

      return prefValue === targetValue;
    };

    const compareRange = (value, min, max) => {
      const normalize = (val) =>
        typeof val === "string" ? val.replace(/[‘’]/g, "'").trim() : val;

      min = normalize(min);
      max = normalize(max);

      if (min === "Doesn't Matter" || max === "Doesn't Matter") return true;

      if (
        min === undefined ||
        max === undefined ||
        min === null ||
        max === null ||
        min === "" ||
        max === ""
      ) {
        return false;
      }

      return value >= parseInt(min) && value <= parseInt(max);
    };

    //compareLocation
    const compareLocation = (prefCity, targetCity) => {
      if (
        typeof prefCity === "string" &&
        (prefCity.trim().toLowerCase() === "doesn't matter" ||
          prefCity.trim() === "")
      ) {
        return true;
      }

      if (!prefCity || !targetCity) return false;

      return prefCity.trim().toLowerCase() === targetCity.trim().toLowerCase();
    };

    const parseHeightToInches = (heightStr) => {
      if (!heightStr || typeof heightStr !== 'string') return null;

      const cleaned = heightStr.replace(/[‘’]/g, "'").trim(); // Normalize quotes
      const match = cleaned.match(/(\d+)'[\s]*([\d]*)/); // Extract feet and inches

      if (!match) return null;

      const feet = parseInt(match[1], 10);
      const inches = match[2] ? parseInt(match[2], 10) : 0;

      return feet * 12 + inches;
    };

    const compareHeightStrict = (valueStr, minStr, maxStr) => {
      const value = parseHeightToInches(valueStr);
      const min = parseHeightToInches(minStr);
      const max = parseHeightToInches(maxStr);

      if (minStr === "Doesn't Matter" || maxStr === "Doesn't Matter") return true;

      if (value === null || min === null || max === null) return false;

      return value >= min && value <= max;
    };

    const parseCustomIncomeRange = (incomeStr) => {
      if (!incomeStr || typeof incomeStr !== "string") return null;

      const normalized = incomeStr.toLowerCase().trim();

      if (normalized.includes("no income")) {
        return { min: 0, max: 0 };
      }

      if (normalized.includes("less than 1 lakh")) {
        return { min: 1, max: 99999 };
      }

      if (normalized.includes("above 20 lakh")) {
        return { min: 2000001, max: Infinity };
      }

      const match = normalized.match(/(\d+)\s*lakh\s*-\s*(\d+)\s*lakh/);
      if (match) {
        const min = parseInt(match[1], 10) * 100000;
        const max = parseInt(match[2], 10) * 100000;
        return { min, max };
      }

      return null;
    };

    const compareIncomeRange = (preferredStr, actualStr) => {
      if (!preferredStr || preferredStr.toLowerCase() === "no income") {
        return true;
      }

      const preferred = parseCustomIncomeRange(preferredStr);
      const actual = parseCustomIncomeRange(actualStr);

      if (!preferred || !actual) return false;

      // ✅ Accept if target income is equal to or above preferred income
      return actual.min >= preferred.min;
    };


    const age =
      new Date().getFullYear() -
      new Date(userBiodata.personalDetails.dob).getFullYear();
    const height = parseInt(userBiodata.personalDetails.heightFeet);

    const preferences = loggedInUserBiodata.partnerPreferences;

    const comparisonResults = {
      subCaste: compareField(
        preferences.partnerSubCaste,
        userBiodata.personalDetails.subCaste
      ),
      manglikStatus: compareField(
        preferences.partnerManglikStatus,
        userBiodata.personalDetails.manglikStatus
      ),
      maritalStatus: compareField(
        preferences.partnerMaritalStatus,
        userBiodata.personalDetails.maritalStatus
      ),
      disabilities: compareField(
        preferences.partnerDisabilities,
        userBiodata.personalDetails.disabilities
      ),
      qualification: compareField(
        preferences.partnerQualification,
        userBiodata.personalDetails.qualification
      ),
      occupation: compareField(
        preferences.partnerOccupation,
        userBiodata.personalDetails.occupation
      ),
      income: compareIncomeRange(
        preferences.partnerIncome,
        userBiodata.personalDetails.annualIncome
      ),

      familyType: compareField(
        preferences.partnerFamilyType,
        userBiodata.personalDetails.familyType
      ),
      age: compareRange(
        age,
        preferences.partnerMinAge,
        preferences.partnerMaxAge
      ),
      height: compareHeightStrict(
        userBiodata.personalDetails.heightFeet,
        preferences.partnerMinHeightFeet,
        preferences.partnerMaxHeightFeet
      ),

      location: compareLocation(
        preferences.partnerCity,
        userBiodata.personalDetails.cityOrVillage
      ), // ✅ Custom for location
      diet: compareField(
        preferences.partnerDietaryHabits,
        userBiodata.personalDetails.dietaryHabit
      ),
      smoke: compareField(
        preferences.partnerSmokingHabits,
        userBiodata.personalDetails.smokingHabit
      ),
      drink: compareField(
        preferences.partnerDrinkingHabits,
        userBiodata.personalDetails.drinkingHabit
      ),
    };

    const matchingCriteria = Object.entries(comparisonResults)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    const resultMessage = matchingCriteria.length
      ? `Matching preferences: ${matchingCriteria.join(", ")}`
      : "No preferences match";

    return res.status(200).json({
      status: true,
      message: resultMessage,
      data: user,
      loggedInUserBiodata,
      targetUserBioData: userBiodata,
      comparisonResults,
      isSaved,
      requestStatus,
      isVisible: requestStatus === "accepted" ? true : false,
      requestId,
      connectionStatus,
    });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};

//getMatchProfiles Based on loggedInUser PartnerPreference
const getMatchProfiles = async (req, res) => {
  try {
    const loggedInUserId = req?.user?._id;

    // Early validation
    if (!loggedInUserId) {
      return res
        .status(400)
        .json({ status: false, message: "User is not logged in." });
    }

    // Default pagination values
    const page = Math.max(1, parseInt(req.query.page) || 1); // Default to page 1 if not provided or invalid
    let limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 50); // Default to limit 10, max 50
    const skip = (page - 1) * limit;

    // Fetch logged-in user's biodata and validate partner preferences
    const loggedInUser = await Biodata.findOne({ userId: loggedInUserId });
    if (!loggedInUser) {
      return res.status(400).json({
        status: false,
        message: "Logged-in user matrimonial profile not found!",
      });
    }
    if (!loggedInUser.partnerPreferences) {
      return res.status(400).json({
        status: false,
        message: "Please fill your PartnerPreference Form Details!",
      });
    }

    // Fetch connection requests to filter users that the logged-in user is connected with
    const connectionRequest = await ConnectionRequest.find({
      $or: [{ toUserId: loggedInUserId }, { fromUserId: loggedInUserId }],
    }).select("fromUserId toUserId status");

    const hideUserFromFeed = new Set();
    connectionRequest.forEach((req) => {
      hideUserFromFeed.add(req.fromUserId.toString());
      hideUserFromFeed.add(req.toUserId.toString());
    });

    // Fetch target users' biodata excluding hidden ones
    const targetUserIds = await Biodata.find({
      $and: [
        { userId: { $nin: Array.from(hideUserFromFeed) } }, // Exclude hidden users
        { userId: { $ne: loggedInUserId } }, // Exclude logged-in user's own biodata
      ],
    })
      .select("userId personalDetails")
      .skip(skip)
      .limit(limit)
      .sort({ lastRepostedAt: -1, updatedAt: -1 }); // Sorting by lastRepostedAt and updatedAt

    if (targetUserIds.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No target users found" });
    }

    // Fetch full details for the target users
    const targetUsers = await Biodata.find({
      userId: { $in: targetUserIds.map((user) => user.userId) },
    }).select("-partnerPreferences"); // Exclude partnerPreferences

    // Function to calculate match score
    const calculateMatchScore = (loggedInUser, targetUser) => {
      let score = 0;

      // Age range check (weight = 2)
      const targetAge =
        new Date().getFullYear() -
        new Date(targetUser.personalDetails.dob).getFullYear();
      const minAge = parseInt(loggedInUser.partnerPreferences.partnerMinAge);
      const maxAge = parseInt(loggedInUser.partnerPreferences.partnerMaxAge);
      if (targetAge >= minAge && targetAge <= maxAge) score += 2;

      // Height check (weight = 1.5)
      const targetHeight = parseInt(targetUser.personalDetails.heightFeet);
      const minHeight = parseInt(
        loggedInUser.partnerPreferences.partnerMinHeightFeet
      );
      const maxHeight = parseInt(
        loggedInUser.partnerPreferences.partnerMaxHeightFeet
      );
      if (targetHeight >= minHeight && targetHeight <= maxHeight) score += 1.5;

      // Location check (weight = 0.5)
      if (
        loggedInUser.partnerPreferences.partnerCity ===
        targetUser.personalDetails.currentCity
      ) {
        score += 0.5;
      }

      // Other checks...
      if (
        loggedInUser.partnerPreferences.partnerManglikStatus ===
        targetUser.personalDetails.manglikStatus
      )
        score += 1;
      if (
        loggedInUser.partnerPreferences.partnerMaritalStatus ===
        targetUser.personalDetails.maritalStatus
      )
        score += 1;
      if (
        loggedInUser.partnerPreferences.partnerFamilyType ===
        targetUser.personalDetails.familyType
      )
        score += 0.5;
      const targetIncome = parseInt(targetUser.personalDetails.annualIncome);
      const minIncome = parseInt(loggedInUser.partnerPreferences.partnerIncome);
      if (targetIncome >= minIncome) score += 1;
      if (
        loggedInUser.partnerPreferences.partnerOccupation ===
        targetUser.personalDetails.occupation
      )
        score += 0.5;
      if (
        loggedInUser.partnerPreferences.partnerDietaryHabits ===
        targetUser.personalDetails.dietaryHabit
      )
        score += 0.5;
      if (
        loggedInUser.partnerPreferences.partnerSmokingHabits ===
        targetUser.personalDetails.smokingHabit
      )
        score += 0.5;
      if (
        loggedInUser.partnerPreferences.partnerDrinkingHabits ===
        targetUser.personalDetails.drinkingHabit
      )
        score += 0.5;
      if (
        loggedInUser.partnerPreferences.partnerComplexion ===
        targetUser.personalDetails.complexion
      )
        score += 0.5;
      if (
        loggedInUser.partnerPreferences.partnerSubCaste ===
        targetUser.personalDetails.subCaste
      )
        score += 0.5;
      if (
        loggedInUser.partnerPreferences.partnerQualification ===
        targetUser.personalDetails.qualification
      )
        score += 0.5;

      return score;
    };

    // Calculate match score for each target user
    const scoredProfiles = targetUsers.map((targetUser) => {
      const matchScore = calculateMatchScore(loggedInUser, targetUser);
      return { ...targetUser.toObject(), matchScore };
    });

    // Filter and sort profiles by lastRepostedAt first, then matchScore
    const sortedProfiles = scoredProfiles
      .filter((profile) => profile.matchScore > 0) // Filter out profiles with matchScore 0
      .sort((a, b) => {
        // First, compare by lastRepostedAt
        if (b.lastRepostedAt !== a.lastRepostedAt) {
          return b.lastRepostedAt - a.lastRepostedAt; // Descending order for lastRepostedAt
        }
        // If lastRepostedAt is the same, then compare by matchScore
        return b.matchScore - a.matchScore; // Descending order for matchScore
      });

    // Return the sorted profiles
    return res.status(200).json({
      status: true,
      profiles: sortedProfiles,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

//shareProfiles API to generate a shareable link for a profile
const shareBioDataProfile = async (req, res) => {
  const profileId = req.params.id;

  try {
    // Find the profile by ID
    const profile = await Biodata.findOne({ userId: profileId });

    if (!profile) {
      return res
        .status(400)
        .json({ status: false, message: "Profile not found" });
    }

    // Generate the shareable link (URL)
    const shareableLink = `${process.env.SHAREABLEPROFILE_URL}/api/v1/user/profile/${profileId}`;

    return res.status(200).json({
      status: true,
      message: "Profile link generated successfully",
      shareableLink,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error generating share link",
      error: error.message,
    });
  }
};

// Logout user
const Logout = (req, res) => {
  try {
    // Clear the cookie
    res.clearCookie("userInfo", {
      httpOnly: false,
      secure: process.env.COOKIE_FLAG === "production",
    });
    return res.status(200).json({
      status: true,
      message: "Logout successful",
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Internal server error", error });
  }
};

//for deletionOfUserAccount
//sendOTPtoUser
const sendOTPforUserDeletion = async (req, res) => {
  try {
    let { mobileNo, password } = req.body;

    if (!mobileNo || !password) {
      return res.status(400).json({
        status: false,
        message: "Mobile number and password are required!",
      });
    }

    // Normalize mobile number
    mobileNo = mobileNo.replace(/^(?:\+91|91|0)/, "");

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNo)) {
      return res.status(400).json({
        status: false,
        message:
          "Invalid mobile number! Please enter a valid 10-digit Indian mobile number.",
      });
    }

    // Find user by mobile number
    const userExists = await User.findOne({ mobileNo });
    if (!userExists) {
      return res
        .status(404)
        .json({ status: false, message: "User profile not found." });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, userExists.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ status: false, message: "Incorrect password!" });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete existing OTPs
    await OTPRequest.findOneAndDelete({ mobileNo });

    // Save new OTP
    const newOtpRequest = new OTPRequest({ mobileNo, otp, otpExpires });
    await newOtpRequest.save();

    const smsResponse = await sendOTP(mobileNo, otp);
    console.log("SMS Gateway API Response:", smsResponse);

    if (!smsResponse.success) {
      await OTPRequest.findOneAndDelete({ mobileNo }); // Clean up
      return res
        .status(500)
        .json({ status: false, message: smsResponse.message });
    }

    return res.status(200).json({
      status: true,
      message: `OTP sent successfully to ******${mobileNo.slice(-4)}`,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error", error });
  }
};

//verifyOTPforUserDeletion
const verifyOTPforUserDeletion = async (req, res) => {
  try {
    const { mobileNo, otp } = req.body;

    if (!mobileNo || !otp) {
      return res.status(400).json({
        status: false,
        message: "Mobile number and OTP are required.",
      });
    }

    // Validate OTP format (optional but recommended)
    if (!/^\d{4,6}$/.test(otp)) {
      return res.status(400).json({
        status: false,
        message: "Invalid OTP format.",
      });
    }

    // Find the OTP entry
    const otpRecord = await OTPRequest.findOne({ mobileNo });

    if (!otpRecord) {
      return res.status(400).json({
        status: false,
        message:
          "No OTP request found for this number. Please request a new OTP.",
      });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({
        status: false,
        message: "Incorrect OTP. Please try again.",
      });
    }

    if (new Date() > otpRecord.otpExpires) {
      await OTPRequest.deleteOne({ mobileNo }); // Clean up expired OTP
      return res.status(400).json({
        status: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Optional: Delete OTP record after successful verification
    await OTPRequest.deleteOne({ mobileNo });

    return res.status(200).json({
      status: true,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error.",
      error,
    });
  }
};

//deleteUser & it's Details from other models
const Delete_UserAccount = async (req, res) => {
  try {
    const { mobileNo } = req.body;

    if (!mobileNo) {
      return res.status(400).json({
        status: false,
        message: "Mobile number is required.",
      });
    }

    // Find user
    const loggedInUser = await User.findOne({ mobileNo });
    if (!loggedInUser) {
      return res.status(400).json({
        status: false,
        message: "User not Found!",
      });
    }

    const userId = loggedInUser._id;

    // Fetch profile-related documents created by this user
    const [dharmshalas, committees, biodata, pandit, jyotish, kathavachak] =
      await Promise.all([
        Dharmshala.find({ userId }),
        Committee.find({ userId }),
        Biodata.findOne({ userId }),
        Pandit.findOne({ userId }),
        Jyotish.findOne({ userId }),
        Kathavachak.findOne({ userId }),
      ]);

    // Get all related profile _ids to delete from SavedProfile
    const saveProfileIds = [
      biodata?._id,
      pandit?._id,
      jyotish?._id,
      kathavachak?._id,
      ...dharmshalas.map((d) => d._id),
      ...committees.map((c) => c._id),
    ].filter(Boolean);

    const deleteSavedProfileReferences = SavedProfile.deleteMany({
      saveProfile: { $in: saveProfileIds },
    });

    const deletionPromises = [
      Biodata.deleteOne({ userId }),
      Jyotish.deleteOne({ userId }),
      Kathavachak.deleteOne({ userId }),
      Advertise.deleteOne({ userId }),
      Dharmshala.deleteMany({ userId }),
      Committee.deleteMany({ userId }),
      Feedback.deleteOne({ userId }),
      Report.deleteMany({ userId }),
      Report.deleteMany({ profileId: { $in: saveProfileIds } }), // reports against user's profiles
      SavedProfile.deleteOne({ userId }), // saved by this user
      deleteSavedProfileReferences, // saved about this user's profiles
      Pandit.deleteOne({ userId }),
      ConnectionRequest.deleteMany({
        $or: [{ toUserId: userId }, { fromUserId: userId }],
      }),
      Activist.deleteOne({ userId }),
      Rating.deleteMany({ userId }),
      EventPost.deleteMany({ $or: [{ userId }, { activistId: userId }] }),
      OTPRequest.deleteOne({ mobileNo }),
      KathavachakRequest.deleteMany({ userId }),
      PanditRequest.deleteMany({ userId }),
      JyotishRequest.deleteMany({ userId }),
      ActivistRequest.deleteMany({ userId }),
      Subscription.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      User.deleteOne({ _id: userId }),
    ];

    const results = await Promise.allSettled(deletionPromises);

    const failedDeletions = results
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason);

    return res.status(200).json({
      status: true,
      message: "User Account Deleted Successfully",
      data: results.map((r) => r.value || null),
      failedDeletions,
    });
  } catch (error) {
    console.error("Delete_UserAccount error:", error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//sendOTPtoUser
const sendOTPtoUser = async (req, res) => {
  try {
    const { mobileNo } = req.body;
    if (!mobileNo) {
      return res
        .status(400)
        .json({ status: false, message: "Mobile number is required!" });
    }

    // Regular expression to validate Indian mobile numbers
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;

    if (!mobileRegex.test(mobileNo)) {
      return res.status(400).json({
        status: false,
        message: "Invalid mobile number! Please Enter valid mobile number",
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    const userExists = await User.findOne({ mobileNo: mobileNo });

    if (userExists) {
      return res
        .status(400)
        .json({
          status: false,
          message:
            "An account with this mobile number already exists. Please log in or use a different number to register.",
        });
    }

    // Check if there's an existing OTP for this mobile number and remove it
    await OTPRequest.findOneAndDelete({ mobileNo });

    // Save OTP in the OTPRequest collection
    const newOtpRequest = new OTPRequest({
      mobileNo,
      otp,
      otpExpires,
    });

    await newOtpRequest.save();

    const smsResponse = await sendOTP(mobileNo, otp);
    console.log("SMS Gateway API Response:", smsResponse);
    if (!smsResponse.success) {
      return res
        .status(500)
        .json({ status: false, message: smsResponse.message });
    }

    return res.status(200).json({
      status: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error", error });
  }
};

const updateUserProfileType = async (userId, profileType) => {
  try {
    // Find the user
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw new Error("User not found");
    }

    // Update the profile field
    user[profileType] = true;

    // Save the updated user
    await user.save();

    return user;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

//sendOtp for reset Password
const sendResetOTP = async (req, res) => {
  try {
    const { mobileNo } = req.body;
    if (!mobileNo) {
      return res
        .status(400)
        .json({ status: false, message: "Mobile number is required!" });
    }

    // Validate mobile number format
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNo)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid mobile number!" });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    // Check if there's an existing OTP for this mobile number and remove it
    await OTPRequest.findOneAndDelete({ mobileNo });

    // Save OTP in the OTPRequest collection
    const newOtpRequest = new OTPRequest({
      mobileNo,
      otp,
      otpExpires,
    });

    await newOtpRequest.save();

    // Send OTP via SMS (implement sendOTP function as per your SMS service)
    const smsResponse = await sendOTP(mobileNo, otp);
    console.log("SMS Gateway API Response:", smsResponse);
    if (!smsResponse.success) {
      return res
        .status(500)
        .json({ status: false, message: smsResponse.message });
    }

    return res
      .status(200)
      .json({ status: true, message: "OTP sent successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error", error });
  }
};

//if user forget its password so they can reset it
const forgotPassword = async (req, res) => {
  const { mobileNo, newPassword, otp } = req.body;

  // Validate mobile number
  if (!mobileNo) {
    return res
      .status(400)
      .json({ status: false, message: "Mobile number is required!" });
  }

  // Validate mobile number format
  const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
  if (!mobileRegex.test(mobileNo)) {
    return res.status(400).json({
      status: false,
      message: "Invalid mobile number! Please enter a valid mobile number.",
    });
  }

  try {
    // Find the user by mobileNo
    const user = await User.findOne({ mobileNo });
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "User not found." });
    }

    // Verify OTP
    const userOtpRecord = await OTPRequest.findOne({ mobileNo, otp });
    if (!userOtpRecord || userOtpRecord.otpExpires < Date.now()) {
      return res
        .status(400)
        .send({ status: false, message: "Invalid OTP or OTP expired." });
    }

    // Clear OTP after verification
    await OTPRequest.deleteOne({ mobileNo });

    //ResetPassword
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Respond with success
    return res.status(200).json({
      status: true,
      message:
        "Your Password is Reset successfully.Please verify it by Re-Login.",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//to change existing password
const changePassword = async (req, res) => {
  const { mobileNo } = req?.user;
  const { oldPassword, newPassword } = req.body;

  // Validate required fields
  if (!mobileNo || !oldPassword || !newPassword) {
    return res.status(400).json({
      status: false,
      message: "Old password and new password are required!",
    });
  }

  try {
    // Get user by mobileNo
    const user = await User.findOne({ mobileNo }).select("password");
    if (!user) {
      return res.status(400).json({
        status: false,
        message: "Authentication failed. User not found.",
      });
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res
        .status(400)
        .json({ status: false, message: "Old password is incorrect." });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    user.password = hashedNewPassword;
    await user.save();

    //for re-login
    res.clearCookie("userInfo");

    // Respond with success
    return res.status(200).json({
      status: true,
      message: "Password changed successfully!",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//updating the profiles by refering its profile type
const updateServiceProfiles = async (req, res) => {
  try {
    const { profileType } = req.params;
    const { _id: userId } = req.user;

    const getProfileModel = (profileType) => {
      switch (profileType) {
        case "Pandit":
          return mongoose.model("Pandit");
        case "Kathavachak":
          return mongoose.model("Kathavachak");
        case "Jyotish":
          return mongoose.model("Jyotish");
        default:
          throw new Error("Invalid profile type");
      }
    };

    if (!profileType) {
      return res.status(400).json({
        status: false,
        message: "Profile type is required!",
      });
    }

    const ProfileModel = getProfileModel(profileType);

    const existingProfile = await ProfileModel.findOne({ userId });
    if (!existingProfile) {
      return res.status(400).json({
        status: false,
        message: `${profileType} Profile Not Found!`,
      });
    }

    let profilePhotoUrl = null;
    if (req.files?.profilePhoto?.[0]) {
      profilePhotoUrl = req.files.profilePhoto[0].path.replace(/\\/g, "/");
    }

    let additionalPhotosUrls = existingProfile.additionalPhotos || [];

    // Handle removeImages correctly (parse if string)
    let removeImages = [];
    if (req.body.removeImages) {
      if (typeof req.body.removeImages === "string") {
        try {
          removeImages = JSON.parse(req.body.removeImages);
        } catch {
          return res.status(400).json({
            status: false,
            message: "Invalid format for removeImages. It should be a JSON array.",
          });
        }
      } else if (Array.isArray(req.body.removeImages)) {
        removeImages = req.body.removeImages;
      }
    }

    // Filter out images marked for removal
    additionalPhotosUrls = additionalPhotosUrls.filter(
      (imgUrl) => !removeImages.includes(imgUrl)
    );

    // Append newly uploaded images
    if (req.files?.additionalPhotos) {
      req.files.additionalPhotos.forEach((file) => {
        additionalPhotosUrls.push(file.path.replace(/\\/g, "/"));
      });
    }

    // Ensure only the last 5 images are kept
    if (additionalPhotosUrls.length > 5) {
      additionalPhotosUrls = additionalPhotosUrls.slice(-5);
    }

    const dataForUpdate = { ...req.body };
    delete dataForUpdate.removeImages; // Remove removeImages from update data

    if (profilePhotoUrl) {
      dataForUpdate.profilePhoto = profilePhotoUrl;
    }

    dataForUpdate.additionalPhotos = additionalPhotosUrls;

    // Handle service fields as arrays
    const servicesFieldMap = {
      Pandit: "panditServices",
      Jyotish: "jyotishServices",
      Kathavachak: "kathavachakServices",
    };
    const serviceField = servicesFieldMap[profileType];

    if (serviceField && dataForUpdate[serviceField]) {
      let parsedArray = dataForUpdate[serviceField];
      if (typeof parsedArray === "string") {
        try {
          parsedArray = JSON.parse(parsedArray);
          if (!Array.isArray(parsedArray)) throw new Error();
        } catch {
          return res.status(400).json({
            status: false,
            message: `Invalid format for ${serviceField}. It should be a JSON array of strings.`,
          });
        }
      }
      dataForUpdate[serviceField] = parsedArray;
    }

    const updatedProfile = await ProfileModel.updateOne(
      { userId },
      { $set: dataForUpdate }
    );

    if (updatedProfile.modifiedCount === 0) {
      return res.status(400).json({
        status: false,
        message: "No changes were made to the profile.",
      });
    }

    return res.status(200).json({
      status: true,
      message: `${profileType} profile updated successfully.`,
      data: updatedProfile,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

//heightStrToInches function for getMetrimonialSummary
function heightStrToInches(heightStr) {
  const match = heightStr.match(/(\d+)'[\s]*(\d+)?/);
  if (!match) return null;

  const feet = parseInt(match[1], 10) || 0;
  const inches = parseInt(match[2], 10) || 0;
  return feet * 12 + inches;
}
// //getAllMetrimonial profile summary like savedProfiles, connection Recieved Profiles and bioData Profiles
const getMetrimonialSummary = async (req, res) => {
  try {
    const loggedInUser = req.user;
    const loggedInUserBiodata = await Biodata.findOne({
      userId: loggedInUser?._id,
    });
    if (!loggedInUserBiodata) throw new Error("Biodata not found for the user");

    // If biodata is inactive (disabled by Brahmin Milan Team)
    if (loggedInUserBiodata.activityStatus === "Inactive") {
      return res.status(400).json({
        status: false,
        message:
          "Your biodata has been deactivated by the Brahmin Milan Team. Please contact the support team for assistance or reactivation.",
      });
    }


    // ✅ Get all users with active Biodata subscription
    const activeSubscribedUsers = await User.find({
      "serviceSubscriptions.serviceType": "Biodata",
      "serviceSubscriptions.status": "Active",
      "serviceSubscriptions.endDate": { $gte: new Date() },
    }).select("_id");
    const activeSubscribedUserIds = new Set(
      activeSubscribedUsers.map((u) => u._id.toString())
    );

    const savedProfiles = await SavedProfile.find({
      userId: loggedInUser._id,
      profileType: "Biodata",
    }).populate("saveProfile");
    const savedProfilesMap = savedProfiles.reduce((map, saved) => {
      const key = saved?.saveProfile?._id?.toString();
      map[key] = true;
      return map;
    }, {});

    const connectionRequest = await ConnectionRequest.find({
      $or: [{ toUserId: loggedInUser._id }, { fromUserId: loggedInUser._id }],
    });

    const hideUserFromFeed = new Set();
    const connectionMap = {};
    connectionRequest.forEach((req) => {
      hideUserFromFeed.add(req?.fromUserId?.toString());
      hideUserFromFeed.add(req?.toUserId?.toString());
      const otherUserId =
        req.fromUserId.toString() === loggedInUser._id.toString()
          ? req.toUserId.toString()
          : req.fromUserId.toString();
      connectionMap[otherUserId] = req.status;
    });

    // ✅ Filter savedProfiles for only active subscribed users and activistStatus !== "Inactive"
    const savedProfilesWithFlag = savedProfiles
      .filter((saved) => {
        const profileUserId = saved?.saveProfile?.userId?.toString();
        const isSubscribed = activeSubscribedUserIds.has(profileUserId);
        const isActive = saved?.saveProfile?.activityStatus !== "Inactive"; // exclude Inactive
        return isSubscribed && isActive;
      })
      .map((saved) => {
        const profileObj = saved?.saveProfile?.toObject();
        const profileUserId = profileObj.userId?.toString();
        const status = connectionMap[profileUserId] || null;

        const matchingConnection = connectionRequest.find(
          (cr) =>
            (cr.fromUserId.toString() === loggedInUser._id.toString() &&
              cr.toUserId.toString() === profileUserId) ||
            (cr.toUserId.toString() === loggedInUser._id.toString() &&
              cr.fromUserId.toString() === profileUserId)
        );

        return {
          ...profileObj,
          isSaved: true,
          status,
          isVisible: status === "accepted",
          requestId: matchingConnection?._id || null,
          connectionStatus: matchingConnection
            ? matchingConnection.fromUserId.toString() === loggedInUser._id.toString()
              ? "sent"
              : "received"
            : "none",
        };
      });

    const searchTerm = req.query?.searchTerm?.trim() || "";
    const searchGender = req.query?.gender ? { gender: req.query.gender } : {};
    const regex = new RegExp(searchTerm, "i");

    const searchQuery = [
      { "personalDetails.fullname": regex },
      { "personalDetails.currentCity": regex },
      { "personalDetails.occupation": regex },
      { "personalDetails.mobileNo": regex },
      { bioDataId: regex },
    ];

    const pp = loggedInUserBiodata.partnerPreferences || {};
    const currentDate = new Date();
    const matchConditions = [
      { gender: loggedInUserBiodata.gender === "male" ? "female" : "male" },
      { userId: { $ne: loggedInUser._id } },
      //{ userId: { $nin: Array.from(hideUserFromFeed) } },
    ];

    if (searchGender.gender) matchConditions.push(searchGender);
    if (searchTerm) matchConditions.push({ $or: searchQuery });

    const optionalFilter = (field, path) => {
      if (
        pp[field] &&
        pp[field] !== "Doesn’t Matter" &&
        pp[field].trim() !== ""
      ) {
        matchConditions.push({ [path]: pp[field] });
      }
    };

    // Age filter
    const minAge = parseInt(pp.partnerMinAge);
    const maxAge = parseInt(pp.partnerMaxAge);
    if (!isNaN(minAge) && !isNaN(maxAge)) {
      const minDOB = new Date(
        currentDate.getFullYear() - maxAge - 1,
        currentDate.getMonth(),
        currentDate.getDate() + 1
      );
      const maxDOB = new Date(
        currentDate.getFullYear() - minAge,
        currentDate.getMonth(),
        currentDate.getDate()
      );
      matchConditions.push({
        "personalDetails.dob": { $gte: minDOB, $lte: maxDOB },
      });
    }

    if (
      pp.partnerMinHeightFeet &&
      pp.partnerMaxHeightFeet &&
      pp.partnerMinHeightFeet !== "Doesn’t Matter" &&
      pp.partnerMaxHeightFeet !== "Doesn’t Matter"
    ) {
      const minHeightInInches = heightStrToInches(pp.partnerMinHeightFeet);
      const maxHeightInInches = heightStrToInches(pp.partnerMaxHeightFeet);

      matchConditions.push({
        $expr: {
          $and: [
            {
              $gte: [
                {
                  $add: [
                    {
                      $multiply: [
                        {
                          $toDouble: {
                            $arrayElemAt: [
                              { $split: ["$personalDetails.heightFeet", "'"] },
                              0,
                            ],
                          },
                        },
                        12,
                      ],
                    },
                    {
                      $toInt: {
                        $trim: {
                          input: {
                            $arrayElemAt: [
                              { $split: ["$personalDetails.heightFeet", "'"] },
                              1,
                            ],
                          },
                        },
                      },
                    },
                  ],
                },
                minHeightInInches,
              ],
            },
            {
              $lte: [
                {
                  $add: [
                    {
                      $multiply: [
                        {
                          $toInt: {
                            $arrayElemAt: [
                              { $split: ["$personalDetails.heightFeet", "'"] },
                              0,
                            ],
                          },
                        },
                        12,
                      ],
                    },
                    {
                      $toInt: {
                        $trim: {
                          input: {
                            $arrayElemAt: [
                              { $split: ["$personalDetails.heightFeet", "'"] },
                              1,
                            ],
                          },
                        },
                      },
                    },
                  ],
                },
                maxHeightInInches,
              ],
            },
          ],
        },
      });
    }

    optionalFilter("partnerMaritalStatus", "personalDetails.maritalStatus");
    optionalFilter("partnerSubCaste", "personalDetails.subCaste");
    optionalFilter("partnerQualification", "personalDetails.qualification");
    optionalFilter("partnerOccupation", "personalDetails.occupation");
    optionalFilter("partnerManglikStatus", "personalDetails.manglikStatus");
    optionalFilter("partnerState", "personalDetails.state");
    optionalFilter("partnerCity", "personalDetails.currentCity");
    optionalFilter("partnerDrinkingHabits", "personalDetails.drinkingHabit");
    optionalFilter("partnerSmokingHabits", "personalDetails.smokingHabit");
    optionalFilter("partnerDietaryHabits", "personalDetails.dietaryHabit");
    optionalFilter("partnerFamilyType", "personalDetails.familyType");

    if (
      pp.partnerIncome &&
      pp.partnerIncome !== "Doesn’t Matter" &&
      pp.partnerIncome.trim() !== ""
    ) {
      matchConditions.push({
        "personalDetails.annualIncome": pp.partnerIncome,
      });
    }

    const profiles = await Biodata.find({
      $and: matchConditions,
      activityStatus: { $ne: "Inactive" },
    }).sort({
      latestActivityAt: -1
    });

    const sortedProfilesWithFlag = profiles
      .filter((profile) =>
        activeSubscribedUserIds.has(profile?.userId?.toString())
      )
      .map((profile) => {
        const profileObj = profile?.toObject();
        const profileUserId = profileObj.userId?.toString();
        const status = connectionMap[profileUserId] || null;

        const matchingConnection = connectionRequest.find(
          (cr) =>
            (cr.fromUserId.toString() === loggedInUser._id.toString() &&
              cr.toUserId.toString() === profileUserId) ||
            (cr.toUserId.toString() === loggedInUser._id.toString() &&
              cr.fromUserId.toString() === profileUserId)
        );

        return {
          ...profileObj,
          isSaved: Boolean(savedProfilesMap[profile?._id?.toString()]),
          status,
          isVisible: status === "accepted",
          requestId: matchingConnection?._id || null,
          connectionStatus: matchingConnection
            ? matchingConnection.fromUserId.toString() === loggedInUser._id.toString()
              ? "sent"
              : "received"
            : "none",
        };
      });

    const receivedConnectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: { $in: ["interested", "ignore", "accepted", "rejected"] },
    });

    const fromUserDetails = (
      await Promise.all(
        receivedConnectionRequests.map(async (data) => {
          const fromUserBioData = await Biodata.findOne({
            $and: [
              { userId: data?.fromUserId },
              { activityStatus: { $ne: "Inactive" } },
            ],
          });
          const status = data?.status;
          if (
            !fromUserBioData ||
            !activeSubscribedUserIds.has(data?.fromUserId?.toString())
          )
            return null;

          const profileUserId = fromUserBioData?.userId?.toString();

          const matchingConnection = connectionRequest.find(
            (cr) =>
              (cr.fromUserId.toString() === loggedInUser._id.toString() &&
                cr.toUserId.toString() === profileUserId) ||
              (cr.toUserId.toString() === loggedInUser._id.toString() &&
                cr.fromUserId.toString() === profileUserId)
          );

          return {
            ...fromUserBioData?.toObject(),
            isSaved: Boolean(
              savedProfilesMap[fromUserBioData?._id?.toString()]
            ),
            status,
            isVisible: status === "accepted",
            requestId: data?._id,
            connectionStatus: matchingConnection
              ? matchingConnection.fromUserId.toString() === loggedInUser._id.toString()
                ? "sent"
                : "received"
              : "none",
          };
        })
      )
    ).filter(Boolean);


    const allProfiles = await Biodata.find({
      $and: [
        { gender: loggedInUserBiodata.gender === "male" ? "female" : "male" },
        searchGender,
        { $or: searchQuery },
        { userId: { $ne: loggedInUser._id } },
        { activityStatus: { $ne: "Inactive" } },
      ],
    }).sort({ latestActivityAt: -1 });

    const allProfilesWithFlag = allProfiles
      .filter((profile) =>
        activeSubscribedUserIds.has(profile?.userId?.toString())
      )
      .map((profile) => {
        const profileObj = profile?.toObject();
        const profileUserId = profileObj.userId?.toString();
        const status = connectionMap[profileUserId] || null;

        // Find matching connection request
        const matchingConnection = connectionRequest.find(
          (cr) =>
            (cr.fromUserId.toString() === loggedInUser._id.toString() &&
              cr.toUserId.toString() === profileUserId) ||
            (cr.toUserId.toString() === loggedInUser._id.toString() &&
              cr.fromUserId.toString() === profileUserId)
        );

        return {
          ...profileObj,
          isSaved: Boolean(savedProfilesMap[profile?._id?.toString()]),
          status,
          isVisible: status === "accepted",
          requestId: matchingConnection?._id || null,
          connectionStatus: matchingConnection
            ? matchingConnection.fromUserId.toString() === loggedInUser._id.toString()
              ? "sent"
              : "received"
            : "none",
        };
      });

    return res.status(200).json({
      status: true,
      message: "Matrimonial Summary data fetched successfully",
      metrimony: sortedProfilesWithFlag,
      interestedProfiles: fromUserDetails,
      savedProfiles: savedProfilesWithFlag,
      allProfiles: allProfilesWithFlag,
    });
  } catch (err) {
    console.error("Error fetching Matrimonial Summary:", err.message);
    return res.status(500).json({
      status: false,
      message: `Error fetching Matrimonial Summary data: ${err.message}`,
    });
  }
};

//createFeedBack
const createFeedBack = async (req, res) => {
  try {
    const { _id: userId } = req?.user;
    const { rating, comment } = req?.body;

    if (!rating || !comment) {
      return res
        .status(400)
        .json({ status: false, message: "Rating and Comment is required!" });
    }

    //new feedback
    const newFeedback = new Feedback({ userId, rating, comment });
    await newFeedback.save();

    return res.status(200).json({
      status: true,
      message: "Feedback sent Successfully",
      feedback: newFeedback,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

const advertiseWithUs = async (req, res) => {
  try {
    // Destructure userId
    const { _id: userId } = req?.user;
    const { fullName, email, phoneNumber, message } = req?.body;

    // Regular expressions for basic validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneNumberRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;

    // Check required fields
    if (!fullName || !email || !phoneNumber) {
      return res.status(400).json({
        status: false,
        message: "Please enter all required fields!",
      });
    }

    // Validate email
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: false,
        message: "Invalid email address.",
      });
    }

    // Validate phone number
    if (!phoneNumberRegex.test(phoneNumber)) {
      return res.status(400).json({
        status: false,
        message: "Invalid phone number.",
      });
    }

    // Check if user already sent a request
    const existingAdvertise = await Advertise.findOne({ userId });
    if (existingAdvertise) {
      return res.status(400).json({
        status: false,
        message: "You have already sent an 'Advertise With Us' request!",
      });
    }

    // Create new AdvertiseWithUs request
    const newAdvertise = new Advertise({
      userId,
      fullName,
      email,
      phoneNumber,
      message,
    });

    await newAdvertise.save();

    // Success response
    return res.status(200).json({
      status: true,
      message: "'Advertise With Us' request sent successfully.",
      advertise: newAdvertise,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

const saveUserToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user?._id; // from verifyToken middleware

    // Case 1: Empty string => clear token
    if (token === "") {
      if (userId) {
        await User.findByIdAndUpdate(userId, { $unset: { fcmToken: "" } });
      }

      return res.status(200).json({
        status: true,
        message: "Notifications disabled successfully!",
      });
    }

    // Case 2: Missing or invalid token
    if (!token || typeof token !== "string" || token.trim() === "") {
      return res.status(400).json({
        status: false,
        message: "Valid FCM token is required or pass empty string to disable",
        error: "Invalid or missing token",
      });
    }

    // Case 3: Valid token -> save/update
    if (userId) {
      await User.findByIdAndUpdate(userId, { fcmToken: token }, { new: true });
    } else {
      let user = await User.findOne({ fcmToken: token });
      if (!user) {
        user = new User({ fcmToken: token });
        await user.save();
      }
    }

    return res.status(200).json({
      status: true,
      message: "Notifications enabled successfully!",
    });

  } catch (error) {
    console.error("Failed to save token:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to save FCM token",
      error: error.message,
    });
  }
};


module.exports = {
  SignIn,
  SignUp,
  advertiseWithUs,
  connections,
  getMetrimonialSummary,
  createFeedBack,
  forgotPassword,
  changePassword,
  feed,
  shareBioDataProfile,
  matchMatrimonialProfile,
  getMatchProfiles,
  Logout,
  viewProfile,
  updateProfile,
  updateProfileImage,
  deleteProfileImage,
  Delete_UserAccount,
  sendOTPtoUser,
  updateUserProfileType,
  fetchUserProfile,
  updateServiceProfiles,
  sendResetOTP,
  sendOTPforUserDeletion,
  verifyOTPforUserDeletion,
  saveUserToken
};
