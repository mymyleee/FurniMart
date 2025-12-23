const express = require("express");
const { body } = require("express-validator");
const CategoryController = require("../controllers/category.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

// Quy tắc validation
const createCategoryValidation = [
  body("name").trim().notEmpty().withMessage("Category name is required").isLength({ max: 255 }).withMessage("Category name must be less than 255 characters"),
  body("slug").trim().notEmpty().withMessage("Slug is required").matches(/^[a-z0-9-]+$/).withMessage("Slug must contain only lowercase letters, numbers, and hyphens"),
  body("description").optional().trim().isLength({ max: 1000 }).withMessage("Description must be less than 1000 characters"),
  body("parentCategoryId").optional().isInt().withMessage("Parent category ID must be an integer"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
  body("displayOrder").optional().isInt().withMessage("Display order must be an integer"),
];

const updateCategoryValidation = [
  body("name").optional().trim().notEmpty().withMessage("Category name cannot be empty").isLength({ max: 255 }).withMessage("Category name must be less than 255 characters"),
  body("slug").optional().trim().notEmpty().withMessage("Slug cannot be empty").matches(/^[a-z0-9-]+$/).withMessage("Slug must contain only lowercase letters, numbers, and hyphens"),
  body("description").optional().trim().isLength({ max: 1000 }).withMessage("Description must be less than 1000 characters"),
  body("parentCategoryId").optional().isInt().withMessage("Parent category ID must be an integer"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
  body("displayOrder").optional().isInt().withMessage("Display order must be an integer"),
];

// Routes
router.get("/", CategoryController.getAllCategories);
router.get("/slug/:slug", CategoryController.getCategoryBySlug);
router.get("/:id", CategoryController.getCategoryById);
router.post("/", authenticate, authorize("ADMIN", "BRANCH_MANAGER"), createCategoryValidation, CategoryController.createCategory);
router.put("/:id", authenticate, authorize("ADMIN", "BRANCH_MANAGER"), updateCategoryValidation, CategoryController.updateCategory);
router.delete("/:id", authenticate, authorize("ADMIN", "BRANCH_MANAGER"), CategoryController.deleteCategory);

module.exports = router;
