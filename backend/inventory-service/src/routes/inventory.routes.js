const express = require("express");
const { body, param } = require("express-validator");
const InventoryController = require("../controllers/inventory.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

// Validation rules
const updateStockValidation = [
  param("branchId").isInt().withMessage("Branch ID must be an integer"),
  param("productId").isInt().withMessage("Product ID must be an integer"),
  body("quantityOnHand")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer"),
  body("reason").optional().trim().isLength({ max: 500 }),
];

const transferValidation = [
  body("fromBranchId")
    .isInt()
    .withMessage("From branch ID must be an integer"),
  body("toBranchId").isInt().withMessage("To branch ID must be an integer"),
  body("productId").isInt().withMessage("Product ID must be an integer"),
  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("reason").optional().trim().isLength({ max: 500 }),
];

const reserveValidation = [
  body("branchId").isInt().withMessage("Branch ID must be an integer"),
  body("productId").isInt().withMessage("Product ID must be an integer"),
  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("orderId").trim().notEmpty().withMessage("Order ID is required"),
];

const releaseReserveValidation = [
  body("branchId").isInt().withMessage("Branch ID must be an integer"),
  body("productId").isInt().withMessage("Product ID must be an integer"),
  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("orderId").trim().notEmpty().withMessage("Order ID is required"),
];

const updateAlertValidation = [
  body("status")
    .notEmpty()
    .isIn(["Active", "Resolved", "Ignored"])
    .withMessage("Status must be Active, Resolved, or Ignored"),
];

// Branch Inventory Routes
router.get(
  "/:branchId/products",
  InventoryController.getBranchInventory
);

// Product Availability Routes
router.get(
  "/product/:productId/availability",
  InventoryController.getProductAvailability
);

// Update Stock Level
router.put(
  "/:branchId/products/:productId",
  authenticate,
  authorize("ADMIN", "BRANCH_MANAGER", "WAREHOUSE_STAFF"),
  updateStockValidation,
  InventoryController.updateStockLevel
);

// Transfer Inventory
router.post(
  "/transfer",
  authenticate,
  authorize("ADMIN", "BRANCH_MANAGER", "WAREHOUSE_STAFF"),
  transferValidation,
  InventoryController.transferInventory
);

// Reserve Inventory
router.post(
  "/reserve",
  authenticate,
  authorize("ADMIN", "ORDER_MANAGER", "WAREHOUSE_STAFF"),
  reserveValidation,
  InventoryController.reserveInventory
);

// Release Reserve
router.post(
  "/release-reserve",
  authenticate,
  authorize("ADMIN", "ORDER_MANAGER", "WAREHOUSE_STAFF"),
  releaseReserveValidation,
  InventoryController.releaseReserve
);

// Stock Alerts Routes
router.get("/alerts", InventoryController.getAlerts);

router.get("/alerts/:alertId", InventoryController.getAlertById);

router.put(
  "/alerts/:alertId",
  authenticate,
  authorize("ADMIN", "BRANCH_MANAGER", "WAREHOUSE_STAFF"),
  updateAlertValidation,
  InventoryController.updateAlert
);

// Product History
router.get(
  "/products/:productId/history",
  InventoryController.getProductHistory
);

// Branch Report
router.get(
  "/branches/:branchId/report",
  authenticate,
  authorize("ADMIN", "BRANCH_MANAGER", "REPORT_VIEWER"),
  InventoryController.getBranchReport
);

module.exports = router;
