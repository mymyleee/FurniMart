const { validationResult } = require("express-validator");
const UserModel = require("../models/user.model");

class UserController {
  /**
   * Lấy user theo ID (chỉ Admin)
   */
  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cập nhật profile user
   */
  static async updateProfile(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { fullName, phone } = req.body;
      const userId = req.user.id;

      // TODO: Implement profile update logic
      // Hiện tại chỉ trả về success

      res.json({
        success: true,
        message: "Profile updated successfully",
        // data: { user: updatedUser }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Đổi mật khẩu
   */
  static async changePassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Lấy user để xác thực mật khẩu hiện tại
      const user = await UserModel.findByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Xác thực mật khẩu hiện tại
      const { comparePassword } = require("../utils/password.utils");
      const isPasswordValid = await comparePassword(
        currentPassword,
        user.PasswordHash
      );
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Cập nhật mật khẩu
      await UserModel.updatePassword(userId, newPassword);

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cập nhật trạng thái user (chỉ Admin)
   */
  static async updateUserStatus(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const { status, reason } = req.body;

      // Kiểm tra user có tồn tại không
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Ngăn admin thay đổi status của chính mình
      if (user.Id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: "Cannot change your own status",
        });
      }

      // Chuẩn hóa userId
      let userId = id;
      if (typeof userId !== "string") {
        userId = String(userId);
      }
      userId = userId.trim().toUpperCase();

      // Cập nhật status
      await UserModel.updateStatus(userId, status);

      // Lấy user đã được cập nhật
      const updatedUser = await UserModel.findById(userId);

      res.json({
        success: true,
        message: `User status updated to ${status}`,
        data: {
          user: {
            id: updatedUser.Id,
            email: updatedUser.Email,
            fullName: updatedUser.FullName,
            role: updatedUser.RoleName,
            status: updatedUser.Status,
            updatedAt: updatedUser.UpdatedAt,
          },
          reason: reason || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
