/**
 * Unit Tests for BranchInventory Model
 */

const BranchInventoryModel = require("../models/branchInventory.model");
const db = require("../config/database");

// Mock the database
jest.mock("../config/database");

describe("BranchInventoryModel", () => {
  const mockRequest = {
    input: jest.fn().mockReturnThis(),
    query: jest.fn(),
  };

  const mockPool = {
    request: jest.fn().mockReturnValue(mockRequest),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    db.getPool.mockResolvedValue(mockPool);
  });

  describe("findAll", () => {
    it("should return all inventory", async () => {
      const mockData = [
        {
          Id: "id-1",
          BranchId: 1,
          ProductId: 101,
          QuantityAvailable: 100,
        },
      ];

      mockRequest.query.mockResolvedValue({ recordset: mockData });

      const result = await BranchInventoryModel.findAll();

      expect(result).toEqual(mockData);
      expect(mockRequest.query).toHaveBeenCalled();
    });

    it("should filter by branchId", async () => {
      const mockData = [];
      mockRequest.query.mockResolvedValue({ recordset: mockData });

      await BranchInventoryModel.findAll({ branchId: 1 });

      expect(mockRequest.input).toHaveBeenCalledWith(
        "branchId",
        expect.anything(),
        1
      );
    });

    it("should support pagination", async () => {
      const mockData = [];
      mockRequest.query.mockResolvedValue({ recordset: mockData });

      await BranchInventoryModel.findAll({ page: 2, limit: 20 });

      expect(mockRequest.input).toHaveBeenCalledWith(
        "offset",
        expect.anything(),
        20
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "limit",
        expect.anything(),
        20
      );
    });

    it("should filter low stock only", async () => {
      const mockData = [];
      mockRequest.query.mockResolvedValue({ recordset: mockData });

      await BranchInventoryModel.findAll({ lowStockOnly: true });

      expect(mockRequest.query).toHaveBeenCalled();
      const queryCall = mockRequest.query.mock.calls[0][0];
      expect(queryCall).toContain("MinimumStockLevel");
    });
  });

  describe("findById", () => {
    it("should return inventory by id", async () => {
      const mockData = {
        Id: "id-1",
        BranchId: 1,
        ProductId: 101,
      };

      mockRequest.query.mockResolvedValue({ recordset: [mockData] });

      const result = await BranchInventoryModel.findById("id-1");

      expect(result).toEqual(mockData);
      expect(mockRequest.input).toHaveBeenCalledWith(
        "id",
        expect.anything(),
        "id-1"
      );
    });

    it("should return null if not found", async () => {
      mockRequest.query.mockResolvedValue({ recordset: [] });

      const result = await BranchInventoryModel.findById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("findByBranchAndProduct", () => {
    it("should find inventory by branch and product", async () => {
      const mockData = {
        Id: "id-1",
        BranchId: 1,
        ProductId: 101,
      };

      mockRequest.query.mockResolvedValue({ recordset: [mockData] });

      const result = await BranchInventoryModel.findByBranchAndProduct(1, 101);

      expect(result).toEqual(mockData);
      expect(mockRequest.input).toHaveBeenCalledWith(
        "branchId",
        expect.anything(),
        1
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "productId",
        expect.anything(),
        101
      );
    });

    it("should return null if not found", async () => {
      mockRequest.query.mockResolvedValue({ recordset: [] });

      const result = await BranchInventoryModel.findByBranchAndProduct(1, 999);

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create new inventory", async () => {
      const newInventory = {
        Id: "new-id",
        BranchId: 1,
        ProductId: 101,
        QuantityOnHand: 100,
      };

      mockRequest.query.mockResolvedValue({ recordset: [newInventory] });

      const result = await BranchInventoryModel.create({
        branchId: 1,
        productId: 101,
        quantityOnHand: 100,
      });

      expect(result).toEqual(newInventory);
      expect(mockRequest.input).toHaveBeenCalledWith(
        "branchId",
        expect.anything(),
        1
      );
      expect(mockRequest.input).toHaveBeenCalledWith(
        "productId",
        expect.anything(),
        101
      );
    });
  });

  describe("update", () => {
    it("should update inventory quantity", async () => {
      const updatedInventory = {
        Id: "id-1",
        QuantityOnHand: 200,
        QuantityAvailable: 180,
      };

      mockRequest.query.mockResolvedValue({ recordset: [updatedInventory] });

      const result = await BranchInventoryModel.update("id-1", {
        quantityOnHand: 200,
      });

      expect(result).toEqual(updatedInventory);
      expect(mockRequest.input).toHaveBeenCalledWith(
        "quantityOnHand",
        expect.anything(),
        200
      );
    });

    it("should update reserved quantity", async () => {
      const updatedInventory = {
        Id: "id-1",
        QuantityReserved: 50,
      };

      mockRequest.query.mockResolvedValue({ recordset: [updatedInventory] });

      await BranchInventoryModel.update("id-1", {
        quantityReserved: 50,
      });

      expect(mockRequest.input).toHaveBeenCalledWith(
        "quantityReserved",
        expect.anything(),
        50
      );
    });
  });

  describe("getProductAvailability", () => {
    it("should return product availability across branches", async () => {
      const mockAvailability = [
        { BranchId: 1, QuantityAvailable: 100 },
        { BranchId: 2, QuantityAvailable: 50 },
      ];

      mockRequest.query.mockResolvedValue({ recordset: mockAvailability });

      const result = await BranchInventoryModel.getProductAvailability(101);

      expect(result).toEqual(mockAvailability);
      expect(mockRequest.input).toHaveBeenCalledWith(
        "productId",
        expect.anything(),
        101
      );
    });

    it("should return empty array if product not in any branch", async () => {
      mockRequest.query.mockResolvedValue({ recordset: [] });

      const result = await BranchInventoryModel.getProductAvailability(999);

      expect(result).toEqual([]);
    });
  });
});
