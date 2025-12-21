const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const JWT_SECRET =
  process.env.JWT_SECRET || "furnimart-secret-key-change-in-production";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "1h";
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || "7d";

/**
 * Generate access token
 */
function generateAccessToken(user) {
  // Ensure userId is a string
  let userId = user.id || user.Id; // Handle both lowercase and uppercase
  if (!userId) {
    console.error(
      "ERROR: userId is missing in user object:",
      JSON.stringify(user, null, 2)
    );
    throw new Error("userId is required to generate access token");
  }

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

  userId = userId.trim().toUpperCase();

  const payload = {
    userId: userId,
    email: user.email || user.Email,
    roleId: user.roleId || user.RoleId,
    roleName: user.roleName || user.RoleName,
  };

  // Debug logging (only in development, avoid logging sensitive data in production)
  if (process.env.NODE_ENV === "development") {
    console.log("Generating access token with userId:", payload.userId);
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
    issuer: "furnimart-identity-service",
    audience: "furnimart-api",
  });
}

/**
 * Generate refresh token
 */
function generateRefreshToken() {
  return uuidv4();
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: "furnimart-identity-service",
      audience: "furnimart-api",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    }
    throw error;
  }
}

/**
 * Decode token without verification (for debugging)
 */
function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  decodeToken,
  JWT_REFRESH_EXPIRATION,
};
