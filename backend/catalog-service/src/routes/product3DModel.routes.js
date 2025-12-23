const express = require("express");
const { body } = require("express-validator");
const Product3DModelController = require("../controllers/product3DModel.controller");

const router = express.Router();

// Validation rules
const create3DModelValidation = [
  body("modelUrl").trim().notEmpty().withMessage("Model URL is required").isURL().withMessage("Model URL must be a valid URL"),
  body("thumbnailUrl").optional().trim().isURL().withMessage("Thumbnail URL must be a valid URL"),
  body("fileSize").optional().isInt({ min: 0 }).withMessage("File size must be a non-negative integer"),
  body("format").optional().isIn(["glb", "gltf"]).withMessage("Format must be 'glb' or 'gltf'"),
  body("version").optional().trim().isLength({ max: 50 }).withMessage("Version must be less than 50 characters"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
];

const update3DModelValidation = [
  body("modelUrl").optional().trim().notEmpty().withMessage("Model URL cannot be empty").isURL().withMessage("Model URL must be a valid URL"),
  body("thumbnailUrl").optional().trim().isURL().withMessage("Thumbnail URL must be a valid URL"),
  body("fileSize").optional().isInt({ min: 0 }).withMessage("File size must be a non-negative integer"),
  body("format").optional().isIn(["glb", "gltf"]).withMessage("Format must be 'glb' or 'gltf'"),
  body("version").optional().trim().isLength({ max: 50 }).withMessage("Version must be less than 50 characters"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
];

// Routes
router.get("/:productId/3d", Product3DModelController.getProduct3DModel);
router.post("/:productId/3d", create3DModelValidation, Product3DModelController.createProduct3DModel);
router.put("/:productId/3d", update3DModelValidation, Product3DModelController.updateProduct3DModel);
router.delete("/:productId/3d", Product3DModelController.deleteProduct3DModel);

module.exports = router;




