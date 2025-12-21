const express = require("express");
const { body } = require("express-validator");
const AuthController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// Validation rules
const registerValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  body("fullName").trim().isLength({ min: 2, max: 255 }).withMessage("Full name is required (2-255 characters)"),
  body("phone").optional().isMobilePhone().withMessage("Valid phone number is required"),
  body("role")
    .optional()
    .isIn(["CUSTOMER", "SELLER", "BRANCH_MANAGER", "DELIVERY_STAFF", "ADMIN"])
    .withMessage("Invalid role"),
];

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const refreshValidation = [body("refreshToken").notEmpty().withMessage("Refresh token is required")];

const logoutValidation = [body("refreshToken").optional().notEmpty().withMessage("Invalid refresh token")];

// Routes
router.post("/register", registerValidation, AuthController.register);
router.post("/login", loginValidation, AuthController.login);
router.post("/refresh", refreshValidation, AuthController.refresh);
router.post("/logout", logoutValidation, AuthController.logout);
router.get("/me", authenticate, AuthController.getMe);

module.exports = router;
