const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Admin = require('../models/admin');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({
        status: false,
        message: "No token provided or invalid token format",
        error: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ First check User collection
      let user = await User.findById(decoded.userId);
      let role = "user";

      // ✅ If not found, check Admin collection
      if (!user) {
        const admin = await Admin.findById(decoded.userId || decoded.id).select("-password");
        if (admin) {
          user = admin;
          role = "admin";
        }
      }

      if (!user) {
        return res.status(400).json({
          status: false,
          message: "User does not exist. Please login again.",
          error: "User not found",
        });
      }

      // ✅ Only check access disabled for regular users, not admins
      if (role === "user" && user.access && user.access.toLowerCase() === "disable") {
        return res.status(400).json({
          status: false,
          message: "Your account has been disabled by the Brahmin Milan Team. Please contact support.",
          error: "Account disabled",
        });
      }

      // ✅ Attach user + role to request
      req.user = { ...user.toObject(), role };
      next();

    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(400).json({
          status: false,
          message: "Token has expired. Please login again.",
          error: "Token expired",
        });
      }
      return res.status(400).json({
        status: false,
        message: "Invalid token. Please login again.",
        error: "Invalid token",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error during token verification. Please try again.",
      error: error.message,
    });
  }
};

module.exports = verifyToken;