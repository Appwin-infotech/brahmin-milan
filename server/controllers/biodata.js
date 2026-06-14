const { default: mongoose } = require("mongoose");
const Admin = require("../models/admin");
const Biodata = require("../models/biodata"); // Update with your model file path
const ConnectionRequest = require("../models/connectionRequest");
const Notification = require("../models/notification");
const Report = require("../models/report");
const SavedProfile = require("../models/savedProfiles");
const SuccessStory = require("../models/successStory");
const SuccessStoryRequest = require("../models/successStoryRequest");
const User = require("../models/user"); // Update with your model file path
const { sendNotificationToAdmin } = require("../socket/socket.server");
const cloudinary = require("cloudinary").v2;
const { updateUserProfileType } = require("./user");
const { BASE_URL } = require("../utils/constants");

const createPersonalDetails = async (req, res) => {
  try {
    const { _id: userId, userId: bioDataId } = req.user;
    const { gender, ...personalDetails } = req.body;
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;

    // 1. Check subscription
    const user = await User.findById(userId);
    const today = new Date();

    const hasValidSubscription = user?.serviceSubscriptions?.some(
      (subscription) =>
        subscription.serviceType === "Biodata" &&
        subscription.status === "Active" &&
        new Date(subscription.endDate) > today
    );

    if (!hasValidSubscription) {
      return res.status(400).json({
        status: false,
        message: "You do not have an active subscription for Biodata service.",
      });
    }

    // Validate ContactNumber1
    if (!personalDetails?.contactNumber1) {
      return res.status(400).json({
        status: false,
        message: "ContactNumber1 is required.",
      });
    }

    if (!mobileRegex.test(personalDetails.contactNumber1)) {
      return res.status(400).json({
        status: false,
        message: "Invalid ContactNumber1. Please enter a valid 10-digit mobile number.",
      });
    }

    // ✅ Handle closeUpPhoto: validate 1–3 files, store as array of paths
    const uploadedPhotos = req.files?.['closeUpPhoto'];

    if (!uploadedPhotos || uploadedPhotos.length === 0) {
      return res.status(400).json({
        status: false,
        message: "At least one close-up photo is required.",
      });
    }

    if (uploadedPhotos.length > 3) {
      return res.status(400).json({
        status: false,
        message: "You can upload a maximum of 3 close-up photos.",
      });
    }

    personalDetails.closeUpPhoto = uploadedPhotos.map((file) =>
      file.path.replace(/\\/g, "/")
    );

    // 3. Check if biodata already exists
    const existingBiodata = await Biodata.findOne({ userId });

    if (existingBiodata?.personalDetails != null) {
      return res.status(400).json({
        status: false,
        message: "Invalid Request! Personal Details already added for this user.",
      });
    }

    if (existingBiodata) {
      existingBiodata.personalDetails = personalDetails;
      await existingBiodata.save();
      return res.status(200).json({
        status: true,
        message: "Biodata updated successfully.",
      });
    }

    // 4. Create new biodata
    const biodata = new Biodata({
      userId,
      bioDataId,
      personalDetails,
      gender,
      latestActivityAt: Date.now(),
    });

    await biodata.save();

    // Update isMatrimonial flag
    await updateUserProfileType(userId, "isMatrimonial");

    await biodata.populate({ path: "userId", select: "serviceSubscriptions" });

    // 5. Notify Admins
    const admins = await Admin.find();
    if (admins.length > 0) {
      // ✅ Use first photo in array as the preview photo for notifications
      const previewPhoto = biodata?.personalDetails?.closeUpPhoto?.[0];
      const notificationMessage = `${biodata?.personalDetails?.fullname} has created a Matrimonial Profile.`;

      for (const admin of admins) {
        sendNotificationToAdmin(
          "biodataCreated",
          admin._id,
          notificationMessage,
          previewPhoto,   // ✅ first photo used as preview
          biodata
        );
        const notification = new Notification({
          userId: admin._id,
          userType: "Admin",
          notificationType: "biodataCreated",
          relatedData: {
            BiodataId: biodata?.bioDataId,
            createdBy: biodata?.personalDetails?.fullname,
            photoUrl: previewPhoto,   // ✅ first photo used as preview
          },
          message: notificationMessage,
          seen: false,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
        await notification.save();
      }
    }

    return res.status(200).json({
      status: true,
      message: "Personal details created successfully.",
      data: biodata,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error creating personal details.",
      error: error.message,
    });
  }
};

// Update Personal Details
const updatePersonalDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { gender, removePhotos, ...personalDetails } = req.body;
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;

    // Find the biodata document
    const biodata = await Biodata.findOne({ userId });
    if (!biodata) {
      return res.status(400).json({
        status: false,
        message: "No biodata found. Use the create endpoint to add personal details.",
      });
    }

    // Validate contactNumber1 if provided
    if (
      personalDetails.contactNumber1 &&
      !mobileRegex.test(personalDetails.contactNumber1)
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid ContactNumber1. Please enter a valid 10-digit mobile number.",
      });
    }

    // Validate contactNumber2 if provided
    if (
      personalDetails.contactNumber2 &&
      !mobileRegex.test(personalDetails.contactNumber2)
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid ContactNumber2. Please enter a valid 10-digit mobile number.",
      });
    }

    // ─── Handle closeUpPhoto array ────────────────────────────────────────────

    // Start with existing photos
    let existingPhotos = biodata.personalDetails?.closeUpPhoto || [];

    // Step 1: Remove photos if client sent removePhotos (URL or array of URLs)
    // Client sends:  removePhotos: "/uploads/abc.jpg"
    //            or  removePhotos: ["/uploads/abc.jpg", "/uploads/def.jpg"]
    if (removePhotos) {
      const toRemove = Array.isArray(removePhotos) ? removePhotos : [removePhotos];
      existingPhotos = existingPhotos.filter((p) => !toRemove.includes(p));
    }

    // Step 2: Append newly uploaded photos
    const uploadedPhotos = req.files?.['closeUpPhoto'] || [];
    const newPhotoPaths = uploadedPhotos.map((file) =>
      file.path.replace(/\\/g, "/")
    );
    const mergedPhotos = [...existingPhotos, ...newPhotoPaths];

    // Step 3: Validate final count is within 1–3
    if (mergedPhotos.length < 1) {
      return res.status(400).json({
        status: false,
        message: "At least one close-up photo is required.",
      });
    }

    if (mergedPhotos.length > 3) {
      return res.status(400).json({
        status: false,
        message: `Too many photos. You can have a maximum of 3 close-up photos. Currently you would have ${mergedPhotos.length}.`,
      });
    }

    personalDetails.closeUpPhoto = mergedPhotos;

    // ──────────────────────────────────────────────────────────────────────────

    // Merge personal details with existing ones
    biodata.personalDetails = {
      ...biodata.personalDetails.toObject?.() ?? biodata.personalDetails,
      ...personalDetails,
    };

    if (gender) {
      biodata.gender = gender;
    }

    await biodata.save();

    return res.status(200).json({
      status: true,
      message: "Personal details updated successfully.",
      data: biodata,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error updating personal details.",
      error: error.message,
    });
  }
};

