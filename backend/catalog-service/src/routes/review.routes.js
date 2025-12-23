const express = require("express");
const { body } = require("express-validator");
const ReviewController = require("../controllers/review.controller");

const router = express.Router();

// Validation rules
const createReviewValidation = [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("title").optional().trim().isLength({ max: 255 }).withMessage("Title must be less than 255 characters"),
  body("comment").optional().trim().isLength({ max: 2000 }).withMessage("Comment must be less than 2000 characters"),
  body("isVerifiedPurchase").optional().isBoolean().withMessage("isVerifiedPurchase must be a boolean"),
];

const updateReviewValidation = [
  body("rating").optional().isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("title").optional().trim().isLength({ max: 255 }).withMessage("Title must be less than 255 characters"),
  body("comment").optional().trim().isLength({ max: 2000 }).withMessage("Comment must be less than 2000 characters"),
  body("isApproved").optional().isBoolean().withMessage("isApproved must be a boolean"),
  body("isHelpful").optional().isInt({ min: 0 }).withMessage("isHelpful must be a non-negative integer"),
];

// Routes
router.get("/:productId/reviews", ReviewController.getProductReviews);
router.get("/:productId/reviews/rating", ReviewController.getProductRatingSummary);
router.get("/reviews/:id", ReviewController.getReviewById);
router.post("/:productId/reviews", createReviewValidation, ReviewController.createReview);
router.put("/reviews/:id", updateReviewValidation, ReviewController.updateReview);
router.delete("/reviews/:id", ReviewController.deleteReview);

module.exports = router;




