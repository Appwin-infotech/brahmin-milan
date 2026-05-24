const { default: mongoose } = require("mongoose");
const Admin = require("../models/admin");
const Biodata = require("../models/biodata");
const SuccessStory = require("../models/successStory");
const SuccessStoryRequest = require("../models/successStoryRequest");
const { sendNotificationToAdmin } = require("../socket/socket.server");
const Notification = require("../models/notification");
const ConnectionRequest = require("../models/connectionRequest");

const cloudinary = require("cloudinary").v2;

const createSuccessStory = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const {
      groomName,
      groomBiodataId,
      brideName,
      brideBiodataId,
      rating,
      thought,
      weddingDate,
    } = req.body;

    if (
      !groomName ||
      !groomBiodataId ||
      !brideBiodataId ||
      !brideName ||
      !rating ||
      !thought
    ) {
      return res
        .status(400)
        .json({ status: false, message: "Please Enter Required Fields!" });
    }

    let parsedWD = null;
    if (weddingDate) {
      parsedWD = new Date(weddingDate);
      if (isNaN(parsedWD)) {
        return res
          .status(400)
          .json({ status: false, message: "Invalid Wedding Date." });
      }
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ status: false, message: "Invalid User!" });
    }

    const groomBiodata = await Biodata.findOne({ bioDataId: groomBiodataId });
    const brideBiodata = await Biodata.findOne({ bioDataId: brideBiodataId });

    if (!groomBiodata || !brideBiodata) {
      return res.status(400).json({
        status: false,
        message: "Invalid groom or bride Biodata ID.",
      });
    }

    const brideAndGroomConnection = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: brideBiodata.userId, toUserId: groomBiodata.userId },
        { fromUserId: groomBiodata.userId, toUserId: brideBiodata.userId },
      ],
      status: "accepted",
    });

    if (!brideAndGroomConnection) {
      return res.status(400).json({
        status: false,
        message:
          "Invalid Success Story Request! No accepted connection found between bride and groom.",
      });
    }

    const alreadyExistingStoryRequest = await SuccessStoryRequest.findOne({
      groomBiodataId,
      brideBiodataId,
    });
    if (alreadyExistingStoryRequest) {
      return res.status(400).json({
        status: false,
        message:
          "A success story with this groom and bride already Requested.",
      });
    }

    const alreadyExistingStory = await SuccessStory.findOne({
      groomBiodataId,
      brideBiodataId,
    });
    if (alreadyExistingStory) {
      return res.status(400).json({
        status: false,
        message:
          "A success story with this groom and bride already exists.",
      });
    }

    const existingStoryInRequest = await SuccessStoryRequest.findOne({
      userId: userId,
    });

    if (existingStoryInRequest) {
      return res.status(400).json({
        status: false,
        message: "You have already Requested a SuccessStory.",
      });
    }

    const existingStory = await SuccessStory.findOne({ userId: userId });

    if (existingStory) {
      return res.status(400).json({
        status: false,
        message: "You have already uploaded a SuccessStory.",
      });
    }

    const ifEitherInStoryRequest = await SuccessStoryRequest.findOne({
      $or: [{ groomBiodataId }, { brideBiodataId }],
    });

    if (ifEitherInStoryRequest) {
      return res.status(400).json({
        status: false,
        message:
          "This groom or bride is already part of another requested story which is waiting for approval.",
      });
    }

    const ifEitherInStory = await SuccessStory.findOne({
      $or: [{ groomBiodataId }, { brideBiodataId }],
    });

    if (ifEitherInStory) {
      return res.status(400).json({
        status: false,
        message:
          "This groom or bride is already part of another success story.",
      });
    }

    // ✅ Multer: Handle uploaded photo file
    let photoUrlPath = null;
    if (req.files?.photoUrl?.[0]) {
      photoUrlPath = req.files.photoUrl[0].path.replace(/\\/g, "/");
    }

    const groomDetails = {
      userId: groomBiodata?.userId,
      bioDataId: groomBiodata?.bioDataId,
      name: groomBiodata?.personalDetails?.fullname,
      profileImage: groomBiodata?.personalDetails?.closeUpPhoto,
      contactNo: groomBiodata?.personalDetails?.contactNumber1,
    };

    const brideDetails = {
      userId: brideBiodata?.userId,
      bioDataId: brideBiodata?.bioDataId,
      name: brideBiodata?.personalDetails?.fullname,
      profileImage: brideBiodata?.personalDetails?.closeUpPhoto,
      contactNo: brideBiodata?.personalDetails?.contactNumber1,
    };

    const newStory = new SuccessStoryRequest({
      userId,
      groomName,
      groomBiodataId,
      groomDetails,
      brideName,
      brideBiodataId,
      brideDetails,
      rating,
      thought,
      photoUrl: photoUrlPath,
      weddingDate: parsedWD,
    });

    await newStory.save();
    await newStory.populate({
      path: "userId",
      select: "userId username email photoUrl",
    });

    const admins = await Admin.find();
    if (admins.length > 0) {
      const notificationMessage = `${req?.user?.username} has requested a SuccessStory Creation.`;
      for (const admin of admins) {
        sendNotificationToAdmin(
          "successStoryRequest",
          admin._id,
          notificationMessage,
          req?.user?.photoUrl,
          newStory
        );

        const notification = new Notification({
          userId: admin._id,
          userType: "Admin",
          notificationType: "successStoryRequest",
          relatedData: {
            successStoryId: newStory?._id,
            requestBy: req?.user?.username,
            photoUrl: req?.user?.photoUrl,
          },
          message: notificationMessage,
          seen: false,
        });

        await notification.save();
      }
    }

    return res.status(200).json({
      status: true,
      message:
        "Your Request is Pending for Admin approval please wait for sometime, thanks.",
      story: newStory,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

const getSuccessStories = async (req, res) => {
  try {
    const { myStory } = req.query;
    const userId = req.user?._id;

    // Build filter conditionally
    const filter = myStory === "true" ? { userId } : {};

    const stories = await SuccessStory.find(filter).sort({ createdAt: -1 });

    if (!stories.length) {
      return res.status(200).json({
        status: true,
        message: myStory === "true"
          ? "You haven't uploaded any Success Stories yet."
          : "Success Stories not uploaded yet.",
        data: [],
      });
    }

    res.status(200).json({
      status: true,
      message: "Success stories fetched successfully",
      data: stories,
    });
  } catch (error) {
    console.error("Error fetching success stories:", error);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const deleteSuccessStory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const adminId = req.admin?._id;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: false, message: "Invalid Success Story ID." });
    }

    // Find the success story
    const story = await SuccessStory.findById(id);
    if (!story) {
      return res.status(400).json({ status: false, message: "Success Story not found." });
    }

    // Check permission: allow only admin or story owner to delete
    if (!adminId && story.userId.toString() !== userId?.toString()) {
      return res.status(400).json({ status: false, message: "Unauthorized to delete this success story." });
    }

        // Delete related notifications only
await Notification.deleteMany({
  $or: [
    {
      notificationType: { $in: ["successStoryRequest", "successStoryApproved"] },
      "relatedData.successStoryId": id,
    },
    {
      notificationType: "successStoryRejected",
      "relatedData.toUserId": story.userId,
      "relatedData.status": "rejected",
    },
  ],
});


    // Delete the story
    await SuccessStory.findByIdAndDelete(id);

    return res.status(200).json({
      status: true,
      message: "Success Story deleted successfully.",
    });

  } catch (err) {
    return res.status(500).json({ status: false, message:err.message });
  }
};

