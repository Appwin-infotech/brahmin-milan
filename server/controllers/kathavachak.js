const Kathavachak = require("../models/kathavachak");
const { default: mongoose } = require("mongoose");
const Rating = require("../models/rating");
const SavedProfile = require("../models/savedProfiles");
const Report = require("../models/report");
const User = require("../models/user");
const Admin = require("../models/admin");
const { sendNotificationToAdmin } = require("../socket/socket.server");
const Notification = require("../models/notification");


const createKathavachakProfile = async (req, res) => {
  try {
    const {
      mobileNo,
      fullName,
      residentialAddress,
      state,
      city,
      kathavachakServices,
      experience,
      ...otherData
    } = req.body;

    const { _id: userId, userId: kathavachakId } = req?.user;

    // ✅ Required fields
    if (!mobileNo || !fullName || !state || !city || !kathavachakServices || !userId) {
      return res.status(400).json({
        status: false,
        message: "All required fields must be provided",
      });
    }

        // Convert kathavachakServices from string to array if needed
let kathavachakServicesArray = kathavachakServices;
if (typeof kathavachakServices === "string") {
  try {
    kathavachakServicesArray = JSON.parse(kathavachakServices);
    if (!Array.isArray(kathavachakServicesArray)) {
      throw new Error();
    }
  } catch {
    return res.status(400).json({
      status: false,
      message: "Invalid format for kathavachakServices. It should be a JSON array of strings.",
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
    const existingMobileNo = await Kathavachak.findOne({ mobileNo });
    if (existingMobileNo) {
      return res.status(400).json({
        status: false,
        message: "A Kathavachak Profile already exists with the provided details.",
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
        subscription.serviceType === "Kathavachak" &&
        subscription.status === "Active" &&
        new Date(subscription.endDate) > new Date()
    );

    if (!activeSubscription) {
      return res.status(400).json({
        status: false,
        message: "You must have an active Kathavachak subscription to create a profile.",
      });
    }

        // ✅ Upload profile photo from req.files
    let photoUrlPath = null;
    if (req.files?.profilePhoto && req.files.profilePhoto.length > 0) {
      photoUrlPath = `uploads/${req.files.profilePhoto[0].filename}`;
    }

    // ✅ Upload additional photos from req.files
    const additionalPhotosUrls = [];
    if (req.files?.additionalPhotos && req.files.additionalPhotos.length > 0) {
      req.files.additionalPhotos.forEach((file) => {
        additionalPhotosUrls.push(`uploads/${file.filename}`);
      });
    }

    // ✅ Create Kathavachak Profile
    const newKathavachak = new Kathavachak({
      userId,
      kathavachakId,
      fullName,
      mobileNo,
      residentialAddress,
      state,
      city,
      experience,
      kathavachakServices:kathavachakServicesArray,
      profilePhoto:photoUrlPath,
      additionalPhotos: additionalPhotosUrls,
      ...otherData,
    });

    await newKathavachak.save();

    //  Optionally flag user as Kathavachak
    user.isKathavachak = true;
    await user.save();

    // ✅ Notify Admins
    const admins = await Admin.find();
    if (admins.length > 0) {
      const notificationMessage = `${fullName} has created a Kathavachak profile.`;

      for (const admin of admins) {
        sendNotificationToAdmin("kathavachakCreated", admin._id, notificationMessage, photoUrlPath, newKathavachak);

        const notification = new Notification({
          userId: admin._id,
          userType: "Admin",
          notificationType: "kathavachakCreated",
          relatedData: {
            kathavachakId: newKathavachak._id,
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
      message: "Kathavachak profile created successfully.",
      data: newKathavachak,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//updateKathavachakProfile
const updateKathavachakProfile = async (req, res) => {
  try {
    const userId = req?.user?._id;

    const dataForUpdate = req?.body;
   
    if (!dataForUpdate) {
      return res
        .status(400)
        .json({
          status: false,
          message: "Data is Required For Updating KathavachakRequest Profile!",
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

           // Handle kathavachakServices if sent as JSON string
    if (dataForUpdate.kathavachakServices && typeof dataForUpdate.kathavachakServices === "string") {
      try {
        dataForUpdate.kathavachakServices = JSON.parse(dataForUpdate.kathavachakServices);
        if (!Array.isArray(dataForUpdate.kathavachakServices)) {
          throw new Error();
        }
      } catch {
        return res.status(400).json({
          status: false,
          message: "Invalid format for kathavachakServices. It should be a JSON array of strings.",
        });
      }
    }

       // Handle file uploads using Multer
    if (req.files?.profilePhoto) {
      dataForUpdate.profilePhoto = `uploads/${req.files.profilePhoto[0].filename}`;
    }

    if (req.files?.additionalPhotos) {
      dataForUpdate.additionalPhotos = req.files.additionalPhotos.map(
        (file) => `uploads/${file.filename}`
      );
    }
    
    //check if KathavachakRequest profile exists
    const existingKathavachak = await Kathavachak.findOne({ userId: userId });

    if (!existingKathavachak) {
      return res
        .status(400)
        .json({ status: false, message: "Kathavachak Profile Not Found!" });
    }

    //update KathavachakRequest profile
    const updatedKathavachak = await Kathavachak.updateOne(
      { userId },
      { $set: dataForUpdate }
    );

    // Check if the update operation was successful
    if (updatedKathavachak.modifiedCount === 0) {
      return res
        .status(400)
        .json({
          status: false,
          message: "No changes were made to the Kathavachak Profile.",
        });
    }

    // Return success response
    return res.status(200).json({
      status: true,
      message: "Kathavachak profile Details updated successfully.",
      data: updatedKathavachak,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err });
  }
};

//getKathavachakProfile of an specific user by its _id
const getKathavachakProfileById = async (req, res) => {
  try {
    const kathavachakId = req.params.id;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(kathavachakId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid Kathavachak ID format" });
    }

    const KathavachakProfile = await Kathavachak.findById(
      kathavachakId
    ).populate({
      path: "ratings",
      select: "-__v",
      options: {
        sort: { createdAt: -1 },
      },
      populate: {
        path: "userId",
        select: "username city photoUrl",
      },
    });

    if (!KathavachakProfile) {
      return res
        .status(400)
        .json({ status: false, message: "Kathavachak profile not found" });
    }

    const totalReviews = KathavachakProfile?.ratings?.length || 0;
    const averageRating = totalReviews
      ? KathavachakProfile.ratings.reduce(
          (acc, rating) => acc + (rating?.rating || 0),
          0
        ) / totalReviews
      : 0;
    const roundedAverageRating = averageRating.toFixed(1);

    // ✅ Check if the Kathavachak profile is saved by the user
    const saved = await SavedProfile.findOne({
      userId,
      saveProfile: kathavachakId,
      profileType: "Kathavachak",
    });

    const responseData = {
      ...KathavachakProfile.toObject(),
      totalReviews,
      averageRating: roundedAverageRating,
      isSaved: !!saved,
    };

    return res.status(200).json({
      status: true,
      message: `Kathavachak ${KathavachakProfile?.fullName} profile fetched successfully`,
      data: responseData,
    });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};


// Add Ratings & Reviews To Kathavachak
const addKathavachakReviewRating = async (req, res) => {
  try {
    const { entityId, entityType, rating, review } = req.body;
    const { _id: userId } = req?.user;

    // Validate if the provided `kathavachakId` is valid
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res
        .status(400)
        .json({
          status: false,
          message: "Invalid Kathavachak or Entity ID format",
        });
    }

    // Validate if the provided `userId` is valid (optional but good practice)
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user ID format" });
    }

    // Check if the user is trying to review their own Kathavachak profile
    const kathavachakProfile = await Kathavachak.findById(entityId).select(
      "userId"
    );

    if (!kathavachakProfile) {
      return res
        .status(400)
        .json({ status: false, message: "Kathavachak profile not found!" });
    }

    if (String(kathavachakProfile.userId) === String(userId)) {
      return res
        .status(400)
        .json({
          status: false,
          message: "You cannot review your own Kathavachak profile!",
        });
    }

    // Check if the user has already reviewed this Kathavachak
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

    // Add the new reviewRating ID to the Kathavachak's ratings array
    await Kathavachak.findByIdAndUpdate(entityId, {
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

// Update Ratings & Reviews for Kathavachak
const updateKathavachakReviewRating = async (req, res) => {
  try {
    const { entityId, rating, review } = req.body;
    const { _id: userId } = req?.user;

    // Validate if the provided `entityId` (Kathavachak ID) is valid
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res
        .status(400)
        .json({
          status: false,
          message: "Invalid Kathavachak or Entity ID format",
        });
    }

    // Validate if the provided `userId` is valid (optional but good practice)
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user ID format" });
    }

    // Check if the Kathavachak profile exists
    const KathavachakProfile = await Kathavachak.findById(entityId).select(
      "userId"
    );

    if (!KathavachakProfile) {
      return res
        .status(400)
        .json({ status: false, message: "Kathavachak profile not found!" });
    }

    // Check if the user is trying to review their own Kathavachak profile
    if (String(KathavachakProfile.userId) === String(userId)) {
      return res
        .status(400)
        .json({
          status: false,
          message: "You cannot update your own Kathavachak profile review!",
        });
    }

    // Check if the user has already posted a review for this Kathavachak
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

// Get All Kathavachaks with their average rating and total number of reviews
// const getAllKathavachak = async (req, res) => {
//   try {
//     const userId = req?.user?._id; // Get the logged-in user's ID

//     // Extract filters from query params
//     const { locality, services, rating, experience } = req.query;

//     // Step 1: ✅ Get userIds with active Kathavachak subscription
//     const activeKathavachakUsers = await User.find({
//       serviceSubscriptions: {
//         $elemMatch: {
//           serviceType: "Kathavachak",
//           status: "Active",
//           startDate: { $lte: new Date() },
//           endDate: { $gte: new Date() },
//         },
//       },
//     }).select("_id");

//     const activeUserIds = activeKathavachakUsers.map((user) => user._id);

//     // Step 2: Prepare filter conditions for Pandit profiles
//     let filterConditions = {
//       isEnabled: true,
//       userId: { $in: activeUserIds }, // ✅ Only allow profiles of users with active Kathavachak subscription
//     };

//     // Apply locality filter (case-insensitive search)
//     if (locality) {
//       filterConditions.city = { $regex: locality, $options: "i" }; // Case-insensitive search for locality
//     }

//     // Apply services filter (check if the Kathavachak offers certain services)
//     if (services) {
//       const servicesArray = services.split(","); // Assuming services are passed as comma-separated values
//       filterConditions.kathavachakServices = { $in: servicesArray };
//     }

//     // Aggregation pipeline for getting Kathavachak profiles with their ratings and reviews
//     // Step 3: Define rating range
//     // let ratingMatch = {};
//     // const r = parseInt(rating);
//     // if (r === 5) ratingMatch = { $gte: 4.1, $lte: 5 };
//     // else if (r === 4) ratingMatch = { $gte: 3.1, $lt: 4.1 };
//     // else if (r === 3) ratingMatch = { $gte: 2.1, $lt: 3.1 };
//     // else if (r === 2) ratingMatch = { $gte: 1.1, $lt: 2.1 };
//     // else if (r === 1) ratingMatch = { $eq: 1 };

//         // Rating filter logic
// let ratingMatch = {};
// if (rating) {
//   ratingMatch = { $gte: parseFloat(rating) };
// }

//     // Aggregation pipeline for getting Kathavachak profiles with their ratings and reviews
//     const kathavachaks = await Kathavachak.aggregate([
//       { $match: filterConditions },

//       {
//         $lookup: {
//           from: "ratings",
//           localField: "_id",
//           foreignField: "entityId",
//           pipeline: [
//             { $match: { entityType: "Kathavachak" } },
//             { $project: { rating: 1, review: 1, userId: 1 } },

//           ],
//           as: "reviews",
//         },
//       },
//       {
//         $addFields: {
//           totalReviews: { $size: "$reviews" },
//           averageRating: {
//             $cond: [
//               { $gt: [{ $size: "$reviews" }, 0] },
//               { $avg: "$reviews.rating" },
//               0,
//             ],
//           },
//         },
//       },

//       {
//         $addFields: {
//           averageRating: { $round: ["$averageRating", 1] },
//         },
//       },

//       // Conditional rating filter
//       ...(rating
//         ? [
//             { $match: { averageRating: ratingMatch } },
//             { $sort: { averageRating: -1 } },



//           ]
//         : [{ $sort: { createdAt: -1 } }]
//       ),

//       {
//         $project: { reviews: 0 },


//       },

//       // Add isSaved flag
//       {
//         $lookup: {
//           from: "savedprofiles",
//           let: { kathavachakId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$userId", userId] },
//                     { $eq: ["$saveProfile", "$$kathavachakId"] },
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
//          ...(experience
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

//     // If no Kathavachaks found or no reviews
//     if (!kathavachaks || kathavachaks.length === 0) {
//       return res.status(400).json({
//         status: false,
//         message: "Kathavachak reviews & ratings not available yet.",
//       });
//     }

//     // Return the data with success
//     return res.status(200).json({
//       status: true,
//       data: kathavachaks,
//     });
//   } catch (err) {
//     res.status(500).json({
//       status: false,
//       error: err.message || "Something went wrong.",
//     });
//   }
// };

const getAllKathavachak = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const { locality, services, rating, experience } = req.query;

    // Step 1: Get userIds with active Kathavachak subscription
    const activeKathavachakUsers = await User.find({
      serviceSubscriptions: {
        $elemMatch: {
          serviceType: "Kathavachak",
          status: "Active",
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        },
      },
    }).select("_id");

    const activeUserIds = activeKathavachakUsers.map((user) => user._id);

    // Step 2: Base filter
    let filterConditions = {
      isEnabled: true,
      userId: { $in: activeUserIds },
    };

    if (locality) {
      filterConditions.city = { $regex: locality, $options: "i" };
    }

    if (services) {
      const servicesArray = services.split(",");
      filterConditions.kathavachakServices = { $in: servicesArray };
    }

    // Step 3: Safe filter vars
    let ratingMatch = {};
    if (rating) {
      ratingMatch = { $gte: parseFloat(rating) };
    }

    const safeExperience = experience && !isNaN(experience) ? parseInt(experience) : null;

    // Step 4: Aggregation
    const kathavachaks = await Kathavachak.aggregate([
      { $match: filterConditions },

      // Ratings lookup
      {
        $lookup: {
          from: "ratings",
          localField: "_id",
          foreignField: "entityId",
          pipeline: [
            { $match: { entityType: "Kathavachak" } },
            { $project: { rating: 1, review: 1, userId: 1 } },
          ],
          as: "reviews",
        },
      },

      // Calculate avg rating & total reviews
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

      // Rating filter
      ...(rating ? [{ $match: { averageRating: ratingMatch } }] : []),

      // Experience filter
      ...(safeExperience !== null
        ? [
            {
              $match: {
                $expr: { $gte: [{ $toInt: "$experience" }, safeExperience] },
              },
            },
            { $addFields: { experienceNum: { $toInt: "$experience" } } },
          ]
        : []),

      // Saved profile check
      {
        $lookup: {
          from: "savedprofiles",
          let: { kathavachakId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", userId] },
                    { $eq: ["$saveProfile", "$$kathavachakId"] },
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

      // Final combined sort
      {
        $sort:
          rating && safeExperience !== null
            ? { averageRating: 1, experienceNum: -1 } // rating asc, then experience desc
            : rating
            ? { averageRating: 1 } // only rating asc
            : safeExperience !== null
            ? { experienceNum: -1 } // only experience desc
            : { createdAt: -1 }, // default latest
      },
    ]);

    if (!kathavachaks || kathavachaks.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Kathavachak reviews & ratings not available yet.",
      });
    }

    return res.status(200).json({ status: true, data: kathavachaks });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message || "Something went wrong.",
    });
  }
};


//shareProfiles API to generate a shareable link for a profile
const shareKathavachakProfile = async (req, res) => {
  const profileId = req.params.id;

  try {
    // Find the profile by ID
    const profile = await Kathavachak.findById(profileId);

    if (!profile) {
      return res
        .status(400)
        .json({ status: false, message: "Profile not found" });
    }

    // Generate the shareable link (URL)
    const shareableLink = `${process.env.SHAREABLEPROFILE_URL}/api/v1/kathavachak/kathavachakProfileData/${profileId}`;

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

//view Kathavachak Profile
const viewKathavachak = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const kathavachak = await Kathavachak.aggregate([
      {
        $match: { userId: { $eq: userId } }, // Apply filter conditions to Kathavachak profiles
      },
      {
        $lookup: {
          from: "ratings", // Ratings collection
          localField: "_id", // Reference to Kathavachak's _id
          foreignField: "entityId", // Rating's field referring to Kathavachak (entityId)
          pipeline: [
            {
              $match: { entityType: "Kathavachak" }, // Only include ratings for Kathavachaks
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
    //if Kathavachak Profile is not exists then
    if (!kathavachak) {
      return res
        .status(400)
        .json({ status: false, message: "Kathavachak Profile Not Found!" });
    }

    return res.status(200).json({
      status: true,
      message: "Kathavachak Profile Data Fetched Successfully.",
      data: kathavachak,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

//delete Kathavachak Profile
const deleteKathavachakProfile = async (req, res) => {
  try {
    const userId = req?.user?._id;

    const exitsKathavachak = await Kathavachak.findOne({ userId });

    //if Kathavachak Profile is not exists then
    if (!exitsKathavachak) {
      return res
        .status(400)
        .json({ status: false, message: "Kathavachak Profile Not Found!" });
    }

    // Run deletion tasks in parallel using Promise.all
    const deletionPromises = [
      SavedProfile.deleteMany({ saveProfile: exitsKathavachak._id }),
      Report.deleteMany({
        profileId: exitsKathavachak._id,
        profileType: exitsKathavachak.profileType,
      }),
      Rating.deleteMany({ entityId: exitsKathavachak._id }),
      Kathavachak.deleteOne({ userId }),
    ];

    const results = await Promise.allSettled(deletionPromises); // Use Promise.allSettled to handle each promise result

    // Collect failed deletions
    const failedDeletions = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (failedDeletions.length > 0) {
      console.error("Some deletions failed:", failedDeletions);
    }

    // Mark the isKathavachak as false after successful deletion
    await User.updateOne({ _id: userId }, { $set: { isKathavachak: false } });

    return res.status(200).json({
      status: true,
      message: "Kathavachak Account Deleted Successfully.",
      data: results.map((result) => result.value),
      failedDeletions,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

module.exports = {
  createKathavachakProfile,
  updateKathavachakProfile,
  getKathavachakProfileById,
  addKathavachakReviewRating,
  updateKathavachakReviewRating,
  getAllKathavachak,
  shareKathavachakProfile,
  viewKathavachak,
  deleteKathavachakProfile,
};
