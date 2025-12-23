const { verifyAccessToken } = require("../utils/jwt.utils");
const UserModel = require("../models/user.model");

/**
 * Xác thực user bằng JWT token
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

    const token = authHeader.substring(7); // Loại bỏ prefix "Bearer "

    // Xác thực token
    const decoded = verifyAccessToken(token);

    // Đảm bảo userId được format đúng (xử lý chuyển đổi Buffer hoặc object)
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

    // Trim và đảm bảo format UUID đúng (uppercase cho SQL Server)
    userId = userId.trim().toUpperCase();

    // Debug logging (chỉ trong development)
    if (process.env.NODE_ENV === "development") {
      console.log("=== AUTH DEBUG ===");
      console.log("Extracted userId:", userId, "Type:", typeof userId);
    }

    // Lấy user từ database
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

    // Kiểm tra user có active không
    if (user.Status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "User account is not active",
      });
    }

    // Gắn user vào request
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
 * Phân quyền user theo role(s)
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
