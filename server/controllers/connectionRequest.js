const Biodata = require("../models/biodata");
const ConnectionRequest = require("../models/connectionRequest");
const Notification = require("../models/notification");
const SavedProfile = require("../models/savedProfiles");
const User = require("../models/user");
const { getConnectedUsers, getIO } = require("../socket/socket.server");

//send connection request to user ["ignore","interested"]
const sendRequest = async (req, res) => {
  try {
    const {_id:fromUserId} = req?.user;
    const status = req?.params?.status;
    const toUserId = req?.params?.userId;
    let socketIssue = ""; 
    
    // Allowed status types for the connection request
    const allowedStatus = ["ignore", "interested"];

    // Validate status parameter
    if (!status || !allowedStatus.includes(status)) {
      return res.status(400).json({status: false, message: `Invalid Status type: ${status}. Allowed values are ${allowedStatus.join(', ')}` });
    }

    // Check if a connection request already exists between the two users
    const existingConnectionRequest = await ConnectionRequest.findOne({
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId }
      ]
    });

    // Check if the logged-in user has a biodata
    const loggedInUser = await Biodata.findOne({ userId: fromUserId });
    if (!loggedInUser) {
      return res.status(400).json({status: false, message: "You need to create your biodata first before sending a connection request." });
    }

        // Check if logged-in user's biodata is deactivated by admin
    if (loggedInUser.activityStatus === "Inactive") {
      return res.status(400).json({
        status: false,
        message:
          "Your biodata has been deactivated by the Brahmin Milan Team. You cannot send connection requests. Please contact support.",
      });
    }


    // Check if the target user has a biodata
    const toUser = await Biodata.findOne({ userId: toUserId });
    if (!toUser) {
      return res.status(400).json({status: false, message: "The user you are trying to connect with does not have biodata yet." });
    }

    // If a connection request already exists, return an error
    if (existingConnectionRequest) {
      return res.status(400).json({status: false, message: "A connection request already exists between these users." });
    }

    // Create a new connection request
    const connectionRequest = new ConnectionRequest({
      fromUserId,
      toUserId,
      status,
    });

    const data = await connectionRequest.save();

    // Send notification to the user who is receiving the connection request (toUserId)
    const fromUser = await Biodata.findOne({ userId: fromUserId }); // Get details of the user who is sending the request
  
    const notificationMessage = `${fromUser?.personalDetails?.fullname} sent you a connection request!`;

    // Create the notification for the receiving user (toUserId)
    await Notification.create({
      userId: toUserId, // Send notification to the user who is receiving the request
      userType: 'User',
      notificationType: 'connectionRequest',
      relatedData: {
        fromUserId: fromUserId,
        username: fromUser?.personalDetails?.fullname,
        photoUrl: fromUser?.personalDetails?.closeUpPhoto,
        status: status,
      },
      message: notificationMessage,
    });

           // Optionally, send a real-time notification to the user who sent the request (via socket.io)
           // Start ---->
           const connectedUsers = getConnectedUsers();
           const io = getIO();
           const toUserSocketId = await connectedUsers.get(toUserId.toString());
           if(!toUserSocketId){
              socketIssue = `User not Active yet ! toUserSocketId not found.`;
           }
       
           if (toUserSocketId) {
             io.to(toUserSocketId).emit("connectionRequest", {
               username: fromUser?.personalDetails?.fullname,
               photoUrl: fromUser?.personalDetails?.closeUpPhoto,
               userId: fromUser.userId,
               message: notificationMessage,
               status: status,
             });
           }
       
           // End ---->

    // Return success message with the created connection request data
    return res.status(200).json({
      status: true ,
      message: `${req?.user?.username} is ${status} in ${toUser?.personalDetails?.fullname}`,
      data: data,
      socketIssue
    });
  } catch (err) {
    res.status(500).json({status: false, message: "Error while sending connection request", error: err.message });
  }
}

//get all connection requests recieved
const recievedConnectionRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    // ✅ Step 0: Check logged-in user's biodata status (non-breaking)
const loggedInUserBiodata = await Biodata.findOne({ userId });

if (!loggedInUserBiodata) {
  return res.status(400).json({
    status: false,
    message: "You need to create your biodata first to view connection requests.",
  });
}

