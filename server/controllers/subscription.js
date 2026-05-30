const Subscription = require("../models/subscription");
const SubscriptionPlan = require("../models/subscriptionPlan");
const Pandit = require("../models/pandit");
const Jyotish = require("../models/jyotish");
const Biodata = require("../models/biodata");
const Kathavachak = require("../models/kathavachak");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/user");
const { default: mongoose } = require("mongoose");

require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.createSubscriptionPlan = async (req, res) => {
  try {
    const { profileType, trialPeriod, duration, amount, description } = req.body;

    // Validate required fields
    if (!profileType || !trialPeriod || !duration || !amount || !description) {
      return res.status(400).json({ status: false, error: "All fields are required." });
    }

    // Ensure profileType is one of the predefined values
    const allowedProfileTypes = ["Biodata", "Pandit", "Kathavachak", "Jyotish"];
    if (!allowedProfileTypes.includes(profileType)) {
      return res.status(400).json({ status: false, error: "Invalid profile type." });
    }

    // Prepare new plan object
    const newPlanData = { profileType, trialPeriod, duration, amount, description };

    // If a photo was uploaded, add its URL
  if (req.file && req.file.path) {
  newPlanData.photoUrl = req.file.path.replace(/\\/g, "/");
}

    // Create and save plan
    const newPlan = new SubscriptionPlan(newPlanData);
    await newPlan.save();

    return res.status(200).json({
      status: true,
      message: "Subscription plan created successfully",
      plan: newPlan,
    });
  } catch (error) {
    res.status(500).json({ status: false, error: "Server error", details: error.message });
  }
};

exports.updateSubscriptionPlan = async (req, res) => {
  try {
    const { planId, trialPeriod, duration, amount, description } = req.body;

    if (!planId) {
      return res.status(400).json({ status: false, error: "Plan ID is required." });
    }

    const updateObj = { trialPeriod, duration, amount, description };

    if (req.file && req.file.path) {
      updateObj.photoUrl = req.file.path.replace(/\\/g, "/");
    }

    // Find and update by _id
    const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
      planId,
      updateObj,
      { new: true, runValidators: true }
    );

    if (!updatedPlan) {
      return res.status(400).json({ status: false, error: "Subscription plan not found." });
    }

    return res.status(200).json({
      status: true,
      message: "Subscription plan updated successfully",
      plan: updatedPlan
    });
  } catch (error) {
    console.error("Update Subscription Plan Error:", error);
    res.status(500).json({ status: false, error: "Server error", details: error.message });
  }
};

exports.deleteSubscriptionPlan = async (req, res) => {
  try {
    const { planId } = req.params;

    if (!planId) {
      return res.status(400).json({ status: false, error: "Plan ID is required." });
    }

    const deletedPlan = await SubscriptionPlan.findByIdAndDelete(planId);

    if (!deletedPlan) {
      return res.status(404).json({ status: false, error: "Subscription plan not found." });
    }

    return res.status(200).json({
      status: true,
      message: "Subscription plan deleted successfully.",
      plan: deletedPlan
    });
  } catch (error) {
    res.status(500).json({ status: false, error: "Server error", details: error.message });
  }
};

exports.getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();
    return res.status(200).json({
      status: true, plans
    });
  } catch (error) {
    res.status(500).json({ status: false, error: "Server error", details: error.message });
  }
};

exports.plansByServiceType = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const plans = await SubscriptionPlan.find({ profileType: serviceType });
    return res.status(200).json({
      status: true, plans
    });
  } catch (error) {
    res.status(500).json({ status: false, error: "Server error", details: error.message });
  }
};

const getModelByProfileType = (profileType) => {
  switch (profileType) {
    case 'Pandit':
      return Pandit;
    case 'Biodata':
      return Biodata;
    case 'Kathavachak':
      return Kathavachak;
    case 'Jyotish':
      return Jyotish;
    default:
      throw new Error(`Unsupported profileType: ${profileType}`);
  }
};