// Create Partner Preferences
const createPartnerPreferences = async (req, res) => {
  try {
    const { _id: userId, userId: bioDataId } = req.user; // Get userId from the authenticated user
    const partnerPreferences = req.body; // Get partner preferences from the request body

    // Check if biodata already exists for this user
    const existingBiodata = await Biodata.findOne({ userId });

    //check if existingBioData
    if (!existingBiodata) {
      return res.status(400).json({
        status: false,
        message:
          "Please create your Biodata first then set partner's preference.",
      });
    }

    if (existingBiodata?.partnerPreferences != null) {
      return res.status(400).json({
        status: false,
        message:
          "Invalid Request! Partner Preferences already added for this user.",
      }); // Return error if partner preferences already exist for this user
    }

    // Merge partner preferences and gender if biodata exists
    existingBiodata.partnerPreferences = partnerPreferences;
    await existingBiodata.save();

    //return success
    return res.status(200).json({
      status: true,
      message: "Partner preferences added successfully.",
      data: existingBiodata,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error creating partner preferences.",
      error: error.message,
    });
  }
};

// Update Partner Preferences
const updatePartnerPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const partnerPreferences = req.body;

    // Find the biodata document
    const biodata = await Biodata.findOne({ userId });
    if (!biodata) {
      return res.status(400).json({
        status: false,
        message:
          "No biodata found. Use the create endpoint to add partner preferences.",
      });
    }

    // Merge partner preferences into the existing biodata
    biodata.partnerPreferences = {
      ...biodata.partnerPreferences,
      ...partnerPreferences,
    };

    // If personal details exist, don't overwrite, just merge
    if (biodata.personalDetails) {
      await biodata.save();
      return res.status(200).json({
        status: true,
        message: "Partner preferences updated successfully.",
        data: biodata,
      });
    }

    // If no personal details exist, you may want to prompt the user to add them
    res.status(400).json({
      status: false,
      message:
        "Personal details are required before updating partner preferences.",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error updating partner preferences.",
      error: error.message,
    });
  }
};

