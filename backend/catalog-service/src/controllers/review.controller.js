const ReviewModel = require("../models/review.model");
const { validationResult } = require("express-validator");

class ReviewController {
  /**
   * Get all reviews for a product
   */
  static async getProductReviews(req, res, next) {
    try {
      const { productId } = req.params;
      const { page = 1, limit = 10, isApproved } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
      };

      if (isApproved !== undefined) {
        options.isApproved = isApproved === "true" || isApproved === "1";
      }

      const reviews = await ReviewModel.findByProductId(productId, options);
      const total = await ReviewModel.countByProductId(productId, options);
      const ratingSummary = await ReviewModel.getAverageRating(productId);
      const ratingDistribution = await ReviewModel.getRatingDistribution(productId);

      res.json({
        success: true,
        data: {
          reviews,
          pagination: {
            page: options.page,
            limit: options.limit,
            total,
            totalPages: Math.ceil(total / options.limit),
          },
          ratingSummary,
          ratingDistribution,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get review by ID
   */
  static async getReviewById(req, res, next) {
    try {
      const { id } = req.params;
      const review = await ReviewModel.findById(id);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      res.json({
        success: true,
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new review
   */
  static async createReview(req, res, next) {
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
      const reviewData = {
        productId,
        userId: req.user?.id || req.body.userId, // From auth middleware or body
        rating: parseInt(req.body.rating),
        title: req.body.title || null,
        comment: req.body.comment || null,
        isVerifiedPurchase: req.body.isVerifiedPurchase || false,
        isApproved: req.body.isApproved || false, // Default false, needs admin approval
      };

      const review = await ReviewModel.create(reviewData);

      res.status(201).json({
        success: true,
        message: "Review created successfully. It will be visible after approval.",
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update review
   */
  static async updateReview(req, res, next) {
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
      const review = await ReviewModel.findById(id);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      const updateData = {};
      if (req.body.rating !== undefined) updateData.rating = parseInt(req.body.rating);
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.comment !== undefined) updateData.comment = req.body.comment;
      if (req.body.isApproved !== undefined) updateData.isApproved = req.body.isApproved;
      if (req.body.isHelpful !== undefined) updateData.isHelpful = parseInt(req.body.isHelpful);

      const updatedReview = await ReviewModel.update(id, updateData);

      res.json({
        success: true,
        message: "Review updated successfully",
        data: { review: updatedReview },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete review
   */
  static async deleteReview(req, res, next) {
    try {
      const { id } = req.params;
      const review = await ReviewModel.findById(id);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      await ReviewModel.delete(id);

      res.json({
        success: true,
        message: "Review deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product rating summary
   */
  static async getProductRatingSummary(req, res, next) {
    try {
      const { productId } = req.params;
      const ratingSummary = await ReviewModel.getAverageRating(productId);
      const ratingDistribution = await ReviewModel.getRatingDistribution(productId);

      res.json({
        success: true,
        data: {
          ratingSummary,
          ratingDistribution,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReviewController;




