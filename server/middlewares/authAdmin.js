const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');

const verifyAdminToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ 
        status:false,
        message: 'No token provided or invalid token format',
        error: 'Authentication required'
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find admin in the database
      const admin = await Admin.findById(decoded.userId);
      if (!admin) {
        return res.status(400).json({
          status:false,
          message: 'Admin does not exist. Please login again.',
          error: 'Admin does not exist. Please login again.'
        });
      }

      // Check if admin is active
      if (admin.status !== 'active') {
        return res.status(400).json({
          status:false,
          message: 'Account is inactive. Please contact super admin.',
          error: 'Account inactive'
        });
      }
      
      req.admin = admin;  
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).json({
          status:false,
          message: 'Token has expired. Please login again',
          error: 'Token expired'
        });
      }
      
      return res.status(400).json({
        status: false,
        message: 'Invalid token. Please login again',
        error: 'Invalid token'
      });
    }
  } catch (error) {
    return res.status(500).json({
      status:false,
      message: 'Error during verify token, try again',
      error: error.message
    });
  }
};

module.exports = verifyAdminToken;
