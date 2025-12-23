const ProductAttributeModel = require("../models/productAttribute.model");
const { validationResult } = require("express-validator");

class ProductAttributeController {
  /**
   * Get all attributes for a product
   */
  static async getProductAttributes(req, res, next) {
    try {
      const { productId } = req.params;
      const attributes = await ProductAttributeModel.findByProductId(productId);

      res.json({
        success: true,
        data: {
          attributes,
          count: attributes.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new product attribute
   */
  static async createProductAttribute(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { productId } = req.params;
      const attributeData = {
        productId,
        attributeName: req.body.attributeName,
        attributeValue: req.body.attributeValue,
        displayOrder: req.body.displayOrder || 0,
      };

      const attribute = await ProductAttributeModel.create(attributeData);

      res.status(201).json({
        success: true,
        message: "Product attribute created successfully",
        data: { attribute },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk create product attributes
   */
  static async bulkCreateProductAttributes(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { productId } = req.params;
      const { attributes } = req.body;

      if (!Array.isArray(attributes) || attributes.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Attributes must be a non-empty array",
        });
      }

      const createdAttributes = await ProductAttributeModel.bulkCreate(productId, attributes);

      res.status(201).json({
        success: true,
        message: `${createdAttributes.length} product attributes created successfully`,
        data: { attributes: createdAttributes },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product attribute
   */
  static async updateProductAttribute(req, res, next) {
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
      const attribute = await ProductAttributeModel.findById(id);

      if (!attribute) {
        return res.status(404).json({
          success: false,
          message: "Product attribute not found",
        });
      }

      const updateData = {};
      if (req.body.attributeName !== undefined) updateData.attributeName = req.body.attributeName;
      if (req.body.attributeValue !== undefined) updateData.attributeValue = req.body.attributeValue;
      if (req.body.displayOrder !== undefined) updateData.displayOrder = parseInt(req.body.displayOrder);

      const updatedAttribute = await ProductAttributeModel.update(id, updateData);

      res.json({
        success: true,
        message: "Product attribute updated successfully",
        data: { attribute: updatedAttribute },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product attribute
   */
  static async deleteProductAttribute(req, res, next) {
    try {
      const { id } = req.params;
      const attribute = await ProductAttributeModel.findById(id);

      if (!attribute) {
        return res.status(404).json({
          success: false,
          message: "Product attribute not found",
        });
      }

      await ProductAttributeModel.delete(id);

      res.json({
        success: true,
        message: "Product attribute deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductAttributeController;




