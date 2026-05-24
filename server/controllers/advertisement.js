// controllers/advertisement.controller.js
const { errorMonitor } = require("nodemailer/lib/xoauth2");
const Advertisement = require("../models/advertisementSchema");
const DefaultAdvertisementImage = require("../models/defaultAdvertisementImage");
// const upload = require("../config/multerConfig"); // Import multer config

// Multer middleware for single or multiple files
// const uploadFiles = upload.array('media', 10); // 'media' is the field name, and we limit to 10 files

const createAdvertisement = async (req, res) => {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      repeatSchedule,
      targetProfileTypes,
      mediaMeta,
      section,
    } = req.body;

    if (!["Top", "Bottom"].includes(section)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid or missing section." });
    }

    let parsedTargetProfileTypes = targetProfileTypes;
    if (typeof targetProfileTypes === "string") {
      try {
        parsedTargetProfileTypes = JSON.parse(targetProfileTypes);
      } catch (e) {
        return res
          .status(400)
          .json({
            status: false,
            message: "Invalid targetProfileTypes format",
          });
      }
    }

    let parsedSchedule = null;
    if (repeatSchedule) {
      try {
        parsedSchedule = JSON.parse(repeatSchedule);
      } catch (_) {
        return res
          .status(400)
          .json({ status: false, message: "Invalid repeatSchedule JSON" });
      }
    }

    if (!title || !description || !parsedTargetProfileTypes.length) {
      return res
        .status(400)
        .json({ status: false, message: "Please Enter Required Fields." });
    }

    const { _id: createdBy } = req.admin;
    const files = req.files;
    const parsedMeta = JSON.parse(mediaMeta || "[]");
    const mediaPaths = [];

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const meta = parsedMeta[i] || {};

        // Section and profileType validation
        const isVideo = file.mimetype.startsWith("video");
        // Validate bottom section constraints before push
        if (section === "Bottom") {
          if (files.length > 1) {
            return res
              .status(400)
              .json({
                status: false,
                message: "Only one image allowed in bottom section",
              });
          }
          if (isVideo) {
            return res
              .status(400)
              .json({
                status: false,
                message: "Video not allowed in bottom section",
              });
          }
        }

        if (section === "Top" && isVideo) {
          // Only HomePage can have 1 video
          if (!parsedTargetProfileTypes.includes("HomePage")) {
            return res
              .status(400)
              .json({
                status: false,
                message: "Only HomePage top section allows video",
              });
          }
          if (mediaPaths.some((m) => m.mediaType === "video")) {
            return res
              .status(400)
              .json({
                status: false,
                message: "Only one video allowed in top section",
              });
          }
        }

        mediaPaths.push({
          mediaType: isVideo ? "video" : "image",
          mediaUrl: file.path.replace(/\\/g, "/"),
          resolution: meta.resolution || { width: 1080, height: 720 },
          duration: meta.duration || 5,
          hyperlink: meta.hyperlink || null,
        });
      }
    }

    const newAd = await Advertisement.create({
      title,
      description,
      media: mediaPaths,
      startTime,
      endTime,
      repeatSchedule: parsedSchedule,
      targetProfileTypes: parsedTargetProfileTypes,
      section,
      createdBy,
    });

    res.status(200).json({
      status: true,
      message: "Advertisement created successfully",
      data: newAd,
    });
  } catch (err) {
    console.error("Create Advertisement Error:", err);
    res.status(500).json({
      status: false,
      message: "Failed to create advertisement",
      error: err.message,
    });
  }
};