exports.activateSubscription = async (userId, service, subscriptionId) => {
  try {
    const { serviceType, duration } = service; // duration in months
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + duration);

    // --- Fetch user ---
    const user = await User.findById(userId);
    if (!user) {
      return {
        status: false,
        message: "User not found.",
        errors: ["User not found for subscription activation."]
      };
    }

    // --- Always activate immediately now ---
    const subscriptionUpdateFields = {
      "service.status": "Active",
      "service.duration": duration,
      "service.startDate": now,
      "service.endDate": endDate,
    };

    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { $set: subscriptionUpdateFields },
      { new: true }
    );

    if (!updatedSubscription) {
      return {
        status: false,
        message: "Subscription not found.",
        errors: ["Invalid subscriptionId or subscription no longer exists."]
      };
    }

    // --- Update or Push into User's serviceSubscriptions ---
    const existingService = user.serviceSubscriptions.find(
      (s) => s.serviceType === serviceType
    );

    if (existingService) {
      await User.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            "serviceSubscriptions.$[elem].status": "Active",
            "serviceSubscriptions.$[elem].subscriptionType": "Paid",
            "serviceSubscriptions.$[elem].duration": duration,
            "serviceSubscriptions.$[elem].startDate": now,
            "serviceSubscriptions.$[elem].endDate": endDate,
          },
        },
        {
          arrayFilters: [{ "elem.serviceType": serviceType }],
          new: true,
        }
      );
    } else {
      const newSubscription = {
        serviceType,
        subscriptionType: "Paid",
        status: "Active",
        duration,
        startDate: now,
        endDate: endDate,
      };

      await User.findByIdAndUpdate(
        userId,
        { $push: { serviceSubscriptions: newSubscription } },
        { new: true }
      );
    }

    return {
      status: true,
      message: `${serviceType} subscription activated successfully.`,
    };
  } catch (error) {
    console.error("activateSubscription error:", error);
    return {
      status: false,
      message: "Error during subscription activation.",
      errors: [error.message],
    };
  }
};


