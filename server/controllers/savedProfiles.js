const Biodata = require("../models/biodata");
const Committee = require("../models/committee");
const ConnectionRequest = require("../models/connectionRequest");
const Dharmshala = require("../models/dharmshala");
const Jyotish = require("../models/jyotish");
const Kathavachak = require("../models/kathavachak");
const Pandit = require("../models/pandit");
const SavedProfile = require("../models/savedProfiles");
const User = require("../models/user");


// Route to save a profile for the user
const saveProfiles = async (req, res) => {
  const userId = req?.user?._id;  // Assuming user is authenticated and their ID is in req.user
  const profileId = req?.params?.id;  // The profile ID from the request

  try {  

      
// Helper function to check which model the profile ID belongs to
   const checkProfileById = async (profileId) => {
     let profile = null;
     let profileType = null;

     // Check PanditProfile first
     profile = await Pandit.findById(profileId);
      if(profile) {
        profileType = profile.profileType;
        return { profile, profileType };
     }
     // Check Biodata
     profile = await Biodata.findById(profileId);
       if (profile) {
       profileType = profile.profileType;
       return { profile, profileType };
      }

     // check JyotishProfile
     if (!profile) {
       profile = await Jyotish.findById(profileId);
        if (profile) {
        profileType = profile.profileType;
        return { profile, profileType };
       }
      }

     //  check KathvachakProfile
     if (!profile) {
        profile = await Kathavachak.findById(profileId);
        if (profile) {
          profileType = profile.profileType;
          return { profile, profileType };
        }
       }

      // check Committee
      if (!profile) {
        profile = await Committee.findById(profileId);
        if (profile) {
          profileType = profile.profileType;
          return { profile, profileType };
        }
       }    
     //check Dharshala
     if (!profile) {
      profile = await Dharmshala.findById(profileId);
      if (profile) {
        profileType = profile.profileType;
        return { profile, profileType };
      }
     }     

  };


    // Check which model the profile belongs to by the profileId
    const { profile, profileType } = await checkProfileById(profileId);


    // If no profile was found, return an error
    if (!profile) {
      return res.status(400).json({status:false, message: "Profile not found." });
    }

    // Check if the profile is already saved by this user
    const existingSavedProfile = await SavedProfile.findOne({ userId, saveProfile: profileId, profileType });
    if (existingSavedProfile) {
      // return res.status(400).json({ message: "Profile already saved." });
      const deletedSavedProfile = await SavedProfile.findOneAndDelete({saveProfile: profileId});
      return res.status(200).json({status:true ,message: `${profileType} Profile Successfully Removed from savedProfiles.`,data:deletedSavedProfile});
    }

    // Create a new SavedProfile entry for the user and profile
    const newSavedProfile = new SavedProfile({
      userId,
      saveProfile: profileId,
      profileType,  // "pandit", "jyotish", "kathvachak", etc.
    });

    await newSavedProfile.save();

    return res.status(200).json({
      status: true ,message: "Profile saved successfully." });
  } catch (error) {
    res.status(500).json({status:false, message: "Error saving profile", error: error.message });
  }
};

// Route to get saved profiles for the user
//Working code
// const getSavedProfiles = async (req, res) => {
//   const userId = req?.user?._id;

//   try {
//     // Get all saved profiles
//     const savedProfiles = await SavedProfile.find({ userId })
//       .populate("saveProfile")
//       .sort({ createdAt: -1 });

//     if (!savedProfiles || savedProfiles.length === 0) {
//       return res.status(400).json({
//         status: false,
//         message: "No saved profiles found.",
//       });
//     }

//     // Filter out inactive profiles
//     const activeSavedProfiles = savedProfiles.filter(
//       (saved) => saved?.saveProfile?.activityStatus !== "Inactive"
//     );

//     if (activeSavedProfiles.length === 0) {
//       return res.status(400).json({
//         status: false,
//         message: "No active saved profiles found.",
//       });
//     }

//     // Load only if any biodata profile is present
//     const hasBiodata = activeSavedProfiles.some(
//       (s) => s?.saveProfile?.profileType === "Biodata"
//     );

//     // Prepare these only if biodata exists
//     let activeSubscribedUserIds = new Set();
//     let connectionMap = {};

//     if (hasBiodata) {
//       const activeSubscribedUsers = await User.find({
//         "serviceSubscriptions.serviceType": "Biodata",
//         "serviceSubscriptions.status": "Active",
//         "serviceSubscriptions.endDate": { $gte: new Date() },
//       }).select("_id");

//       activeSubscribedUserIds = new Set(
//         activeSubscribedUsers.map((u) => u._id.toString())
//       );

//       const connectionRequests = await ConnectionRequest.find({
//         $or: [{ toUserId: userId }, { fromUserId: userId }],
//       });

