const mongoose = require("mongoose");
const Rating = require("../models/rating");
const Pandit = require("../models/pandit");
const SavedProfile = require("../models/savedProfiles");
const Report = require("../models/report");
const User = require("../models/user");
const Notification = require("../models/notification");
const Admin = require("../models/admin");
const { sendNotificationToAdmin } = require("../socket/socket.server");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

const createPanditProfile = async (req, res) => {
  try {
    const {
      mobileNo,
      fullName,
      residentialAddress,
      state,
      city,
      panditServices,
      experience,
      description,
      ...otherData
    } = req.body;

    const { _id: userId, userId: panditId } = req?.user;

    if (!mobileNo || !fullName || !state || !city || !panditServices || !userId) {
      return res.status(400).json({
        status: false,
        message: "All required fields must be provided",
      });
    }

    // Convert panditServices from string to array if needed
    let panditServicesArray = panditServices;
    if (typeof panditServices === "string") {
      try {
        panditServicesArray = JSON.parse(panditServices);
        if (!Array.isArray(panditServicesArray)) {
          throw new Error();
        }
      } catch {
        return res.status(400).json({
          status: false,
          message: "Invalid format for panditServices. It should be a JSON array of strings.",
        });
      }
    }

    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNo)) {
      return res.status(400).json({
        status: false,
        message: "Invalid mobile number! Please enter a valid mobile number.",
      });
    }

    const existingMobileNo = await Pandit.findOne({ mobileNo });
    if (existingMobileNo) {
      return res.status(400).json({
        status: false,
        message: "A Pandit Profile already exists with the provided details.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ status: false, message: "Invalid user ID" });
    }

    const experienceRegex = /^(\d+(-\d+)?|\d+\+)?$/;
    if (experience && !experienceRegex.test(experience)) {
      return res.status(400).json({
        status: false,
        message: "Invalid experience format",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    const activeSubscription = user.serviceSubscriptions?.find(
      (subscription) =>
        subscription.serviceType === "Pandit" &&
        subscription.status === "Active" &&
        new Date(subscription.endDate) > new Date()
    );

    if (!activeSubscription) {
      return res.status(400).json({
        status: false,
        message: "You must have an active Pandit subscription to create a profile.",
      });
    }

    // 🔹 Validate profilePhoto - max 1
    let photoUrlPath = null;
    if (req.files?.profilePhoto) {
      const profilePhotoFiles = Array.isArray(req.files.profilePhoto)
        ? req.files.profilePhoto
        : [req.files.profilePhoto];

      if (profilePhotoFiles.length > 1) {
        return res.status(400).json({
          status: false,
          message: "Only 1 profile photo is allowed.",
        });
      }

      const upload = await uploadImageToCloudinary(
        profilePhotoFiles[0],
        process.env.FOLDER_NAME || "pandit",
        1200,
        600
      );

      if (!upload?.secure_url) {
        return res.status(500).json({
          status: false,
          message: "Profile photo upload failed.",
        });
      }

      photoUrlPath = upload.secure_url;
    }

    // 🔹 Validate additionalPhotos - max 5
    const additionalPhotosUrls = [];
    if (req.files?.additionalPhotos) {
      const additionalFiles = Array.isArray(req.files.additionalPhotos)
        ? req.files.additionalPhotos
        : [req.files.additionalPhotos];

      if (additionalFiles.length > 5) {
        return res.status(400).json({
          status: false,
          message: "You can only upload a maximum of 5 additional photos.",
        });
      }

      for (let i = 0; i < additionalFiles.length; i++) {
        const upload = await uploadImageToCloudinary(
          additionalFiles[i],
          process.env.FOLDER_NAME || "pandit",
          1200,
          600
        );

        if (!upload?.secure_url) {
          return res.status(500).json({
            status: false,
            message: "Additional photo upload failed.",
          });
        }

        additionalPhotosUrls.push(upload.secure_url);
      }
    }

    const newPandit = new Pandit({
      userId,
      panditId,
      fullName,
      mobileNo,
      residentialAddress,
      state,
      city,
      experience,
      panditServices: panditServicesArray,
      description,
      profilePhoto: photoUrlPath,
      additionalPhotos: additionalPhotosUrls,
      ...otherData,
    });

    await newPandit.save();

    user.isPandit = true;
    await user.save();

    const admins = await Admin.find();
    if (admins.length > 0) {
      const notificationMessage = `${fullName} has created a Pandit profile.`;
      for (const admin of admins) {
        sendNotificationToAdmin(
          "panditCreated",
          admin._id,
          notificationMessage,
          photoUrlPath,
          newPandit
        );

        const notification = new Notification({
          userId: admin._id,
          userType: "Admin",
          notificationType: "panditCreated",
          relatedData: {
            panditId: newPandit._id,
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
      message: "Pandit profile created successfully.",
      data: newPandit,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updatePanditProfile = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const dataForUpdate = req?.body;

    if (!dataForUpdate) {
      return res.status(400).json({
        status: false,
        message: "Data is required for updating Pandit profile!",
      });
    }

    // ✅ Handle panditServices if sent as JSON string
    if (dataForUpdate.panditServices && typeof dataForUpdate.panditServices === "string") {
      try {
        dataForUpdate.panditServices = JSON.parse(dataForUpdate.panditServices);
        if (!Array.isArray(dataForUpdate.panditServices)) {
          throw new Error();
        }
      } catch {
        return res.status(400).json({
          status: false,
          message: "Invalid format for panditServices. It should be a JSON array of strings.",
        });
      }
    }

    // Validate mobile number format
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (dataForUpdate.mobileNo && !mobileRegex.test(dataForUpdate.mobileNo)) {
      return res.status(400).json({
        status: false,
        message: "Invalid mobile number. Please enter a valid 10-digit mobile number.",
      });
    }

    // 🔹 Handle profilePhoto upload via Cloudinary - max 1
    if (req.files?.profilePhoto) {
      const profilePhotoFiles = Array.isArray(req.files.profilePhoto)
        ? req.files.profilePhoto
        : [req.files.profilePhoto];

      if (profilePhotoFiles.length > 1) {
        return res.status(400).json({
          status: false,
          message: "Only 1 profile photo is allowed.",
        });
      }

      const upload = await uploadImageToCloudinary(
        profilePhotoFiles[0],
        process.env.FOLDER_NAME || "pandit",
        1200,
        600
      );

      if (!upload?.secure_url) {
        return res.status(500).json({
          status: false,
          message: "Profile photo upload failed.",
        });
      }

      dataForUpdate.profilePhoto = upload.secure_url;
    }

    // 🔹 Handle additionalPhotos upload via Cloudinary - max 5
    if (req.files?.additionalPhotos) {
      const additionalFiles = Array.isArray(req.files.additionalPhotos)
        ? req.files.additionalPhotos
        : [req.files.additionalPhotos];

      if (additionalFiles.length > 5) {
        return res.status(400).json({
          status: false,
          message: "You can only upload a maximum of 5 additional photos.",
        });
      }

      const additionalPhotosUrls = [];
      for (let i = 0; i < additionalFiles.length; i++) {
        const upload = await uploadImageToCloudinary(
          additionalFiles[i],
          process.env.FOLDER_NAME || "pandit",
          1200,
          600
        );

        if (!upload?.secure_url) {
          return res.status(500).json({
            status: false,
            message: "Additional photo upload failed.",
          });
        }

        additionalPhotosUrls.push(upload.secure_url);
      }

      dataForUpdate.additionalPhotos = additionalPhotosUrls;
    }

    // Check if Pandit profile exists
    const existingPandit = await Pandit.findOne({ userId });
    if (!existingPandit) {
      return res.status(400).json({
        status: false,
        message: "Pandit profile not found!",
      });
    }

    // Update Pandit profile
    const updatedPandit = await Pandit.updateOne(
      { userId },
      { $set: dataForUpdate }
    );

    if (updatedPandit.modifiedCount === 0) {
      return res.status(400).json({
        status: false,
        message: "No changes were made to the Pandit profile.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Pandit profile details updated successfully.",
      data: updatedPandit,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


//getPanditProfile of an specific user by its _id
const getPanditProfileById = async (req, res) => {
  try {
    const panditId = req.params.id;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(panditId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid Pandit ID format" });
    }

    const panditProfile = await Pandit.findById(panditId).populate({
      path: "ratings",
      select: "-__v",
      options: { sort: { createdAt: -1 } },
      populate: {
        path: "userId",
        select: "username city photoUrl",
      },
    });

    if (!panditProfile) {
      return res
        .status(400)
        .json({ status: false, message: "Pandit profile not found" });
    }

    const totalReviews = panditProfile?.ratings?.length || 0;
    const averageRating = totalReviews
      ? panditProfile.ratings.reduce(
        (acc, rating) => acc + (rating?.rating || 0),
        0
      ) / totalReviews
      : 0;

    const roundedAverageRating = averageRating.toFixed(1);

    // Check if the profile is saved by the user
    const saved = await SavedProfile.findOne({
      userId,
      saveProfile: panditId,
      profileType: "Pandit",
    });

    const responseData = {
      ...panditProfile.toObject(),
      totalReviews,
      averageRating: roundedAverageRating,
      isSaved: saved ? true : false,
    };

    return res.status(200).json({
      status: true,
      message: `Pandit ${panditProfile?.fullName} profile fetched successfully`,
      data: responseData,
    });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};


// Add Ratings & Reviews To Pandit
const addPanditReviewRating = async (req, res) => {
  try {
    const { entityId, entityType, rating, review } = req.body;
    const { _id: userId } = req?.user;

    // Validate if the provided `panditId` is valid
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid Pandit or Entity ID format" });
    }

    // Validate if the provided `userId` is valid (optional but good practice)
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user ID format" });
    }

    // Check if the user is trying to review their own Pandit profile
    const panditProfile = await Pandit.findById(entityId).select("userId");

    if (!panditProfile) {
      return res
        .status(400)
        .json({ status: false, message: "Pandit profile not found!" });
    }

    if (String(panditProfile.userId) === String(userId)) {
      return res
        .status(400)
        .json({
          status: false,
          message: "You cannot review your own Pandit profile!",
        });
    }

    // Check if the user has already reviewed this Pandit
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

    // Add the new reviewRating ID to the Pandit's ratings array
    await Pandit.findByIdAndUpdate(entityId, {
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

// Update Ratings & Reviews for Pandit
const updatePanditReviewRating = async (req, res) => {
  try {
    const { entityId, rating, review } = req.body;
    const { _id: userId } = req?.user;

    // Validate if the provided `entityId` (Pandit ID) is valid
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid Pandit or Entity ID format" });
    }

    // Validate if the provided `userId` is valid (optional but good practice)
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user ID format" });
    }

    // Check if the Pandit profile exists
    const panditProfile = await Pandit.findById(entityId).select("userId");

    if (!panditProfile) {
      return res
        .status(400)
        .json({ status: false, message: "Pandit profile not found!" });
    }

    // Check if the user is trying to review their own Pandit profile
    if (String(panditProfile.userId) === String(userId)) {
      return res
        .status(400)
        .json({
          status: false,
          message: "You cannot update your own Pandit profile review!",
        });
    }

    // Check if the user has already posted a review for this Pandit
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

// Get All Pandits with their average rating and total number of reviews
// const getAllPandit = async (req, res) => {
//   try {
//     const userId = req?.user?._id; // Get the logged-in user's ID

//     // Extract filters from query params
//     const { locality, services, rating, experience } = req.query;

//     // Step 1: ✅ Get userIds with active Pandit subscription
//     const activePanditUsers = await User.find({
//       serviceSubscriptions: {
//         $elemMatch: {
//           serviceType: "Pandit",
//           status: "Active",
//           startDate: { $lte: new Date() },
//           endDate: { $gte: new Date() },
//         },
//       },
//     }).select("_id");

//     const activeUserIds = activePanditUsers.map((user) => user._id);

//     // Step 2: Prepare filter conditions for Pandit profiles
//     let filterConditions = {
//       isEnabled: true,
//       userId: { $in: activeUserIds }, // ✅ Only allow profiles of users with active Pandit subscription
//     };

//     // Apply locality filter (case-insensitive search)
//     if (locality) {
//       filterConditions.city = { $regex: locality, $options: "i" }; // Case-insensitive search for locality
//     }

//     // Apply services filter (check if the Pandit offers certain services)
//     if (services) {
//       const servicesArray = services.split(","); // Assuming services are passed as comma-separated values
//       filterConditions.panditServices = { $in: servicesArray };
//     }

//        // Rating range logic
//     // let ratingMatch = {};
//     // const r = parseInt(rating);
//     // if (r === 5) ratingMatch = { $gte: 4.1, $lte: 5 };
//     // else if (r === 4) ratingMatch = { $gte: 3.1, $lt: 4.1 };
//     // else if (r === 3) ratingMatch = { $gte: 2.1, $lt: 3.1 };
//     // else if (r === 2) ratingMatch = { $gte: 1.1, $lt: 2.1 };
//     // else if (r === 1) ratingMatch = { $eq: 1 };

//     // Rating filter logic
// let ratingMatch = {};
// if (rating) {
//   ratingMatch = { $gte: parseFloat(rating) };
// }

//     // Aggregation pipeline for getting Pandit profiles with their ratings and reviews
//     const pandits = await Pandit.aggregate([
//       {
//         $match: filterConditions, // ✅ Filter active + enabled + locality + services + experience
//       },
//       {
//         $lookup: {
//           from: "ratings",
//           localField: "_id",
//           foreignField: "entityId",
//           pipeline: [
//             {
//               $match: {
//                 entityType: "Pandit", // Only Pandit ratings
//               },
//             },
//             {
//               $project: {
//                 rating: 1,
//                 review: 1,
//                 userId: 1,
//               },
//             },
//           ],
//           as: "reviews",
//         },
//       },
//       {
//         $addFields: {
//           totalReviews: { $size: "$reviews" },
//           averageRating: {
//             $cond: {
//               if: { $gt: [{ $size: "$reviews" }, 0] },
//               then: { $avg: "$reviews.rating" },
//               else: 0,
//             },
//           },
//         },
//       },

//       {
//         $addFields: {
//           averageRating: { $round: ["$averageRating", 1] },
//         },
//       },

//       ...(rating
//         ? [
//             {
//               $match: {
//                 averageRating: ratingMatch,
//               },
//             },
//             {
//               $sort: { averageRating: 1 }, // ✅ Sort by rating if filter applied
//             },
//           ]
//         : [
//             {
//               $sort: { createdAt: -1 }, // ✅ Default sort
//             },
//           ]),
//       {
//         $project: {
//           reviews: 0, // Optional
//         },
//       },

//       {
//         $lookup: {
//           from: "savedprofiles",
//           let: { panditId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$userId", userId] },
//                     { $eq: ["$saveProfile", "$$panditId"] },
//                   ],
//                 },
//               },
//             },
//             { $limit: 1 },


//           ],
//           as: "saved",
//         },
//       },
//       {
//         $addFields: {
//           isSaved: { $gt: [{ $size: "$saved" }, 0] },
//         },
//       },
//       {
//         $project: {
//           saved: 0,
//         },
//       },
//    ...(experience
//   ? [
//       {
//         $match: {
//           $expr: {
//             $gte: [{ $toInt: "$experience" }, parseInt(experience)],
//           },
//         },
//       },
//       {
//         $addFields: {
//           experienceNum: { $toInt: "$experience" },
//         },
//       },
//       {
//         $sort: { experienceNum: 1 }, // ✅ sort by experience only if filtering
//       },
//     ]
//   : [
//       {
//         $sort: { createdAt: -1 }, // ✅ Default sort if no experience filter
//       },
//     ]),
//     ]);

//     // If no Pandits found or no reviews
//     if (!pandits || pandits.length === 0) {
//       return res.status(400).json({
//         status: false,
//         message: "Pandit reviews & ratings not available yet.",
//       });
//     }

//     // Return the data with success
//     return res.status(200).json({
//       status: true,
//       data: pandits,
//     });
//   } catch (err) {
//     res.status(500).json({
//       status: false,
//       error: err.message || "Something went wrong.",
//     });
//   }
// };

const getAllPandit = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const { locality, services, rating, experience } = req.query;

    // Step 1: Get userIds with active Pandit subscription
    const activePanditUsers = await User.find({
      serviceSubscriptions: {
        $elemMatch: {
          serviceType: "Pandit",
          status: "Active",
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        },
      },
    }).select("_id");

    const activeUserIds = activePanditUsers.map((user) => user._id);

    // Step 2: Prepare filter conditions for Pandit profiles
    let filterConditions = {
      isEnabled: true,
      userId: { $in: activeUserIds },
    };

    if (locality) {
      filterConditions.city = { $regex: locality, $options: "i" };
    }

    if (services) {
      const servicesArray = services.split(",");
      filterConditions.panditServices = { $in: servicesArray };
    }

    // Step 3: Build rating and experience filters for aggregation
    let ratingMatch = {};
    if (rating) {
      ratingMatch = { $gte: parseFloat(rating) };
    }

    let experienceMatch = {};
    if (experience) {
      experienceMatch = { $gte: parseInt(experience) };
    }

    // Step 4: Aggregation
    const pandits = await Pandit.aggregate([
      { $match: filterConditions },

      // Lookup ratings
      {
        $lookup: {
          from: "ratings",
          localField: "_id",
          foreignField: "entityId",
          pipeline: [
            { $match: { entityType: "Pandit" } },
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

      // Filter by experience if provided
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
          let: { panditId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", userId] },
                    { $eq: ["$saveProfile", "$$panditId"] },
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
            ? { averageRating: 1, experienceNum: 1 } // rating asc, then experience desc
            : { averageRating: 1 } // only rating asc
          : experience
            ? { experienceNum: 1 } // only experience desc
            : { createdAt: -1 }, // default latest
      },
    ]);

    if (!pandits || pandits.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Pandit reviews & ratings not available yet.",
      });
    }

    return res.status(200).json({ status: true, data: pandits });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message || "Something went wrong.",
    });
  }
};

//sharePandit API to generate a shareable link for a profile
const sharePanditProfile = async (req, res) => {
  // Get the profile ID from the request parameters
  const profileId = req.params.id;

  try {
    // Find the profile by ID
    const profile = await Pandit.findById(profileId);

    if (!profile) {
      return res
        .status(400)
        .json({ status: false, message: "Profile not found" });
    }

    // Generate the shareable link (URL)
    const shareableLink = `${process.env.SHAREABLEPROFILE_URL}/api/v1/pandit/panditProfileData/${profileId}`;

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

//view Pandit Profile
const viewPandit = async (req, res) => {
  try {
    const userId = req?.user?._id;
    // Aggregation pipeline for getting Pandit profiles with their ratings and reviews
    const pandit = await Pandit.aggregate([
      {
        $match: { userId: { $eq: userId } }, // Apply filter conditions to Pandit profiles
      },
      {
        $lookup: {
          from: "ratings", // Ratings collection
          localField: "_id", // Reference to Pandit's _id
          foreignField: "entityId", // Rating's field referring to Pandit (entityId)
          pipeline: [
            {
              $match: { entityType: "Pandit" }, // Only include ratings for Pandits
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

    //if Pandit Profile is not exists then
    if (!pandit) {
      return res
        .status(400)
        .json({ status: false, message: "Pandit Profile Not Found!" });
    }

    return res.status(200).json({
      status: true,
      message: "Pandit Profile Data Fetched Successfully.",
      data: pandit,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

//delete Pandit Profile
const deletePanditProfile = async (req, res) => {
  try {
    const userId = req?.user?._id;

    const exitsPandit = await Pandit.findOne({ userId });

    //if Pandit Profile is not exists then
    if (!exitsPandit) {
      return res
        .status(400)
        .json({ status: false, message: "Pandit Profile Not Found!" });
    }

    // Run deletion tasks in parallel using Promise.all
    const deletionPromises = [
      SavedProfile.deleteMany({ saveProfile: exitsPandit._id }),
      Report.deleteMany({
        profileId: exitsPandit._id,
        profileType: exitsPandit.profileType,
      }),
      Rating.deleteMany({ entityId: exitsPandit._id }),
      Pandit.deleteOne({ userId }),
    ];

    const results = await Promise.allSettled(deletionPromises); // Use Promise.allSettled to handle each promise result

    // Collect failed deletions
    const failedDeletions = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (failedDeletions.length > 0) {
      console.error("Some deletions failed:", failedDeletions);
    }

    // Mark the isPandit as false after successful deletion
    await User.updateOne({ _id: userId }, { $set: { isPandit: false } });

    return res.status(200).json({
      status: true,
      message: "Pandit Account Deleted Successfully.",
      data: results.map((result) => result.value),
      failedDeletions,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

module.exports = {
  createPanditProfile,
  getPanditProfileById,
  addPanditReviewRating,
  updatePanditReviewRating,
  getAllPandit,
  sharePanditProfile,
  viewPandit,
  updatePanditProfile,
  deletePanditProfile,
};