if (loggedInUserBiodata.activityStatus === "Inactive") {
  return res.status(400).json({
    status: false,
    message:
      "Your biodata has been deactivated by the Brahmin Milan Team. Please contact support for reactivation.",
  });
}

    const connectionRequests = await ConnectionRequest.find({
      toUserId: userId,
      status: { $in: ["interested", "ignore", "accepted", "rejected"] },
    });

    if (!connectionRequests || connectionRequests.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No Request found",
      });
    }

    // ✅ Step 1: Fetch all userIds from "fromUserId"
    const fromUserIds = connectionRequests.map((r) => r.fromUserId.toString());

    // ✅ Step 2: Get all Biodata profiles for these userIds
    const biodatas = await Biodata.find({ userId: { $in: fromUserIds } });

    // ✅ Step 3: Create map of BioData by userId
    const biodataMap = {};
    biodatas.forEach((b) => {
      if (b.activityStatus !== "Inactive") {
        biodataMap[b.userId.toString()] = b;
      }
    });

    // ✅ Step 4: Get users with active Biodata subscriptions
    const subscribedUsers = await User.find({
      _id: { $in: Object.keys(biodataMap) },
      "serviceSubscriptions.serviceType": "Biodata",
      "serviceSubscriptions.status": "Active",
      "serviceSubscriptions.endDate": { $gte: new Date() },
    }).select("_id");

    const activeSubscribedUserIds = new Set(
      subscribedUsers.map((u) => u._id.toString())
    );

    const FromUserDetails = [];

    for (const req of connectionRequests) {
      const fromUserId = req.fromUserId.toString();
      const requestId = req._id;

      const bioData = biodataMap[fromUserId];
      if (!bioData || !activeSubscribedUserIds.has(fromUserId)) {
        continue; // Skip if inactive or unsubscribed
      }

      // ✅ Check if saved
      const saved = await SavedProfile.findOne({
        userId: userId,
        saveProfile: bioData._id,
        profileType: "Biodata",
      });

      const isSaved = saved ? true : false;

      FromUserDetails.push({
        FromUserBioData: bioData,
        requestId,
        status: req.status,
        isVisible: req.status === "accepted",
        isSaved,
      });
    }

    if (FromUserDetails.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No active or subscribed received requests found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Received Request Data fetched Successfully",
      data: FromUserDetails,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Error while getting received connection request: " + err.message,
    });
  }
};


//get all connection request sent by loggedInUser
const sentConnectionRequests = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

     //  Step 0: Check logged-in user's biodata status
    const loggedInUserBiodata = await Biodata.findOne({ userId: loggedInUserId });

    if (!loggedInUserBiodata) {
      return res.status(400).json({
        status: false,
        message: "You need to create your biodata first to view sent connection requests.",
      });
    }

    if (loggedInUserBiodata.activityStatus === "Inactive") {
      return res.status(400).json({
        status: false,
        message:
          "Your biodata has been deactivated by the Brahmin Milan Team. Please contact support for reactivation.",
      });
    }

    // Step 1: Find all sent connection requests
    const connectionRequests = await ConnectionRequest.find({
      fromUserId: loggedInUserId,
      status: { $in: ["interested", "ignore", "accepted", "rejected"] },
    });

    if (!connectionRequests || connectionRequests.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No Request found",
      });
    }

    // Step 2: Extract all toUserIds
    const toUserIds = connectionRequests.map((r) => r.toUserId.toString());

    // Step 3: Fetch all Biodata for these users and filter out inactive ones
    const biodatas = await Biodata.find({ userId: { $in: toUserIds } });
    const biodataMap = {};
    biodatas.forEach((b) => {
      if (b.activityStatus !== "Inactive") {
        biodataMap[b.userId.toString()] = b;
      }
    });

    // Step 4: Find users with active Biodata subscriptions
    const subscribedUsers = await User.find({
      _id: { $in: Object.keys(biodataMap) },
      "serviceSubscriptions.serviceType": "Biodata",
      "serviceSubscriptions.status": "Active",
      "serviceSubscriptions.endDate": { $gte: new Date() },
    }).select("_id");

    const activeSubscribedUserIds = new Set(
      subscribedUsers.map((u) => u._id.toString())
    );

    const toUserDetails = [];

    // Step 5: Prepare response data
    for (const reqItem of connectionRequests) {
      const toUserId = reqItem.toUserId.toString();
      const requestId = reqItem._id;

      const bioData = biodataMap[toUserId];
      if (!bioData || !activeSubscribedUserIds.has(toUserId)) {
        continue; // Skip if inactive or unsubscribed
      }

      // Step 6: Check if current user has saved this profile
      const saved = await SavedProfile.findOne({
        userId: loggedInUserId,
        saveProfile: bioData._id,
        profileType: "Biodata",
      });

      const isSaved = !!saved;

      toUserDetails.push({
        toUserBioData: bioData,
        requestId,
        status: reqItem.status,
        isVisible: reqItem.status === "accepted",
        isSaved,
      });
    }

    if (toUserDetails.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No active or subscribed sent requests found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Sent Requests Data fetched Successfully",
      data: toUserDetails,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Error while getting sent connection request: " + err.message,
    });
  }
};


