const BranchInventoryModel = require("../models/branchInventory.model");
const StockMovementsModel = require("../models/stockMovements.model");
const StockAlertsModel = require("../models/stockAlerts.model");
const { validationResult } = require("express-validator");

class InventoryController {
  /**
   * Lấy inventory của một chi nhánh
   * GET /api/inventory/:branchId/products
   */
  static async getBranchInventory(req, res, next) {
    try {
      const { branchId } = req.params;
      const { page = 1, limit = 20, lowStockOnly = false } = req.query;

      const options = {
        branchId: parseInt(branchId),
        page: parseInt(page),
        limit: parseInt(limit),
        lowStockOnly: lowStockOnly === "true",
      };

      const inventory = await BranchInventoryModel.findAll(options);

      res.json({
        success: true,
        data: {
          inventory,
          count: inventory.length,
          page: parseInt(page),
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Kiểm tra availability của sản phẩm trên tất cả chi nhánh
   * GET /api/inventory/product/:productId/availability
   */
  static async getProductAvailability(req, res, next) {
    try {
      const { productId } = req.params;

      const availability = await BranchInventoryModel.getProductAvailability(
        parseInt(productId)
      );

      if (!availability || availability.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found in any branch",
        });
      }

      // Tính tổng availability
      const totalAvailable = availability.reduce(
        (sum, item) => sum + item.QuantityAvailable,
        0
      );

      res.json({
        success: true,
        data: {
          productId: parseInt(productId),
          totalAvailable,
          branches: availability,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cập nhật stock của sản phẩm tại chi nhánh
   * PUT /api/inventory/:branchId/products/:productId
   */
  static async updateStockLevel(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { branchId, productId } = req.params;
      const { quantityOnHand, reason } = req.body;
      const userId = req.user?.id;

      // Tìm inventory hiện tại
      const currentInventory = await BranchInventoryModel.findByBranchAndProduct(
        parseInt(branchId),
        parseInt(productId)
      );

      if (!currentInventory) {
        return res.status(404).json({
          success: false,
          message: "Inventory not found",
        });
      }

      const oldQuantity = currentInventory.QuantityOnHand;
      const quantityChange = quantityOnHand - oldQuantity;

      // Cập nhật inventory
      const updatedInventory = await BranchInventoryModel.update(
        currentInventory.Id,
        { quantityOnHand }
      );

      // Ghi nhận stock movement
      if (quantityChange !== 0) {
        const movementType =
          quantityChange > 0 ? "RESTOCK" : "ADJUSTMENT";
        await StockMovementsModel.create({
          branchId: parseInt(branchId),
          productId: parseInt(productId),
          movementType,
          quantity: Math.abs(quantityChange),
          reason: reason || "Manual adjustment",
          balanceBefore: oldQuantity,
          balanceAfter: quantityOnHand,
          createdBy: userId,
        });
      }

      // Kiểm tra và cập nhật low stock alerts
      await StockAlertsModel.checkAndCreateLowStockAlerts();

      res.json({
        success: true,
        message: "Stock updated successfully",
        data: { inventory: updatedInventory },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Chuyển inventory giữa các chi nhánh
   * POST /api/inventory/transfer
   */
  static async transferInventory(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { fromBranchId, toBranchId, productId, quantity, reason } =
        req.body;
      const userId = req.user?.id;

      // Kiểm tra source inventory
      const sourceInventory = await BranchInventoryModel.findByBranchAndProduct(
        parseInt(fromBranchId),
        parseInt(productId)
      );

      if (!sourceInventory) {
        return res.status(404).json({
          success: false,
          message: "Source inventory not found",
        });
      }

      if (sourceInventory.QuantityAvailable < quantity) {
        return res.status(400).json({
          success: false,
          message: "Insufficient inventory for transfer",
          available: sourceInventory.QuantityAvailable,
          requested: quantity,
        });
      }

      // Kiểm tra destination inventory
      let targetInventory = await BranchInventoryModel.findByBranchAndProduct(
        parseInt(toBranchId),
        parseInt(productId)
      );

      // Nếu không tồn tại, tạo mới
      if (!targetInventory) {
        targetInventory = await BranchInventoryModel.create({
          branchId: parseInt(toBranchId),
          productId: parseInt(productId),
          quantityOnHand: 0,
        });
      }

      // Cập nhật source
      const updatedSource = await BranchInventoryModel.update(
        sourceInventory.Id,
        {
          quantityOnHand: sourceInventory.QuantityOnHand - quantity,
        }
      );

      // Cập nhật target
      const updatedTarget = await BranchInventoryModel.update(
        targetInventory.Id,
        {
          quantityOnHand: targetInventory.QuantityOnHand + quantity,
        }
      );

      // Ghi nhận movements
      const transferId = `TRANSFER-${Date.now()}`;
      await StockMovementsModel.create({
        branchId: parseInt(fromBranchId),
        productId: parseInt(productId),
        movementType: "TRANSFER_OUT",
        quantity,
        reason: reason || `Transfer to branch ${toBranchId}`,
        referenceId: transferId,
        balanceBefore: sourceInventory.QuantityOnHand,
        balanceAfter: updatedSource.QuantityOnHand,
        createdBy: userId,
      });

      await StockMovementsModel.create({
        branchId: parseInt(toBranchId),
        productId: parseInt(productId),
        movementType: "TRANSFER_IN",
        quantity,
        reason: reason || `Transfer from branch ${fromBranchId}`,
        referenceId: transferId,
        balanceBefore: targetInventory.QuantityOnHand,
        balanceAfter: updatedTarget.QuantityOnHand,
        createdBy: userId,
      });

      res.json({
        success: true,
        message: "Inventory transferred successfully",
        data: {
          transfer: {
            from: updatedSource,
            to: updatedTarget,
            quantity,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Đặt trữ inventory cho order
   * POST /api/inventory/reserve
   */
  static async reserveInventory(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { branchId, productId, quantity, orderId } = req.body;
      const userId = req.user?.id;

      // Tìm inventory
      const inventory = await BranchInventoryModel.findByBranchAndProduct(
        parseInt(branchId),
        parseInt(productId)
      );

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: "Inventory not found",
        });
      }

      if (inventory.QuantityAvailable < quantity) {
        return res.status(400).json({
          success: false,
          message: "Insufficient inventory for reservation",
          available: inventory.QuantityAvailable,
          requested: quantity,
        });
      }

      // Cập nhật reserved quantity
      const updatedInventory = await BranchInventoryModel.update(
        inventory.Id,
        {
          quantityReserved: inventory.QuantityReserved + quantity,
        }
      );

      // Ghi nhận movement
      await StockMovementsModel.create({
        branchId: parseInt(branchId),
        productId: parseInt(productId),
        movementType: "RESERVE",
        quantity,
        reason: `Reserved for order ${orderId}`,
        referenceId: orderId,
        balanceBefore: inventory.QuantityAvailable,
        balanceAfter: updatedInventory.QuantityAvailable,
        createdBy: userId,
      });

      res.json({
        success: true,
        message: "Inventory reserved successfully",
        data: { inventory: updatedInventory },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Giải phóng đặt trữ inventory
   * POST /api/inventory/release-reserve
   */
  static async releaseReserve(req, res, next) {
    try {
      const { branchId, productId, quantity, orderId } = req.body;
      const userId = req.user?.id;

      const inventory = await BranchInventoryModel.findByBranchAndProduct(
        parseInt(branchId),
        parseInt(productId)
      );

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: "Inventory not found",
        });
      }

      if (inventory.QuantityReserved < quantity) {
        return res.status(400).json({
          success: false,
          message: "Cannot release more than reserved",
          reserved: inventory.QuantityReserved,
          requested: quantity,
        });
      }

      const updatedInventory = await BranchInventoryModel.update(
        inventory.Id,
        {
          quantityReserved: inventory.QuantityReserved - quantity,
        }
      );

      await StockMovementsModel.create({
        branchId: parseInt(branchId),
        productId: parseInt(productId),
        movementType: "RELEASE_RESERVE",
        quantity,
        reason: `Released from order ${orderId}`,
        referenceId: orderId,
        balanceBefore: inventory.QuantityReserved,
        balanceAfter: updatedInventory.QuantityReserved,
        createdBy: userId,
      });

      res.json({
        success: true,
        message: "Reservation released successfully",
        data: { inventory: updatedInventory },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy tất cả stock alerts
   * GET /api/inventory/alerts
   */
  static async getAlerts(req, res, next) {
    try {
      const { branchId, productId, status = "Active", page = 1, limit = 20 } =
        req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
      };

      if (branchId) {
        options.branchId = parseInt(branchId);
      }

      if (productId) {
        options.productId = parseInt(productId);
      }

      const alerts = await StockAlertsModel.findAll(options);

      res.json({
        success: true,
        data: {
          alerts,
          count: alerts.length,
          page: parseInt(page),
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy alert theo ID
   * GET /api/inventory/alerts/:alertId
   */
  static async getAlertById(req, res, next) {
    try {
      const { alertId } = req.params;
      const alert = await StockAlertsModel.findById(alertId);

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: "Alert not found",
        });
      }

      res.json({
        success: true,
        data: { alert },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cập nhật alert status
   * PUT /api/inventory/alerts/:alertId
   */
  static async updateAlert(req, res, next) {
    try {
      const { alertId } = req.params;
      const { status } = req.body;

      if (!["Active", "Resolved", "Ignored"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be Active, Resolved, or Ignored",
        });
      }

      const updatedAlert = await StockAlertsModel.update(alertId, { status });

      if (!updatedAlert) {
        return res.status(404).json({
          success: false,
          message: "Alert not found",
        });
      }

      res.json({
        success: true,
        message: "Alert updated successfully",
        data: { alert: updatedAlert },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy lịch sử movements của sản phẩm
   * GET /api/inventory/products/:productId/history
   */
  static async getProductHistory(req, res, next) {
    try {
      const { productId } = req.params;
      const { limit = 50 } = req.query;

      const history = await StockMovementsModel.getProductHistory(
        parseInt(productId),
        { limit: parseInt(limit) }
      );

      res.json({
        success: true,
        data: {
          productId: parseInt(productId),
          history,
          count: history.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy report movements của chi nhánh
   * GET /api/inventory/branches/:branchId/report
   */
  static async getBranchReport(req, res, next) {
    try {
      const { branchId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "startDate and endDate are required",
        });
      }

      const report = await StockMovementsModel.getBranchMovementReport(
        parseInt(branchId),
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        data: {
          branchId: parseInt(branchId),
          period: { startDate, endDate },
          report,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InventoryController;
