const jwt = require('jsonwebtoken');
const User = require('../models/user');

const verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({
        status: false,
        message: "No token provided or invalid token format",
        error: "Authentication required",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(400).json({
          status: false,
          message: "User does not exist. Please login again.",
          error: "User not found",
        });
      }

      // Check if access is disabled
      if (user.access && user.access.toLowerCase() === "disable") {
        return res.status(400).json({
          status: false,
          message: "Your account has been disabled by the Brahmin Milan Team. Please contact support.",
          error: "Account disabled",
        });
      }

      // Attach user to request
      req.user = user;
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