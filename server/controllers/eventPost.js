const Activist = require("../models/activist");
const EventPost = require("../models/eventPost");
const Notification = require("../models/notification");
const { getConnectedUsers, getIO, sendNotificationToAdmin } = require("../socket/socket.server");
const Admin = require("../models/admin");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

//create a eventPost
const createEventPost = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { title, description } = req.body;

    // Get activist profile
    const activist = await Activist.findOne({ userId });

    if (!activist) {
      return res.status(400).json({
        status: false,
        message: "Activist Profile not found! Please create Activist Profile.",
      });
    }

    if (activist.access === "disable") {
      return res.status(400).json({
        status: false,
        message:
          "Uploading event posts is temporarily disabled because your activist profile access is restricted. Please try again later or contact support.",
      });
    }

    // 🔹 Upload eventPost images to Cloudinary
    const imagesUrls = [];
    if (req.files?.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];

      if (files.length > 5) {
        return res.status(400).json({
          status: false,
          message: "You can only upload a maximum of 5 images.",
        });
      }

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

    const { activistId, fullname: activistName } = activist;

    // Create new event post
    const newEventPost = new EventPost({
      userId,
      activistId,
      activistName,
      title,
      description,
      images: imagesUrls,
    });

    await newEventPost.save();

    const activistDetails = activist;

    // Embed activist details in the response
    const enrichedEventPost = {
      ...newEventPost.toObject(),
      activistDetails,
    };

    // Notify Admins
    const admins = await Admin.find();
    if (admins.length > 0) {
      const notificationMessage = `${newEventPost.activistName} has posted an event.`;

      for (const admin of admins) {
        sendNotificationToAdmin(
          "eventPostCreated",
          admin._id,
          notificationMessage,
          activist?.profilePhoto,
          enrichedEventPost
        );

        const notification = new Notification({
          userId: admin._id,
          userType: "Admin",
          notificationType: "eventPostCreated",
          relatedData: {
            postId: newEventPost?._id,
            createdBy: newEventPost?.activistName,
            photoUrl: activist?.profilePhoto,
          },
          message: notificationMessage,
          seen: false,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });

        await notification.save();
      }
    }

    return res.status(200).json({
      status: true,
      message: "Event post created successfully.",
      eventPost: newEventPost,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

//getAllEventPost with its respective activist details
const getAllEventsPost = async (req, res) => {
  try {

    const { _id: userId } = req.user || req.admin;

    // Prepare filter conditions if needed (currently empty)
    const filterConditions = {};

    // Fetch all event posts and populate the related fields (likes, comments)
    const eventPosts = await EventPost.find(filterConditions)
      .populate({
        path: 'likes',
        select: '_id username photoUrl', // Customize the fields you want from the User model
      })
      .populate({
        path: 'comments.user',
        select: '_id username photoUrl', // Customize the fields you want from the User model
      })
      .sort({ createdAt: -1 })
      .lean();

    // If no event posts are found
    if (!eventPosts.length) {
      return res.status(400).json({ status: false, message: "Event posts not available." });
    }

    // Step 1: Fetch the posts liked by the logged-in user
    const likedPosts = await EventPost.find({ likes: userId }).select("_id");
    const likedPostIds = new Set(likedPosts.map(post => post._id.toString()));

    // Step 2: Enhance posts
    for (const post of eventPosts) {
      // Add isLiked field
      post.isLiked = likedPostIds.has(post._id.toString());

      // Sort likes by timestamp
      if (post.likes && post.likes.length > 0) {
        post.likes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }

      // Sort comments by date
      if (post.comments && post.comments.length > 0) {
        post.comments.sort((a, b) => new Date(b.date) - new Date(a.date));
      }

      // Attach activist details (based on activistId stored in post)
      const activistDetails = await Activist.findOne({ activistId: post.activistId }).lean();
      post.activistDetails = activistDetails || null;
    }

    // Final response
    return res.status(200).json({
      status: true,
      message: "Event posts fetched successfully.",
      data: eventPosts,
    });

  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

//getEventPostbyId 
const getEventPostById = async (req, res) => {
  try {
    const { _id: userId } = req.user || req.admin;
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({ status: false, message: "Event post ID is required." });
    }

    // Fetch the specific event post by ID
    const eventPost = await EventPost.findById(postId)
      .populate({
        path: 'likes',
        select: '_id username photoUrl',
      })
      .populate({
        path: 'comments.user',
        select: '_id username photoUrl',
      })
      .lean();

    if (!eventPost) {
      return res.status(404).json({ status: false, message: "Event post not found." });
    }

    // Check if the logged-in user has liked this post
    const liked = await EventPost.exists({ _id: postId, likes: userId });
    eventPost.isLiked = !!liked;

    // Sort likes by timestamp
    if (eventPost.likes && eventPost.likes.length > 0) {
      eventPost.likes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Sort comments by date
    if (eventPost.comments && eventPost.comments.length > 0) {
      eventPost.comments.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Attach activist details
    const activistDetails = await Activist.findOne({ activistId: eventPost.activistId }).lean();
    eventPost.activistDetails = activistDetails || null;

    return res.status(200).json({
      status: true,
      message: "Event post fetched successfully.",
      data: eventPost,
    });

  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

//view our own EventsPost Profile
const viewEventPost = async (req, res) => {
  try {
    const userId = req?.user?._id;

    // Get activist details for the logged-in user
    const activist = await Activist.findOne({ userId }).lean();

    if (!activist) {
      return res.status(400).json({ status: false, message: "Activist not found." });
    }

    // Fetch all event posts by this activist
    const eventPosts = await EventPost.find({ activistId: activist.activistId })
      .populate("likes comments.user")
      .sort({ updatedAt: -1 });

    if (!eventPosts.length) {
      return res.status(400).json({ status: false, message: "Event Post Not Found!" });
    }

    // Step 1: Get IDs of posts liked by this user
    const likedPosts = await EventPost.find({ likes: userId }).select('_id');
    const likedPostIds = new Set(likedPosts.map(post => post._id.toString()));

    // Step 2: Add `isLiked` field to each post
    const eventPostsWithLikeStatus = eventPosts.map(post => {
      const isLiked = likedPostIds.has(post._id.toString());
      return { ...post.toObject(), isLiked, activistDetails: activist };
    });

    // Step 3: Send response with activistDetails
    return res.status(200).json({
      status: true,
      message: "EventPost Data Fetched Successfully.",
      data: {
        eventPosts: eventPostsWithLikeStatus
      }
    });

  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

const updateEventPost = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const dataForUpdate = req?.body;
    const { postId } = dataForUpdate;

    if (!postId) {
      return res.status(400).json({
        status: false,
        message: "Post ID is required for updating!",
      });
    }

    // Get activist profile of logged-in user
    const activist = await Activist.findOne({ userId });
    if (!activist) {
      return res.status(400).json({
        status: false,
        message: "Invalid Update Request! Activist Profile not Found!",
      });
    }

    // Check if event post exists
    const existingEventPost = await EventPost.findById(postId);
    if (!existingEventPost) {
      return res.status(400).json({
        status: false,
        message: "Event Post Not Found!",
      });
    }

    // Parse removeImages safely
    let removeImages = req.body.removeImages;
    if (typeof removeImages === "string") {
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

    // Start from existing images
    let imagesUrls = existingEventPost.images || [];

    // Remove specified images
    imagesUrls = imagesUrls.filter((imgUrl) => !removeImages.includes(imgUrl));

    // 🔹 Handle newly uploaded images via Cloudinary
    const newUploadedImages = [];
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

        newUploadedImages.push(upload.secure_url);
      }
    }

    // Replace removed images with new ones (if available)
    while (removeImages.length > 0 && newUploadedImages.length > 0) {
      imagesUrls.push(newUploadedImages.shift());
      removeImages.shift();
    }

    // Append any remaining new images (while enforcing a max limit of 5)
    imagesUrls = [...imagesUrls, ...newUploadedImages];
    if (imagesUrls.length > 5) {
      imagesUrls = imagesUrls.slice(-5);
    }

    // Set imagesUrls in dataForUpdate
    dataForUpdate.images = imagesUrls;

    // Perform the update
    const updatedEventPost = await EventPost.findByIdAndUpdate(
      postId,
      { $set: dataForUpdate },
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: "Event Post updated successfully.",
      data: updatedEventPost,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

//like post
const likePost = async (req, res) => {
  try {
    const { _id: userId, username, photoUrl } = req?.user;
    const { postId } = req.body;
    let socketIssue = "";

    // Find the event post
    const event = await EventPost.findById(postId);
    if (!event) {
      return res.status(400).json({ status: false, message: 'Event Post not found' });
    }

    const isPostOwner = event.userId.toString() === userId.toString();
    const alreadyLiked = event.likes.includes(userId);

    if (alreadyLiked) {
      // Remove like
      event.likes = event.likes.filter(like => like.toString() !== userId.toString());
      await event.save();

      // Delete the like notification related to this user & post
      await Notification.deleteMany({
        notificationType: 'like',
        userId: event.userId, // notification recipient (post owner)
        'relatedData.likedBy._id': userId, // user who liked (and now unliked)
        'relatedData.postId': postId,
      });

    } else {
      // Add like
      event.likes.push(userId);
      await event.save();

      // Send notification if not post owner and liked
      if (!isPostOwner) {
        const postOwnerId = event.userId;
        const notificationMessage = `${username} liked your event!`;

        await Notification.create({
          userId: postOwnerId,
          userType: 'User',
          notificationType: 'like',
          relatedData: {
            likedBy: { name: username, _id: userId },
            photoUrl: Array.isArray(photoUrl) && photoUrl.length > 0 ? photoUrl[0] : null,
            postId,
          },
          message: notificationMessage,
        });

        const connectedUsers = getConnectedUsers();
        const io = getIO();
        const postOwnerSocketId = await connectedUsers.get(postOwnerId.toString());

        if (!postOwnerSocketId) {
          socketIssue = `User not Active yet! postOwnerSocketId not found.`;
        } else {
          io.to(postOwnerSocketId).emit("post-liked", {
            likedBy: { name: username, userId, photoUrl: Array.isArray(photoUrl) && photoUrl.length > 0 ? photoUrl[0] : null },
            postId,
            message: notificationMessage,
          });
        }
      }
    }

    // Re-fetch updated event post with populated user info for likes and comments
    const enrichedEvent = await EventPost.findById(postId)
      .populate({
        path: 'likes',
        select: '_id username photoUrl',
      })
      .populate({
        path: 'comments.user',
        select: '_id username photoUrl',
      })
      .lean();

    // Sort likes/comments manually
    enrichedEvent.comments = enrichedEvent.comments?.sort((a, b) => new Date(b.date) - new Date(a.date)) || [];
    enrichedEvent.likes = enrichedEvent.likes?.reverse();

    // Determine isLiked
    enrichedEvent.isLiked = enrichedEvent.likes.some(like => like._id.toString() === userId.toString());

    // Add activistDetails
    const activistDetails = await Activist.findOne({ activistId: enrichedEvent.activistId }).lean();
    enrichedEvent.activistDetails = activistDetails || null;

    return res.status(200).json({
      status: true,
      message: alreadyLiked ? 'Like removed' : 'Event liked',
      event: enrichedEvent,
      likesCount: enrichedEvent.likes.length,
      socketIssue,
    });

  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

//comment on post
const postComments = async (req, res) => {
  try {
    const { _id: userId, username, photoUrl } = req?.user;
    const { postId, comment } = req.body;
    let socketIssue = "";

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ status: false, message: 'Comment cannot be empty' });
    }

    const event = await EventPost.findById(postId);
    if (!event) {
      return res.status(400).json({ status: false, message: 'Event not found' });
    }

    const isPostOwner = event.userId.toString() === userId.toString();

    // Add comment
    event.comments.push({ user: userId, comment, date: Date.now() });
    await event.save();

    // Notification logic
    if (!isPostOwner) {
      const postOwnerId = event.userId;
      const notificationMessage = `${username} commented on your event!`;

      await Notification.create({
        userId: postOwnerId,
        userType: 'User',
        notificationType: 'comment',
        relatedData: {
          commentBy: { name: username, _id: userId },
          photoUrl: Array.isArray(photoUrl) && photoUrl.length > 0 ? photoUrl[0] : 'default-photo-url',
          postId,
          comment,
        },
        message: notificationMessage,
      });
      const connectedUsers = getConnectedUsers();
      const io = getIO();
      const postOwnerSocketId = await connectedUsers.get(postOwnerId.toString());

      if (!postOwnerSocketId) {
        socketIssue = `User not Active yet ! postOwnerSocketId not found.`;
      } else {
        io.to(postOwnerSocketId).emit("post-commented", {
          commentBy: {
            name: username,
            userId,
            photoUrl: Array.isArray(photoUrl) && photoUrl.length > 0 ? photoUrl[0] : 'default-photo-url'
          },
          postId,
          message: notificationMessage,
        });
      }
    }

    // Re-fetch enriched post with populated likes and comments
    const enrichedEvent = await EventPost.findById(postId)
      .populate({
        path: 'likes',
        select: '_id username photoUrl',
      })
      .populate({
        path: 'comments.user',
        select: '_id username photoUrl',
      })
      .lean();

    // Sort comments by date descending
    enrichedEvent.comments = enrichedEvent.comments?.sort((a, b) => new Date(b.date) - new Date(a.date)) || [];
    enrichedEvent.likes = enrichedEvent.likes?.reverse();

    // Determine if current user liked this post
    enrichedEvent.isLiked = enrichedEvent.likes.some(like => like._id.toString() === userId.toString());

    // ✅ Add activistDetails
    const activistDetails = await Activist.findOne({ activistId: enrichedEvent.activistId }).lean();
    enrichedEvent.activistDetails = activistDetails || null;

    return res.status(200).json({
      status: true,
      message: 'Comment added successfully',
      event: enrichedEvent,
      socketIssue,
    });

  } catch (error) {
    res.status(500).json({ status: false, message: 'Error adding comment', error: error.message });
  }
};



//deleteComment from post
const deleteCommentFromPost = async (req, res) => {
  try {
    const userId = req?.user?._id;
    const { postId, commentId } = req?.params;

    const eventPost = await EventPost.findById(postId);
    if (!eventPost) {
      return res.status(400).json({ status: false, message: "Event Post not found." });
    }

    const comment = eventPost.comments.find(c => c._id.toString() === commentId);
    if (!comment) {
      return res.status(400).json({ status: false, message: "Comment not found." });
    }

    if (comment.user.toString() !== userId.toString()) {
      return res.status(400).json({ status: false, message: "Unauthorized to delete this comment." });
    }

    // Delete the comment from the post
    const deletedComment = await EventPost.updateOne(
      { _id: postId },
      { $pull: { comments: { _id: commentId } } }
    );

    if (deletedComment.modifiedCount === 0) {
      return res.status(400).json({ status: false, message: "Comment not found or not deleted." });
    }

    await Notification.deleteMany({
      notificationType: 'comment',
      userId: eventPost.userId,           // post owner who received the notification
      "relatedData.commentBy._id": comment.user,  // comment creator userId
      "relatedData.postId": postId,
    });
    // Refetch and populate updated post
    const updatedEvent = await EventPost.findById(postId)
      .populate({
        path: 'likes',
        select: '_id username photoUrl',
      })
      .populate({
        path: 'comments.user',
        select: '_id username photoUrl',
      })
      .lean();

    // Sort comments descending by date
    updatedEvent.comments = updatedEvent.comments?.sort((a, b) => new Date(b.date) - new Date(a.date)) || [];

    // Reverse likes or sort by timestamp if available
    updatedEvent.likes = updatedEvent.likes?.reverse();

    // Determine if current user has liked the post
    updatedEvent.isLiked = updatedEvent.likes.some(like => like._id.toString() === userId.toString());

    // Add activistDetails
    const activistDetails = await Activist.findOne({ activistId: updatedEvent.activistId }).lean();
    updatedEvent.activistDetails = activistDetails || null;

    return res.status(200).json({
      status: true,
      message: "Comment deleted successfully.",
      event: updatedEvent,
    });

  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};




//delete Event Post
const deleteEventPost = async (req, res) => {
  try {
    // Destructure userId and postId from the request
    const userId = req?.user?._id;
    const { postId } = req?.params; // Assumed postId is in params

    // Get user data (Activist)
    const activist = await Activist.findOne({ userId });

    if (!activist) {
      return res.status(400).json({ status: false, message: "Activist not found." });
    }

    // Find the event post
    const eventPost = await EventPost.findById(postId);

    // If the event post does not exist
    if (!eventPost) {
      return res.status(400).json({ status: false, message: "Event Post not found!" });
    }

    // Check if the user is the owner of the event post
    if (activist.activistId.toString() !== eventPost.activistId.toString()) {
      return res.status(400).json({ status: false, message: "Unauthorized to delete this post." });
    }

    // Delete the event post and store the result
    const deletedPost = await EventPost.findByIdAndDelete(postId);

    // Check if any document was deleted
    if (!deletedPost) {
      return res.status(400).json({ status: false, message: "Failed to delete the Event Post." });
    }

    // Delete all notifications of types eventPostCreated, like, comment related to this post
    await Notification.deleteMany({
      notificationType: { $in: ["eventPostCreated", "like", "comment"] },
      "relatedData.postId": postId,
    });

    // Send success response
    return res.status(200).json({
      status: true, message: "Event Post deleted successfully.", data: deletedPost
    });

  } catch (err) {
    // Handle any server errors
    res.status(500).json({ status: false, message: err.message });
  }
};

module.exports = { createEventPost, viewEventPost, deleteEventPost, deleteCommentFromPost, getAllEventsPost, getEventPostById, updateEventPost, likePost, postComments };