const jwt = require("jsonwebtoken");

/**
 * Xác thực user bằng JWT token từ identity-service
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

    // Xác thực token - sử dụng cùng JWT_SECRET với identity-service
    const jwtSecret =
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-in-production";

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired",
        });
      } else if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }
      throw error;
    }

    // Đảm bảo userId được format đúng
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

    // Gắn thông tin user vào request
    req.user = {
      id: userId,
      email: decoded.email || null,
      fullName: decoded.fullName || null,
      roleId: decoded.roleId || null,
      roleName: decoded.roleName || null,
    };

    next();
  } catch (error) {
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
