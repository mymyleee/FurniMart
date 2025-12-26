/**
 * Unit Tests for Inventory Service
 * Note: These tests require jest and setup with mock database
 */

const InventoryService = require("../services/inventory.service");
const BranchInventoryModel = require("../models/branchInventory.model");
const StockMovementsModel = require("../models/stockMovements.model");
const StockAlertsModel = require("../models/stockAlerts.model");
const catalogServiceClient = require("../services/catalogService.client");
const orderServiceClient = require("../services/orderService.client");

// Mock the dependencies
jest.mock("../models/branchInventory.model");
jest.mock("../models/stockMovements.model");
jest.mock("../models/stockAlerts.model");
jest.mock("../services/catalogService.client");
jest.mock("../services/orderService.client");

describe("InventoryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addStock", () => {
    it("should add stock successfully", async () => {
      const mockInventory = {
        Id: "test-id",
        BranchId: 1,
        ProductId: 101,
        QuantityOnHand: 150,
        QuantityAvailable: 140,
      };

      catalogServiceClient.productExists.mockResolvedValue(true);
      BranchInventoryModel.findByBranchAndProduct.mockResolvedValue(null);
      BranchInventoryModel.create.mockResolvedValue(mockInventory);
      StockMovementsModel.create.mockResolvedValue({});
      StockAlertsModel.findAll.mockResolvedValue([]);
      orderServiceClient.notifyStockAvailable.mockResolvedValue({});

      const result = await InventoryService.addStock(1, 101, 100, "Test restock");

      expect(result).toEqual(mockInventory);
      expect(BranchInventoryModel.create).toHaveBeenCalled();
      expect(StockMovementsModel.create).toHaveBeenCalled();
    });

    it("should throw error if product not found", async () => {
      catalogServiceClient.productExists.mockResolvedValue(false);

      await expect(
        InventoryService.addStock(1, 101, 100, "Test restock")
      ).rejects.toThrow("Product 101 not found");
    });

    it("should update existing inventory", async () => {
      const existingInventory = {
        Id: "test-id",
        BranchId: 1,
        ProductId: 101,
        QuantityOnHand: 50,
      };

      const updatedInventory = {
        ...existingInventory,
        QuantityOnHand: 150,
      };

      catalogServiceClient.productExists.mockResolvedValue(true);
      BranchInventoryModel.findByBranchAndProduct.mockResolvedValue(
        existingInventory
      );
      BranchInventoryModel.update.mockResolvedValue(updatedInventory);
      StockMovementsModel.create.mockResolvedValue({});
      StockAlertsModel.findAll.mockResolvedValue([]);
      orderServiceClient.notifyStockAvailable.mockResolvedValue({});

      const result = await InventoryService.addStock(1, 101, 100);

      expect(result.QuantityOnHand).toBe(150);
      expect(BranchInventoryModel.update).toHaveBeenCalled();
    });
  });

  describe("checkAndHandleLowStock", () => {
    it("should create alert for low stock", async () => {
      const mockInventory = {
        Id: "test-id",
        BranchId: 1,
        ProductId: 101,
        QuantityAvailable: 5,
        MinimumStockLevel: 10,
      };

      BranchInventoryModel.findByBranchAndProduct.mockResolvedValue(
        mockInventory
      );
      StockAlertsModel.findAll.mockResolvedValue([]);
      StockAlertsModel.create.mockResolvedValue({});
      orderServiceClient.notifyOutOfStock.mockResolvedValue({});

      await InventoryService.checkAndHandleLowStock(1, 101);

      expect(StockAlertsModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: 1,
          productId: 101,
          alertType: "LOW_STOCK",
        })
      );
    });

    it("should not create duplicate alerts", async () => {
      const mockInventory = {
        Id: "test-id",
        BranchId: 1,
        ProductId: 101,
        QuantityAvailable: 5,
        MinimumStockLevel: 10,
      };

      const existingAlert = {
        Id: "alert-id",
        Status: "Active",
      };

      BranchInventoryModel.findByBranchAndProduct.mockResolvedValue(
        mockInventory
      );
      StockAlertsModel.findAll.mockResolvedValue([existingAlert]);

      await InventoryService.checkAndHandleLowStock(1, 101);

      expect(StockAlertsModel.create).not.toHaveBeenCalled();
    });
  });

  describe("reserveForOrder", () => {
    it("should reserve inventory successfully", async () => {
      const mockInventory = {
        Id: "test-id",
        BranchId: 1,
        ProductId: 101,
        QuantityAvailable: 50,
        QuantityReserved: 0,
      };

      const updatedInventory = {
        ...mockInventory,
        QuantityReserved: 10,
        QuantityAvailable: 40,
      };

      orderServiceClient.orderExists.mockResolvedValue(true);
      BranchInventoryModel.findByBranchAndProduct.mockResolvedValue(
        mockInventory
      );
      BranchInventoryModel.update.mockResolvedValue(updatedInventory);
      StockMovementsModel.create.mockResolvedValue({});

      const result = await InventoryService.reserveForOrder(
        1,
        101,
        10,
        "ORD-001"
      );

      expect(result.QuantityReserved).toBe(10);
      expect(BranchInventoryModel.update).toHaveBeenCalled();
    });

    it("should throw error if insufficient inventory", async () => {
      const mockInventory = {
        Id: "test-id",
        BranchId: 1,
        ProductId: 101,
        QuantityAvailable: 5,
      };

      orderServiceClient.orderExists.mockResolvedValue(true);
      BranchInventoryModel.findByBranchAndProduct.mockResolvedValue(
        mockInventory
      );

      await expect(
        InventoryService.reserveForOrder(1, 101, 10, "ORD-001")
      ).rejects.toThrow("Insufficient inventory");
    });

    it("should throw error if order not found", async () => {
      orderServiceClient.orderExists.mockResolvedValue(false);

      await expect(
        InventoryService.reserveForOrder(1, 101, 10, "ORD-001")
      ).rejects.toThrow("Order ORD-001 not found");
    });
  });

  describe("consumeStock", () => {
    it("should consume stock successfully", async () => {
      const mockInventory = {
        Id: "test-id",
        BranchId: 1,
        ProductId: 101,
        QuantityOnHand: 50,
        QuantityReserved: 10,
      };

      const updatedInventory = {
        ...mockInventory,
        QuantityOnHand: 40,
        QuantityReserved: 0,
      };

      BranchInventoryModel.findByBranchAndProduct.mockResolvedValue(
        mockInventory
      );
      BranchInventoryModel.update.mockResolvedValue(updatedInventory);
      StockMovementsModel.create.mockResolvedValue({});
      StockAlertsModel.findAll.mockResolvedValue([]);

      const result = await InventoryService.consumeStock(1, 101, 10, "ORD-001");

      expect(result.QuantityOnHand).toBe(40);
      expect(result.QuantityReserved).toBe(0);
    });

    it("should throw error if insufficient reserved stock", async () => {
      const mockInventory = {
        Id: "test-id",
        BranchId: 1,
        ProductId: 101,
        QuantityReserved: 5,
      };

      BranchInventoryModel.findByBranchAndProduct.mockResolvedValue(
        mockInventory
      );

      await expect(
        InventoryService.consumeStock(1, 101, 10, "ORD-001")
      ).rejects.toThrow("Insufficient reserved stock");
    });
  });

  describe("transferStock", () => {
    it("should transfer stock successfully", async () => {
      const sourceInventory = {
        Id: "source-id",
        BranchId: 1,
        ProductId: 101,
        QuantityOnHand: 100,
        QuantityAvailable: 100,
      };

      const targetInventory = {
        Id: "target-id",
        BranchId: 2,
        ProductId: 101,
        QuantityOnHand: 50,
      };

      const updatedSource = {
        ...sourceInventory,
        QuantityOnHand: 80,
      };

      const updatedTarget = {
        ...targetInventory,
        QuantityOnHand: 70,
      };

      BranchInventoryModel.findByBranchAndProduct
        .mockResolvedValueOnce(sourceInventory)
        .mockResolvedValueOnce(targetInventory);

      catalogServiceClient.productExists.mockResolvedValue(true);
      BranchInventoryModel.update
        .mockResolvedValueOnce(updatedSource)
        .mockResolvedValueOnce(updatedTarget);
      StockMovementsModel.create.mockResolvedValue({});

      const result = await InventoryService.transferStock(1, 2, 101, 20);

      expect(result.from.QuantityOnHand).toBe(80);
      expect(result.to.QuantityOnHand).toBe(70);
    });

    it("should create new inventory at target branch", async () => {
      const sourceInventory = {
        Id: "source-id",
        BranchId: 1,
        ProductId: 101,
        QuantityOnHand: 100,
        QuantityAvailable: 100,
      };

      const createdTarget = {
        Id: "target-id",
        BranchId: 2,
        ProductId: 101,
        QuantityOnHand: 20,
      };

      BranchInventoryModel.findByBranchAndProduct
        .mockResolvedValueOnce(sourceInventory)
        .mockResolvedValueOnce(null);

      catalogServiceClient.productExists.mockResolvedValue(true);
      BranchInventoryModel.update.mockResolvedValue({
        ...sourceInventory,
        QuantityOnHand: 80,
      });
      BranchInventoryModel.create.mockResolvedValue(createdTarget);
      StockMovementsModel.create.mockResolvedValue({});

      const result = await InventoryService.transferStock(1, 2, 101, 20);

      expect(BranchInventoryModel.create).toHaveBeenCalled();
      expect(result.to).toEqual(createdTarget);
    });
  });

  describe("getTotalStock", () => {
    it("should calculate total stock across all branches", async () => {
      const availability = [
        { BranchId: 1, QuantityAvailable: 100 },
        { BranchId: 2, QuantityAvailable: 50 },
        { BranchId: 3, QuantityAvailable: 75 },
      ];

      BranchInventoryModel.getProductAvailability.mockResolvedValue(
        availability
      );

      const total = await InventoryService.getTotalStock(101);

      expect(total).toBe(225);
    });

    it("should return 0 if product not in any branch", async () => {
      BranchInventoryModel.getProductAvailability.mockResolvedValue([]);

      const total = await InventoryService.getTotalStock(101);

      expect(total).toBe(0);
    });
  });

  describe("getBestBranchesForFulfillment", () => {
    it("should return branches with sufficient stock sorted by availability", async () => {
      const availability = [
        { BranchId: 1, QuantityAvailable: 100 },
        { BranchId: 2, QuantityAvailable: 50 },
        { BranchId: 3, QuantityAvailable: 150 },
        { BranchId: 4, QuantityAvailable: 20 },
      ];

      BranchInventoryModel.getProductAvailability.mockResolvedValue(
        availability
      );

      const result = await InventoryService.getBestBranchesForFulfillment(
        101,
        40,
        3
      );

      expect(result.length).toBe(3);
      expect(result[0].BranchId).toBe(3); // highest available
      expect(result[1].BranchId).toBe(1);
      expect(result[2].BranchId).toBe(2);
    });

    it("should only return branches with sufficient stock", async () => {
      const availability = [
        { BranchId: 1, QuantityAvailable: 100 },
        { BranchId: 2, QuantityAvailable: 20 },
        { BranchId: 3, QuantityAvailable: 50 },
      ];

      BranchInventoryModel.getProductAvailability.mockResolvedValue(
        availability
      );

      const result = await InventoryService.getBestBranchesForFulfillment(
        101,
        40
      );

      expect(result.length).toBe(2);
      expect(result.every((b) => b.QuantityAvailable >= 40)).toBe(true);
    });
  });
});
