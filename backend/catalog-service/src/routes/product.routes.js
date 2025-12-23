const express = require("express");
const { body } = require("express-validator");
const ProductController = require("../controllers/product.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

// Validation rules
const createProductValidation = [
  body("name").trim().notEmpty().withMessage("Product name is required").isLength({ max: 255 }).withMessage("Product name must be less than 255 characters"),
  body("slug").trim().notEmpty().withMessage("Slug is required").matches(/^[a-z0-9-]+$/).withMessage("Slug must contain only lowercase letters, numbers, and hyphens"),
  body("sku").trim().notEmpty().withMessage("SKU is required").isLength({ max: 100 }).withMessage("SKU must be less than 100 characters"),
  body("categoryId").isInt().withMessage("Category ID is required and must be an integer"),
  body("basePrice").isFloat({ min: 0 }).withMessage("Base price is required and must be a positive number"),
  body("salePrice").optional().isFloat({ min: 0 }).withMessage("Sale price must be a positive number"),
  body("description").optional().trim(),
  body("shortDescription").optional().trim().isLength({ max: 500 }).withMessage("Short description must be less than 500 characters"),
  body("stockStatus").optional().isIn(["IN_STOCK", "OUT_OF_STOCK", "BACKORDER", "PREORDER"]).withMessage("Invalid stock status"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
  body("isFeatured").optional().isBoolean().withMessage("isFeatured must be a boolean"),
  body("weight").optional().isFloat({ min: 0 }).withMessage("Weight must be a positive number"),
  body("length").optional().isFloat({ min: 0 }).withMessage("Length must be a positive number"),
  body("width").optional().isFloat({ min: 0 }).withMessage("Width must be a positive number"),
  body("height").optional().isFloat({ min: 0 }).withMessage("Height must be a positive number"),
  body("material").optional().trim().isLength({ max: 255 }).withMessage("Material must be less than 255 characters"),
  body("color").optional().trim().isLength({ max: 100 }).withMessage("Color must be less than 100 characters"),
  body("brand").optional().trim().isLength({ max: 255 }).withMessage("Brand must be less than 255 characters"),
  body("warrantyPeriod").optional().isInt({ min: 0 }).withMessage("Warranty period must be a non-negative integer"),
  body("metaTitle").optional().trim().isLength({ max: 255 }).withMessage("Meta title must be less than 255 characters"),
  body("metaDescription").optional().trim().isLength({ max: 500 }).withMessage("Meta description must be less than 500 characters"),
];

const updateProductValidation = [
  body("name").optional().trim().notEmpty().withMessage("Product name cannot be empty").isLength({ max: 255 }).withMessage("Product name must be less than 255 characters"),
  body("slug").optional().trim().notEmpty().withMessage("Slug cannot be empty").matches(/^[a-z0-9-]+$/).withMessage("Slug must contain only lowercase letters, numbers, and hyphens"),
  body("sku").optional().trim().notEmpty().withMessage("SKU cannot be empty").isLength({ max: 100 }).withMessage("SKU must be less than 100 characters"),
  body("categoryId").optional().isInt().withMessage("Category ID must be an integer"),
  body("basePrice").optional().isFloat({ min: 0 }).withMessage("Base price must be a positive number"),
  body("salePrice").optional().isFloat({ min: 0 }).withMessage("Sale price must be a positive number"),
  body("description").optional().trim(),
  body("shortDescription").optional().trim().isLength({ max: 500 }).withMessage("Short description must be less than 500 characters"),
  body("stockStatus").optional().isIn(["IN_STOCK", "OUT_OF_STOCK", "BACKORDER", "PREORDER"]).withMessage("Invalid stock status"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
  body("isFeatured").optional().isBoolean().withMessage("isFeatured must be a boolean"),
  body("weight").optional().isFloat({ min: 0 }).withMessage("Weight must be a positive number"),
  body("length").optional().isFloat({ min: 0 }).withMessage("Length must be a positive number"),
  body("width").optional().isFloat({ min: 0 }).withMessage("Width must be a positive number"),
  body("height").optional().isFloat({ min: 0 }).withMessage("Height must be a positive number"),
  body("material").optional().trim().isLength({ max: 255 }).withMessage("Material must be less than 255 characters"),
  body("color").optional().trim().isLength({ max: 100 }).withMessage("Color must be less than 100 characters"),
  body("brand").optional().trim().isLength({ max: 255 }).withMessage("Brand must be less than 255 characters"),
  body("warrantyPeriod").optional().isInt({ min: 0 }).withMessage("Warranty period must be a non-negative integer"),
  body("metaTitle").optional().trim().isLength({ max: 255 }).withMessage("Meta title must be less than 255 characters"),
  body("metaDescription").optional().trim().isLength({ max: 500 }).withMessage("Meta description must be less than 500 characters"),
];

// Routes
router.get("/", ProductController.getAllProducts);
router.get("/slug/:slug", ProductController.getProductBySlug);
router.get("/:id", ProductController.getProductById);
router.post("/", authenticate, authorize("ADMIN", "BRANCH_MANAGER", "SELLER"), createProductValidation, ProductController.createProduct);
router.put("/:id", authenticate, authorize("ADMIN", "BRANCH_MANAGER", "SELLER"), updateProductValidation, ProductController.updateProduct);
router.delete("/:id", authenticate, authorize("ADMIN", "BRANCH_MANAGER", "SELLER"), ProductController.deleteProduct);

module.exports = router;




