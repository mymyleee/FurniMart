const ProductImageModel = require("../models/productImage.model");
const { validationResult } = require("express-validator");

class ProductImageController {
  /**
   * Get all images for a product
   */
  static async getProductImages(req, res, next) {
    try {
      const { productId } = req.params;
      const images = await ProductImageModel.findByProductId(productId);

      res.json({
        success: true,
        data: {
          images,
          count: images.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new product image
   */
  static async createProductImage(req, res, next) {
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
      const imageData = {
        productId,
        imageUrl: req.body.imageUrl,
        altText: req.body.altText,
        displayOrder: req.body.displayOrder || 0,
        isPrimary: req.body.isPrimary || false,
      };

      const image = await ProductImageModel.create(imageData);

      res.status(201).json({
        success: true,
        message: "Product image created successfully",
        data: { image },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product image
   */
  static async updateProductImage(req, res, next) {
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
      const image = await ProductImageModel.findById(id);

      if (!image) {
        return res.status(404).json({
          success: false,
          message: "Product image not found",
        });
      }

      const updateData = {};
      if (req.body.imageUrl !== undefined) updateData.imageUrl = req.body.imageUrl;
      if (req.body.altText !== undefined) updateData.altText = req.body.altText;
      if (req.body.displayOrder !== undefined) updateData.displayOrder = parseInt(req.body.displayOrder);
      if (req.body.isPrimary !== undefined) updateData.isPrimary = req.body.isPrimary;

      const updatedImage = await ProductImageModel.update(id, updateData);

      res.json({
        success: true,
        message: "Product image updated successfully",
        data: { image: updatedImage },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product image
   */
  static async deleteProductImage(req, res, next) {
    try {
      const { id } = req.params;
      const image = await ProductImageModel.findById(id);

      if (!image) {
        return res.status(404).json({
          success: false,
          message: "Product image not found",
        });
      }

      await ProductImageModel.delete(id);

      res.json({
        success: true,
        message: "Product image deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductImageController;




