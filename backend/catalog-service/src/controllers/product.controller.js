const ProductModel = require("../models/product.model");
const ProductImageModel = require("../models/productImage.model");
const Product3DModelModel = require("../models/product3DModel.model");
const ProductAttributeModel = require("../models/productAttribute.model");
const ReviewModel = require("../models/review.model");
const { validationResult } = require("express-validator");

class ProductController {
  /**
   * Lấy tất cả sản phẩm với bộ lọc và phân trang
   */
  static async getAllProducts(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        categoryId,
        isActive,
        stockStatus,
        isFeatured,
        search,
        minPrice,
        maxPrice,
        sortBy = "CreatedAt",
        sortOrder = "DESC",
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder: sortOrder.toUpperCase(),
      };

      if (categoryId) options.categoryId = parseInt(categoryId);
      if (isActive !== undefined) options.isActive = isActive === "true" || isActive === "1";
      if (stockStatus) options.stockStatus = stockStatus;
      if (isFeatured !== undefined) options.isFeatured = isFeatured === "true" || isFeatured === "1";
      if (search) options.search = search;
      if (minPrice) options.minPrice = parseFloat(minPrice);
      if (maxPrice) options.maxPrice = parseFloat(maxPrice);

      const products = await ProductModel.findAll(options);
      const total = await ProductModel.count(options);

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            page: options.page,
            limit: options.limit,
            total,
            totalPages: Math.ceil(total / options.limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy sản phẩm theo ID
   */
  static async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const { include = "all" } = req.query; // all, images, 3d, attributes, reviews, hoặc comma-separated

      const product = await ProductModel.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const includes = include === "all" 
        ? ["images", "3d", "attributes", "reviews", "rating"]
        : include.split(",").map(i => i.trim());

      const productData = { ...product };

      // Bao gồm hình ảnh
      if (includes.includes("images") || includes.includes("all")) {
        productData.images = await ProductImageModel.findByProductId(id);
      }

      // Bao gồm model 3D
      if (includes.includes("3d") || includes.includes("all")) {
        productData.model3D = await Product3DModelModel.findByProductId(id);
      }

      // Bao gồm thuộc tính
      if (includes.includes("attributes") || includes.includes("all")) {
        productData.attributes = await ProductAttributeModel.findByProductId(id);
      }

      // Bao gồm đánh giá và tóm tắt xếp hạng
      if (includes.includes("reviews") || includes.includes("all") || includes.includes("rating")) {
        const reviews = await ReviewModel.findByProductId(id, { isApproved: true, page: 1, limit: 5 });
        const ratingSummary = await ReviewModel.getAverageRating(id);
        productData.reviews = reviews;
        productData.ratingSummary = ratingSummary;
      }

      res.json({
        success: true,
        data: { product: productData },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy sản phẩm theo slug
   */
  static async getProductBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const { include = "all" } = req.query;

      const product = await ProductModel.findBySlug(slug);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Tăng view count - await để đảm bảo cập nhật thành công
      let updatedProduct = product;
      try {
        updatedProduct = await ProductModel.update(product.Id, { viewCount: (product.ViewCount || 0) + 1 });
        // Nếu update thành công, sử dụng product đã được cập nhật
        if (updatedProduct) {
          product.ViewCount = updatedProduct.ViewCount;
        }
      } catch (err) {
        console.error("Error incrementing view count:", err);
        // Không throw error, chỉ log để không ảnh hưởng đến response
      }

      const includes = include === "all" 
        ? ["images", "3d", "attributes", "reviews", "rating"]
        : include.split(",").map(i => i.trim());

      const productData = { ...product };

      // Bao gồm hình ảnh
      if (includes.includes("images") || includes.includes("all")) {
        productData.images = await ProductImageModel.findByProductId(product.Id);
      }

      // Bao gồm model 3D
      if (includes.includes("3d") || includes.includes("all")) {
        productData.model3D = await Product3DModelModel.findByProductId(product.Id);
      }

      // Bao gồm thuộc tính
      if (includes.includes("attributes") || includes.includes("all")) {
        productData.attributes = await ProductAttributeModel.findByProductId(product.Id);
      }

      // Bao gồm đánh giá và tóm tắt xếp hạng
      if (includes.includes("reviews") || includes.includes("all") || includes.includes("rating")) {
        const reviews = await ReviewModel.findByProductId(product.Id, { isApproved: true, page: 1, limit: 5 });
        const ratingSummary = await ReviewModel.getAverageRating(product.Id);
        productData.reviews = reviews;
        productData.ratingSummary = ratingSummary;
      }

      res.json({
        success: true,
        data: { product: productData },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tạo sản phẩm mới
   */
  static async createProduct(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const productData = {
        name: req.body.name,
        description: req.body.description,
        shortDescription: req.body.shortDescription,
        sku: req.body.sku,
        categoryId: req.body.categoryId,
        basePrice: parseFloat(req.body.basePrice),
        salePrice: req.body.salePrice ? parseFloat(req.body.salePrice) : null,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        isFeatured: req.body.isFeatured !== undefined ? req.body.isFeatured : false,
        stockStatus: req.body.stockStatus || "IN_STOCK",
        weight: req.body.weight ? parseFloat(req.body.weight) : null,
        length: req.body.length ? parseFloat(req.body.length) : null,
        width: req.body.width ? parseFloat(req.body.width) : null,
        height: req.body.height ? parseFloat(req.body.height) : null,
        material: req.body.material || null,
        color: req.body.color || null,
        brand: req.body.brand || null,
        warrantyPeriod: req.body.warrantyPeriod ? parseInt(req.body.warrantyPeriod) : null,
        metaTitle: req.body.metaTitle || null,
        metaDescription: req.body.metaDescription || null,
        slug: req.body.slug,
        createdBy: req.user?.id || null,
      };

      const product = await ProductModel.create(productData);

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: { product },
      });
    } catch (error) {
      if (error.number === 2627) {
        // Vi phạm ràng buộc unique
        const message = error.message.includes("SKU") 
          ? "Product with this SKU already exists"
          : "Product with this slug already exists";
        return res.status(409).json({
          success: false,
          message,
        });
      }
      next(error);
    }
  }

  /**
   * Cập nhật sản phẩm
   */
  static async updateProduct(req, res, next) {
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
      const product = await ProductModel.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const updateData = {};
      const allowedFields = [
        "name", "description", "shortDescription", "sku", "categoryId",
        "basePrice", "salePrice", "isActive", "isFeatured", "stockStatus",
        "weight", "length", "width", "height", "material", "color", "brand",
        "warrantyPeriod", "metaTitle", "metaDescription", "slug", "viewCount"
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          if (field.includes("Price") || field === "weight" || field === "length" || field === "width" || field === "height") {
            updateData[field] = parseFloat(req.body[field]);
          } else if (field === "categoryId" || field === "warrantyPeriod" || field === "viewCount") {
            updateData[field] = parseInt(req.body[field]);
          } else {
            updateData[field] = req.body[field];
          }
        }
      });

      updateData.updatedBy = req.user?.id || null;

      const updatedProduct = await ProductModel.update(id, updateData);

      res.json({
        success: true,
        message: "Product updated successfully",
        data: { product: updatedProduct },
      });
    } catch (error) {
      if (error.number === 2627) {
        const message = error.message.includes("SKU")
          ? "Product with this SKU already exists"
          : "Product with this slug already exists";
        return res.status(409).json({
          success: false,
          message,
        });
      }
      next(error);
    }
  }

  /**
   * Xóa sản phẩm
   */
  static async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      const product = await ProductModel.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      await ProductModel.delete(id);

      res.json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductController;
