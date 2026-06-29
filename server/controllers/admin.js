const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");
const PanditRequest = require("../models/panditRequest");
const KathavachakRequest = require("../models/kathavachakRequest");
const Kathavachak = require("../models/kathavachak");
const Activist = require("../models/activist");
const JyotishRequest = require("../models/jyotishRequest");
const Pandit = require("../models/pandit");
const ActivistRequest = require("../models/activistRequest");
const Jyotish = require("../models/jyotish");
const User = require("../models/user");
const { updateUserProfileType } = require("./user");
const Report = require("../models/report");
const Feedback = require("../models/feedback");
const Advertise = require("../models/advertise");
const Biodata = require("../models/biodata");
const Committee = require("../models/committee");
const Rating = require("../models/rating");
const { getConnectedUsers, getIO } = require("../socket/socket.server");
const Notification = require("../models/notification");
const Subscription = require("../models/subscription");
const Dharmshala = require("../models/dharmshala");
const SuccessStoryRequest = require("../models/successStoryRequest");
const SuccessStory = require("../models/successStory");
const SavedProfile = require("../models/savedProfiles");
const ConnectionRequest = require("../models/connectionRequest");
const EventPost = require("../models/eventPost");
const OTPRequest = require("../models/OTPRequest");
const Advertisement = require("../models/advertisementSchema");
const cloudinary = require("cloudinary").v2;
const { generateOTP, sendOTP } = require("../utils/otpService");
const moment = require("moment");
const { default: mongoose } = require("mongoose");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

