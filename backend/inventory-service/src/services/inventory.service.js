const BranchInventoryModel = require("../models/branchInventory.model");
const StockMovementsModel = require("../models/stockMovements.model");
const StockAlertsModel = require("../models/stockAlerts.model");
const catalogServiceClient = require("./catalogService.client");
const orderServiceClient = require("./orderService.client");

class InventoryService {
  /**
   * Thêm stock cho sản phẩm tại chi nhánh
   */
  static async addStock(branchId, productId, quantity, reason = "Manual restock", userId = null) {
    try {
      // Kiểm tra sản phẩm có tồn tại không
      const productExists = await catalogServiceClient.productExists(productId);
      if (!productExists) {
        throw new Error(`Product ${productId} not found`);
      }

      // Tìm hoặc tạo inventory
      let inventory = await BranchInventoryModel.findByBranchAndProduct(
        branchId,
        productId
      );

      if (!inventory) {
        inventory = await BranchInventoryModel.create({
          branchId,
          productId,
          quantityOnHand: quantity,
          minimumStockLevel: 10,
        });
      } else {
        inventory = await BranchInventoryModel.update(inventory.Id, {
          quantityOnHand: inventory.QuantityOnHand + quantity,
        });
      }

      // Ghi nhận movement
      await StockMovementsModel.create({
        branchId,
        productId,
        movementType: "RESTOCK",
        quantity,
        reason,
        balanceBefore: inventory.QuantityOnHand - quantity,
        balanceAfter: inventory.QuantityOnHand,
        createdBy: userId,
      });

      // Kiểm tra và xóa low stock alerts nếu có
      const alerts = await StockAlertsModel.findAll({
        branchId,
        productId,
        status: "Active",
      });

      for (const alert of alerts) {
        if (alert.AlertType === "LOW_STOCK" && inventory.QuantityAvailable > alert.ThresholdLevel) {
          await StockAlertsModel.update(alert.Id, { status: "Resolved" });
        }
      }

      // Thông báo cho order service
      await orderServiceClient.notifyStockAvailable(productId, branchId, inventory.QuantityAvailable);

      return inventory;
    } catch (error) {
      console.error("Error adding stock:", error.message);
      throw error;
    }
  }

  /**
   * Kiểm tra stock và xử lý low stock alerts
   */
  static async checkAndHandleLowStock(branchId, productId) {
    try {
      const inventory = await BranchInventoryModel.findByBranchAndProduct(
        branchId,
        productId
      );

      if (!inventory) {
        return null;
      }

      // Nếu stock dưới mức tối thiểu
      if (inventory.QuantityAvailable <= inventory.MinimumStockLevel) {
        // Kiểm tra xem đã có alert chưa
        const existingAlert = await StockAlertsModel.findAll({
          branchId,
          productId,
          status: "Active",
        });

        if (existingAlert.length === 0) {
          // Tạo alert mới
          await StockAlertsModel.create({
            branchId,
            productId,
            alertType: "LOW_STOCK",
            currentStock: inventory.QuantityAvailable,
            thresholdLevel: inventory.MinimumStockLevel,
          });
        }

        // Thông báo cho order service
        if (inventory.QuantityAvailable === 0) {
          await orderServiceClient.notifyOutOfStock(productId, branchId);
        }
      }

      return inventory;
    } catch (error) {
      console.error("Error checking low stock:", error.message);
      throw error;
    }
  }

  /**
   * Reserve stock cho order
   */
  static async reserveForOrder(branchId, productId, quantity, orderId, userId = null) {
    try {
      // Kiểm tra order có tồn tại không
      const orderExists = await orderServiceClient.orderExists(orderId);
      if (!orderExists) {
        throw new Error(`Order ${orderId} not found`);
      }

      const inventory = await BranchInventoryModel.findByBranchAndProduct(
        branchId,
        productId
      );

      if (!inventory) {
        throw new Error(
          `Inventory not found for product ${productId} in branch ${branchId}`
        );
      }

      if (inventory.QuantityAvailable < quantity) {
        throw new Error(
          `Insufficient inventory. Available: ${inventory.QuantityAvailable}, Requested: ${quantity}`
        );
      }

      const updatedInventory = await BranchInventoryModel.update(
        inventory.Id,
        {
          quantityReserved: inventory.QuantityReserved + quantity,
        }
      );

      await StockMovementsModel.create({
        branchId,
        productId,
        movementType: "RESERVE",
        quantity,
        reason: `Reserved for order ${orderId}`,
        referenceId: orderId,
        balanceBefore: inventory.QuantityAvailable,
        balanceAfter: updatedInventory.QuantityAvailable,
        createdBy: userId,
      });

      return updatedInventory;
    } catch (error) {
      console.error("Error reserving inventory:", error.message);
      throw error;
    }
  }

  /**
   * Giải phóng reserved stock
   */
  static async releaseReservedStock(branchId, productId, quantity, orderId, userId = null) {
    try {
      const inventory = await BranchInventoryModel.findByBranchAndProduct(
        branchId,
        productId
      );

      if (!inventory) {
        throw new Error(
          `Inventory not found for product ${productId} in branch ${branchId}`
        );
      }

      if (inventory.QuantityReserved < quantity) {
        throw new Error(
          `Cannot release more than reserved. Reserved: ${inventory.QuantityReserved}, Release: ${quantity}`
        );
      }

      const updatedInventory = await BranchInventoryModel.update(
        inventory.Id,
        {
          quantityReserved: inventory.QuantityReserved - quantity,
        }
      );

      await StockMovementsModel.create({
        branchId,
        productId,
        movementType: "RELEASE_RESERVE",
        quantity,
        reason: `Released from order ${orderId}`,
        referenceId: orderId,
        balanceBefore: inventory.QuantityReserved,
        balanceAfter: updatedInventory.QuantityReserved,
        createdBy: userId,
      });

      return updatedInventory;
    } catch (error) {
      console.error("Error releasing reserved inventory:", error.message);
      throw error;
    }
  }