exports.buySubscription = async (req, res) => {
  try {
    const { userId, profileType, planId } = req.body;

    if (!userId || !profileType || !planId) {
      return res.status(400).json({ message: "User ID, profileType, and planId are required." });
    }

    // ✅ Delete any stale "Pending" subscription for same profileType
    await Subscription.deleteMany({
      userId,
      "service.serviceType": profileType,
     "service.status": { $in: ["Pending"] }
    });

    // ✅ Check for active subscription
    const now = new Date();
    const existingActive = await Subscription.findOne({
      userId,
      "service.serviceType": profileType,
      "service.status": "Active",
      "service.endDate": { $gt: now }
    });

    if (existingActive) {
      return res.status(400).json({
        message: `You already have an active subscription for ${profileType}.`
      });
    }

    // ✅ Check for waiting approval
    const existingWaiting = await Subscription.findOne({
      userId,
      "service.serviceType": profileType,
      "service.status": "WaitingForApproval"
    });

    if (existingWaiting) {
      return res.status(400).json({
        message: `You already have a subscription pending admin approval for ${profileType}.`
      });
    }

    // ✅ Fetch exact plan using planId and profileType
    const plan = await SubscriptionPlan.findOne({ _id: planId, profileType });

    if (!plan) {
      return res.status(400).json({ message: `Plan not found for ${profileType}.` });
    }

    // ✅ Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: plan.amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId,
        service: profileType,
        planId: plan._id.toString()
      }
    });

    // ✅ Save new subscription
    const newSubscription = new Subscription({
      userId,
      planId: plan._id,
      service: {
        serviceType: profileType,
        amount: plan.amount,
        duration: plan.duration,
        isTrial: false,
        trialPeriod: plan.trialPeriod,
        status: "Pending"
      },
      razorpayOrderId: razorpayOrder.id
    });

    await newSubscription.save();

    return res.status(200).json({
      status: true,
      message: "Subscription created. Please proceed to payment.",
      razorpayOrder,
      subscription: newSubscription
    });

  } catch (error) {
    console.error("Buy subscription error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

exports.cancelPendingSubscription = async (req, res) => {
  try {
    const { userId, profileType } = req.body;

    if (!userId || !profileType) {
      return res.status(400).json({ status: false, message: "userId and profileType are required." });
    }

    const deleted = await Subscription.deleteMany({
      userId,
      "service.serviceType": profileType,
      "service.status": "Pending"
    });

    return res.status(200).json({
      status: true,
      message: "Pending subscription cleared. You can now buy again.",
      deletedCount: deleted.deletedCount
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error", error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing Razorpay payment details." });
    }

    // 🔍 Find subscription using Razorpay order ID
    const subscription = await Subscription.findOne({ razorpayOrderId: razorpay_order_id });
    if (!subscription) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    // ✅ Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature. Payment verification failed."
      });
    }

    // 💾 Save payment details and activate subscription
    subscription.paymentDetails = {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    };
    subscription.paymentDate = new Date();
    subscription.service.status = "Active";

    await subscription.save();

    // 🚀 Update user model with active subscription
    const activationResult = await this.activateSubscription(
      subscription.userId,
      subscription.service,
      subscription._id
    );

    if (activationResult.status) {
      return res.status(200).json({
        status: true,
        message: "Payment verified and " + activationResult.message,
        activatedService: subscription.service,
        errors: activationResult.errors || null
      });
    } else {
      return res.status(400).json({
        status: false,
        message: activationResult.message,
        errors: activationResult.errors
      });
    }
  } catch (error) {
    console.error("verifyPayment error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getSubscriptionHistory = async (req, res) => {
  try {
    const { _id: userId } = req.user;

    // Validate the userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ status: false, message: "Invalid userId." });
    }

    // Build the filter object using userId
    const filter = { userId };

    // Filter by subscription status (Active, Expired, Pending, WaitingForApproval)
    if (req.query.status) {
      filter["service.status"] = req.query.status;
    }

    // Filter by service type (Pandit, Kathavachak, Jyotish, Biodata)
    if (req.query.serviceType) {
      filter["service.serviceType"] = req.query.serviceType;
    }

    // Filter by subscription type (Trial or Paid) if provided
    if (req.query.subscriptionType) {
      filter["service.subscriptionType"] = req.query.subscriptionType;
    }

    // Filter by createdAt date range if provided
    if (req.query.fromDate && req.query.toDate) {
      filter.createdAt = {
        $gte: new Date(req.query.fromDate),
        $lte: new Date(req.query.toDate)
      };
    }

    // Filter by payment date range if provided
    if (req.query.paymentFrom && req.query.paymentTo) {
      filter.paymentDate = {
        $gte: new Date(req.query.paymentFrom),
        $lte: new Date(req.query.paymentTo)
      };
    }

    // Filter by service amount range if provided
    if (req.query.minAmount || req.query.maxAmount) {
      filter["service.amount"] = {};
      if (req.query.minAmount) {
        filter["service.amount"].$gte = Number(req.query.minAmount);
      }
      if (req.query.maxAmount) {
        filter["service.amount"].$lte = Number(req.query.maxAmount);
      }
    }

    // --- New Filters for service.startDate ---
    if (req.query.serviceStartFrom || req.query.serviceStartTo) {
      filter["service.startDate"] = {};
      if (req.query.serviceStartFrom) {
        filter["service.startDate"].$gte = new Date(req.query.serviceStartFrom);
      }
      if (req.query.serviceStartTo) {
        filter["service.startDate"].$lte = new Date(req.query.serviceStartTo);
      }
    }

    // --- New Filters for service.endDate ---
    if (req.query.serviceEndFrom || req.query.serviceEndTo) {
      filter["service.endDate"] = {};
      if (req.query.serviceEndFrom) {
        filter["service.endDate"].$gte = new Date(req.query.serviceEndFrom);
      }
      if (req.query.serviceEndTo) {
        filter["service.endDate"].$lte = new Date(req.query.serviceEndTo);
      }
    }

    // Retrieve subscriptions for the user matching the filter criteria,
    // sorted by createdAt descending and populate the userId field
    const subscriptions = await Subscription.find(filter)
      .populate("userId")
      .populate("planId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: "Subscription history retrieved successfully.",
      data: subscriptions,
    });
  } catch (error) {
    console.error("Error retrieving subscription history:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving subscription history.",
      errors: [error.message],
    });
  }
};

