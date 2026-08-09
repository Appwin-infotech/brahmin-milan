const Jyotish = require("../models/jyotish");
const Rating = require("../models/rating");
const { default: mongoose } = require("mongoose");
const SavedProfile = require("../models/savedProfiles");
const Report = require("../models/report");
const User = require("../models/user");
const Admin = require("../models/admin");
const Notification = require("../models/notification");
const { sendNotificationToAdmin } = require("../socket/socket.server");
const fs = require("fs");
const path = require("path");

// Builds the public URL for a file Multer just saved to /uploads
const buildImageUrl = (filename) => `${process.env.BASE_URL}/uploads/${filename}`;

// Deletes a local uploads/ file given its public URL. Safe no-op for
// non-local (e.g. leftover Cloudinary) URLs or missing files.
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

const createJyotishProfile = async (req, res) => {
  try {
    const {
      mobileNo,
      fullName,
      residentialAddress,
      state,
      city,
      jyotishServices,
      experience,
      description,
      ...otherData
    } = req.body;

    const { _id: userId, userId: jyotishId } = req?.user;

    // ✅ Required fields
    if (!mobileNo || !fullName || !state || !city || !jyotishServices || !userId) {
      return res.status(400).json({
        status: false,
        message: "All required fields must be provided",
      });
    }

    // Convert jyotishServices from string to array if needed
    let jyotishServicesArray = jyotishServices;
    if (typeof jyotishServices === "string") {
      try {
        jyotishServicesArray = JSON.parse(jyotishServices);
        if (!Array.isArray(jyotishServicesArray)) {
          throw new Error();
        }
      } catch {
        return res.status(400).json({
          status: false,
          message: "Invalid format for jyotishServices. It should be a JSON array of strings.",
        });
      }
    }

    // ✅ Validate mobile number
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNo)) {
      return res.status(400).json({
        status: false,
        message: "Invalid mobile number! Please enter a valid mobile number.",
      });
    }

    // ✅ Prevent duplicates
    const existingMobileNo = await Jyotish.findOne({ mobileNo });
    if (existingMobileNo) {
      return res.status(400).json({
        status: false,
        message: "A Jyotish Profile already exists with the provided details.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ status: false, message: "Invalid user ID" });
    }

    // ✅ Validate experience format
    const experienceRegex = /^(\d+(-\d+)?|\d+\+)?$/;
    if (experience && !experienceRegex.test(experience)) {
      return res.status(400).json({
        status: false,
        message: "Invalid experience format",
      });
    }

    // ✅ Check active subscription
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    const activeSubscription = user.serviceSubscriptions?.find(
      (subscription) =>
        subscription.serviceType === "Jyotish" &&
        subscription.status === "Active" &&
        new Date(subscription.endDate) > new Date()
    );

    if (!activeSubscription) {
      return res.status(400).json({
        status: false,
        message: "You must have an active Jyotish subscription to create a profile.",
      });
    }

    // 🔹 profilePhoto - max 1 (Multer populates req.files.profilePhoto as an array)
    let photoUrlPath = null;
    if (req.files?.profilePhoto) {
      const profilePhotoFiles = req.files.profilePhoto;

      if (profilePhotoFiles.length > 1) {
        profilePhotoFiles.forEach((f) => fs.unlink(f.path, () => {}));
        return res.status(400).json({
          status: false,
          message: "Only 1 profile photo is allowed.",
        });
      }

      photoUrlPath = buildImageUrl(profilePhotoFiles[0].filename);
    }

    // 🔹 additionalPhotos - max 5
    let additionalPhotosUrls = [];
    if (req.files?.additionalPhotos) {
      const additionalFiles = req.files.additionalPhotos;

      if (additionalFiles.length > 5) {
        additionalFiles.forEach((f) => fs.unlink(f.path, () => {}));
        return res.status(400).json({
          status: false,
          message: "You can only upload a maximum of 5 additional photos.",
        });
      }

      additionalPhotosUrls = additionalFiles.map((file) => buildImageUrl(file.filename));
    }

    // ✅ Create Jyotish Profile
    const newJyotish = new Jyotish({
      userId,
      jyotishId,
      fullName,
      mobileNo,
      residentialAddress,
      state,
      city,
      experience,
      description,
      jyotishServices: jyotishServicesArray,
      profilePhoto: photoUrlPath,
      additionalPhotos: additionalPhotosUrls,
      ...otherData,
    });

    await newJyotish.save();

    // ✅ Flag user as Jyotish
    user.isJyotish = true;
    await user.save();

    // ✅ Notify Admins
    const admins = await Admin.find();
    if (admins.length > 0) {
      const notificationMessage = `${fullName} has created a Jyotish profile.`;

      for (const admin of admins) {
        sendNotificationToAdmin(
          "jyotishCreated",
          admin._id,
          notificationMessage,
          photoUrlPath,
          newJyotish
        );

        const notification = new Notification({
          userId: admin._id,
          userType: "Admin",
          notificationType: "jyotishCreated",
          relatedData: {
            jyotishId: newJyotish._id,
            createdBy: fullName,
            photoUrl: photoUrlPath,
          },
          message: notificationMessage,
          seen: false,
        });

        await notification.save();
      }
    }

    return res.status(200).json({
      status: true,
      message: "Jyotish profile created successfully.",
      data: newJyotish,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//updateJyotishProfile
const updateJyotishProfile = async (req, res) => {
  try {
    const userId = req?.user?._id;

    const dataForUpdate = req?.body;

    if (!dataForUpdate) {
      return res
        .status(400)
        .json({
          status: false,
          message: "Data is Required For Updating JyotishRequest Profile!",
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

    // Handle jyotishServices if sent as JSON string
    if (dataForUpdate.jyotishServices && typeof dataForUpdate.jyotishServices === "string") {
      try {
        dataForUpdate.jyotishServices = JSON.parse(dataForUpdate.jyotishServices);
        if (!Array.isArray(dataForUpdate.jyotishServices)) {
          throw new Error();
        }
      } catch {
        return res.status(400).json({
          status: false,
          message: "Invalid format for jyotishServices. It should be a JSON array of strings.",
        });
      }
    }

    //check if JyotishRequest profile exists (fetched early so we can clean up old files)
    const existingJyotish = await Jyotish.findOne({ userId: userId });

    if (!existingJyotish) {
      return res
        .status(400)
        .json({ status: false, message: "Jyotish Profile Not Found!" });
    }

    // 🔹 Handle profilePhoto upload - max 1
    if (req.files?.profilePhoto) {
      const profilePhotoFiles = req.files.profilePhoto;

      if (profilePhotoFiles.length > 1) {
        profilePhotoFiles.forEach((f) => fs.unlink(f.path, () => {}));
        return res.status(400).json({
          status: false,
          message: "Only 1 profile photo is allowed.",
        });
      }

      // old profile photo is being replaced — remove it from disk
      if (existingJyotish.profilePhoto) {
        deleteLocalImage(existingJyotish.profilePhoto);
      }

      dataForUpdate.profilePhoto = buildImageUrl(profilePhotoFiles[0].filename);
    }

    // 🔹 Handle additionalPhotos upload - max 5
    if (req.files?.additionalPhotos) {
      const additionalFiles = req.files.additionalPhotos;

      if (additionalFiles.length > 5) {
        additionalFiles.forEach((f) => fs.unlink(f.path, () => {}));
        return res.status(400).json({
          status: false,
          message: "You can only upload a maximum of 5 additional photos.",
        });
      }

      // old additional photos are being replaced — remove them from disk
      if (Array.isArray(existingJyotish.additionalPhotos)) {
        existingJyotish.additionalPhotos.forEach(deleteLocalImage);
      }

      dataForUpdate.additionalPhotos = additionalFiles.map((file) => buildImageUrl(file.filename));
    }

    //update JyotishRequest profile
    const updatedJyotish = await Jyotish.updateOne(
      { userId },
      { $set: dataForUpdate }
    );

    // Check if the update operation was successful
    if (updatedJyotish.modifiedCount === 0) {
      return res
        .status(400)
        .json({
          status: false,
          message: "No changes were made to the Jyotish Profile.",
        });
    }

    // Return success response
    return res.status(200).json({
      status: true,
      message: "Jyotish profile Details updated successfully.",
      data: updatedJyotish,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

//getJyotishProfile of an specific user by its _id
const getJyotishProfileById = async (req, res) => {
  try {
    const jyotishId = req.params.id;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(jyotishId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid Jyotish ID format",
      });
    }

    const JyotishProfile = await Jyotish.findById(jyotishId).populate({
      path: "ratings",
      select: "-__v",
      options: { sort: { createdAt: -1 } },
      populate: {
        path: "userId",
        select: "username city photoUrl",
      },
    });

    if (!JyotishProfile) {
      return res.status(400).json({
        status: false,
        message: "Jyotish profile not found",
      });
    }

    const totalReviews = JyotishProfile?.ratings?.length || 0;
    const averageRating = totalReviews
      ? JyotishProfile.ratings.reduce(
          (acc, rating) => acc + (rating?.rating || 0),
          0
        ) / totalReviews
      : 0;
    const roundedAverageRating = averageRating.toFixed(1);

    // ✅ Check if the Jyotish profile is saved by the user
    const saved = await SavedProfile.findOne({
      userId,
      saveProfile: jyotishId,
      profileType: "Jyotish",
    });

    const responseData = {
      ...JyotishProfile.toObject(),
      totalReviews,
      averageRating: roundedAverageRating,
      isSaved: !!saved,
    };

    return res.status(200).json({
      status: true,
      message: `Jyotish ${JyotishProfile?.fullName} profile fetched successfully`,
      data: responseData,
    });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};


// Add Ratings & Reviews To Jyotish
const addJyotishReviewRating = async (req, res) => {
  try {
    const { entityId, entityType, rating, review } = req.body;
    const { _id: userId } = req?.user;

    // Validate if the provided `JyotishId` is valid
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res
        .status(400)
        .json({
          status: false,
          message: "Invalid Jyotish or Entity ID format",
        });
    }

    // Validate if the provided `userId` is valid (optional but good practice)
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user ID format" });
    }

    // Check if the user is trying to review their own Jyotish profile
    const jyotishProfile = await Jyotish.findById(entityId).select("userId");
    if (!jyotishProfile) {
      return res
        .status(400)
        .json({ status: false, message: "Jyotish profile not found!" });
    }

    if (String(jyotishProfile.userId) === String(userId)) {
      return res
        .status(400)
        .json({
          status: false,
          message: "You cannot review your own Jyotish profile!",
        });
    }

    // Check if the user has already reviewed this Jyotish
    const existingReviewRating = await Rating.findOne({ entityId, userId });
    if (existingReviewRating) {
      return res
        .status(400)
        .json({
          status: false,
          message: "You have already posted a review & rating.",
        });
    }

    // Create a new review & rating
    const reviewRating = new Rating({
      userId,
      entityId,
      entityType,
      rating,
      review,
    });
    await reviewRating.save();

    // Add the new reviewRating ID to the Jyotish's ratings array
    await Jyotish.findByIdAndUpdate(entityId, {
      $push: { ratings: reviewRating._id },
    });

    // Send successful response
    return res.status(200).json({
      status: true,
      message: "Review & Rating saved successfully",
    });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};

// Update Ratings & Reviews for Jyotish
const updateJyotishReviewRating = async (req, res) => {
  try {
    const { entityId, rating, review } = req.body;
    const { _id: userId } = req?.user;

    // Validate if the provided `entityId` (Jyotish ID) is valid
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res
        .status(400)
        .json({
          status: false,
          message: "Invalid Jyotish or Entity ID format",
        });
    }

    // Validate if the provided `userId` is valid (optional but good practice)
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user ID format" });
    }

    // Check if the Jyotish profile exists
    const JyotishProfile = await Jyotish.findById(entityId).select("userId");

    if (!JyotishProfile) {
      return res
        .status(400)
        .json({ status: false, message: "Jyotish profile not found!" });
    }

    // Check if the user is trying to review their own Jyotish profile
    if (String(JyotishProfile.userId) === String(userId)) {
      return res
        .status(400)
        .json({
          status: false,
          message: "You cannot update your own Jyotish profile review!",
        });
    }

    // Check if the user has already posted a review for this Jyotish
    const existingReviewRating = await Rating.findOne({ entityId, userId });

    if (!existingReviewRating) {
      return res
        .status(400)
        .json({
          status: false,
          message: "No existing review found to update.",
        });
    }

    // Update the review and rating
    existingReviewRating.rating = rating || existingReviewRating.rating;
    existingReviewRating.review = review || existingReviewRating.review;

    // Save the updated review and rating
    await existingReviewRating.save();

    // Send successful response
    return res.status(200).json({
      status: true,
      message: "Review & Rating updated successfully",
    });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};

const getAllJyotish = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const { locality, services, rating, experience } = req.query;

    // Step 1: Get userIds with active Jyotish subscription
    const activeJyotishUsers = await User.find({
      serviceSubscriptions: {
        $elemMatch: {
          serviceType: "Jyotish",
          status: "Active",
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        },
      },
    }).select("_id");

    const activeUserIds = activeJyotishUsers.map((user) => user._id);

    // Step 2: Prepare filter conditions
    let filterConditions = {
      isEnabled: true,
      userId: { $in: activeUserIds },
    };

    if (locality) {
      filterConditions.city = { $regex: locality, $options: "i" };
    }

    if (services) {
      const servicesArray = services.split(",");
      filterConditions.jyotishServices = { $in: servicesArray };
    }

    // Step 3: Rating & experience filters
    let ratingMatch = {};
    if (rating) {
      ratingMatch = { $gte: parseFloat(rating) };
    }

    // Step 4: Aggregation
    const jyotishs = await Jyotish.aggregate([
      { $match: filterConditions },

      // Lookup ratings
      {
        $lookup: {
          from: "ratings",
          localField: "_id",
          foreignField: "entityId",
          pipeline: [
            { $match: { entityType: "Jyotish" } },
            { $project: { rating: 1, review: 1, userId: 1 } },
          ],
          as: "reviews",
        },
      },

      // Calculate total reviews & avg rating
      {
        $addFields: {
          totalReviews: { $size: "$reviews" },
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: "$reviews" }, 0] },
              then: { $avg: "$reviews.rating" },
              else: 0,
            },
          },
        },
      },
      { $addFields: { averageRating: { $round: ["$averageRating", 1] } } },

      // Filter by rating if provided
      ...(rating ? [{ $match: { averageRating: ratingMatch } }] : []),

      // Filter by experience if provided (safe conversion)
      ...(experience
        ? [
            {
              $match: {
                $expr: {
                  $gte: [
                    {
                      $convert: {
                        input: "$experience",
                        to: "int",
                        onError: 0,
                        onNull: 0
                      }
                    },
                    parseInt(experience)
                  ],
                },
              },
            },
            {
              $addFields: {
                experienceNum: {
                  $convert: {
                    input: "$experience",
                    to: "int",
                    onError: 0,
                    onNull: 0
                  }
                },
              },
            },
          ]
        : []),

      // Lookup saved profiles for current user
      {
        $lookup: {
          from: "savedprofiles",
          let: { jyotishId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", userId] },
                    { $eq: ["$saveProfile", "$$jyotishId"] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "saved",
        },
      },
      { $addFields: { isSaved: { $gt: [{ $size: "$saved" }, 0] } } },
      { $project: { reviews: 0, saved: 0 } },

      // Combined sort
      {
        $sort: rating
          ? experience
            ? { averageRating: 1, experienceNum: 1 } // rating asc, then experience asc
            : { averageRating: 1 } // only rating asc
          : experience
          ? { experienceNum: 1 } // only experience asc
          : { createdAt: -1 }, // default latest
      },
    ]);

    if (!jyotishs || jyotishs.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Jyotish reviews & ratings not available yet.",
      });
    }

    return res.status(200).json({ status: true, data: jyotishs });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message || "Something went wrong.",
    });
  }
};