  /**
   * Consume (giảm) stock khi order hoàn thành
   */
  static async consumeStock(branchId, productId, quantity, orderId, userId = null) {
    try {
      const inventory = await BranchInventoryModel.findByBranchAndProduct(
        branchId,
        productId
      );

      if (!inventory) {
        throw new Error(
          `Inventory not found for product ${productId} in branch ${branchId}`
        );
      }

      // Kiểm tra có đủ reserved stock không
      if (inventory.QuantityReserved < quantity) {
        throw new Error(
          `Insufficient reserved stock. Reserved: ${inventory.QuantityReserved}, Required: ${quantity}`
        );
      }

      const updatedInventory = await BranchInventoryModel.update(
        inventory.Id,
        {
          quantityOnHand: inventory.QuantityOnHand - quantity,
          quantityReserved: inventory.QuantityReserved - quantity,
        }
      );

      await StockMovementsModel.create({
        branchId,
        productId,
        movementType: "SALE",
        quantity,
        reason: `Sold in order ${orderId}`,
        referenceId: orderId,
        balanceBefore: inventory.QuantityOnHand,
        balanceAfter: updatedInventory.QuantityOnHand,
        createdBy: userId,
      });

      // Kiểm tra low stock sau khi consume
      await this.checkAndHandleLowStock(branchId, productId);

      return updatedInventory;
    } catch (error) {
      console.error("Error consuming stock:", error.message);
      throw error;
    }
  }

  /**
   * Transfer stock giữa các chi nhánh
   */
  static async transferStock(fromBranchId, toBranchId, productId, quantity, reason = "Branch transfer", userId = null) {
    try {
      const sourceInventory = await BranchInventoryModel.findByBranchAndProduct(
        fromBranchId,
        productId
      );

      if (!sourceInventory) {
        throw new Error(
          `Source inventory not found for product ${productId} in branch ${fromBranchId}`
        );
      }

      if (sourceInventory.QuantityAvailable < quantity) {
        throw new Error(
          `Insufficient inventory for transfer. Available: ${sourceInventory.QuantityAvailable}, Requested: ${quantity}`
        );
      }

      // Kiểm tra sản phẩm có tồn tại không
      const productExists = await catalogServiceClient.productExists(productId);
      if (!productExists) {
        throw new Error(`Product ${productId} not found`);
      }

      // Cập nhật source
      const updatedSource = await BranchInventoryModel.update(
        sourceInventory.Id,
        {
          quantityOnHand: sourceInventory.QuantityOnHand - quantity,
        }
      );

      // Tìm hoặc tạo target inventory
      let targetInventory = await BranchInventoryModel.findByBranchAndProduct(
        toBranchId,
        productId
      );

      if (!targetInventory) {
        targetInventory = await BranchInventoryModel.create({
          branchId: toBranchId,
          productId,
          quantityOnHand: quantity,
        });
      } else {
        targetInventory = await BranchInventoryModel.update(targetInventory.Id, {
          quantityOnHand: targetInventory.QuantityOnHand + quantity,
        });
      }

      // Ghi nhận movements
      const transferId = `TRANSFER-${Date.now()}`;

      await StockMovementsModel.create({
        branchId: fromBranchId,
        productId,
        movementType: "TRANSFER_OUT",
        quantity,
        reason: `${reason} - To branch ${toBranchId}`,
        referenceId: transferId,
        balanceBefore: sourceInventory.QuantityOnHand,
        balanceAfter: updatedSource.QuantityOnHand,
        createdBy: userId,
      });

      await StockMovementsModel.create({
        branchId: toBranchId,
        productId,
        movementType: "TRANSFER_IN",
        quantity,
        reason: `${reason} - From branch ${fromBranchId}`,
        referenceId: transferId,
        balanceBefore: targetInventory.QuantityOnHand - quantity,
        balanceAfter: targetInventory.QuantityOnHand,
        createdBy: userId,
      });

      return {
        from: updatedSource,
        to: targetInventory,
      };
    } catch (error) {
      console.error("Error transferring stock:", error.message);
      throw error;
    }
  }

  /**
   * Lấy total stock của sản phẩm trên tất cả chi nhánh
   */
  static async getTotalStock(productId) {
    try {
      const availability = await BranchInventoryModel.getProductAvailability(productId);

      if (!availability || availability.length === 0) {
        return 0;
      }

      return availability.reduce((sum, item) => sum + item.QuantityAvailable, 0);
    } catch (error) {
      console.error("Error getting total stock:", error.message);
      throw error;
    }
  }

  /**
   * Lấy best branches cho fulfillment (chi nhánh có stock nhiều nhất)
   */
  static async getBestBranchesForFulfillment(productId, quantity, limit = 3) {
    try {
      const availability = await BranchInventoryModel.getProductAvailability(productId);

      if (!availability || availability.length === 0) {
        return [];
      }

      // Filter branches có đủ stock
      const suitable = availability
        .filter((item) => item.QuantityAvailable >= quantity)
        .sort((a, b) => b.QuantityAvailable - a.QuantityAvailable)
        .slice(0, limit);

      return suitable;
    } catch (error) {
      console.error("Error getting best branches:", error.message);
      throw error;
    }
  }
}

module.exports = InventoryService;
