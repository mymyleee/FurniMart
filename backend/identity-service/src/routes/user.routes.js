const express = require("express");
const { body } = require("express-validator");
const UserController = require("../controllers/user.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const updateProfileValidation = [
  body("fullName").optional().trim().isLength({ min: 2, max: 255 }).withMessage("Full name must be 2-255 characters"),
  body("phone").optional().isMobilePhone().withMessage("Valid phone number is required"),
];

const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
];

const updateStatusValidation = [
  body("status")
    .isIn(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_APPROVAL"])
    .withMessage("Status must be one of: ACTIVE, INACTIVE, SUSPENDED, PENDING_APPROVAL"),
  body("reason").optional().trim().isLength({ max: 500 }).withMessage("Reason must be less than 500 characters"),
];

// Routes
// IMPORTANT: More specific routes must come before generic routes (/:id)
router.put("/profile", updateProfileValidation, UserController.updateProfile);
router.put("/password", changePasswordValidation, UserController.changePassword);
router.put("/:id/status", authorize("ADMIN"), updateStatusValidation, UserController.updateUserStatus);
router.get("/:id", authorize("ADMIN"), UserController.getUserById);

module.exports = router;

