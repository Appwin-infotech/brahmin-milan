const Notification = require("../models/notification");
const admin = require("../config/firebaseAdmin");
const User = require("../models/user");

//Get AllNotification related to LoggedIn User
const getAllNotification = async (req,res) => {
    try{
          const {_id: userId} = req.user || req.admin; // if admin wants getAllNotifications
          //if user alreay viewed notifications
          const seen = req?.query.seen;

          const finalCondition = {userId: userId,seen: seen === "true" ? true : false};
      
         
         // Sort based on 'seenAt' if seen is true, otherwise sort by 'updatedAt'
         const sortCriteria = seen === "true" ? { seenAt: -1 } : {updatedAt: -1 };         

          //all notification Data by userId
          const allNotification = await Notification.find(finalCondition).sort(sortCriteria);

          if(!allNotification.length || !allNotification){
            return res.status(400).json({status:false, message: "No Notification Found yet."});
          };

          //success response 
          return res.status(200).json({
            status: true , message: "All Notifications Data Fetched Successfully.", data:allNotification})
    }catch(err){
       res.status(500).json({status:false, message: err.message})
    }
}

// mark notification as seen and delete after a week
const markNotificationAsSeen = async (req, res) => {
    try {
      const { notificationId } = req.params;
      const { _id: userId } = req.user;
  
      // Find the notification by ID and user ID
      const notification = await Notification.findOne({
        _id: notificationId,
        userId: userId,
      });
  
      if (!notification) {
        return res.status(400).json({ status:false, message: "Notification not found." });
      }

      if(notification.seen === true){
        return res.status(400).json({status:false, message: "Notification Already viewed!"});
      }
  
      // Mark the notification as seen and set the seenAt and expiresAt fields
      notification.seen = true;
      notification.seenAt = new Date();  // Set the current time when marked as seen
      notification.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);  // Set expiration time (7 days from now)
    
      await notification.save();
  
      return res.status(200).json({
        status: true ,
        message: "Notification marked as seen successfully.",
        data: notification,
      });
  
    } catch (err) {
      console.error("Error marking notification as seen: ", err);
      return res.status(500).json({status:false, message: err.message });
    }
  };
  
  //markNotificationByAdmin as seen and delete after a week
const markNotificationAsSeenByAdmin = async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Find the notification by ID and user ID
    const notification = await Notification.findOne({
      _id: notificationId,
    });

    if (!notification) {
      return res.status(400).json({ status:false, message: "Notification not found." });
    }

    if(notification.seen === true){
      return res.status(400).json({status:false, message: "Notification Already viewed!"});
    }

    // Mark the notification as seen and set the seenAt and expiresAt fields
    notification.seen = true;
    notification.seenAt = new Date();  // Set the current time when marked as seen
    notification.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);  // Set expiration time (7 days from now)
  
    await notification.save();

    return res.status(200).json({
      status: true ,
      message: "Notification marked as seen successfully.",
      data: notification,
    });

  } catch (err) {
    console.error("Error marking notification as seen: ", err);
    return res.status(500).json({status:false, message: err.message });
  }
};

//markAllNotificationAsSeenByAdmin
const markAllNotificationsAsSeenByAdmin = async (req, res) => {
  try {
    const { _id:userId } = req.admin;

    const currentDate = new Date();
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Update all unseen notifications for this admin user
    const result = await Notification.updateMany(
      {
        seen: false,
        userType: "Admin",
        userId: userId, // make sure it's the field storing ObjectId or string
      },
      {
        $set: {
          seen: true,
          seenAt: currentDate,
          expiresAt: expiryDate,
        },
      }
    );

    return res.status(200).json({
      status: true,
      message: `${result.modifiedCount} admin notifications marked as seen successfully.`,
    });
  } catch (err) {
    console.error("Error marking admin notifications as seen: ", err);
    return res.status(500).json({ status: false, message: err.message });
  }
};


// Send notification and save to DB
const sendNotificationToAll = async (req, res) => {
  const { title, message, notificationType = "general" } = req.body;

  try {
    // 1️⃣ Fetch all users with FCM tokens
    const users = await User.find({ fcmToken: { $exists: true, $ne: null } });
    const tokens = users.map((user) => user.fcmToken);

    if (tokens.length === 0) {
      return res.status(400).json({ error: "No users with valid tokens found." });
    }

    // 2️⃣ Prepare the FCM payload
    const payload = {
      notification: { title, body: message },
    };

    // 3️⃣ Send notifications via Firebase
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...payload,
    });

    console.log("Notifications sent:", response.successCount);

    // 4️⃣ Save notifications in MongoDB
    const notificationsToSave = users.map((user) => ({
      userId: user._id,
      userType: "User",
      notificationType: notificationType, // should be one of your enum values
      relatedData: {
        sentBy: "Admin",
        broadcast: true,
      },
      message: message,
      seen: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // expire after 7 days
    }));

    await Notification.insertMany(notificationsToSave);

    // 5️⃣ Return success response
    res.status(200).json({
      status: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      message: "Notifications sent and saved successfully!",
    });
  } catch (error) {
    console.error("Failed to send notifications:", error);
    res.status(500).json({ error: "Failed to send notifications" });
  }
};


module.exports = {getAllNotification,markNotificationAsSeen, markNotificationAsSeenByAdmin,markAllNotificationsAsSeenByAdmin,sendNotificationToAll};