const { validationResult } = require("express-validator");
const UserModel = require("../models/user.model");
const RefreshTokenModel = require("../models/refreshToken.model");
const { comparePassword } = require("../utils/password.utils");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  JWT_REFRESH_EXPIRATION,
} = require("../utils/jwt.utils");

class AuthController {
  /**
   * Đăng ký user mới
   */
  static async register(req, res, next) {
    try {
      // Kiểm tra lỗi validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password, fullName, phone, role } = req.body;

      // Kiểm tra email đã tồn tại chưa
      const emailExists = await UserModel.emailExists(email);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }

      // Mặc định role là CUSTOMER nếu không chỉ định
      const userRole = role || "CUSTOMER";

      // Đối với các role không phải CUSTOMER, set status là PENDING_APPROVAL
      const status = userRole === "CUSTOMER" ? "ACTIVE" : "PENDING_APPROVAL";

      // Tạo user
      const user = await UserModel.create({
        email,
        password,
        fullName,
        phone,
        role: userRole,
        status,
      });

      // Debug: log user object (chỉ trong development)
      if (process.env.NODE_ENV === "development") {
        console.log(
          "Register - User created:",
          JSON.stringify(
            {
              Id: user.Id,
              Email: user.Email,
              RoleId: user.RoleId,
              roleName: user.roleName,
            },
            null,
            2
          )
        );
      }

      // Chuẩn hóa user.Id thành string nếu cần
      let userId = user.Id;
      if (!userId) {
        throw new Error("User.Id is missing after creation");
      }

      if (Buffer.isBuffer(userId)) {
        const hex = userId.toString("hex");
        userId = [
          hex.substr(0, 8),
          hex.substr(8, 4),
          hex.substr(12, 4),
          hex.substr(16, 4),
          hex.substr(20, 12),
        ]
          .join("-")
          .toUpperCase();
      } else if (typeof userId !== "string") {
        userId = String(userId).toUpperCase();
      } else {
        userId = userId.toUpperCase();
      }

      if (process.env.NODE_ENV === "development") {
        console.log("Register - Normalized userId:", userId);
      }

      // Tạo tokens với userId đã được chuẩn hóa
      const accessToken = generateAccessToken({
        id: userId,
        email: user.Email,
        roleId: user.RoleId,
        roleName: user.roleName,
      });
      const refreshToken = generateRefreshToken();

      // Lưu refresh token
      await RefreshTokenModel.create({
        userId: userId,
        token: refreshToken,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        message:
          userRole === "CUSTOMER"
            ? "Registration successful"
            : "Registration successful. Your account is pending approval.",
        data: {
          user: {
            id: userId,
            email: user.Email,
            fullName: user.FullName,
            phone: user.Phone,
            role: user.roleName,
            status: user.Status,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Đăng nhập user
   */
  static async login(req, res, next) {
    try {
      // Kiểm tra lỗi validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Tìm user theo email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Kiểm tra user có active không
      if (user.Status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: `Account is ${user.Status.toLowerCase()}. Please contact support.`,
        });
      }

      // Xác thực mật khẩu
      const isPasswordValid = await comparePassword(
        password,
        user.PasswordHash
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Chuẩn hóa user.Id thành string nếu cần
      let userId = user.Id;
      if (Buffer.isBuffer(userId)) {
        const hex = userId.toString("hex");
        userId = [
          hex.substr(0, 8),
          hex.substr(8, 4),
          hex.substr(12, 4),
          hex.substr(16, 4),
          hex.substr(20, 12),
        ]
          .join("-")
          .toUpperCase();
      } else if (typeof userId !== "string") {
        userId = String(userId).toUpperCase();
      } else {
        userId = userId.toUpperCase();
      }

      // Cập nhật last login
      await UserModel.updateLastLogin(userId);

      // Tạo tokens với userId đã được chuẩn hóa
      const accessToken = generateAccessToken({
        id: userId,
        email: user.Email,
        roleId: user.RoleId,
        roleName: user.RoleName,
      });
      const refreshToken = generateRefreshToken();

      // Revoke old refresh tokens (tùy chọn - để bảo mật)
      // await RefreshTokenModel.revokeAllForUser(user.Id, req.ip);

      // Lưu refresh token mới
      await RefreshTokenModel.create({
        userId: user.Id,
        token: refreshToken,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user.Id,
            email: user.Email,
            fullName: user.FullName,
            phone: user.Phone,
            role: user.RoleName,
            status: user.Status,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Làm mới access token
   */
  static async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      // Tìm refresh token trong database
      const tokenData = await RefreshTokenModel.findByToken(refreshToken);

      if (!tokenData) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired refresh token",
        });
      }

      // Chuẩn bị dữ liệu user để tạo token
      // Đảm bảo UserId được format đúng (nên đã được convert bởi model)
      let userId = tokenData.UserId;
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

      const userForToken = {
        id: userId,
        email: tokenData.Email,
        roleId: tokenData.RoleId,
        roleName: tokenData.RoleName,
      };

      // Tạo tokens mới
      const newAccessToken = generateAccessToken(userForToken);
      const newRefreshToken = generateRefreshToken();

      // Revoke refresh token cũ
      await RefreshTokenModel.revoke(refreshToken, newRefreshToken, req.ip);

      // Đảm bảo userId là uppercase để nhất quán
      userId = userId.toUpperCase();

      // Lưu refresh token mới
      await RefreshTokenModel.create({
        userId: userId,
        token: newRefreshToken,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Đăng xuất user
   */
  static async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Revoke refresh token
        await RefreshTokenModel.revoke(refreshToken, null, req.ip);
      }

      res.json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy thông tin user hiện tại
   */
  static async getMe(req, res, next) {
    try {
      // Debug logging (chỉ trong development)
      if (process.env.NODE_ENV === "development") {
        console.log(
          "getMe - req.user.id:",
          req.user.id,
          "Type:",
          typeof req.user.id
        );
      }

      const user = await UserModel.findById(req.user.id);

      if (!user) {
        if (process.env.NODE_ENV === "development") {
          console.log("getMe - User not found for id:", req.user.id);
        }
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.Id,
            email: user.Email,
            fullName: user.FullName,
            phone: user.Phone,
            role: user.RoleName,
            status: user.Status,
            emailVerified: user.EmailVerified,
            phoneVerified: user.PhoneVerified,
            lastLoginAt: user.LastLoginAt,
            createdAt: user.CreatedAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