//       connectionRequests.forEach((req) => {
//         const otherUserId =
//           req.fromUserId.toString() === userId.toString()
//             ? req.toUserId.toString()
//             : req.fromUserId.toString();
//         connectionMap[otherUserId] = req;
//       });
//     }

//     // Final transformed response
//     const result = activeSavedProfiles.map((saved) => {
//       const profile = saved.saveProfile?.toObject();
//       const profileUserId = profile?.userId?.toString();

//       // Add extra fields only for Biodata profileType
//       if (profile.profileType === "Biodata") {
//         const isSubscribed = activeSubscribedUserIds.has(profileUserId);
//         if (!isSubscribed) return null;

//         const existingConnection = connectionMap[profileUserId];

//         return {
//           ...profile,
//           isSaved: true,
//           requestId: existingConnection?._id || null,
//           requestStatus: existingConnection?.status || null,
//           connectionStatus: existingConnection
//             ? existingConnection.fromUserId.toString() === userId.toString()
//               ? "sent"
//               : "received"
//             : "none",
//         };
//       }

//       // Return other profiles as-is
//       return profile;
//     }).filter(Boolean); // Remove nulls (unsubscribed biodata)

//     if (result.length === 0) {
//       return res.status(400).json({
//         status: false,
//         message: "No active saved profiles found.",
//       });
//     }

//     return res.status(200).json({
//       status: true,
//       savedProfiles: result,
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: false,
//       message: "Error fetching saved profiles",
//       error: error.message,
//     });
//   }
// };

// const getSavedProfiles = async (req, res) => {
//   const userId = req?.user?._id;

//   try {
//     // 1️⃣ Fetch all saved profiles
//     const savedProfiles = await SavedProfile.find({ userId })
//       .populate("saveProfile")
//       .sort({ createdAt: -1 });

//     if (!savedProfiles?.length) {
//       return res.status(400).json({
//         status: false,
//         message: "No saved profiles found.",
//       });
//     }

//     // 2️⃣ Separate Biodata from other types
//     const biodataProfiles = savedProfiles.filter(
//       (s) => s?.saveProfile?.profileType === "Biodata"
//     );
//     const otherProfiles = savedProfiles.filter(
//       (s) => s?.saveProfile?.profileType !== "Biodata"
//     );

//     // 3️⃣ Get active subscribed Biodata userIds
//     let activeSubscribedUserIds = new Set();
//     if (biodataProfiles.length > 0) {
//       const activeSubscribedUsers = await User.find({
//         _id: {
//           $in: biodataProfiles.map((s) => s?.saveProfile?.userId),
//         },
//         "serviceSubscriptions.serviceType": "Biodata",
//         "serviceSubscriptions.status": "Active",
//         "serviceSubscriptions.endDate": { $gte: new Date() },
//       }).select("_id");

//       activeSubscribedUserIds = new Set(
//         activeSubscribedUsers.map((u) => u._id.toString())
//       );
//     }

//     // 4️⃣ Get connection map for biodata
//     let connectionMap = {};
//     if (biodataProfiles.length > 0) {
//       const connectionRequests = await ConnectionRequest.find({
//         $or: [{ toUserId: userId }, { fromUserId: userId }],
//       });

//       connectionRequests.forEach((req) => {
//         const otherUserId =
//           req.fromUserId.toString() === userId.toString()
//             ? req.toUserId.toString()
//             : req.fromUserId.toString();
//         connectionMap[otherUserId] = req;
//       });
//     }

//     // 5️⃣ Filter and transform results
//     const result = savedProfiles
//       .map((saved) => {
//         const profile = saved.saveProfile?.toObject();
//         if (!profile) return null;

//         // ✅ Biodata: must be active + subscribed
//         if (profile.profileType === "Biodata") {
//           if (
//             profile.activityStatus === "Inactive" ||
//             !activeSubscribedUserIds.has(profile.userId.toString())
//           ) {
//             return null; // skip expired or inactive
//           }

//           const existingConnection = connectionMap[profile.userId.toString()];
//           return {
//             ...profile,
//             isSaved: true,
//             requestId: existingConnection?._id || null,
//             requestStatus: existingConnection?.status || null,
//             connectionStatus: existingConnection
//               ? existingConnection.fromUserId.toString() === userId.toString()
//                 ? "sent"
//                 : "received"
//               : "none",
//           };
//         }

//         // ✅ Other profiles: just return if active
//         return {
//           ...profile,
//           isSaved: true,
//         };
//       })
//       .filter(Boolean);

//     if (!result.length) {
//       return res.status(400).json({
//         status: false,
//         message: "No active saved profiles found.",
//       });
//     }

//     return res.status(200).json({
//       status: true,
//       savedProfiles: result,
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: false,
//       message: "Error fetching saved profiles",
//       error: error.message,
//     });
//   }
// };


