const { verifyAccessToken } = require("../utils/jwt.utils");
const UserModel = require("../models/user.model");

/**
 * Authenticate user using JWT token
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const decoded = verifyAccessToken(token);

    // Ensure userId is properly formatted (handle Buffer or object conversion)
    let userId = decoded.userId;
    if (Buffer.isBuffer(userId)) {
      const hex = userId.toString("hex");
      userId = [
        hex.substr(0, 8),
        hex.substr(8, 4),
        hex.substr(12, 4),
        hex.substr(16, 4),
        hex.substr(20, 12),
      ].join("-");
    } else if (typeof userId !== "string") {
      userId = String(userId);
    }

    // Trim and ensure proper UUID format (uppercase for SQL Server)
    userId = userId.trim().toUpperCase();

    // Debug logging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("=== AUTH DEBUG ===");
      console.log("Extracted userId:", userId, "Type:", typeof userId);
    }

    // Get user from database
    const user = await UserModel.findById(userId);

    if (!user) {
      if (process.env.NODE_ENV === "development") {
        console.log("User not found for userId:", userId);
      }
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is active
    if (user.Status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "User account is not active",
      });
    }

    // Attach user to request
    req.user = {
      id: user.Id,
      email: user.Email,
      fullName: user.FullName,
      roleId: user.RoleId,
      roleName: user.RoleName,
      status: user.Status,
    };

    next();
  } catch (error) {
    if (error.message === "Token expired") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    } else if (error.message === "Invalid token") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: error.message,
    });
  }
}

/**
 * Authorize user by role(s)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