//update-Advetisement 
const updateAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "Advertisement ID is required",
      });
    }

    const existingAd = await Advertisement.findById(id);
    if (!existingAd) {
      return res.status(404).json({
        status: false,
        message: "Advertisement not found",
      });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      repeatSchedule,
      targetProfileTypes,
      mediaMeta,
      section,
    } = req.body;

    if (section && !["Top", "Bottom"].includes(section)) {
      return res.status(400).json({
        status: false,
        message: "Invalid section value",
      });
    }

    let parsedTargetProfileTypes = targetProfileTypes;
    if (typeof targetProfileTypes === "string") {
      try {
        parsedTargetProfileTypes = JSON.parse(targetProfileTypes);
      } catch (e) {
        return res.status(400).json({
          status: false,
          message: "Invalid targetProfileTypes format",
        });
      }
    }

    let parsedSchedule = null;
    if (repeatSchedule) {
      try {
        parsedSchedule = JSON.parse(repeatSchedule);
      } catch (e) {
        return res.status(400).json({
          status: false,
          message: "Invalid repeatSchedule format",
        });
      }
    }

    const files = req.files || [];
    let parsedMeta = [];

    try {
      parsedMeta = JSON.parse(mediaMeta || "[]");
    } catch (err) {
      return res.status(400).json({
        status: false,
        message: "Invalid mediaMeta format",
      });
    }

    let updatedMedia = existingAd.media || [];

    if (files.length > 0) {
      // Validate section-based media rules
      const isVideo = (file) => file.mimetype.startsWith("video");

      if (section === "Bottom") {
        if (files.length > 1 || files.some(isVideo)) {
          return res.status(400).json({
            status: false,
            message:
              "Bottom section allows only one image (no video allowed)",
          });
        }
      }

      if (section === "Top" && files.some(isVideo)) {
        if (!parsedTargetProfileTypes.includes("HomePage")) {
          return res.status(400).json({
            status: false,
            message: "Only HomePage top section allows video",
          });
        }

        if (
          files.filter(isVideo).length > 1 ||
          updatedMedia.some((m) => m.mediaType === "video")
        ) {
          return res.status(400).json({
            status: false,
            message: "Only one video allowed in top section",
          });
        }
      }

      // Replace media with newly uploaded ones
      updatedMedia = files.map((file, i) => {
        const meta = parsedMeta[i] || {};
        return {
          mediaType: isVideo(file) ? "video" : "image",
          mediaUrl: file.path.replace(/\\/g, "/"),
          resolution: meta.resolution || { width: 1080, height: 720 },
          duration: meta.duration || 5,
          hyperlink: meta.hyperlink || null,
        };
      });
    }

    // Build the update payload
    const updatedData = {
      ...(title && { title }),
      ...(description && { description }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(section && { section }),
      ...(parsedSchedule && { repeatSchedule: parsedSchedule }),
      ...(parsedTargetProfileTypes && {
        targetProfileTypes: parsedTargetProfileTypes,
      }),
      ...(files.length > 0 && { media: updatedMedia }),
    };

    const updatedAd = await Advertisement.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    res.status(200).json({
      status: true,
      message: "Advertisement updated successfully",
      data: updatedAd,
    });
  } catch (err) {
    console.error("Update Advertisement Error:", err);
    res.status(500).json({
      status: false,
      message: "Failed to update advertisement",
      error: err.message,
    });
  }
};


const getAdvertisementsForAdmin = async (req, res) => {
  try {
    const { section } = req.query;

    if (section && !["Top", "Bottom"].includes(section)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid section" });
    }

    let advertisements = await Advertisement.find().sort({ createdAt: -1 });

    if (advertisements.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "Advertisements Not found!" });
    }

    return res.status(200).json({
      status: true,
      data: advertisements,
    });
  } catch (error) {
    console.error("Error in getAdvertisements:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch advertisements",
      error: error.message
    });
  }
};