const getSavedProfiles = async (req, res) => {
  const userId = req?.user?._id;

  try {
    // 1️⃣ Get all saved profiles
    const savedProfiles = await SavedProfile.find({ userId })
      .populate("saveProfile")
      .sort({ createdAt: -1 });

    if (!savedProfiles || savedProfiles.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No saved profiles found.",
      });
    }

// 2️⃣ Filter out inactive profiles
const activeSavedProfiles = savedProfiles.filter((saved) => {
  const profile = saved?.saveProfile;
  if (!profile) return false;

  switch (profile.profileType) {
    case "Biodata":
      return profile.activityStatus !== "Inactive";
    case "Pandit":
    case "Jyotish":
    case "Kathavachak":
      return profile.isEnabled === true;
    case "Dharmshala":
    case "Committee":
      return true; // ✅ Always allow, no activity/isEnabled field
    default:
      return false;
  }
});


    if (activeSavedProfiles.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No active saved profiles found.",
      });
    }

    // 3️⃣ Collect which profile types we need subscriptions for
    const profileTypeToUserIds = {
      Biodata: new Set(),
      Pandit: new Set(),
      Jyotish: new Set(),
      Kathavachak: new Set(),
    };

    activeSavedProfiles.forEach((saved) => {
      const profile = saved.saveProfile;
      if (profile?.userId && profileTypeToUserIds[profile.profileType]) {
        profileTypeToUserIds[profile.profileType].add(profile.userId.toString());
      }
    });

    // 4️⃣ Check active subscriptions for each profile type
    const activeSubscribedUserIds = {
      Biodata: new Set(),
      Pandit: new Set(),
      Jyotish: new Set(),
      Kathavachak: new Set(),
    };

    for (const type of Object.keys(profileTypeToUserIds)) {
      if (profileTypeToUserIds[type].size > 0) {
const subscribedUsers = await User.find({
  _id: { $in: Array.from(profileTypeToUserIds[type]) },
  serviceSubscriptions: {
    $elemMatch: {
      serviceType: type,
      status: "Active",
      endDate: { $gte: new Date() }
    }
  }
}).select("_id");


         console.log("subscribed Users:", type, " :",subscribedUsers);

        activeSubscribedUserIds[type] = new Set(
          subscribedUsers.map((u) => u._id.toString())
        );
      }
    }

   

    // 5️⃣ Prepare connection map only for Biodata
    let connectionMap = {};
    if (profileTypeToUserIds.Biodata.size > 0) {
      const connectionRequests = await ConnectionRequest.find({
        $or: [{ toUserId: userId }, { fromUserId: userId }],
      });

      connectionRequests.forEach((req) => {
        const otherUserId =
          req.fromUserId.toString() === userId.toString()
            ? req.toUserId.toString()
            : req.fromUserId.toString();
        connectionMap[otherUserId] = req;
      });
    }

// 6️⃣ Final transformed response
const result = activeSavedProfiles
  .map((saved) => {
    const profile = saved.saveProfile?.toObject();
const profileUserId =
  typeof profile?.userId === "object"
    ? profile.userId._id?.toString()
    : profile?.userId?.toString();

    const type = profile.profileType;

    // Skip unsubscribed only for types with subscriptions
if (["Biodata", "Pandit", "Jyotish", "Kathavachak"].includes(type)) {
  if (!activeSubscribedUserIds[type].has(profileUserId)) return null;
}


    // Add extra fields only for Biodata
    if (type === "Biodata") {
      const existingConnection = connectionMap[profileUserId];
      return {
        ...profile,
        isSaved: true,
        requestId: existingConnection?._id || null,
        requestStatus: existingConnection?.status || null,
        connectionStatus: existingConnection
          ? existingConnection.fromUserId.toString() === userId.toString()
            ? "sent"
            : "received"
          : "none",
      };
    }

    // For others, just return with isSaved
    return {
      ...profile,
      isSaved: true,
    };
  })
  .filter(Boolean);


    if (result.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No active saved profiles found.",
      });
    }

    return res.status(200).json({
      status: true,
      savedProfiles: result,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching saved profiles",
      error: error.message,
    });
  }
};


const deleteSavedProfiles = async (req,res) => {
  
   try{
 
    const userId = req?.user?._id
    const profileId = req?.params?.id;

    const existingSavedProfile = await SavedProfile.find({saveProfile:profileId});

    if(!existingSavedProfile || existingSavedProfile.length === 0){
      return res.status(400).json({status:false, message: "profile Not found in savedProfiles!"})
    }

    const deleteSavedProfile = await SavedProfile.deleteOne({saveProfile:profileId});


    if(!deleteSavedProfile){
      return res.status(400).json({status:false, message: "Something went wrong while Deleting Saved Profile!"})
    }

    return res.status(200).json({
      status: true , message: "Profile Deleted SuccessFully from savedProiles.",data:deleteSavedProfile});

   }catch(err){
    res.status(500).json({status: "success",message: err.message})
   }
}

module.exports = {saveProfiles,getSavedProfiles,deleteSavedProfiles};
