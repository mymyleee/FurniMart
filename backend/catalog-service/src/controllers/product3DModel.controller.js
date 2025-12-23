const Product3DModelModel = require("../models/product3DModel.model");
const { validationResult } = require("express-validator");

class Product3DModelController {
  /**
   * Get 3D model for a product
   */
  static async getProduct3DModel(req, res, next) {
    try {
      const { productId } = req.params;
      const model = await Product3DModelModel.findByProductId(productId);

      if (!model) {
        return res.status(404).json({
          success: false,
          message: "3D model not found for this product",
        });
      }

      res.json({
        success: true,
        data: { model },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new 3D model
   */
  static async createProduct3DModel(req, res, next) {
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

      // Check if 3D model already exists for this product
      const existing = await Product3DModelModel.findByProductId(productId);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "3D model already exists for this product. Use PUT to update.",
        });
      }

      const modelData = {
        productId,
        modelUrl: req.body.modelUrl,
        thumbnailUrl: req.body.thumbnailUrl,
        fileSize: req.body.fileSize ? parseInt(req.body.fileSize) : null,
        format: req.body.format || "glb",
        version: req.body.version || null,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      };

      const model = await Product3DModelModel.create(modelData);

      res.status(201).json({
        success: true,
        message: "3D model created successfully",
        data: { model },
      });
    } catch (error) {
      if (error.number === 2627) {
        return res.status(409).json({
          success: false,
          message: "3D model already exists for this product",
        });
      }
      next(error);
    }
  }

  /**
   * Update 3D model
   */
  static async updateProduct3DModel(req, res, next) {
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
      const model = await Product3DModelModel.findByProductId(productId);

      if (!model) {
        return res.status(404).json({
          success: false,
          message: "3D model not found for this product",
        });
      }

      const updateData = {};
      if (req.body.modelUrl !== undefined) updateData.modelUrl = req.body.modelUrl;
      if (req.body.thumbnailUrl !== undefined) updateData.thumbnailUrl = req.body.thumbnailUrl;
      if (req.body.fileSize !== undefined) updateData.fileSize = parseInt(req.body.fileSize);
      if (req.body.format !== undefined) updateData.format = req.body.format;
      if (req.body.version !== undefined) updateData.version = req.body.version;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

      const updatedModel = await Product3DModelModel.update(model.Id, updateData);

      res.json({
        success: true,
        message: "3D model updated successfully",
        data: { model: updatedModel },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete 3D model
   */
  static async deleteProduct3DModel(req, res, next) {
    try {
      const { productId } = req.params;
      const model = await Product3DModelModel.findByProductId(productId);

      if (!model) {
        return res.status(404).json({
          success: false,
          message: "3D model not found for this product",
        });
      }

      await Product3DModelModel.delete(model.Id);

      res.json({
        success: true,
        message: "3D model deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = Product3DModelController;




