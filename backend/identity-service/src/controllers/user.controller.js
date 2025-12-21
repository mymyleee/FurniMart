const { validationResult } = require("express-validator");
const UserModel = require("../models/user.model");

class UserController {
  /**
   * Get user by ID (Admin only)
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
   * Update user profile
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
      // For now, just return success

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
   * Change password
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

      // Get user to verify current password
      const user = await UserModel.findByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify current password
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

      // Update password
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
   * Update user status (Admin only)
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

      // Check if user exists
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Prevent admin from changing their own status
      if (user.Id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: "Cannot change your own status",
        });
      }

      // Normalize userId
      let userId = id;
      if (typeof userId !== "string") {
        userId = String(userId);
      }
      userId = userId.trim().toUpperCase();

      // Update status
      await UserModel.updateStatus(userId, status);

      // Get updated user
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