const getAdvertisements = async (req, res) => {
  try {
    const { targetProfileType, section } = req.query;

    if (section && !["Top", "Bottom"].includes(section)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid section" });
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5); // "HH:mm"

    const baseFilter = {
      isActive: true,
      $and: [
        { $or: [{ startTime: null }, { startTime: { $lte: now } }] },
        { $or: [{ endTime: null }, { endTime: { $gte: now } }] },
        {
          $or: [
            { repeatSchedule: null },
            {
              $expr: {
                $and: [
                  { $in: [currentDay, "$repeatSchedule.daysOfWeek"] },
                  {
                    $anyElementTrue: {
                      $map: {
                        input: "$repeatSchedule.timeSlots",
                        as: "slot",
                        in: {
                          $and: [
                            { $lte: ["$$slot.from", currentTime] },
                            { $gte: ["$$slot.to", currentTime] },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    // Only apply section filter if provided
    if (section) {
      baseFilter.section = section;
    }

    if (targetProfileType) {
      baseFilter.targetProfileTypes = targetProfileType;
    }

    let advertisements = await Advertisement.find(baseFilter).sort({
      createdAt: -1,
    });

    if (advertisements.length === 0) {
      // Return default ad from DefaultAdvertisementImage collection
      const fallback = await DefaultAdvertisementImage.findOne({
        targetProfileType,
        section,
      });
      if (fallback) {
        advertisements = [fallback];
      }
    }

    return res.status(200).json({
      status: true,
      data: advertisements,
    });
  } catch (error) {
    console.error("Error in getAdvertisements:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch advertisements",
      error: err.message
    });
  }
};

//delete-Advertisment
const deleteAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Advertisement ID is required",
      });
    }

    const deletedAd = await Advertisement.findByIdAndDelete(id);

    if (!deletedAd) {
      return res.status(404).json({
        status: false,
        message: "Advertisement not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Advertisement deleted successfully",
    });
  } catch (err) {
    console.error("Delete Advertisement error:", err);
    res.status(500).json({
      status: false,
      message: "Failed to delete Advertisement",
      error: err.message
    });
  }
};

//it will create if not avaiable and update if avaible existing on
const updateDefaultAdvertisement = async (req, res) => {
  try {
    const { targetProfileType, section, mediaMeta } = req.body;
    const files = req.files;

    console.log(targetProfileType);

    if (!["Top", "Bottom"].includes(section)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid or missing section." });
    }

    if (!targetProfileType || !section || !files || files.length === 0) {
      return res.status(400).json({
        status: false,
        message:
          "targetProfileType, section and at least one media file are required",
      });
    }

    const parsedMeta = JSON.parse(mediaMeta || "[]");
    const mediaPaths = [];

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const meta = parsedMeta[i] || {};

        // Section and profileType validation
        const isVideo = file.mimetype.startsWith("video");
        // Validate bottom section constraints before push
        if (section === "Bottom") {
          if (files.length > 1) {
            return res
              .status(400)
              .json({
                status: false,
                message: "Only one image allowed in bottom section",
              });
          }
          if (isVideo) {
            return res
              .status(400)
              .json({
                status: false,
                message: "Video not allowed in bottom section",
              });
          }
        }

        if (section === "Top" && isVideo) {
          // Only HomePage can have 1 video
          if (!targetProfileType === "HomePage") {
            return res
              .status(400)
              .json({
                status: false,
                message: "Only HomePage top section allows video",
              });
          }
          if (mediaPaths.some((m) => m.mediaType === "video")) {
            return res
              .status(400)
              .json({
                status: false,
                message: "Only one video allowed in top section",
              });
          }
        }

        mediaPaths.push({
          mediaType: isVideo ? "video" : "image",
          mediaUrl: file.path.replace(/\\/g, "/"),
          resolution: meta.resolution || { width: 1080, height: 720 },
          duration: meta.duration || 5,
          hyperlink: meta.hyperlink || null,
        });
      }
    }

    const updated = await DefaultAdvertisementImage.findOneAndUpdate(
      { targetProfileType, section },
      {
        targetProfileType,
        section,
        media: mediaPaths,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      status: true,
      message: "Default advertisement updated",
      data: updated,
    });
  } catch (err) {
    console.error("Update default ad error:", err);
    res.status(500).json({
      status: false,
      message: "Failed to update default advertisement",
      error: err.message
    });
  }
};

//getDefaultAdvertisement
const getDefaultAdvertisement = async (req, res) => {
  try {
    const { targetProfileType, section } = req.query;
    const baseFilter = {};

    // Only apply section filter if provided
    if (section) {
      baseFilter.section = section;
    }

    if (targetProfileType) {
      baseFilter.targetProfileTypes = targetProfileType;
    }

    const ad = await DefaultAdvertisementImage.find(baseFilter).sort({
      createdAt: -1,
    });

    if (!ad.length) {
      return res
        .status(400)
        .json({ status: false, message: "Default advetisements not set yet." });
    }

    res.status(200).json({
      status: true,
      data: ad,
    });
  } catch (err) {
    console.error("Get default ad error:", err);
    res.status(500).json({
      status: false,
      message: "Failed to fetch default advertisement",
      error: err.message
    });
  }
};

// deleteDefaultAdvertisement
const deleteDefaultAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Advertisement ID is required",
      });
    }

    const deletedAd = await DefaultAdvertisementImage.findByIdAndDelete(id);

    if (!deletedAd) {
      return res.status(404).json({
        status: false,
        message: "Default Advertisement not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Default Advertisement deleted successfully",
    });
  } catch (err) {
    console.error("Delete default ad error:", err);
    res.status(500).json({
      status: false,
      message: "Failed to delete default advertisement",
      error: err.message
    });
  }
};
const updateAdvertisementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { isActive } = req.body;

    // Convert string to boolean if needed
    if (typeof isActive === "string") {
      if (isActive.toLowerCase() === "true") {
        isActive = true;
      } else if (isActive.toLowerCase() === "false") {
        isActive = false;
      } else {
        return res.status(400).json({
          status: false,
          message: "Invalid 'isActive' value. Must be true or false.",
        });
      }
    }

    // Final validation
    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        status: false,
        message: "Missing or invalid 'isActive' field. It must be a boolean.",
      });
    }

    const advertisement = await Advertisement.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!advertisement) {
      return res.status(404).json({
        status: false,
        message: "Advertisement not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Advertisement status updated successfully",
      advertisement,
    });
  } catch (error) {
    console.error("Error updating advertisement status:", error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};



module.exports = {
  createAdvertisement,
  updateAdvertisement,
  getAdvertisements,
  deleteAdvertisement,
  updateDefaultAdvertisement,
  getDefaultAdvertisement,
  getAdvertisementsForAdmin,
  deleteDefaultAdvertisement,
  updateAdvertisementStatus
};