// Get biodata
const getBiodata = async (req, res) => {
  try {
    const userId = req.user._id;
    const biodata = await Biodata.findOne({ userId }).lean();

    if (!biodata) {
      return res.status(400).json({
        status: false,
        message: "No biodata found for this user.",
      });
    }

    // Build complete personalDetails with all fields (show null for missing optional fields)
    const personalDetails = {
      fullname: biodata.personalDetails?.fullname || null,
      subCaste: biodata.personalDetails?.subCaste || null,
      dob: biodata.personalDetails?.dob || null,
      placeofbirth: biodata.personalDetails?.placeofbirth || null,
      maritalStatus: biodata.personalDetails?.maritalStatus || null,
      disabilities: biodata.personalDetails?.disabilities || null,
      heightFeet: biodata.personalDetails?.heightFeet || null,
      weight: biodata.personalDetails?.weight || null,
      timeOfBirth: biodata.personalDetails?.timeOfBirth || null,
      complexion: biodata.personalDetails?.complexion || null,
      manglikStatus: biodata.personalDetails?.manglikStatus || null,
      qualification: biodata.personalDetails?.qualification || null,
      occupation: biodata.personalDetails?.occupation || null,
      annualIncome: biodata.personalDetails?.annualIncome || null,
      currentCity: biodata.personalDetails?.currentCity || null,
      aboutMe: biodata.personalDetails?.aboutMe || null,
      profileCreatedBy: biodata.personalDetails?.profileCreatedBy || null,
      fatherName: biodata.personalDetails?.fatherName || null,
      motherName: biodata.personalDetails?.motherName || null,
      fatherOccupation: biodata.personalDetails?.fatherOccupation || null,
      fatherIncomeAnnually: biodata.personalDetails?.fatherIncomeAnnually || null,
      motherOccupation: biodata.personalDetails?.motherOccupation || null,
      familyType: biodata.personalDetails?.familyType || null,
      siblings: biodata.personalDetails?.siblings || null,
      otherFamilyMemberInfo: biodata.personalDetails?.otherFamilyMemberInfo || null,
      contactNumber1: biodata.personalDetails?.contactNumber1 || null,
      contactNumber2: biodata.personalDetails?.contactNumber2 || null,
      state: biodata.personalDetails?.state || null,
      cityOrVillage: biodata.personalDetails?.cityOrVillage || null,
      knowCooking: biodata.personalDetails?.knowCooking || null,
      dietaryHabit: biodata.personalDetails?.dietaryHabit || null,
      smokingHabit: biodata.personalDetails?.smokingHabit || null,
      tobaccoHabits: biodata.personalDetails?.tobaccoHabits || null,
      drinkingHabit: biodata.personalDetails?.drinkingHabit || null,
      hobbies: biodata.personalDetails?.hobbies || null,
      gotraSelf: biodata.personalDetails?.gotraSelf || null,
      livingStatus: biodata.personalDetails?.livingStatus || null,
      partnerExpectations: biodata.personalDetails?.partnerExpectations || null,
      closeUpPhoto: biodata.personalDetails?.closeUpPhoto || [],  // ✅ was missing
    };

    // Build complete partnerPreferences (null if not filled yet)
    const partnerPreferences = biodata.partnerPreferences
      ? {
        partnerSubCaste: biodata.partnerPreferences?.partnerSubCaste || null,
        partnerMinAge: biodata.partnerPreferences?.partnerMinAge || null,
        partnerMaxAge: biodata.partnerPreferences?.partnerMaxAge || null,
        partnerMinHeightFeet: biodata.partnerPreferences?.partnerMinHeightFeet || null,
        partnerMaxHeightFeet: biodata.partnerPreferences?.partnerMaxHeightFeet || null,
        partnerMaritalStatus: biodata.partnerPreferences?.partnerMaritalStatus || null,
        partnerIncome: biodata.partnerPreferences?.partnerIncome || null,
        partnerOccupation: biodata.partnerPreferences?.partnerOccupation || null,
        partnerQualification: biodata.partnerPreferences?.partnerQualification || null,
        partnerDisabilities: biodata.partnerPreferences?.partnerDisabilities || null,
        partnerManglikStatus: biodata.partnerPreferences?.partnerManglikStatus || null,
        partnersLivingStatus: biodata.partnerPreferences?.partnersLivingStatus || null,
        partnerState: biodata.partnerPreferences?.partnerState || null,
        partnerCity: biodata.partnerPreferences?.partnerCity || null,
        partnerBodyStructure: biodata.partnerPreferences?.partnerBodyStructure || null,
        partnerComplexion: biodata.partnerPreferences?.partnerComplexion || null,
        partnerDietaryHabits: biodata.partnerPreferences?.partnerDietaryHabits || null,
        partnerSmokingHabits: biodata.partnerPreferences?.partnerSmokingHabits || null,
        partnerDrinkingHabits: biodata.partnerPreferences?.partnerDrinkingHabits || null,
        partnerExpectations: biodata.partnerPreferences?.partnerExpectations || null,
        partnerFamilyType: biodata.partnerPreferences?.partnerFamilyType || null,
        partnerFamilyFinancialStatus: biodata.partnerPreferences?.partnerFamilyFinancialStatus || null,
        partnerFamilyIncome: biodata.partnerPreferences?.partnerFamilyIncome || null,
      }
      : null;

    return res.status(200).json({
      status: true,
      data: {
        _id: biodata._id,
        userId: biodata.userId,
        bioDataId: biodata.bioDataId,
        gender: biodata.gender,
        personalDetails,          // ✅ all fields including closeUpPhoto
        partnerPreferences,       // ✅ now included (null if not added yet)
        verified: biodata.verified,
        verifiedBy: biodata.verifiedBy || null,
        profileType: biodata.profileType,
        hideContact: biodata.hideContact,
        isBlur: biodata.isBlur,
        hideOptionalDetails: biodata.hideOptionalDetails,
        activityStatus: biodata.activityStatus,
        activeStartDate: biodata.activeStartDate,
        activeEndDate: biodata.activeEndDate,
        repostStatus: biodata.repostStatus,
        lastRepostedAt: biodata.lastRepostedAt,
        latestActivityAt: biodata.latestActivityAt,
        createdAt: biodata.createdAt,
        updatedAt: biodata.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching biodata.",
      error: error.message,
    });
  }
};
// Get biodataByUserId for basic user
const getBiodataByUserId = async (req, res) => {
  try {
    const { id } = req.params;
    const loggedInUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid user ID format.",
      });
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found.",
      });
    }

    const biodata = await Biodata.findOne({ userId: id }).lean();
    if (!biodata) {
      return res.status(404).json({
        status: false,
        message: "No biodata found for this user.",
      });
    }

    const saved = await SavedProfile.findOne({
      userId: loggedInUserId,
      saveProfile: biodata._id,
    });

    const isSaved = !!saved;

    // Build personalDetails with all fields explicitly
    const personalDetails = {
      fullname: biodata.personalDetails?.fullname || null,
      subCaste: biodata.personalDetails?.subCaste || null,
      dob: biodata.personalDetails?.dob || null,
      placeofbirth: biodata.personalDetails?.placeofbirth || null,
      maritalStatus: biodata.personalDetails?.maritalStatus || null,
      disabilities: biodata.personalDetails?.disabilities || null,
      heightFeet: biodata.personalDetails?.heightFeet || null,
      weight: biodata.personalDetails?.weight || null,
      timeOfBirth: biodata.personalDetails?.timeOfBirth || null,
      complexion: biodata.personalDetails?.complexion || null,
      manglikStatus: biodata.personalDetails?.manglikStatus || null,
      qualification: biodata.personalDetails?.qualification || null,
      occupation: biodata.personalDetails?.occupation || null,
      annualIncome: biodata.personalDetails?.annualIncome || null,
      currentCity: biodata.personalDetails?.currentCity || null,
      aboutMe: biodata.personalDetails?.aboutMe || null,
      profileCreatedBy: biodata.personalDetails?.profileCreatedBy || null,
      fatherName: biodata.personalDetails?.fatherName || null,
      motherName: biodata.personalDetails?.motherName || null,
      fatherOccupation: biodata.personalDetails?.fatherOccupation || null,
      fatherIncomeAnnually: biodata.personalDetails?.fatherIncomeAnnually || null,
      motherOccupation: biodata.personalDetails?.motherOccupation || null,
      familyType: biodata.personalDetails?.familyType || null,
      siblings: biodata.personalDetails?.siblings || null,
      otherFamilyMemberInfo: biodata.personalDetails?.otherFamilyMemberInfo || null,
      contactNumber1: biodata.hideContact ? null : (biodata.personalDetails?.contactNumber1 || null),   // ✅ respect hideContact
      contactNumber2: biodata.hideContact ? null : (biodata.personalDetails?.contactNumber2 || null),   // ✅ respect hideContact
      state: biodata.personalDetails?.state || null,
      cityOrVillage: biodata.personalDetails?.cityOrVillage || null,
      knowCooking: biodata.personalDetails?.knowCooking || null,
      dietaryHabit: biodata.personalDetails?.dietaryHabit || null,
      smokingHabit: biodata.personalDetails?.smokingHabit || null,
      tobaccoHabits: biodata.personalDetails?.tobaccoHabits || null,
      drinkingHabit: biodata.personalDetails?.drinkingHabit || null,
      hobbies: biodata.personalDetails?.hobbies || null,
      gotraSelf: biodata.personalDetails?.gotraSelf || null,
      livingStatus: biodata.personalDetails?.livingStatus || null,
      partnerExpectations: biodata.personalDetails?.partnerExpectations || null,
      closeUpPhoto: biodata.isBlur
        ? (biodata.personalDetails?.closeUpPhoto || []).map(() => null)  // ✅ respect isBlur — return nulls instead of photo paths
        : (biodata.personalDetails?.closeUpPhoto || []),
    };

    return res.status(200).json({
      status: true,
      message: "User biodata fetched successfully.",
      data: {
        isSaved,
        biodata: {
          _id: biodata._id,
          userId: biodata.userId,
          bioDataId: biodata.bioDataId,
          gender: biodata.gender,
          personalDetails,          
          verified: biodata.verified,
          verifiedBy: biodata.verifiedBy || null,
          profileType: biodata.profileType,
          hideContact: biodata.hideContact,
          isBlur: biodata.isBlur,
          hideOptionalDetails: biodata.hideOptionalDetails,
          activityStatus: biodata.activityStatus,
          activeStartDate: biodata.activeStartDate,
          activeEndDate: biodata.activeEndDate,
          repostStatus: biodata.repostStatus,
          lastRepostedAt: biodata.lastRepostedAt,
          latestActivityAt: biodata.latestActivityAt,
          createdAt: biodata.createdAt,
          updatedAt: biodata.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user biodata:", error);
    return res.status(500).json({
      status: false,
      message: "Error fetching biodata.",
      error: error.message,
    });
  }
};

// repostBioData
const repostBioData = async (req, res) => {
  try {
    const userId = req?.user?._id;

    const REPOST_COOLDOWN = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    // Fetch user's biodata
    const bioData = await Biodata.findOne({ userId });

    if (!bioData) {
      return res.status(400).json({
        status: false,
        message: "Matrimonial Profile BioData not found!",
      });
    }

    // Check if the profile was reposted recently and handle cooldown
    const timeSinceLastRepost =
      Date.now() - new Date(bioData.lastRepostedAt).getTime();

    // If it's been more than 7 days, reset the repost status to "No"
    if (timeSinceLastRepost > REPOST_COOLDOWN) {
      bioData.repostStatus = "No";
    }

    // If the profile is still within the repost cooldown period, block repost
    if (
      bioData.repostStatus === "Yes" &&
      timeSinceLastRepost < REPOST_COOLDOWN
    ) {
      const timeRemainingInDays = Math.ceil(
        (REPOST_COOLDOWN - timeSinceLastRepost) / (1000 * 60 * 60 * 24)
      );
      const timeRemainingInHours = Math.ceil(
        (REPOST_COOLDOWN - timeSinceLastRepost) / (1000 * 60 * 60)
      );

      return res.status(200).json({
        status: true,
        message: `Cooldown period active! You can repost again in ${timeRemainingInDays} days (${timeRemainingInHours} hours).`,
      });
    }

    // Proceed with reposting (set repostStatus to "Yes" and update lastRepostedAt)
    bioData.repostStatus = "Yes";
    bioData.lastRepostedAt = new Date();
    bioData.latestActivityAt = new Date();

    // Save the updated bioData
    await bioData.save();

    // Respond with success
    return res.status(200).json({
      status: true,
      message: "Profile successfully reposted!",
      bioData,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Server error, please try again later.",
      error: err.message,
    });
  }
};

//delete Biodata Profile
const deleteBiodataProfile = async (req, res) => {
  try {
    const userId = req?.user?._id;

    const exitsBiodata = await Biodata.findOne({ userId });

    //if Biodata Profile is not exists then
    if (!exitsBiodata) {
      return res
        .status(400)
        .json({ status: false, message: "Biodata Profile Not Found!" });
    }

    // Run deletion tasks in parallel using Promise.all
    const deletionPromises = [
      ConnectionRequest.deleteMany({
        $or: [{ toUserId: userId }, { fromUserId: userId }],
      }),
      SavedProfile.deleteMany({ saveProfile: exitsBiodata._id }),
      Report.deleteMany({
        profileId: exitsBiodata._id,
        profileType: exitsBiodata.profileType,
      }),
      Notification.deleteMany({
        $or: [
          { "relatedData.BiodataId": exitsBiodata?.bioDataId },
          { "relatedData.fromUserId": userId },
          { "relatedData.toUserId": userId }
        ]
      }),
      Biodata.deleteOne({ userId }),
    ];

    const results = await Promise.allSettled(deletionPromises); // Use Promise.allSettled to handle each promise result

    // Collect failed deletions
    const failedDeletions = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (failedDeletions.length > 0) {
      console.error("Some deletions failed:", failedDeletions);
    }

    // Mark the isMatrimonial as false after successful deletion
    await User.updateOne({ _id: userId }, { $set: { isMatrimonial: false } });

    return res.status(200).json({
      status: true,
      message: "Biodata Account Deleted Successfully.",
      data: results.map((result) => result.value),
      failedDeletions,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

module.exports = {
  createPersonalDetails,
  updatePersonalDetails,
  createPartnerPreferences,
  updatePartnerPreferences,
  getBiodata,
  getBiodataByUserId,
  repostBioData,
  deleteBiodataProfile,
};
