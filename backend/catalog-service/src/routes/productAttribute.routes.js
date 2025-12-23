const express = require("express");
const { body } = require("express-validator");
const ProductAttributeController = require("../controllers/productAttribute.controller");

const router = express.Router();

// Validation rules
const createAttributeValidation = [
  body("attributeName").trim().notEmpty().withMessage("Attribute name is required").isLength({ max: 100 }).withMessage("Attribute name must be less than 100 characters"),
  body("attributeValue").trim().notEmpty().withMessage("Attribute value is required").isLength({ max: 500 }).withMessage("Attribute value must be less than 500 characters"),
  body("displayOrder").optional().isInt({ min: 0 }).withMessage("Display order must be a non-negative integer"),
];

const bulkCreateAttributesValidation = [
  body("attributes").isArray({ min: 1 }).withMessage("Attributes must be a non-empty array"),
  body("attributes.*.attributeName").trim().notEmpty().withMessage("Attribute name is required"),
  body("attributes.*.attributeValue").trim().notEmpty().withMessage("Attribute value is required"),
  body("attributes.*.displayOrder").optional().isInt({ min: 0 }).withMessage("Display order must be a non-negative integer"),
];

const updateAttributeValidation = [
  body("attributeName").optional().trim().notEmpty().withMessage("Attribute name cannot be empty").isLength({ max: 100 }).withMessage("Attribute name must be less than 100 characters"),
  body("attributeValue").optional().trim().notEmpty().withMessage("Attribute value cannot be empty").isLength({ max: 500 }).withMessage("Attribute value must be less than 500 characters"),
  body("displayOrder").optional().isInt({ min: 0 }).withMessage("Display order must be a non-negative integer"),
];

// Routes
router.get("/:productId/attributes", ProductAttributeController.getProductAttributes);
router.post("/:productId/attributes", createAttributeValidation, ProductAttributeController.createProductAttribute);
router.post("/:productId/attributes/bulk", bulkCreateAttributesValidation, ProductAttributeController.bulkCreateProductAttributes);
router.put("/attributes/:id", updateAttributeValidation, ProductAttributeController.updateProductAttribute);
router.delete("/attributes/:id", ProductAttributeController.deleteProductAttribute);

module.exports = router;