//shareProfiles API to generate a shareable link for a profile
const shareJyotishProfile = async (req, res) => {
  const profileId = req.params.id;

  try {
    // Find the profile by ID
    const profile = await Jyotish.findById(profileId);

    if (!profile) {
      return res
        .status(400)
        .json({ status: false, message: "Profile not found" });
    }

    // Generate the shareable link (URL)
    const shareableLink = `${process.env.SHAREABLEPROFILE_URL}/api/v1/jyotish/jyotishProfileData/${profileId}`;

    return res.status(200).json({
      status: true,
      message: "Profile link generated successfully",
      shareableLink,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        status: false,
        message: "Error generating share link",
        error: error.message,
      });
  }
};

//view Jyotish Profile
const viewJyotish = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const jyotish = await Jyotish.aggregate([
      {
        $match: { userId: { $eq: userId } }, // Apply filter conditions to Jyotish profiles
      },
      {
        $lookup: {
          from: "ratings", // Ratings collection
          localField: "_id", // Reference to Jyotish's _id
          foreignField: "entityId", // Rating's field referring to Jyotish (entityId)
          pipeline: [
            {
              $match: { entityType: "Jyotish" }, // Only include ratings for Jyotishs
            },
            {
              $project: { rating: 1, review: 1, userId: 1 }, // Include rating, review, and userId
            },
          ],
          as: "reviews", // Alias for the resulting array of reviews
        },
      },
      {
        $addFields: {
          totalReviews: { $size: "$reviews" }, // Count the total number of reviews
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: "$reviews" }, 0] }, // If reviews exist
              then: { $avg: "$reviews.rating" }, // Calculate average rating
              else: 0, // If no reviews, set to 0
            },
          },
        },
      },
      // Round the averageRating to 1 decimal place
      {
        $addFields: {
          averageRating: { $round: ["$averageRating", 1] }, // Round to 1 decimal place
        },
      },
      {
        $project: {
          reviews: 0, // Optionally remove the 'reviews' field from the output
        },
      },
    ]);

    //if Jyotish Profile is not exists then
    if (!jyotish) {
      return res
        .status(400)
        .json({ status: false, message: "Jyotish Profile Not Found!" });
    }

    return res.status(200).json({
      status: true,
      message: "Jyotish Profile Data Fetched Successfully.",
      data: jyotish,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

//delete Jyotish Profile
const deleteJyotishProfile = async (req, res) => {
  try {
    const userId = req?.user?._id;

    const exitsJyotish = await Jyotish.findOne({ userId });

    //if Jyotish Profile is not exists then
    if (!exitsJyotish) {
      return res
        .status(400)
        .json({ status: false, message: "Jyotish Profile Not Found!" });
    }

    // Run deletion tasks in parallel using Promise.all
    const deletionPromises = [
      SavedProfile.deleteMany({ saveProfile: exitsJyotish._id }),
      Report.deleteMany({
        profileId: exitsJyotish._id,
        profileType: exitsJyotish.profileType,
      }),
      Rating.deleteMany({ entityId: exitsJyotish._id }),
      Jyotish.deleteOne({ userId }),
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
    if (exitsJyotish.profilePhoto) deleteLocalImage(exitsJyotish.profilePhoto);
    if (Array.isArray(exitsJyotish.additionalPhotos)) {
      exitsJyotish.additionalPhotos.forEach(deleteLocalImage);
    }

    // Mark the isJyotish as false after successful deletion
    await User.updateOne({ _id: userId }, { $set: { isJyotish: false } });

    return res.status(200).json({
      status: true,
      message: "Jyotish Account Deleted Successfully.",
      data: results.map((result) => result.value),
      failedDeletions,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

module.exports = {
  createJyotishProfile,
  updateJyotishProfile,
  getJyotishProfileById,
  addJyotishReviewRating,
  updateJyotishReviewRating,
  getAllJyotish,
  shareJyotishProfile,
  viewJyotish,
  deleteJyotishProfile,
};