const editSuccessStory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const adminId = req.admin?._id;
    const {
      groomName,
      groomBiodataId,
      brideName,
      brideBiodataId,
      rating,
      thought,
      photoUrl,
      weddingDate,
    } = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: false, message: "Invalid Success Story ID." });
    }

    // Find the success story
    const story = await SuccessStory.findById(id);
    if (!story) {
      return res.status(404).json({ status: false, message: "Success Story not found." });
    }

    // Check permission: only admin or story owner can edit
    if (!adminId && story.userId.toString() !== userId?.toString()) {
      return res.status(403).json({ status: false, message: "Unauthorized to edit this success story." });
    }

    // Update fields if provided
    if (groomName) story.groomName = groomName;
    if (groomBiodataId) story.groomBiodataId = groomBiodataId;
    if (brideName) story.brideName = brideName;
    if (brideBiodataId) story.brideBiodataId = brideBiodataId;
    if (rating) story.rating = rating;
    if (thought) story.thought = thought;
    if (weddingDate) {
      const parsedWD = new Date(weddingDate);
      if (isNaN(parsedWD)) {
        return res.status(400).json({ status: false, message: "Invalid Wedding Date." });
      }
      story.weddingDate = parsedWD;
    }

    await story.save(); // Uses Mongoose's save() for full validation[3][6]

    return res.status(200).json({
      status: true,
      message: "Success Story updated successfully.",
      data: story,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};


module.exports = { createSuccessStory, deleteSuccessStory,getSuccessStories ,editSuccessStory };