exports.setTrialSubscription = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const { serviceType, trialPeriod } = req.body;

    if (!["Biodata", "Pandit", "Kathavachak", "Jyotish"].includes(serviceType)) {
      return res.status(400).json({ status: false, message: "Invalid serviceType" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ status: false, message: "User not found" });

    // ❌ Block if Paid subscription already exists for this service
    const existingPaid = user.serviceSubscriptions.find(
      sub => sub.serviceType === serviceType && sub.subscriptionType === "Paid"
    );
    if (existingPaid) {
      return res.status(400).json({
        status: false,
        message: `Paid Subscription already requested or activated for ${serviceType}`,
      });
    }

    // ❌ Block if Trial already exists for this service
    const existingTrial = user.serviceSubscriptions.find(
      sub => sub.serviceType === serviceType && sub.subscriptionType === "Trial"
    );
    if (existingTrial) {
      return res.status(400).json({
        status: false,
        message: `Trial Plan already requested or used for ${serviceType}`,
      });
    }

    // ✅ Directly activate trial for all services now
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + parseInt(trialPeriod)); // trialPeriod in days

    let trialSubscription = {
      serviceType,
      subscriptionType: "Trial",
      trialPeriod: parseInt(trialPeriod),
      status: "Active",       // 🔑 always active now
      startDate: today,
      endDate: endDate,
    };

    user.serviceSubscriptions.push(trialSubscription);
    await user.save();

    return res.status(200).json({
      status: true,
      message: `Trial activated for ${serviceType}`,
      subscription: trialSubscription
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      message: "Error setting trial subscription",
      error: err.message
    });
  }
};


exports.getTrialHistory = async (req, res) => {
  try {
    const userId = req?.user?._id;

    if (!userId) {
      return res.status(401).json({ status: false, message: "Unauthorized access" });
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const trialSubscriptions = (user.serviceSubscriptions || []).filter(
      sub => sub.subscriptionType === "Trial"
    );

    return res.status(200).json({
      status: true,
      message: "Trial subscription history fetched successfully",
      trials: trialSubscriptions
    });

  } catch (err) {
    console.error("Error in getTrialHistory:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch trial history",
      error: err.message
    });
  }
};


exports.getRazorPayKey = async (req, res) => {
  try {
    res.status(200).json({ status: true, message: "Razor Pay Api Key fetched successfully. ", key: process.env.RAZORPAY_KEY_ID })
  } catch (err) {
    res.status(500).json({ status: false, message: err.message })
  }
}

exports.deleteSubscriptionRecord = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await Subscription.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Subscription record not found." });
    }
    res.json({ message: "Subscription record deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error });
  }
};

// Helper function to get service name based on profileType
function getServiceName(profileType) {
  const serviceNames = {
    Pandit: "Pandit Service",
    Jyotish: "Jyotish Service",
    Biodata: "Biodata Service"
  };
  return serviceNames[profileType] || "Unknown Service";
}



//setTrial depend on serviceType
// exports.setTrialSubscription = async (req, res) => {
//   try {
//     const userId = req?.user?._id;
//     const { serviceType, trialPeriod } = req.body;

//     if (!["Biodata", "Pandit", "Kathavachak", "Jyotish"].includes(serviceType)) {
//       return res.status(400).json({ status: false, message: "Invalid serviceType" });
//     }

//     const user = await User.findById(userId);
//     if (!user) return res.status(400).json({ status: false, message: "User not found" });

//     const existingPaid = user.serviceSubscriptions.find(
//       sub => sub.serviceType === serviceType && sub.subscriptionType === "Paid"
//     )

//     if (existingPaid) {
//       return res.status(400).json({
//         status: false,
//         message: `Paid Subcription already requested or activated for ${serviceType}`,
//       });
//     }

//     const existingTrial = user.serviceSubscriptions.find(
//       sub => sub.serviceType === serviceType && sub.subscriptionType === "Trial"
//     );

//     if (existingTrial) {
//       return res.status(400).json({
//         status: false,
//         message: `Trial Plan already requested or used for ${serviceType}`,
//       });
//     }

//     const today = new Date();
//     const endDate = new Date(today);
//     endDate.setDate(today.getDate() + parseInt(trialPeriod)); // trialPeriod in days
//     let trialSubscription = {
//       serviceType,
//       subscriptionType: "Trial",
//       trialPeriod: parseInt(trialPeriod) // ✅ store trialPeriod for later admin use
//     };

//     if (serviceType === "Biodata") {
//       trialSubscription.startDate = today;
//       trialSubscription.endDate = endDate;
//       trialSubscription.status = "Active";
//     } else {
//       trialSubscription.status = "Pending"; // start/end date will be set by admin later
//     }

//     user.serviceSubscriptions.push(trialSubscription);
//     await user.save();

//     return res.status(200).json({
//       status: true,
//       message: `Trial ${serviceType === "Biodata" ? "activated" : "requested"} for ${serviceType}`,
//       subscription: trialSubscription
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       status: false,
//       message: "Error setting trial subscription",
//       error: err.message
//     });
//   }
// };
