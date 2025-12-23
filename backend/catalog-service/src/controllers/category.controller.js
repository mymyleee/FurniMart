const CategoryModel = require("../models/category.model");
const { validationResult } = require("express-validator");

class CategoryController {
  /**
   * Lấy tất cả danh mục
   */
  static async getAllCategories(req, res, next) {
    try {
      const { isActive, parentCategoryId } = req.query;
      const options = {};

      if (isActive !== undefined) {
        options.isActive = isActive === "true" || isActive === "1";
      }

      if (parentCategoryId) {
        options.parentCategoryId = parseInt(parentCategoryId);
      }

      const categories = await CategoryModel.findAll(options);

      res.json({
        success: true,
        data: {
          categories,
          count: categories.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy danh mục theo slug
   */
  static async getCategoryBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const category = await CategoryModel.findBySlug(slug);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      res.json({
        success: true,
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy danh mục theo ID
   */
  static async getCategoryById(req, res, next) {
    try {
      const { id } = req.params;
      const category = await CategoryModel.findById(parseInt(id));

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      res.json({
        success: true,
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tạo danh mục mới
   */
  static async createCategory(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const categoryData = {
        name: req.body.name,
        description: req.body.description,
        parentCategoryId: req.body.parentCategoryId,
        slug: req.body.slug,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        displayOrder: req.body.displayOrder || 0,
        createdBy: req.user?.id || null,
      };

      const category = await CategoryModel.create(categoryData);

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: { category },
      });
      } catch (error) {
        if (error.number === 2627) {
          // Vi phạm ràng buộc unique
        return res.status(409).json({
          success: false,
          message: "Category with this slug already exists",
        });
      }
      next(error);
    }
  }

  /**
   * Cập nhật danh mục
   */
  static async updateCategory(req, res, next) {
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
      const categoryId = parseInt(id);
      const category = await CategoryModel.findById(categoryId);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const updateData = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.parentCategoryId !== undefined) {
        // Kiểm tra: ngăn chặn tham chiếu vòng tròn (không thể set parent là chính nó hoặc con cháu của nó)
        const newParentId = req.body.parentCategoryId;
        if (newParentId === categoryId) {
          return res.status(400).json({
            success: false,
            message: "Category cannot be its own parent",
          });
        }
        // Kiểm tra xem parent mới có phải là con cháu không (sẽ tạo tham chiếu vòng tròn)
        if (newParentId) {
          let currentParent = await CategoryModel.findById(newParentId);
          const visited = new Set();
          while (currentParent && currentParent.ParentCategoryId) {
            if (currentParent.ParentCategoryId === categoryId) {
              return res.status(400).json({
                success: false,
                message: "Cannot set parent: would create circular reference",
              });
            }
            // Ngăn chặn vòng lặp vô hạn
            if (visited.has(currentParent.ParentCategoryId)) {
              break;
            }
            visited.add(currentParent.ParentCategoryId);
            currentParent = await CategoryModel.findById(currentParent.ParentCategoryId);
          }
        }
        updateData.parentCategoryId = req.body.parentCategoryId;
      }
      if (req.body.slug !== undefined) updateData.slug = req.body.slug;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      if (req.body.displayOrder !== undefined) updateData.displayOrder = req.body.displayOrder;
      updateData.updatedBy = req.user?.id || null;

      const updatedCategory = await CategoryModel.update(parseInt(id), updateData);

      res.json({
        success: true,
        message: "Category updated successfully",
        data: { category: updatedCategory },
      });
    } catch (error) {
      if (error.number === 2627) {
        // Vi phạm ràng buộc unique
        return res.status(409).json({
          success: false,
          message: "Category with this slug already exists",
        });
      }
      next(error);
    }
  }

  /**
   * Xóa danh mục
   */
  static async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      const category = await CategoryModel.findById(parseInt(id));

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      await CategoryModel.delete(parseInt(id));

      res.json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      if (error.number === 547) {
        // Vi phạm ràng buộc foreign key
        return res.status(409).json({
          success: false,
          message: "Cannot delete category: it has associated products or subcategories",
        });
      }
      next(error);
    }
  }
}

module.exports = CategoryController;
