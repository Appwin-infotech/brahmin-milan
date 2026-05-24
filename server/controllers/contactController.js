const { default: mongoose } = require("mongoose");
const ContactMessage = require("../models/contactMessage");

// Create new message
 const createContactMessage = async (req, res) => {
  try {
    const { fullname, email, phone, subject, message } = req.body;

    if (!fullname || !email || !phone || !subject || !message) {
      return res.status(400).json({ status: false, message: "All fields are required" });
    }

    // Validate mobile number format
    const mobileRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (!mobileRegex.test(phone)) {
      return res.status(400).json({
        status: false,
        message: "Invalid mobile number! Please enter a valid mobile number.",
      });
    }

    const newMessage = new ContactMessage({ fullname, email, phone, subject, message });
    await newMessage.save();

    res.status(201).json({ status: true, message: "Message submitted successfully", data: newMessage });
  } catch (error) {
    console.error("Contact form submission error:", error);
    res.status(500).json({ status: false, message: "Something went wrong"|| error.message });
  }
};

// Get all messages (admin)
 const getAllContactMessages = async (req, res) => {
  try {
    const {
      search = "",         // search query
      page = 1,            // pagination: page number
      limit = 10,          // pagination: items per page
      startDate,           // optional start date filter
      endDate              // optional end date filter
    } = req.query;

    const query = {
      $or: [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ]
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ContactMessage.countDocuments(query);
    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

if (!messages || messages.length === 0) {
  return res.status(200).json({
    status: true,
    data: [],
    pagination: {
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: 0,
    },
    message: "No contact messages found for the applied filters.",
  });
}

    res.status(200).json({
      status: true,
      data: messages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};


// Get single message by ID (optional)
 const getContactMessageById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: false, message: "Invalid Contact message ID format." });
    }

    const message = await ContactMessage.findById(id);

    if (!message) {
      return res.status(400).json({ status: false, message: "Contact Message not found." });
    }

    res.status(200).json({ status: true, data: message });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error retrieving contact message.",
      error: error.message,
    });
  }
};


const deleteMultipleContactMessages = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: false, message: "No message IDs provided for deletion." });
    }

    const result = await ContactMessage.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      status: true,
      message: `${result.deletedCount} Contact message(s) deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Failed to delete messages", error });
  }
};


module.exports = {createContactMessage,getAllContactMessages,getContactMessageById,deleteMultipleContactMessages};