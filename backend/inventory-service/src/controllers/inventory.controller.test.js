/**
 * Unit Tests for Inventory Controller
 */

const request = require("supertest");
const express = require("express");
const InventoryController = require("../controllers/inventory.controller");
const BranchInventoryModel = require("../models/branchInventory.model");
const StockAlertsModel = require("../models/stockAlerts.model");

// Mock the models
jest.mock("../models/branchInventory.model");
jest.mock("../models/stockMovements.model");
jest.mock("../models/stockAlerts.model");

describe("InventoryController", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();
  });

  describe("GET /api/inventory/:branchId/products", () => {
    it("should return branch inventory", async () => {
      const mockInventory = [
        {
          Id: "id-1",
          BranchId: 1,
          ProductId: 101,
          QuantityOnHand: 100,
          QuantityAvailable: 90,
        },
      ];

      BranchInventoryModel.findAll.mockResolvedValue(mockInventory);

      app.get(
        "/api/inventory/:branchId/products",
        InventoryController.getBranchInventory
      );

      const response = await request(app).get("/api/inventory/1/products");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inventory).toEqual(mockInventory);
    });

    it("should handle pagination", async () => {
      const mockInventory = [];
      BranchInventoryModel.findAll.mockResolvedValue(mockInventory);

      app.get(
        "/api/inventory/:branchId/products",
        InventoryController.getBranchInventory
      );

      const response = await request(app)
        .get("/api/inventory/1/products")
        .query({ page: 2, limit: 10 });

      expect(response.status).toBe(200);
      expect(BranchInventoryModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
        })
      );
    });

    it("should filter by lowStockOnly", async () => {
      const mockInventory = [];
      BranchInventoryModel.findAll.mockResolvedValue(mockInventory);

      app.get(
        "/api/inventory/:branchId/products",
        InventoryController.getBranchInventory
      );

      const response = await request(app)
        .get("/api/inventory/1/products")
        .query({ lowStockOnly: "true" });

      expect(response.status).toBe(200);
      expect(BranchInventoryModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          lowStockOnly: true,
        })
      );
    });
  });

  describe("GET /api/inventory/product/:productId/availability", () => {
    it("should return product availability across branches", async () => {
      const mockAvailability = [
        { BranchId: 1, BranchName: "Branch 1", QuantityAvailable: 100 },
        { BranchId: 2, BranchName: "Branch 2", QuantityAvailable: 50 },
      ];

      BranchInventoryModel.getProductAvailability.mockResolvedValue(
        mockAvailability
      );

      app.get(
        "/api/inventory/product/:productId/availability",
        InventoryController.getProductAvailability
      );

      const response = await request(app).get("/api/inventory/product/101/availability");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAvailable).toBe(150);
      expect(response.body.data.branches).toEqual(mockAvailability);
    });

    it("should return 404 if product not found in any branch", async () => {
      BranchInventoryModel.getProductAvailability.mockResolvedValue([]);

      app.get(
        "/api/inventory/product/:productId/availability",
        InventoryController.getProductAvailability
      );

      const response = await request(app).get("/api/inventory/product/999/availability");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/inventory/alerts", () => {
    it("should return stock alerts", async () => {
      const mockAlerts = [
        {
          Id: "alert-1",
          BranchId: 1,
          ProductId: 101,
          AlertType: "LOW_STOCK",
          Status: "Active",
        },
      ];

      StockAlertsModel.findAll.mockResolvedValue(mockAlerts);

      app.get("/api/inventory/alerts", InventoryController.getAlerts);

      const response = await request(app).get("/api/inventory/alerts");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toEqual(mockAlerts);
    });

    it("should filter alerts by status", async () => {
      const mockAlerts = [];
      StockAlertsModel.findAll.mockResolvedValue(mockAlerts);

      app.get("/api/inventory/alerts", InventoryController.getAlerts);

      const response = await request(app)
        .get("/api/inventory/alerts")
        .query({ status: "Resolved" });

      expect(response.status).toBe(200);
      expect(StockAlertsModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "Resolved",
        })
      );
    });

    it("should filter alerts by branch", async () => {
      const mockAlerts = [];
      StockAlertsModel.findAll.mockResolvedValue(mockAlerts);

      app.get("/api/inventory/alerts", InventoryController.getAlerts);

      const response = await request(app)
        .get("/api/inventory/alerts")
        .query({ branchId: "1" });

      expect(response.status).toBe(200);
      expect(StockAlertsModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: 1,
        })
      );
    });
  });

  describe("PUT /api/inventory/alerts/:alertId", () => {
    it("should update alert status", async () => {
      const updatedAlert = {
        Id: "alert-1",
        Status: "Resolved",
      };

      StockAlertsModel.update.mockResolvedValue(updatedAlert);

      app.put(
        "/api/inventory/alerts/:alertId",
        InventoryController.updateAlert
      );

      const response = await request(app)
        .put("/api/inventory/alerts/alert-1")
        .send({ status: "Resolved" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alert).toEqual(updatedAlert);
    });

    it("should validate status value", async () => {
      app.put(
        "/api/inventory/alerts/:alertId",
        InventoryController.updateAlert
      );

      const response = await request(app)
        .put("/api/inventory/alerts/alert-1")
        .send({ status: "InvalidStatus" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 404 if alert not found", async () => {
      StockAlertsModel.update.mockResolvedValue(null);

      app.put(
        "/api/inventory/alerts/:alertId",
        InventoryController.updateAlert
      );

      const response = await request(app)
        .put("/api/inventory/alerts/non-existent")
        .send({ status: "Resolved" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