// Create First Super Admin (Temporary Open Route)
const createFirstAdmin = async (req, res) => {
  try {
    const { mobileNo, password, name } = req.body;

    // Validate mobile number format
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNo)) {
      return res.status(400).json({
        status: false,
        message: "Invalid mobile number! Please enter a valid mobile number.",
      });
    }

    // Validate required fields
    if (!mobileNo || !password || !name) {
      return res.status(400).json({
        status: false,
        message: "Mobile number, password, and name are required",
      });
    }

    // Check if any admin already exists
    const existingAdmin = await Admin.findOne({});
    if (existingAdmin) {
      return res.status(400).json({
        status: false,
        message: "An admin already exists. Super admin can create more admins.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create first super admin
    const newAdmin = new Admin({
      mobileNo,
      password: hashedPassword,
      name,
      role: "super_admin", // ✅ First admin is always super_admin
      status: "active",
    });

    await newAdmin.save();

    return res.status(200).json({
      status: true,
      message: "Super admin created successfully. You can now log in.",
      data: {
        mobileNo: newAdmin.mobileNo,
        name: newAdmin.name,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Create Admin (Only Super Admins Can Add Admins)
const createAdmin = async (req, res) => {
  try {
    // Ensure the authenticated admin is passed from `verifyAdminToken`
    const authAdmin = req.admin;

    if (!authAdmin || authAdmin.role !== "super_admin") {
      return res.status(400).json({
        status: false,
        message: "Only super admins can create new admin accounts",
      });
    }

    const { mobileNo, password, name, role = "admin" } = req.body;

    // Validate required fields
    if (!mobileNo || !password || !name) {
      return res.status(400).json({
        status: false,
        message: "Mobile number, password, and name are required fields",
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

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ mobileNo });
    if (existingAdmin) {
      return res.status(400).json({
        status: false,
        message: "An admin with this mobile number already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const newAdmin = new Admin({
      mobileNo,
      password: hashedPassword,
      name,
      role,
      createdBy: authAdmin._id,
    });

    await newAdmin.save();

    // Remove password from response
    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;

    return res.status(200).json({
      status: true,
      message: "Admin created successfully",
      data: adminResponse,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Admin Login
const adminLogin = async (req, res) => {
  try {
    const { mobileNo, password } = req.body;

    // Validate input
    if (!mobileNo || !password) {
      return res.status(400).json({
        status: false,
        message: "Mobile number and password are required",
      });
    }

    // Find admin
    const admin = await Admin.findOne({ mobileNo });
    if (!admin) {
      return res.status(400).json({
        status: false,
        message: "Invalid credentials",
      });
    }

    // Check if admin is active
    if (admin.status !== "active") {
      return res.status(400).json({
        status: false,
        message: "Account is inactive. Please contact super admin.",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(400).json({
        status: false,
        message: "Invalid credentials",
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      status: true,
      message: "Login successful",
      data: {
        _id: admin._id,
        name: admin.name,
        mobileNo: admin.mobileNo,
        role: admin.role,
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const adminLogout = (req, res) => {
  try {
    res.clearCookie("adminInfo", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      domain: process.env.CLIENT_DOMAIN || "localhost",
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

//single profile approval
// PUT /api/v1/admin/panditRequest/:requestId?action=approve|reject
const approveOrRejectPanditRequest = async (req, res) => {
  try {
    const admin = req.admin;
    const { requestId } = req.params;
    const action = req.query.action; // "approve" or "reject"
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ status: false, message: "Invalid action" });
    }

    const request = await PanditRequest.findById(requestId);
    if (!request) {
      return res
        .status(400)
        .json({ status: false, message: "Request not found" });
    }

    const user = await User.findById(request.userId);
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    const now = new Date();
    let socketIssue = "";

    await Notification.deleteMany({
      notificationType: "panditRequest",
      "relatedData.panditRequestId": new mongoose.Types.ObjectId(requestId),
    });

    if (action === "reject") {
      // — REJECTION PATH —
      request.status = "rejected";
      await request.save();
      await PanditRequest.deleteOne({ _id: requestId });

      await Notification.deleteMany({
        userId: user._id,
        notificationType: {
          $in: ["panditApproved", "panditRejected"],
        },
      });

      await Notification.create({
        userId: user._id,
        userType: "User",
        notificationType: "panditRejected",
        relatedData: {
          fromUserId: req.admin._id,
          toUserId: user._id,
          username: "Admin",
          status: "rejected",
        },
        message: "Admin has rejected your Pandit profile request.",
      });

      const socketId = getConnectedUsers().get(user._id.toString());
      if (socketId) {
        getIO().to(socketId).emit("panditRequestRejected", {
          adminId: req.admin._id,
          message: "Your Pandit profile request was rejected by Admin.",
          status: "rejected",
        });
      } else {
        socketIssue = "User not active; socket not found.";
      }

      return res.json({
        status: true,
        message: "Pandit request rejected successfully",
        socketIssue,
      });
    }

    // — APPROVAL PATH —
    // 1) Create Profile
    const panditId = user.userId;
    const newPandit = new Pandit({ panditId, ...request.toObject() });
    await newPandit.save();

    // 2) Activate subscriptions on user
    const userSubs = user.serviceSubscriptions || [];

    // Trial
    const trial = userSubs.find(
      (s) =>
        s.serviceType === "Pandit" &&
        s.subscriptionType === "Trial" &&
        s.status === "Pending"
    );
    if (trial) {
      const end = new Date(now);
      end.setMinutes(end.getMinutes() + ((trial.trialPeriod || 7) * 24 * 60));
      trial.status = "Active";
      trial.startDate = now;
      trial.endDate = end;
    }

    // Paid
    const paid = userSubs.find(
      (s) =>
        s.serviceType === "Pandit" &&
        s.subscriptionType === "Paid" &&
        s.status === "Pending"
    );
    if (paid) {
      const end = new Date(now);
      end.setMonth(end.getMonth() + (paid.duration || 1));
      paid.status = "Active";
      paid.startDate = now;
      paid.endDate = end;

      // Update Subscription doc’s single service object
      const subDoc = await Subscription.findOne({
        userId: user._id,
        "service.serviceType": "Pandit",
        "service.status": "WaitingForApproval",
      });
      if (subDoc && subDoc.service) {
        subDoc.service.status = "Active";
        subDoc.service.startDate = now;
        subDoc.service.endDate = end;
        await subDoc.save();
      }
    }

    // 3) Flag user
    await updateUserProfileType(user._id, "isPandit");

    // 4) Persist user changes
    await user.save();

    // 5) Mark request and remove it
    request.status = "approved";
    await request.save();
    await PanditRequest.deleteOne({ _id: requestId });

    // 6) Notify user

    await Notification.deleteMany({
      userId: user._id,
      notificationType: {
        $in: ["panditApproved", "panditRejected"],
      },
    });

    await Notification.create({
      userId: user._id,
      userType: "User",
      notificationType: "panditApproved",
      relatedData: {
        fromUserId: req.admin._id,
        toUserId: user._id,
        panditId: newPandit._id,
        username: "Admin",
        status: "approved",
      },
      message: "Admin has approved your Pandit profile request.",
    });
    const socketId = getConnectedUsers().get(user._id.toString());
    if (socketId) {
      getIO().to(socketId).emit("panditRequestApproved", {
        adminId: req.admin._id,
        message: "Your Pandit profile request was approved!",
        status: "approved",
      });
    } else {
      socketIssue = "User not active; socket not found.";
    }

    return res.status(200).json({
      status: true,
      message: "Pandit profile approved successfully",
      data: newPandit,
      socketIssue,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

const modelMap = {
  Pandit: { requestModel: PanditRequest, profileModel: Pandit },
  Jyotish: { requestModel: JyotishRequest, profileModel: Jyotish },
  Kathavachak: { requestModel: KathavachakRequest, profileModel: Kathavachak },
  Activist: { requestModel: ActivistRequest, profileModel: Activist },
};

const approveOrRejectMultipleRequests = async (req, res) => {
  try {
    const admin = req.admin;
    const { requests } = req.body;
    const results = [];
    let approvedCount = 0;
    let rejectedCount = 0;
    let failedCount = 0;

    for (const { requestId, profileType, action } of requests) {
      if (!["approve", "reject"].includes(action)) {
        results.push({ requestId, status: false, message: "Invalid action" });
        failedCount++;
        continue;
      }

      const models = modelMap[profileType];
      if (!models) {
        results.push({
          requestId,
          status: false,
          message: "Invalid profileType",
        });
        failedCount++;
        continue;
      }

      const { requestModel, profileModel } = models;

      try {
        const request = await requestModel.findById(requestId);
        if (!request) {
          results.push({
            requestId,
            status: false,
            message: "Request not found",
          });
          failedCount++;
          continue;
        }

        const user = await User.findById(request.userId);
        if (!user) {
          results.push({ requestId, status: false, message: "User not found" });
          failedCount++;
          continue;
        }

        const now = new Date();
        let socketIssue = "";

        await Notification.deleteOne({
          notificationType: `${profileType.toLowerCase()}Request`,
          [`relatedData.${profileType.toLowerCase()}RequestId`]: new mongoose.Types.ObjectId(requestId),
        });

        if (action === "reject") {
          request.status = "rejected";
          await request.save();
          await requestModel.deleteOne({ _id: requestId });

          await Notification.deleteMany({
            userId: user._id,
            notificationType: {
              $in: [
                `${profileType.toLowerCase()}Approved`,
                `${profileType.toLowerCase()}Rejected`,
              ],
            },
          });
          await Notification.create({
            userId: request.userId,
            userType: "User",
            notificationType: `${profileType.toLowerCase()}Rejected`,
            relatedData: {
              fromUserId: req?.admin?._id,
              toUserId: request.userId,
              username: "Admin",
              status: "rejected",
            },
            message: `Admin has rejected your ${profileType} request.`,
          });

          const socketId = getConnectedUsers().get(request.userId.toString());
          if (socketId) {
            getIO()
              .to(socketId)
              .emit(`${profileType.toLowerCase()}RequestRejected`, {
                message: `Admin has rejected your ${profileType} request.`,
                adminId: req?.admin?._id,
                status: "rejected",
              });
          } else {
            socketIssue = "Socket not found";
          }

          results.push({
            requestId,
            status: true,
            message: `${profileType} request rejected successfully`,
            socketIssue,
          });
          rejectedCount++;
          continue;
        }

        // If approved
        const profileId = user.userId;
        const requestData = request.toObject();
        const newProfile = new profileModel({
          [`${profileType.toLowerCase()}Id`]: profileId,
          ...requestData,
        });
        await newProfile.save();

        // Handle Trial and Paid subscription
        const userSubs = user.serviceSubscriptions || [];
        const trial = userSubs.find(
          (s) =>
            s.serviceType === profileType &&
            s.subscriptionType === "Trial" &&
            s.status === "Pending"
        );
        if (trial) {
          const endDate = new Date(now);
          endDate.setMinutes(
            endDate.getMinutes() + ((trial.trialPeriod || 7) * 24 * 60)
          );
          trial.status = "Active";
          trial.startDate = now;
          trial.endDate = endDate;
        }

        const paid = userSubs.find(
          (s) =>
            s.serviceType === profileType &&
            s.subscriptionType === "Paid" &&
            s.status === "Pending"
        );
        if (paid) {
          const endDate = new Date(now);
          endDate.setMonth(endDate.getMonth() + (paid.duration || 1));
          paid.status = "Active";
          paid.startDate = now;
          paid.endDate = endDate;

          const subscriptionDoc = await Subscription.findOne({
            userId: user._id,
            "service.serviceType": profileType,
            "service.status": "WaitingForApproval",
          });

          if (subscriptionDoc) {
            const svc = subscriptionDoc.service;
            svc.status = "Active";
            svc.startDate = now;
            svc.endDate = endDate;
            await subscriptionDoc.save();
          }
        }

        await user.save();

        request.status = "approved";
        await request.save();
        await updateUserProfileType(user._id, `is${profileType}`);
        await requestModel.deleteOne({ _id: requestId });

        await Notification.deleteMany({
          userId: user._id,
          notificationType: {
            $in: [
              `${profileType.toLowerCase()}Approved`,
              `${profileType.toLowerCase()}Rejected`,
            ],
          },
        });
        await Notification.create({
          userId: user._id,
          userType: "User",
          notificationType: `${profileType.toLowerCase()}Approved`,
          relatedData: {
            fromUserId: req?.admin?._id,
            toUserId: user._id,
            [`${profileType.toLowerCase()}Id`]: newProfile._id,
            username: "Admin",
            status: "approved",
          },
          message: `Admin has approved your ${profileType} request.`,
        });

        const socketId = getConnectedUsers().get(user._id.toString());
        if (socketId) {
          getIO()
            .to(socketId)
            .emit(`${profileType.toLowerCase()}RequestApproved`, {
              message: `Admin has approved your ${profileType} request.`,
              adminId: req?.admin?._id,
              status: "approved",
            });
        } else {
          socketIssue = "Socket not found";
        }

        results.push({
          requestId,
          status: true,
          message: `${profileType} request approved successfully`,
          socketIssue,
        });
        approvedCount++;
      } catch (innerErr) {
        results.push({ requestId, status: false, message: innerErr.message });
        failedCount++;
      }
    }

    const message = `✅ Approved: ${approvedCount}, ❌ Rejected: ${rejectedCount}, ⚠️ Failed: ${failedCount}`;

    return res.status(200).json({ status: true, results, message });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

const approveOrRejectKathavachakRequest = async (req, res) => {
  try {
    console.log("approveOrRejectKathavachakRequest")
    const admin = req.admin;
    const { requestId } = req.params;
    const action = req.query.action;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ status: false, message: "Invalid action" });
    }

    const request = await KathavachakRequest.findById(requestId);
    if (!request) {
      return res
        .status(400)
        .json({ status: false, message: "Request not found" });
    }

    const user = await User.findById(request.userId);
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    const now = new Date();
    let socketIssue = "";

    await Notification.deleteOne({
      notificationType: "kathavachakRequest",
      "relatedData.kathavachakRequestId": new mongoose.Types.ObjectId(requestId),
    });


    if (action === "reject") {
      request.status = "rejected";
      await request.save();
      await KathavachakRequest.deleteOne({ _id: requestId });

      await Notification.deleteMany({
        userId: user._id,
        notificationType: {
          $in: ["kathavachakApproved", "kathavachakRejected"],
        },
      });

      await Notification.create({
        userId: user._id,
        userType: "User",
        notificationType: "kathavachakRejected",
        relatedData: {
          fromUserId: req.admin._id,
          toUserId: user._id,
          username: "Admin",
          status: "rejected",
        },
        message: "Admin has rejected your Kathavachak profile request.",
      });

      const socketId = getConnectedUsers().get(user._id.toString());
      if (socketId) {
        getIO().to(socketId).emit("kathavachakRequestRejected", {
          adminId: req.admin._id,
          message: "Your Kathavachak profile request was rejected by Admin.",
          status: "rejected",
        });
      } else {
        socketIssue = "User not active; socket not found.";
      }

      return res.json({
        status: true,
        message: "Kathavachak request rejected successfully",
        socketIssue,
      });
    }

    // — APPROVAL —
    const kathavachakId = user.userId;
    const newKathavachak = new Kathavachak({
      kathavachakId,
      ...request.toObject(),
    });
    await newKathavachak.save();

    const userSubs = user.serviceSubscriptions || [];

    const trial = userSubs.find(
      (s) =>
        s.serviceType === "Kathavachak" &&
        s.subscriptionType === "Trial" &&
        s.status === "Pending"
    );
    if (trial) {
      const end = new Date(now);
      end.setMinutes(end.getMinutes() + ((trial.trialPeriod || 7) * 24 * 60));
      trial.status = "Active";
      trial.startDate = now;
      trial.endDate = end;
    }

    const paid = userSubs.find(
      (s) =>
        s.serviceType === "Kathavachak" &&
        s.subscriptionType === "Paid" &&
        s.status === "Pending"
    );
    if (paid) {
      const end = new Date(now);
      end.setMonth(end.getMonth() + (paid.duration || 1));
      paid.status = "Active";
      paid.startDate = now;
      paid.endDate = end;

      await Subscription.updateOne(
        {
          userId: user._id,
          "service.serviceType": "Kathavachak",
          "service.status": "WaitingForApproval",
        },
        {
          $set: {
            "service.status": "Active",
            "service.startDate": now,
            "service.endDate": end,
          },
        }
      );
    }

    await updateUserProfileType(user._id, "isKathavachak");
    await user.save();

    request.status = "approved";
    await request.save();
    await KathavachakRequest.deleteOne({ _id: requestId });

    await Notification.deleteMany({
      userId: user._id,
      notificationType: {
        $in: ["kathavachakApproved", "kathavachakRejected"],
      },
    });

    await Notification.create({
      userId: user._id,
      userType: "User",
      notificationType: "kathavachakApproved",
      relatedData: {
        fromUserId: req.admin._id,
        toUserId: user._id,
        kathavachakId: newKathavachak._id,
        username: "Admin",
        status: "approved",
      },
      message: "Admin has approved your Kathavachak profile request.",
    });

    const socketId = getConnectedUsers().get(user._id.toString());
    if (socketId) {
      getIO().to(socketId).emit("kathavachakRequestApproved", {
        adminId: req.admin._id,
        message: "Your Kathavachak profile request was approved!",
        status: "approved",
      });
    } else {
      socketIssue = "User not active; socket not found.";
    }

    return res.status(200).json({
      status: true,
      message: "Kathavachak profile approved successfully",
      data: newKathavachak,
      socketIssue,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

const approveOrRejectJyotishRequest = async (req, res) => {
  try {
    const admin = req.admin;
    const { requestId } = req.params;
    const action = req.query.action;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ status: false, message: "Invalid action" });
    }

    const request = await JyotishRequest.findById(requestId);
    if (!request) {
      return res
        .status(400)
        .json({ status: false, message: "Request not found" });
    }

    const user = await User.findById(request.userId);
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    const now = new Date();
    let socketIssue = "";

    await Notification.deleteOne({
      notificationType: "jyotishRequest",
      "relatedData.jyotishRequestId": new mongoose.Types.ObjectId(requestId),
    });

    if (action === "reject") {
      request.status = "rejected";
      await request.save();
      await JyotishRequest.deleteOne({ _id: requestId });

      await Notification.deleteMany({
        userId: user._id,
        notificationType: { $in: ["jyotishApproved", "jyotishRejected"] },
      });

      await Notification.create({
        userId: user._id,
        userType: "User",
        notificationType: "jyotishRejected",
        relatedData: {
          fromUserId: req.admin._id,
          toUserId: user._id,
          username: "Admin",
          status: "rejected",
        },
        message: "Admin has rejected your Jyotish profile request.",
      });

      const socketId = getConnectedUsers().get(user._id.toString());
      if (socketId) {
        getIO().to(socketId).emit("jyotishRequestRejected", {
          adminId: req.admin._id,
          message: "Your Jyotish profile request was rejected by Admin.",
          status: "rejected",
        });
      } else {
        socketIssue = "User not active; socket not found.";
      }

      return res.json({
        status: true,
        message: "Jyotish request rejected successfully",
        socketIssue,
      });
    }

    // — APPROVAL —
    const jyotishId = user.userId;
    const newJyotish = new Jyotish({ jyotishId, ...request.toObject() });
    await newJyotish.save();

    const userSubs = user.serviceSubscriptions || [];

    const trial = userSubs.find(
      (s) =>
        s.serviceType === "Jyotish" &&
        s.subscriptionType === "Trial" &&
        s.status === "Pending"
    );
    if (trial) {
      const end = new Date(now);
      end.setMinutes(end.getMinutes() + ((trial.trialPeriod || 7) * 24 * 60));
      trial.status = "Active";
      trial.startDate = now;
      trial.endDate = end;
    }

    const paid = userSubs.find(
      (s) =>
        s.serviceType === "Jyotish" &&
        s.subscriptionType === "Paid" &&
        s.status === "Pending"
    );
    if (paid) {
      const end = new Date(now);
      end.setMonth(end.getMonth() + (paid.duration || 1));
      paid.status = "Active";
      paid.startDate = now;
      paid.endDate = end;

      await Subscription.updateOne(
        {
          userId: user._id,
          "service.serviceType": "Jyotish",
          "service.status": "WaitingForApproval",
        },
        {
          $set: {
            "service.status": "Active",
            "service.startDate": now,
            "service.endDate": end,
          },
        }
      );
    }

    await updateUserProfileType(user._id, "isJyotish");
    await user.save();

    request.status = "approved";
    await request.save();
    await JyotishRequest.deleteOne({ _id: requestId });

    await Notification.deleteMany({
      userId: user._id,
      notificationType: { $in: ["jyotishApproved", "jyotishRejected"] },
    });

    await Notification.create({
      userId: user._id,
      userType: "User",
      notificationType: "jyotishApproved",
      relatedData: {
        fromUserId: req.admin._id,
        toUserId: user._id,
        jyotishId: newJyotish._id,
        username: "Admin",
        status: "approved",
      },
      message: "Admin has approved your Jyotish profile request.",
    });

    const socketId = getConnectedUsers().get(user._id.toString());
    if (socketId) {
      getIO().to(socketId).emit("jyotishRequestApproved", {
        adminId: req.admin._id,
        message: "Your Jyotish profile request was approved!",
        status: "approved",
      });
    } else {
      socketIssue = "User not active; socket not found.";
    }

    return res.status(200).json({
      status: true,
      message: "Jyotish profile approved successfully",
      data: newJyotish,
      socketIssue,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

const approveOrRejectActivistRequest = async (req, res) => {
  try {
    const admin = req.admin;
    const { requestId } = req.params;
    const action = req.query.action;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ status: false, message: "Invalid action" });
    }

    const request = await ActivistRequest.findById(requestId);
    if (!request) {
      return res
        .status(400)
        .json({ status: false, message: "Request not found" });
    }

    const user = await User.findById(request.userId);
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    let socketIssue = "";

    await Notification.deleteOne({
      notificationType: "activistRequest",
      "relatedData.activistRequestId": new mongoose.Types.ObjectId(requestId),
    });

    // Handle REJECTION
    if (action === "reject") {
      request.status = "rejected";
      await request.save();
      await ActivistRequest.deleteOne({ _id: requestId });

      await Notification.deleteMany({
        userId: user._id,
        notificationType: { $in: ["activistApproved", "activistRejected"] },
      });

      await Notification.create({
        userId: user._id,
        userType: "User",
        notificationType: "activistRejected",
        relatedData: {
          fromUserId: req.admin._id,
          toUserId: user._id,
          username: "Admin",
          status: "rejected",
        },
        message: "Admin has rejected your Activist profile request.",
      });

      const socketId = getConnectedUsers().get(user._id.toString());
      if (socketId) {
        getIO().to(socketId).emit("activistRequestRejected", {
          adminId: req.admin._id,
          message: "Your Activist profile request was rejected by Admin.",
          status: "rejected",
        });
      } else {
        socketIssue = "User not active; socket not found.";
      }

      return res.json({
        status: true,
        message: "Activist request rejected successfully",
        socketIssue,
      });
    }

    // APPROVAL
    const activistId = user.userId;
    const requestData = request.toObject();
    const newActivist = new Activist({ activistId, ...requestData });
    await newActivist.save();

    await updateUserProfileType(user._id, "isActivist");
    await user.save();

    request.status = "approved";
    await request.save();
    await ActivistRequest.deleteOne({ _id: requestId });

    await Notification.deleteMany({
      userId: user._id,
      notificationType: { $in: ["activistApproved", "activistRejected"] },
    });

    await Notification.create({
      userId: user._id,
      userType: "User",
      notificationType: "activistApproved",
      relatedData: {
        fromUserId: req.admin._id,
        toUserId: user._id,
        activistId: newActivist._id,
        username: "Admin",
        status: "approved",
      },
      message: "Admin has approved your Activist profile request.",
    });

    const socketId = getConnectedUsers().get(user._id.toString());
    if (socketId) {
      getIO().to(socketId).emit("activistRequestApproved", {
        adminId: req.admin._id,
        message: "Your Activist profile request was approved!",
        status: "approved",
      });
    } else {
      socketIssue = "User not active; socket not found.";
    }

    return res.status(200).json({
      status: true,
      message: "Activist profile approved successfully",
      data: newActivist,
      socketIssue,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

const reviewSuccessStoryRequest = async (req, res) => {
  try {
    const admin = req.admin;
    const { status, requestId } = req.params;
    const allowedStatus = ["approved", "rejected"];
    let socketIssue = "";

    // Validate the status type
    if (!allowedStatus.includes(status)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid Status Type: " + status });
    }

    const request = await SuccessStoryRequest.findById(requestId);
    if (!request) {
      return res
        .status(400)
        .json({ status: false, message: "SuccessStory Request not found" });
    }

    // const user = await User.findById(request.userId);
    // if (!user) {
    //   return res.status(400).json({ status: false, message: "User not found" });
    // }

    let newStory = null;
    let message = "";

    await Notification.deleteOne({
      notificationType: "successStoryRequest",
      "relatedData.successStoryId": new mongoose.Types.ObjectId(requestId),
    });

    if (status === "approved") {
      const requestData = request.toObject();
      delete requestData._id; // avoid duplicate _id conflict

      newStory = new SuccessStory(requestData);
      await newStory.save();

      message = "Admin has Approved your SuccessStory Creation Request!";
    } else {
      message = "Admin has Rejected your SuccessStory Creation Request!";
    }

    // Always delete the request (approved or rejected)
    await SuccessStoryRequest.findByIdAndDelete(requestId);

    // Delete previous notifications of this type for this user
    await Notification.deleteMany({
      userId: request.userId,
      notificationType: { $in: ["successStoryApproved", "successStoryRejected"] },
    });


    // Notify user
    await Notification.create({
      userId: request.userId,
      userType: "User",
      notificationType:
        status === "approved" ? "successStoryApproved" : "successStoryRejected",
      relatedData: {
        fromUserId: req.admin?._id,
        toUserId: request.userId,
        ...(newStory && { successStoryId: newStory._id }),
        username: "Admin",
        photoUrl: req?.admin?.photoUrl,
        status,
      },
      message,
      seen: false,
    });

    // Real-time socket notification
    const connectedUsers = getConnectedUsers();
    const io = getIO();
    const socketUserId = connectedUsers.get(request.userId.toString());

    if (!socketUserId) {
      socketIssue = "User not connected via socket.";
    } else {
      io.to(socketUserId).emit(
        status === "approved" ? "successStoryApproved" : "successStoryRejected",
        {
          message,
          ...(newStory && { successStoryId: newStory._id }),
          status,
        }
      );
    }

    return res.status(200).json({
      status: true,
      message: `Success Story request ${status} successfully.`,
      ...(newStory && { data: newStory }),
      socketIssue,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

const getAllRequests = async (req, res) => {
  try {
    // Get status from query params, default to fetching both pending and approved
    const { status } = req.query;

    // Build query based on status parameter
    let query = {};
    if (status) {
      // If specific status is requested
      query.status = status;
    } else {
      // Default to fetching both pending and approved
      query.status = { $in: ["pending", "approved"] };
    }

    const panditRequests = await PanditRequest.find(query)
      .populate("userId", "fullName email mobileNo userId") // Specify fields you want from user
      .sort({ createdAt: -1 }); // Sort by newest first

    const kathavachakRequests = await KathavachakRequest.find(query)
      .populate("userId", "fullName email mobileNo userId")
      .sort({ createdAt: -1 });

    const jyotishRequests = await JyotishRequest.find(query)
      .populate("userId", "fullName email mobileNo userId")
      .sort({ createdAt: -1 });

    const activistRequests = await ActivistRequest.find(query)
      .populate("userId", "fullName email mobileNo userId")
      .sort({ createdAt: -1 });

    // Merge results
    const allRequests = [
      ...panditRequests,
      ...kathavachakRequests,
      ...jyotishRequests,
      ...activistRequests,
    ];
    allRequests.sort((a, b) => b.createdAt - a.createdAt);

    return res.status(200).json({
      status: true,
      message: "Requests fetched successfully",
      count: allRequests.length,
      data: allRequests,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error fetching requests",
      error: error.message,
    });
  }
};

//getAllSuccessStoryRequest and its shorter name will be getAllStoryRequests
const getAllStoryRequests = async (req, res) => {
  try {
    const { status } = req.query;

    // Set default status filter
    let query = {};
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ["pending", "approved"] };
    }

    const successStoryRequests = await SuccessStoryRequest.find(query)
      .populate("userId", "fullName email mobileNo userId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: "Success story requests fetched successfully",
      count: successStoryRequests.length,
      data: successStoryRequests,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error fetching success story requests",
      error: error.message,
    });
  }
};

//getAllReports by query
const getAllReports = async (req, res) => {
  try {
    // Extract filters from query params
    const { userId, profileId, profileType, reportDate, startDate, endDate } =
      req.query;

    // Prepare filter conditions for the Kathavachak profiles
    let filterConditions = {};
    //if check by userId
    if (userId) {
      filterConditions.userId = userId;
    }
    //if check by profileId
    if (profileId) {
      filterConditions.profileId = profileId;
    }
    //if check by reportDate
    // If filtering by a specific reportDate (date only, no time)
    if (reportDate) {
      // Convert the given date string into a Date object
      const startOfDay = new Date(reportDate);
      startOfDay.setHours(0, 0, 0, 0); // Set to midnight of the given date
      const endOfDay = new Date(reportDate);
      endOfDay.setHours(23, 59, 59, 999); // Set to the end of the given day

      // Add filter for reports created on this specific date
      filterConditions.reportDate = {
        $gte: startOfDay,
        $lt: endOfDay,
      };
    }
    // If filtering by a date range (startDate to endDate)
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Start of the day for startDate
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of the day for endDate

      // Add filter for reports created within this date range
      filterConditions.reportDate = { $gte: start, $lte: end };
    }
    //id check by profileType
    if (profileType) {
      filterConditions.profileType = profileType;
    }
    // Fetch all reports from the database
    const allReports = await Report.find(filterConditions)
      .populate("userId profileId")
      .sort({ createdAt: -1 });

    //check if reports are available
    if (!allReports || allReports.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No reports found yet." });
    }

    // If reports are available, return them as JSON response
    return res.status(200).json({
      status: true,
      message: "Reports fetched successfully",
      data: allReports,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

//getAllFeedBacks
const getAllFeedBacks = async (req, res) => {
  try {
    // Fetch all feedbacks from the database
    const allFeedbacks = await Feedback.find()
      .populate("userId")
      .sort({ createdAt: -1 });

    //check if feedbacks are available
    if (!allFeedbacks || allFeedbacks.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No feedbacks found yet." });
    }

    // If feedbacks are available, return a res
    return res.status(200).json({
      status: true,
      message: "Feedbacks fetched successfully",
      data: allFeedbacks,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

//getAllAdvertisementRequest
const getAllAdvertisementRequest = async (req, res) => {
  try {
    // Fetch all advertisment requests from the database
    const allAdvertisementRequest = await Advertise.find().populate("userId", "userId").sort({
      createdAt: -1,
    });

    //check if advertisement requests are available
    if (!allAdvertisementRequest || allAdvertisementRequest.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No Advertisement Request found yet.",
      });
    }

    // If advertisement request are available, return a res
    return res.status(200).json({
      status: true,
      message: "Advertisement Requests fetched successfully",
      data: allAdvertisementRequest,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

const models = {
  pandit: { model: Pandit, field: "panditId", entityType: "Pandit" },
  jyotish: { model: Jyotish, field: "jyotishId", entityType: "Jyotish" },
  kathavachak: {
    model: Kathavachak,
    field: "kathavachakId",
    entityType: "Kathavachak",
  },
};

const fetchSpecialist = async (req, res) => {
  try {
    const { userType, customId } = req.params;

    if (!models[userType]) {
      return res.status(400).json({ message: "Invalid user type" });
    }

    const { model, field } = models[userType];

    // Fetch user by the custom ID field
    const user = await model.findOne({ [field]: customId });

    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "Profile not found" });
    }

    return res.status(200).json({
      status: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const parseDate = (str) => {
  const [day, month, year] = str.split("/");
  return new Date(`${year}-${month}-${day}`);
};

const specialistController = async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const { userType } = req.params;
    const {
      search,
      state,
      city,
      action,
      userId,
      isEnabled,
      startDate,
      endDate,
    } = req.query;

    if (!models[userType]) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user type" });
    }

    const { model, field } = models[userType];
    if (action === "toggleAccessWithSubscription" && userId) {
      const { startDate, endDate, serviceType } = req.body;

      const user = await model.findById(userId);
      if (!user) {
        return res.status(400).json({ status: false, message: "User not found" });
      }

      const newIsEnabled = !user.isEnabled;
      user.isEnabled = newIsEnabled;
      await user.save({ validateBeforeSave: false });

      const linkedUser = await User.findById(user.userId);
      if (linkedUser && serviceType) {
        const existingSubIndex = linkedUser.serviceSubscriptions.findIndex(
          (sub) => sub.serviceType === serviceType
        );

        if (newIsEnabled && startDate && endDate) {
          const subData = {
            serviceType,
            subscriptionType: "Paid",
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: "Active",
          };
          if (existingSubIndex !== -1) {
            linkedUser.serviceSubscriptions[existingSubIndex] = {
              ...linkedUser.serviceSubscriptions[existingSubIndex].toObject(),
              ...subData,
            };
          } else {
            linkedUser.serviceSubscriptions.push(subData);
          }
        } else if (!newIsEnabled && existingSubIndex !== -1) {
          linkedUser.serviceSubscriptions[existingSubIndex].status = "Expired";
          linkedUser.serviceSubscriptions[existingSubIndex].endDate = new Date();
        }

        await linkedUser.save();
      }

      return res.status(200).json({
        status: true,
        message: `Access ${newIsEnabled ? "enabled" : "disabled"} successfully`,
      });
    }

    if (action === "toggleAccess" && userId) {
      const user = await model.findById(userId);
      if (!user) {
        return res
          .status(400)
          .json({ status: false, message: "User not found" });
      }
      user.isEnabled = !user.isEnabled;
      await user.save({ validateBeforeSave: false });
      return res
        .status(200)
        .json({ status: true, message: "Access updated successfully" });
    }

    if (action === "getFilters") {
      const states = await model.distinct("state");
      const cities = await model.distinct("city");
      return res.json({ success: true, states, cities });
    }

    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { mobileNo: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
        { [field]: { $regex: search, $options: "i" } },
      ];
    }

    if (state) query.state = state;
    if (city) query.city = city;

    if (isEnabled === "true" || isEnabled === "false") {
      query.isEnabled = isEnabled === "true";
    }

    // Parse dd/mm/yyyy format for createdAt
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate)
        query.createdAt.$gte = new Date(
          parseDate(startDate).setHours(0, 0, 0, 0)
        );
      if (endDate)
        query.createdAt.$lte = new Date(
          parseDate(endDate).setHours(23, 59, 59, 999)
        );
    }

    const [users, totalUsers, activeUsers] = await Promise.all([
      model
        .find(query)
        .populate("userId", "serviceSubscriptions")
        .select(`fullName mobileNo state city createdAt isEnabled ${field}`)
        .sort({ createdAt: -1 }),
      model.countDocuments(query),
      model.countDocuments({ ...query, isEnabled: true }),
    ]);

    return res.status(200).json({
      status: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
      },
      users,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

//deleteUser & it's Details from other models
const delete_UserById = async (req, res) => {
  try {
    const { id } = req?.params;

    // Find user
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "User not Found!" });
    }

    const userId = user._id;

    // Find all documents created by this user
    const [dharmshalas, committees, biodata, pandit, jyotish, kathavachak] =
      await Promise.all([
        Dharmshala.find({ userId }),
        Committee.find({ userId }),
        Biodata.findOne({ userId }),
        Pandit.findOne({ userId }),
        Jyotish.findOne({ userId }),
        Kathavachak.findOne({ userId }),
      ]);

    // Extract their _id values
    const saveProfileIds = [
      biodata?._id,
      pandit?._id,
      jyotish?._id,
      kathavachak?._id,
      ...dharmshalas.map((d) => d._id),
      ...committees.map((c) => c._id),
    ].filter(Boolean);

    // Delete all savedProfiles pointing to any of the above _ids
    const deleteSavedProfilesPromise = SavedProfile.deleteMany({
      saveProfile: { $in: saveProfileIds },
    });

    // Prepare deletion tasks
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
      SavedProfile.deleteOne({ userId }), // saved profiles created *by* this user
      deleteSavedProfilesPromise, // saved profiles *about* the user's creations
      Pandit.deleteOne({ userId }),
      ConnectionRequest.deleteMany({
        $or: [{ toUserId: userId }, { fromUserId: userId }],
      }),
      Activist.deleteOne({ userId }),
      Rating.deleteMany({ userId }),
      EventPost.deleteMany({ $or: [{ userId }, { activistId: userId }] }),
      OTPRequest.deleteOne({ mobileNo: user?.mobileNo }),
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
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (failedDeletions.length > 0) {
      console.error("Some deletions failed:", failedDeletions);
    }

    return res.status(200).json({
      status: true,
      message: "User Account Deleted Successfully",
      data: results.map((result) => result.value || null),
      failedDeletions,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getAllMetrimonial = async (req, res) => {
  try {
    const biodata = await Biodata.find()
      .populate("userId", "serviceSubscriptions")
      .sort({ createdAt: -1 });
    if (!biodata || !biodata.length) {
      return res.status(400).json({
        status: false,
        message: "No biodata data found yet.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "All Metrimonial Profile Data Fetched Successfully.",
      data: biodata,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching biodata.",
      error: error.message,
    });
  }
};

const getBiodataById = async (req, res) => {
  try {
    const { bioDataId } = req.params;

    const biodata = await Biodata.findOne({ bioDataId: bioDataId });
    if (!biodata) {
      return res.status(400).json({
        status: false,
        message: "No biodata found for this ID.",
      });
    }

    return res.status(200).json({
      status: true,
      data: biodata,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching biodata.",
      error: error.message,
    });
  }
};

const getBiodataByUserAdmin = async (req, res) => {
  try {
    // Admin authentication check (using adminToken) should be here
    const { bioDataId } = req.params;

    const biodata = await Biodata.findOne({ bioDataId: bioDataId });

    if (!biodata) {
      return res
        .status(400)
        .json({ status: false, message: "Biodata not found for this user." });
    }

    res.status(200).json({ status: true, data: biodata });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// const setMetrionial_ActivityStatus = async (req, res) => {
//   try {
//     const { bioDataId } = req.body;

//     //check for metrimonial profile exists
//     const metrimonialProfile = await Biodata.findOne({ bioDataId });

//     if (!metrimonialProfile) {
//       return res
//         .status(400)
//         .json({ status: false, message: "Metrimonial Profile Not Found!" });
//     }

//     // Update the profile field
//     if (metrimonialProfile?.activityStatus === "Inactive") {
//       metrimonialProfile["activityStatus"] = "Active";
//       // Save the updated user
//       await metrimonialProfile.save();
//       return res.status(200).json({
//         status: true,
//         message: `Metrimonial Profile is ${metrimonialProfile.activityStatus === "Active"
//             ? "Activated"
//             : "InActivated"
//           }.`,
//       });
//     }
//     if (metrimonialProfile?.activityStatus === "Active") {
//       metrimonialProfile["activityStatus"] = "Inactive";
//       // Save the updated user
//       await metrimonialProfile.save();
//       return res.status(200).json({
//         status: true,
//         message: `Metrimonial Profile is ${metrimonialProfile.activityStatus === "Inactive"
//             ? "InActivated"
//             : "Activated"
//           }.`,
//       });
//     }

//     //res error if something went wronh
//     return res.status(200).json({
//       status: true,
//       message: "Something went wrong While setting activityStatus.",
//     });
//   } catch (err) {
//     res.status(500).json({
//       status: false,
//       message: "Error While Setting ActivityStatus: " + err.message,
//     });
//   }
// };

/**
 * setMetrimonial_ActivityStatus
 *
 * Toggle behaviour:
 *  - If currently Active  → set Inactive, clear date range
 *  - If currently Inactive → require startDate + endDate from body,
 *    set Active for that date range, schedule auto-deactivation
 *
 * Request body:
 *  { bioDataId, startDate?, endDate? }
 *
 * startDate / endDate are ISO strings e.g. "2026-06-01"
 */
const setMetrionial_ActivityStatus = async (req, res) => {
  try {
    const { bioDataId, startDate, endDate } = req.body;

    if (!bioDataId) {
      return res.status(400).json({ status: false, message: "bioDataId is required." });
    }

    const profile = await Biodata.findOne({ bioDataId });

    if (!profile) {
      return res.status(404).json({ status: false, message: "Matrimonial profile not found." });
    }

    // ── Deactivate (Active → Inactive) ────────────────────────────────────────
    if (profile.activityStatus === "Active") {
      profile.activityStatus = "Inactive";
      profile.activeStartDate = null;
      profile.activeEndDate = null;
      await profile.save();

      // Update user's Biodata serviceSubscription to Expired
      await User.findByIdAndUpdate(
        profile.userId, // assuming Biodata has a userId reference
        {
          $set: {
            "serviceSubscriptions.$[elem].status": "Expired",
            "serviceSubscriptions.$[elem].endDate": new Date(),
          },
        },
        {
          arrayFilters: [{ "elem.serviceType": "Biodata" }],
          new: true,
        }
      );

      return res.status(200).json({
        status: true,
        message: "Matrimonial profile has been deactivated.",
        data: {
          activityStatus: profile.activityStatus,
          activeStartDate: profile.activeStartDate,
          activeEndDate: profile.activeEndDate,
        },
      });
    }

    // ── Activate (Inactive → Active) with date range ───────────────────────────
    if (profile.activityStatus === "Inactive") {

      if (!startDate || !endDate) {
        return res.status(400).json({
          status: false,
          message: "startDate and endDate are required to activate a profile.",
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          status: false,
          message: "Invalid date format. Use ISO format e.g. 2026-06-01.",
        });
      }

      if (start >= end) {
        return res.status(400).json({
          status: false,
          message: "startDate must be before endDate.",
        });
      }

      if (end <= new Date()) {
        return res.status(400).json({
          status: false,
          message: "endDate must be in the future.",
        });
      }

      profile.activityStatus = "Active";
      profile.activeStartDate = start;
      profile.activeEndDate = end;
      await profile.save();

      // ── Update or Insert user's Biodata serviceSubscription ──────────────────
      const user = await User.findById(profile.userId);

      if (!user) {
        return res.status(404).json({ status: false, message: "Associated user not found." });
      }

      const existingSubIndex = user.serviceSubscriptions.findIndex(
        (sub) => sub.serviceType === "Biodata"
      );

      if (existingSubIndex !== -1) {
        // Update existing Biodata subscription
        user.serviceSubscriptions[existingSubIndex].status = "Active";
        user.serviceSubscriptions[existingSubIndex].startDate = start;
        user.serviceSubscriptions[existingSubIndex].endDate = end;
      } else {
        // Push new Biodata subscription if not present
        user.serviceSubscriptions.push({
          serviceType: "Biodata",
          subscriptionType: "Paid",
          startDate: start,
          endDate: end,
          status: "Active",
        });
      }

      await user.save();

      return res.status(200).json({
        status: true,
        message: `Matrimonial profile activated from ${start.toDateString()} to ${end.toDateString()}.`,
        data: {
          activityStatus: profile.activityStatus,
          activeStartDate: profile.activeStartDate,
          activeEndDate: profile.activeEndDate,
        },
      });
    }

    return res.status(400).json({ status: false, message: "Unexpected activityStatus value." });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Error while setting activityStatus: " + err.message,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { gender, access, search } = req.query;
    const filter = {};

    //Gender filter
    if (gender) {
      filter["gender"] = new RegExp(gender, "i");
    }

    if (access) {
      filter["access"] = new RegExp(access, "i");
    }

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { mobileNo: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .populate({
        path: "userId",
        select: "userId username city gender mobileNo createdAt access",
      })
      .sort({ createdAt: -1 });

    if (users.length === 0) {
      return res.status(200).json({
        status: true,
        message: "No users found.",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Users fetched successfully.",
      data: users,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

const updateUserAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { access } = req.body;

    if (!access) {
      return res.status(400).json({
        status: false,
        message: "Missing 'access' field in request body",
      });
    }

    const user = await User.findByIdAndUpdate(id, { access }, { new: true });

    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    return res.status(200).json({
      status: true,
      message: "User access updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
      error: error,
    });
  }
};

//createCommitteProfile by admin for activist
const committeeByAdmin = async (req, res) => {
  try {
    const adminUserId = req?.admin?._id;

    // Check if the requester is an admin
    const adminProfile = await Admin.findOne({ _id: adminUserId });
    if (!adminProfile) {
      return res.status(400).json({
        status: false,
        message: "Access denied! Only admin can create committee profiles on behalf of Activist.",
      });
    }

    // Get fields from request body (populated via multer for file upload)
    const {
      activistId,
      committeeTitle,
      presidentName,
      subCaste,
      city,
      area,
      mobileNo,
    } = req.body;

    // Validate required fields
    if (
      !activistId ||
      !committeeTitle ||
      !presidentName ||
      !subCaste ||
      !city ||
      !area ||
      !mobileNo
    ) {
      return res
        .status(400)
        .json({ status: false, message: "Please enter all required fields!" });
    }

    // Validate activist ID (Assuming it's a 6-digit code like 'XX0001')
    if (!/^[A-Z]{2}[0-9]{4}$/.test(activistId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid activist ID! It should be in the format 'XX0001' to 'ZZ9999'.",
      });
    }

    // Find the activist by their unique ID
    const activistProfile = await Activist.findOne({ activistId });

    if (!activistProfile) {
      return res.status(400).json({
        status: false,
        message: "Activist not found! Please check the ID.",
      });
    }

    const userId = activistProfile.userId;

    // Handle photo file upload via multer (req.files)
    let photoUrlPath = null;
    if (req.files?.photoUrl && req.files.photoUrl.length > 0) {
      // Save file path, replacing backslashes
      photoUrlPath = req.files.photoUrl[0].path.replace(/\\/g, "/");
    }

    // Create new committee profile
    const newCommitteeProfile = new Committee({
      userId,
      activistId: activistProfile._id,
      committeeTitle,
      presidentName,
      subCaste,
      city,
      area,
      photoUrl: photoUrlPath,
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


const updateCommitteeByAdmin = async (req, res) => {
  try {
    const { committeeId } = req.params;
    if (!committeeId) {
      return res
        .status(400)
        .json({ status: false, message: "No committeeId provided" });
    }

    // Check if committee exists
    const existingCommittee = await Committee.findById(committeeId.trim());
    if (!existingCommittee) {
      return res
        .status(404)
        .json({ status: false, message: "Committee Profile Not Found!" });
    }

    // Allowed fields to update
    const allowedFields = [
      "committeeTitle",
      "presidentName",
      "subCaste",
      "city",
      "area",
      "mobileNo",
    ];
    const updateData = {};

    // Validate and copy allowed fields
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Validate mobile number format
    if (updateData.mobileNo) {
      const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
      if (!mobileRegex.test(updateData.mobileNo)) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid mobile number. Please enter a valid 10-digit mobile number.",
        });
      }
    }

    // Handle photoUrl upload via multer (req.files.photoUrl)
    if (req.files?.photoUrl && req.files.photoUrl.length > 0) {
      const uploadedPath = req.files.photoUrl[0].path.replace(/\\/g, "/");
      updateData.photoUrl = uploadedPath;
    }

    // Ensure there is something to update
    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No valid fields to update." });
    }

    // Perform the update
    const updatedCommittee = await Committee.findByIdAndUpdate(
      committeeId.trim(),
      { $set: updateData },
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: "Committee updated successfully.",
      data: updatedCommittee,
    });
  } catch (err) {
    console.error("Error updating committee:", err);
    return res.status(500).json({ status: false, message: err.message });
  }
};


const deleteCommiteeByAdmin = async (req, res) => {
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

//dharmshalaByAdmin on the behalf of activist
const dharmshalaByAdmin = async (req, res) => {
  try {
    // Get admin user ID from logged-in admin (via middleware)
    const adminUserId = req?.admin?._id;

    // Check if the requester is a valid admin
    const adminProfile = await Admin.findOne({ _id: adminUserId });
    if (!adminProfile) {
      return res.status(400).json({
        status: false,
        message: "Access denied! Only admin can create Dharmshala profiles on behalf of an Activist.",
      });
    }

    // Extract from body
    const {
      activistId,
      dharmshalaName,
      subCaste,
      city,
      description,
      mobileNo,
    } = req.body;

    // Validate fields
    if (
      !activistId ||
      !dharmshalaName ||
      !subCaste ||
      !city ||
      !mobileNo
    ) {
      return res
        .status(400)
        .json({ status: false, message: "Please enter all required fields!" });
    }

    // Validate activist ID format
    if (!/^[A-Z]{2}[0-9]{4}$/.test(activistId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid activist ID! It should be in the format 'XX0001' to 'ZZ9999'.",
      });
    }

    // Validate images uploaded
    if (!req.files?.images) {
      return res
        .status(400)
        .json({ status: false, message: "At least one image is required!" });
    }

    // 🔹 Upload images to Cloudinary (max 4)
    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];

    if (files.length > 4) {
      return res.status(400).json({
        status: false,
        message: "You can only upload a maximum of 4 images.",
      });
    }

    const imageUrls = [];
    for (let i = 0; i < files.length; i++) {
      const upload = await uploadImageToCloudinary(
        files[i],
        process.env.FOLDER_NAME || "dharmshala",
        1200,
        600
      );

      if (!upload?.secure_url) {
        return res.status(500).json({
          status: false,
          message: "Image upload failed.",
        });
      }

      imageUrls.push(upload.secure_url);
    }

    // Fetch activist profile by activistId
    const activistProfile = await Activist.findOne({ activistId });
    if (!activistProfile) {
      return res.status(400).json({
        status: false,
        message: "Activist not found! Please check the ID.",
      });
    }

    const userId = activistProfile.userId;

    // Create Dharmshala profile
    const newDharmshala = new Dharmshala({
      userId,
      activistId: activistProfile._id,
      dharmshalaName,
      subCaste,
      city,
      description,
      images: imageUrls, // Store Cloudinary URLs array
      mobileNo,
    });

    await newDharmshala.save();

    return res.status(200).json({
      status: true,
      message: "Dharmshala profile created successfully!",
      data: newDharmshala,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};


const getSubscriptions = async (req, res) => {
  try {
    const filter = {};

    // Filter by userId
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    // Filter by subscription status
    if (req.query.status) {
      filter["service.status"] = req.query.status;
    }

    // Filter by service type
    if (req.query.serviceType) {
      filter["service.serviceType"] = req.query.serviceType;
    }

    // Filter by subscription type
    if (req.query.subscriptionType) {
      filter["service.subscriptionType"] = req.query.subscriptionType;
    }

    // Filter by createdAt date range
    if (req.query.fromDate || req.query.toDate) {
      filter.createdAt = {};
      if (req.query.fromDate) {
        filter.createdAt.$gte = new Date(req.query.fromDate);
      }
      if (req.query.toDate) {
        filter.createdAt.$lte = new Date(req.query.toDate);
      }
    }

    // Filter by payment date range
    if (req.query.paymentFrom || req.query.paymentTo) {
      filter.paymentDate = {};
      if (req.query.paymentFrom) {
        filter.paymentDate.$gte = new Date(req.query.paymentFrom);
      }
      if (req.query.paymentTo) {
        filter.paymentDate.$lte = new Date(req.query.paymentTo);
      }
    }

    // Filter by service amount range
    if (req.query.minAmount || req.query.maxAmount) {
      filter["service.amount"] = {};
      if (req.query.minAmount) {
        filter["service.amount"].$gte = Number(req.query.minAmount);
      }
      if (req.query.maxAmount) {
        filter["service.amount"].$lte = Number(req.query.maxAmount);
      }
    }

    // Filter by service startDate range
    if (req.query.serviceStartFrom || req.query.serviceStartTo) {
      filter["service.startDate"] = {};
      if (req.query.serviceStartFrom) {
        filter["service.startDate"].$gte = new Date(req.query.serviceStartFrom);
      }
      if (req.query.serviceStartTo) {
        filter["service.startDate"].$lte = new Date(req.query.serviceStartTo);
      }
    }

    // Filter by service endDate range
    if (req.query.serviceEndFrom || req.query.serviceEndTo) {
      filter["service.endDate"] = {};
      if (req.query.serviceEndFrom) {
        filter["service.endDate"].$gte = new Date(req.query.serviceEndFrom);
      }
      if (req.query.serviceEndTo) {
        filter["service.endDate"].$lte = new Date(req.query.serviceEndTo);
      }
    }

    // Retrieve subscriptions matching the filter criteria
    const subscriptions = await Subscription.find(filter)
      .populate("userId", "username email mobileNo userId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: "Subscriptions retrieved successfully.",
      data: subscriptions,
    });
  } catch (error) {
    console.error("Error retrieving subscriptions:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving subscriptions.",
      errors: [error.message],
    });
  }
};

const updateBiodataByAdmin = async (req, res) => {
  try {
    const { bioDataId } = req.params;

    // Find the biodata by bioDataId
    const biodata = await Biodata.findOne({ bioDataId: bioDataId });

    if (!biodata) {
      return res
        .status(400)
        .json({ status: false, message: "Biodata not found." });
    }

    const updatedFields = req.body;

    // Update the biodata document
    Object.assign(biodata.personalDetails, updatedFields.personalDetails);

    // Save the updated document
    await biodata.save();

    res
      .status(200)
      .json({ status: true, message: "Biodata updated.", data: biodata });
  } catch (error) {
    console.error("Error updating biodata:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

const deleteBiodataByAdmin = async (req, res) => {
  try {
    const { bioDataId } = req.params;

    // Find the biodata by bioDataId (string)
    const biodata = await Biodata.findOne({ bioDataId });
    if (!biodata) {
      return res
        .status(400)
        .json({ status: false, message: "Biodata not found." });
    }
    // Run deletion tasks in parallel using Promise.all
    const deletionPromises = [
      ConnectionRequest.deleteMany({
        $or: [{ toUserId: biodata?.userId }, { fromUserId: biodata?.userId }],
      }),
      SavedProfile.deleteMany({ saveProfile: biodata?._id }),
      Report.deleteMany({
        profileId: biodata?._id,
        profileType: biodata?.profileType,
      }),
      Notification.deleteMany({ "relatedData.BiodataId": biodata?.bioDataId }),
      Biodata.deleteOne({ bioDataId: biodata?.bioDataId }),
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
    await User.updateOne(
      { _id: biodata?.userId },
      { $set: { isMatrimonial: false } }
    );

    return res.status(200).json({
      status: true,
      message: "Biodata Account Deleted Successfully.",
      data: results.map((result) => result.value),
      failedDeletions,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

const getSpecialistByAdmin = async (req, res) => {
  try {
    const { userType, userId } = req.params;
    const Model = models[userType.toLowerCase()];
    if (!Model)
      return res
        .status(400)
        .json({ status: false, message: "Invalid user type." });

    const user = await Model.findOne({ [`${userType}Id`]: userId });
    if (!user)
      return res
        .status(400)
        .json({ status: false, message: "User not found." });

    res.status(200).json({ status: true, data: user });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

const updateSpecialistByAdmin = async (req, res) => {
  try {
    const { userType, userId } = req.params;
    const entry = models[userType.toLowerCase()];
    if (!entry) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user type." });
    }

    const { model: Model, field } = entry;

    // Find the user by the specific field
    const user = await Model.findOne({ [field]: userId });
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "User not found." });
    }

    const updateData = { ...req.body };

    // --- Handle profilePhoto (single image) ---
    if (updateData.profilePhoto) {
      if (
        typeof updateData.profilePhoto === "string" &&
        updateData.profilePhoto.startsWith("data:image/")
      ) {
        // Upload base64 image to Cloudinary
        const base64Data = updateData.profilePhoto.replace(
          /^data:image\/\w+;base64,/,
          ""
        );
        const uploaded = await cloudinary.uploader.upload(
          `data:image/png;base64,${base64Data}`,
          { folder: process.env.FOLDER_NAME || "uploads/profile_photos/" }
        );
        updateData.profilePhoto = uploaded.secure_url;
      }
      // If already a URL, keep as is
    }

    // --- Handle additionalPhotos (array of images) ---
    if (updateData.additionalPhotos) {
      if (
        !Array.isArray(updateData.additionalPhotos) ||
        updateData.additionalPhotos.length > 5
      ) {
        return res.status(400).json({
          status: false,
          message: "You can upload up to 5 additional photos only.",
        });
      }

      const processedPhotos = [];
      for (const photo of updateData.additionalPhotos) {
        if (typeof photo === "string" && photo.startsWith("data:image/")) {
          // Upload base64 image to Cloudinary
          const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
          const uploaded = await cloudinary.uploader.upload(
            `data:image/png;base64,${base64Data}`,
            { folder: process.env.FOLDER_NAME || "uploads/additional_photos/" }
          );
          processedPhotos.push(uploaded.secure_url);
        } else if (typeof photo === "string" && photo.startsWith("http")) {
          processedPhotos.push(photo);
        } else {
          return res.status(400).json({
            status: false,
            message: "Invalid photo format.",
          });
        }
      }
      updateData.additionalPhotos = processedPhotos;
    }

    // Update the user with new data
    Object.assign(user, updateData);
    await user.save();

    res
      .status(200)
      .json({ status: true, message: "User updated.", data: user });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

const deleteSpecialistByAdmin = async (req, res) => {
  try {
    const { userType, userId } = req.params;
    const modelMeta = models[userType.toLowerCase()];
    if (!modelMeta) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user type." });
    }

    const { model, field, entityType } = modelMeta;

    const userFieldMap = {
      pandit: "isPandit",
      kathavachak: "isKathavachak",
      jyotish: "isJyotish",
      activist: "isActivist",
      matrimonial: "isMatrimonial",
    };

    const serviceTypeMap = {
      pandit: "Pandit",
      kathavachak: "Kathavachak",
      jyotish: "Jyotish",
      activist: "Activist",
      matrimonial: "Biodata",
    };

    const specialist = await model.findOne({ [field]: userId });
    if (!specialist) {
      return res
        .status(400)
        .json({ status: false, message: "Specialist profile not found." });
    }

    const user = await User.findOne({ userId: userId });
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "User not found." });
    }

    const userProfileField = userFieldMap[userType.toLowerCase()];
    const userServiceType = serviceTypeMap[userType.toLowerCase()];

    // Prepare deletion promises
    const deletionPromises = [
      Subscription.updateMany(
        { userId: user._id, "service.serviceType": userServiceType },
        { $set: { associatedUser: false } }
      ),
      SavedProfile.deleteMany({ saveProfile: specialist._id }),
      Report.deleteMany({
        profileId: specialist._id,
        profileType: userServiceType,
      }),
      Rating.deleteMany({ entityId: specialist._id, entityType }),
      // Delete related notifications
      Notification.deleteMany({
        userId: user._id,
        notificationType: {
          $in: [
            `${userType.toLowerCase()}Approved`,
            `${userType.toLowerCase()}Rejected`,
            `${userType.toLowerCase()}Request`,
          ],
        },
      }),
      model.deleteOne({ [field]: userId }),
    ];

    const results = await Promise.allSettled(deletionPromises);

    // Collect failed deletions
    const failedDeletions = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (failedDeletions.length > 0) {
      console.error("Some deletions failed:", failedDeletions);
    }

    // Update user profile status
    user[userProfileField] = false;
    await user.save();

    return res.status(200).json({
      status: true,
      message:
        "Specialist profile and all related data deleted/updated successfully.",
      data: results.map((r) => r.value),
      failedDeletions,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

const getDharmshalaById = async (req, res) => {
  try {
    const { id } = req.params;
    const dharmshala = await Dharmshala.findById(id)
      .populate("userId", "name mobileNo")
      .populate("activistId", "name mobileNo");
    if (!dharmshala) {
      return res.status(400).json({
        status: false,
        message: "Dharmshala not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Dharmshala fetched successfully",
      data: dharmshala,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updateDharmshalaById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Validate mobile number format if provided
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (updateData.mobileNo && !mobileRegex.test(updateData.mobileNo)) {
      return res.status(400).json({
        status: false,
        message: "Invalid mobile number. Please enter a valid 10-digit mobile number.",
      });
    }

    // Parse removeImages: expected as JSON string in form-data or array
    let removeImages = updateData.removeImages;
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

    // Fetch existing Dharmshala profile
    const existingDharmshala = await Dharmshala.findById(id);
    if (!existingDharmshala) {
      return res.status(400).json({
        status: false,
        message: "Dharmshala not found",
      });
    }

    // Current images array
    let imagesUrls = existingDharmshala.images || [];

    // Remove images specified in removeImages array
    imagesUrls = imagesUrls.filter((imgUrl) => !removeImages.includes(imgUrl));

    // 🔹 Process newly uploaded images via Cloudinary (max 4 total)
    const newUploadedImages = [];
    if (req.files?.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];

      for (let i = 0; i < files.length; i++) {
        const upload = await uploadImageToCloudinary(
          files[i],
          process.env.FOLDER_NAME || "dharmshala",
          1200,
          600
        );

        if (!upload?.secure_url) {
          return res.status(500).json({
            status: false,
            message: "Image upload failed.",
          });
        }

        newUploadedImages.push(upload.secure_url);
      }
    }

    // Merge new images with old, maintaining limit 4
    imagesUrls = [...imagesUrls, ...newUploadedImages];
    if (imagesUrls.length > 4) {
      imagesUrls = imagesUrls.slice(imagesUrls.length - 4);
    }

    updateData.images = imagesUrls;

    // Remove removeImages field from update data so it doesn't get saved
    delete updateData.removeImages;

    // Update Dharmshala in DB
    const updatedDharmshala = await Dharmshala.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedDharmshala) {
      return res.status(400).json({
        status: false,
        message: "Dharmshala not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Dharmshala updated successfully",
      data: updatedDharmshala,
    });
  } catch (error) {
    console.error("Error updating Dharmshala:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


const deleteDharmshalaById = async (req, res) => {
  try {
    const { id } = req.params;
    const dharmshala = await Dharmshala.findByIdAndDelete(id);
    if (!dharmshala) {
      return res.status(400).json({
        status: false,
        message: "Dharmshala not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Dharmshala deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updateEventPostByAdmin = async (req, res) => {
  try {
    const dataForUpdate = req.body;
    const { postId } = dataForUpdate;

    if (!postId) {
      return res.status(400).json({ status: false, message: "postId is required!" });
    }

    if (!dataForUpdate) {
      return res.status(400).json({
        status: false,
        message: "Data is required for updating EventPost!",
      });
    }

    const existingEventPost = await EventPost.findById(postId);
    if (!existingEventPost) {
      return res.status(404).json({ status: false, message: "EventPost not found!" });
    }

    let imagesUrls = existingEventPost.images || [];

    // Properly parse removeImages
    let removeImages = [];
    if (req.body.removeImages) {
      try {
        removeImages = JSON.parse(req.body.removeImages);
      } catch (error) {
        return res.status(400).json({ status: false, message: "Invalid removeImages format!" });
      }
    }

    if (Array.isArray(removeImages)) {
      imagesUrls = imagesUrls.filter(
        (imgUrl) => !removeImages.includes(imgUrl)
      );
    }

    // 🔹 Handle newly uploaded images via Cloudinary
    if (req.files?.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];

      for (let i = 0; i < files.length; i++) {
        const upload = await uploadImageToCloudinary(
          files[i],
          process.env.FOLDER_NAME || "eventPosts",
          1200,
          600
        );

        if (!upload?.secure_url) {
          return res.status(500).json({
            status: false,
            message: "Image upload failed.",
          });
        }

        imagesUrls.push(upload.secure_url);
      }
    }

    if (imagesUrls.length > 5) {
      imagesUrls = imagesUrls.slice(-5);
    }

    dataForUpdate.images = imagesUrls;

    const updatedEventPost = await EventPost.findByIdAndUpdate(
      postId,
      { $set: dataForUpdate },
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: "EventPost updated successfully.",
      data: updatedEventPost,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

const deleteEventPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    // Find the event post
    const eventPost = await EventPost.findById(postId);

    if (!eventPost) {
      return res
        .status(400)
        .json({ status: false, message: "Event Post not found!" });
    }

    // Delete the event post
    const deletedPost = await EventPost.findByIdAndDelete(postId);

    if (!deletedPost) {
      return res
        .status(400)
        .json({ status: false, message: "Failed to delete the Event Post." });
    }

    // Delete only related notifications
    await Notification.deleteMany({
      "relatedData.postId": postId,
      notificationType: { $in: ["like", "comment", "eventPostCreated"] },
    });

    // Send success response
    return res.status(200).json({
      status: true,
      message: "Event Post deleted successfully.",
      data: deletedPost,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

const getAllNotificationsForAdmin = async (req, res) => {
  try {
    const { _id: userId } = req.admin;
    // Optional: filter by seen status
    const seen = req?.query.seen;
    const condition = { userType: "Admin", userId };
    if (seen === "true" || seen === "false") {
      condition.seen = seen === "true";
    }

    // Admin gets ALL notifications
    const sortCriteria = seen === "true" ? { seenAt: -1 } : { updatedAt: -1 };
    const allNotifications = await Notification.find(condition).sort(
      sortCriteria
    );

    if (!allNotifications.length) {
      return res
        .status(400)
        .json({ status: false, message: "No Notification Found yet." });
    }
    return res.status(200).json({
      status: true,
      message: "All Notifications Data Fetched Successfully.",
      data: allNotifications,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

const getActivistProfileById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the activist profile by _id
    const activist = await Activist.findById(id).lean();

    if (!activist) {
      return res.status(404).json({
        status: false,
        message: "Activist profile not found",
      });
    }

    // Optionally, populate user info if you want
    const user = await User.findById(activist.userId).lean();

    return res.status(200).json({
      status: true,
      message: "Activist profile fetched successfully",
      data: {
        ...activist,
        user,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

//delete Activist Profile
const deleteActivistProfile = async (req, res) => {
  try {
    const { id: userId } = req.params;

    const exitsActivist = await Activist.findOne({ userId });
    if (!exitsActivist) {
      return res.status(400).json({
        status: false,
        message: "Activist Profile Not Found!",
      });
    }

    // Find all dharmshalas and committees created by this user
    const dharmshalas = await Dharmshala.find({ userId });
    const committees = await Committee.find({ userId });

    const dharmshalaIds = dharmshalas.map((d) => d._id);
    const committeeIds = committees.map((c) => c._id);

    // Delete related savedProfiles for dharmshalas and committees
    const deleteSavedProfilesPromise = SavedProfile.deleteMany({
      saveProfile: { $in: [...dharmshalaIds, ...committeeIds] },
    });

    //eventpost 
    const eventPosts = await EventPost.find({ activistId: exitsActivist.activistId });
    const eventPostIds = eventPosts.map((post) => post._id);


    // Run all deletion tasks in parallel
    const deletionPromises = [
      Committee.deleteMany({ userId }),
      Dharmshala.deleteMany({ userId }),
      deleteSavedProfilesPromise,
      EventPost.deleteMany({ activistId: exitsActivist.activistId }),
      // Delete activist-related notifications
      Notification.deleteMany({
        userId,
        notificationType: {
          $in: ["activistRequest", "activistApproved", "activistRejected", ""],
        },
      }),

      // // Delete event post-related notifications
      Notification.deleteMany({
        "relatedData.postId": { $in: eventPostIds },
        notificationType: "eventPostCreated"
      }),
      // Delete event post-related notifications
      Notification.deleteMany({
        userId,
        notificationType: {
          $in: ["like", "comment"],
        },
      }),
      Activist.deleteOne({ userId }),
    ];

    const results = await Promise.allSettled(deletionPromises);

    const failedDeletions = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    // Update the User model to reflect that the user is no longer an activist
    await User.updateOne({ _id: userId }, { $set: { isActivist: false } });

    return res.status(200).json({
      status: true,
      message: "Activist Account Deleted Successfully.",
      data: results.map((result) => result.value || null),
      failedDeletions,
    });
  } catch (err) {
    console.error("Error in deleteActivistProfile:", err);
    res.status(500).json({ status: false, message: err.message });
  }
};

const updateActivistAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { access } = req.body;

    if (!access) {
      return res.status(400).json({
        status: false,
        message: "Missing 'access' field in request body",
      });
    }

    const activist = await Activist.findByIdAndUpdate(
      id,
      { access },
      { new: true }
    );

    if (!activist) {
      return res
        .status(400)
        .json({ status: false, message: "Activist not found" });
    }

    return res.status(200).json({
      status: true,
      message: "Activist access updated successfully",
      activist,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: error.message, error: error });
  }
};

const updateActivistProfileByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const dataForUpdate = { ...req.body };
    const { knownActivistId, dob } = dataForUpdate;

    // Ensure at least some data to update or a file
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
        message: "Invalid mobile number. Please enter a valid 10-digit mobile number.",
      });
    }

    // Validate knownActivistId format
    if (knownActivistId) {
      const regex = /^[A-Z]{2}[0-9]{4}$/;
      if (!regex.test(knownActivistId)) {
        return res.status(400).json({
          status: false,
          message: `Invalid knownActivistId: ${knownActivistId}. It should be in the format 'XX0001'.`,
        });
      }

      const isValidKnownActivist = await Activist.findOne({
        activistId: knownActivistId,
      });
      if (!isValidKnownActivist) {
        return res.status(400).json({
          status: false,
          message: "Invalid KnownActivistId! Activist not found!",
        });
      }
    }

    // Parse DOB if provided
    if (dob) {
      const parsedDob = moment(dob, "DD/MM/YYYY", true);
      if (!parsedDob.isValid()) {
        return res.status(400).json({
          status: false,
          message: "Invalid date format for 'dob'. Expected format is DD/MM/YYYY.",
        });
      }
      dataForUpdate.dob = parsedDob.toDate();
    }

    // Check if the activist profile exists
    const existingActivist = await Activist.findById(id);
    if (!existingActivist) {
      return res.status(404).json({
        status: false,
        message: "Activist profile not found!",
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

    // Perform the update and return updated document
    const updatedActivist = await Activist.findByIdAndUpdate(
      id,
      { $set: dataForUpdate },
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: "Activist profile updated successfully.",
      data: updatedActivist,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};


const feedBackReceivedByAdmin = async (req, res) => {
  try {
    const { id: feedbackId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ status: false, message: "Reply message is required." });
    }

    const feedBack = await Feedback.findById(feedbackId);

    if (!feedBack) {
      return res
        .status(400)
        .json({ status: false, message: "Feedback not found!" });
    }

    if (feedBack?.adminReply?.adminId) {
      return res.status(400).json({
        status: false,
        message: "You have already replied to this feedback.",
      });
    }

    const user = await User.findById(feedBack.userId);
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "User not found!" });
    }

    // Notify the user
    await Notification.create({
      userId: user._id,
      userType: "User",
      notificationType: "respondOnFeedBackByAdmin",
      relatedData: {
        fromUserId: req.admin._id,
        toUserId: user._id,
        username: "Admin",
      },
      message,
    });

    // Real-time notification (if socket exists)
    const socketId = getConnectedUsers().get(user._id.toString());
    if (socketId) {
      getIO().to(socketId).emit("respondOnFeedBackByAdmin", {
        adminId: req.admin._id,
        message,
      });
    }

    // Update feedback with admin reply
    const updatedFeedBack = await Feedback.findByIdAndUpdate(
      feedbackId,
      {
        adminReply: {
          message,
          repliedAt: new Date(),
          adminId: req.admin._id,
        },
        isReplied: true,
      },
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: "Reply sent to the user successfully.",
      updatedFeedBack,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

const editUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = { ...req.body };
    delete updates.userId;
    delete updates._id;
    const user = await User.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    user.password = undefined; // Do not return password

    return res
      .status(200)
      .json({ status: true, message: "User updated", data: user });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

const updateAdvertisementByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ status: false, message: "Advertisement ID is required" });

    const existingAd = await Advertisement.findById(id);
    if (!existingAd)
      return res
        .status(404)
        .json({ status: false, message: "Advertisement not found" });

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
      return res
        .status(400)
        .json({ status: false, message: "Invalid section value" });
    }

    let parsedTargetProfileTypes = targetProfileTypes;
    if (typeof targetProfileTypes === "string") {
      try {
        parsedTargetProfileTypes = JSON.parse(targetProfileTypes);
      } catch {
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
      } catch {
        return res
          .status(400)
          .json({ status: false, message: "Invalid repeatSchedule format" });
      }
    }

    const files = req.files || [];
    let parsedMeta = [];
    try {
      parsedMeta = JSON.parse(mediaMeta || "[]");
    } catch {
      return res
        .status(400)
        .json({ status: false, message: "Invalid mediaMeta format" });
    }

    let updatedMedia = existingAd.media || [];
    const isVideo = (file) =>
      file.mimetype && file.mimetype.startsWith("video");

    if (files.length > 0) {
      // Section/media rules
      if (section === "Bottom") {
        if (files.length > 1 || files.some(isVideo)) {
          return res
            .status(400)
            .json({
              status: false,
              message:
                "Bottom section allows only one image (no video allowed)",
            });
        }
      }
      if (section === "Top" && files.some(isVideo)) {
        if (!parsedTargetProfileTypes.includes("HomePage")) {
          return res
            .status(400)
            .json({
              status: false,
              message: "Only HomePage top section allows video",
            });
        }
        if (
          files.filter(isVideo).length > 1 ||
          updatedMedia.some((m) => m.mediaType === "video")
        ) {
          return res
            .status(400)
            .json({
              status: false,
              message: "Only one video allowed in top section",
            });
        }
      }
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

    // Build update payload
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
    res
      .status(200)
      .json({
        status: true,
        message: "Advertisement updated successfully",
        data: updatedAd,
      });
  } catch (err) {
    res
      .status(500)
      .json({
        status: false,
        message: "Failed to update advertisement",
        error: err.message,
      });
  }
};

const requestAdminOTP = async (req, res) => {
  try {
    const { mobileNo } = req.body;
    if (!mobileNo)
      return res
        .status(400)
        .json({ status: false, message: "Mobile number required" });

    const admin = await Admin.findOne({ mobileNo });
    if (!admin)
      return res
        .status(404)
        .json({ status: false, message: "Admin not found" });

    const otp = generateOTP();

    // Store OTP in DB (with expiry)
    await OTPRequest.findOneAndUpdate(
      { mobileNo },
      {
        mobileNo,
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
        used: false,
      },
      { upsert: true }
    );

    // Send OTP
    const smsResult = await sendOTP(mobileNo, otp);
    if (!smsResult.success)
      return res
        .status(500)
        .json({ status: false, message: smsResult.message });

    return res
      .status(200)
      .json({ status: true, message: "OTP sent successfully" });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

// Verify OTP and Reset Password
const verifyAdminOTPAndResetPassword = async (req, res) => {
  try {
    const { mobileNo, otp, newPassword } = req.body;
    if (!mobileNo || !otp || !newPassword)
      return res
        .status(400)
        .json({ status: false, message: "All fields required" });

    // Find OTP document
    const otpDoc = await OTPRequest.findOne({ mobileNo, otp });
    if (!otpDoc)
      return res.status(400).json({ status: false, message: "Invalid OTP" });

    // Defensive expiry check
    if (
      !otpDoc.otpExpires ||
      new Date(otpDoc.otpExpires).getTime() < Date.now()
    ) {
      // Optionally, delete expired OTPs here
      await OTPRequest.deleteOne({ mobileNo });
      return res.status(400).json({ status: false, message: "OTP expired" });
    }

    // Delete the OTP record after successful verification
    await OTPRequest.deleteOne({ mobileNo });

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update admin password
    const admin = await Admin.findOneAndUpdate(
      { mobileNo },
      { password: hashed }
    );
    if (!admin)
      return res
        .status(404)
        .json({ status: false, message: "Admin not found" });

    return res
      .status(200)
      .json({ status: true, message: "Password reset successful" });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

const changeAdminPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const authAdmin = req.admin;  // Admin info attached by verifyAdminToken middleware
  console.log(authAdmin);
  // Validate required fields
  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      status: false,
      message: "Old password and new password are required!",
    });
  }

  try {
    // Find the admin by their ID
    const admin = await Admin.findById(authAdmin._id).select("password");
    if (!admin) {
      return res.status(400).json({
        status: false,
        message: "Authentication failed. Admin not found.",
      });
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, admin.password);
    if (!isOldPasswordValid) {
      return res.status(400).json({
        status: false,
        message: "Old password is incorrect.",
      });
    }

    // Validate new password (You can add your password strength logic here)
    if (newPassword.length < 5) {
      return res.status(400).json({
        status: false,
        message: "New password should be at least 6 characters long.",
      });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    admin.password = hashedNewPassword;
    await admin.save();

    // Respond with success
    return res.status(200).json({
      status: true,
      message: "Password changed successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//deleteFeedbackById
const deleteFeedbackByAdmin = async (req, res) => {
  try {
    const { feedbackId } = req.params;

    if (!feedbackId) {
      return res
        .status(400)
        .json({ status: false, message: "Feedback ID is required." });
    }

    const feedback = await Feedback.findById(feedbackId);

    if (!feedback) {
      return res
        .status(400)
        .json({ status: false, message: "Feedback not found." });
    }

    await Feedback.findByIdAndDelete(feedbackId);

    return res.status(200).json({
      status: true,
      message: "Feedback deleted successfully by admin.",
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

const deleteAdvertiseRequestByAdmin = async (req, res) => {
  try {
    const { advertiseId } = req.params;

    if (!advertiseId) {
      return res.status(400).json({
        status: false,
        message: "Missing advertise request ID.",
      });
    }

    const deletedAdvertise = await Advertise.findByIdAndDelete(advertiseId);

    if (!deletedAdvertise) {
      return res.status(400).json({
        status: false,
        message: "Advertise request not found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Advertise request deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};


module.exports = {
  createFirstAdmin,
  createAdmin,
  adminLogin,
  adminLogout,
  approveOrRejectMultipleRequests,
  approveOrRejectPanditRequest,
  approveOrRejectJyotishRequest,
  approveOrRejectKathavachakRequest,
  approveOrRejectActivistRequest,
  getAllRequests,
  fetchSpecialist,
  specialistController,
  getAllReports,
  getAllFeedBacks,
  getAllAdvertisementRequest,
  delete_UserById,
  getAllMetrimonial,
  setMetrionial_ActivityStatus,
  getAllUsers,
  updateUserAccess,
  getBiodataById,
  getBiodataByUserAdmin,
  committeeByAdmin,
  updateCommitteeByAdmin,
  deleteCommiteeByAdmin,
  dharmshalaByAdmin,
  getSubscriptions,
  reviewSuccessStoryRequest,
  getAllStoryRequests,
  updateBiodataByAdmin,
  deleteBiodataByAdmin,
  getSpecialistByAdmin,
  updateSpecialistByAdmin,
  deleteSpecialistByAdmin,
  getDharmshalaById,
  updateDharmshalaById,
  deleteDharmshalaById,
  deleteEventPostById,
  deleteActivistProfile,
  getAllNotificationsForAdmin,
  getActivistProfileById,
  updateActivistAccess,
  updateActivistProfileByAdmin,
  updateEventPostByAdmin,
  feedBackReceivedByAdmin,
  editUser,
  updateAdvertisementByAdmin,
  requestAdminOTP,
  verifyAdminOTPAndResetPassword,
  changeAdminPassword,
  deleteFeedbackByAdmin,
  deleteAdvertiseRequestByAdmin
};