//accpet or reject connection request
const responseToRequest = async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { status, requestId } = req.params;
    const allowedStatus = ["accepted", "rejected"];
    let socketIssue = ""; 

    //logggedInUserBioData
    const loggedInUserBiodata = await Biodata.findOne({userId: loggedInUser._id});

        if (!loggedInUserBiodata || loggedInUserBiodata.activityStatus === "Inactive") {
      return res.status(400).json({
        status: false,
        message: "Your biodata has been deactivated by the Brahmin Milan Team. Please contact support for reactivation.",
      });
    }


    // Validate the status type
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ status: false,message: "Invalid Status Type: " + status });
    }

    // Find the connection request that is currently in the "interested" status
    const connectionRequest = await ConnectionRequest.findOne({
      _id: requestId,
      toUserId: loggedInUser?._id, // Ensure this request is for the logged-in user
      status: "interested", // Only consider requests that are still in the "interested" status
    });

    if (!connectionRequest) {
      return res.status(400).json({status: false, message: "Connection Request Not Found" });
    }

    // Update the status of the connection request
    connectionRequest.status = status;
    const data = await connectionRequest.save();

    // Prepare the notification message
    const fromUser = await User.findById(connectionRequest.fromUserId); // Get the user who sent the request
    const message = status === "accepted"
      ? `${loggedInUserBiodata?.personalDetails?.fullname} accepted your connection request!`
      : `${loggedInUserBiodata?.personalDetails?.fullname} rejected your connection request.`;

    // Create a notification for the user who sent the request (fromUserId)
    await Notification.create({
      userId: fromUser?._id, // Send the notification to the sender
      userType: 'User',
      notificationType: 'connectionRequestResponse', // You can define a new type if needed
      relatedData: {
        fromUserId: loggedInUser?._id,
        toUserId: fromUser?._id,
        username: loggedInUserBiodata?.personalDetails?.fullname,
        photoUrl: loggedInUserBiodata?.personalDetails?.closeUpPhoto,
        status: status,
      },
      message: message,
    });

          // Optionally, send a real-time notification to the user who sent the request (via socket.io)
          // Start ---->
          const connectedUsers = getConnectedUsers();
          const io = getIO();
          const fromUserSocketId = await connectedUsers.get(fromUser._id.toString());
      
          if(!fromUserSocketId){
             socketIssue = `User not Active yet ! fromUserSocketId not found.`;
          }
      
          if (fromUserSocketId) {
            io.to(fromUserSocketId).emit("connectionRequestResponse", {
              username: loggedInUser?.username,
              userId: loggedInUser?._id,
             photoUrl: Array.isArray(loggedInUser?.photoUrl) ? loggedInUser.photoUrl[0] : loggedInUserBiodata?.personalDetails?.closeUpPhoto || null,
              message: message,
              status: status,
            });
          }
          // End ---->
     
    // Respond with the updated status
    return res.status(200).json({
      status: true ,
      message: `Connection Request: ${status}`,
      data: data,
      socketIssue
    });

  } catch (err) {
    res.status(500).json({status: false, message: "Error While Reviewing Request: " + err.message });
  }
};


const deleteConnectionRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;
    if (!requestId) return res.status(400).json({ status: false, message: "Request ID is required" });

    // Find the connection first to get user details for deleting notification
    const connectionRequest = await ConnectionRequest.findById(requestId);

    if (!connectionRequest) {
      return res.status(400).json({ status: false, message: "No Connection Found" });
    }

    const { fromUserId, toUserId } = connectionRequest;

    // Delete the connection request
    const deletedRequest = await ConnectionRequest.findByIdAndDelete(requestId);

    // Delete related connectionRequest notifications
    await Notification.deleteMany({
      notificationType: 'connectionRequest',
      userId: toUserId, // Notification was sent to this user
      "relatedData.fromUserId": fromUserId
    });

    return res.status(200).json({
      status: true,
      message: "Connection Removed Successfully",
      connectedUser: deletedRequest,
    });

  } catch (err) {
    res.status(500).json({ status: false, message: "Error While Deleting Connection: " + err });
  }
};


module.exports = { sendRequest,responseToRequest,recievedConnectionRequests,sentConnectionRequests,deleteConnectionRequest}