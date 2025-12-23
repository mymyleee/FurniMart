const express = require("express");
const { body } = require("express-validator");
const ProductImageController = require("../controllers/productImage.controller");

const router = express.Router();

// Validation rules
const createImageValidation = [
  body("imageUrl").trim().notEmpty().withMessage("Image URL is required").isURL().withMessage("Image URL must be a valid URL"),
  body("altText").optional().trim().isLength({ max: 255 }).withMessage("Alt text must be less than 255 characters"),
  body("displayOrder").optional().isInt({ min: 0 }).withMessage("Display order must be a non-negative integer"),
  body("isPrimary").optional().isBoolean().withMessage("isPrimary must be a boolean"),
];

const updateImageValidation = [
  body("imageUrl").optional().trim().notEmpty().withMessage("Image URL cannot be empty").isURL().withMessage("Image URL must be a valid URL"),
  body("altText").optional().trim().isLength({ max: 255 }).withMessage("Alt text must be less than 255 characters"),
  body("displayOrder").optional().isInt({ min: 0 }).withMessage("Display order must be a non-negative integer"),
  body("isPrimary").optional().isBoolean().withMessage("isPrimary must be a boolean"),
];

// Routes
router.get("/:productId/images", ProductImageController.getProductImages);
router.post("/:productId/images", createImageValidation, ProductImageController.createProductImage);
router.put("/images/:id", updateImageValidation, ProductImageController.updateProductImage);
router.delete("/images/:id", ProductImageController.deleteProductImage);

module.exports = router;




