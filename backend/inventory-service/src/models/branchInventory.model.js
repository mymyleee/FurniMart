const db = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class BranchInventoryModel {
  /**
   * Tìm tất cả inventory với bộ lọc
   */
  static async findAll(options = {}) {
    const pool = await db.getPool();
    let query = `
      SELECT 
        bi.Id,
        bi.BranchId,
        bi.ProductId,
        bi.QuantityOnHand,
        bi.QuantityReserved,
        bi.QuantityAvailable,
        bi.LastRestockDate,
        bi.UpdatedAt,
        b.Name as BranchName,
        b.Location as BranchLocation
      FROM BranchInventory bi
      LEFT JOIN Branches b ON bi.BranchId = b.Id
      WHERE 1=1
    `;
    const request = pool.request();

    if (options.branchId) {
      query += " AND bi.BranchId = @branchId";
      request.input("branchId", db.sql.Int, options.branchId);
    }

    if (options.productId) {
      query += " AND bi.ProductId = @productId";
      request.input("productId", db.sql.Int, options.productId);
    }

    if (options.lowStockOnly) {
      query +=
        " AND bi.QuantityAvailable <= bi.MinimumStockLevel";
    }

    // Sắp xếp
    const sortBy = options.sortBy || "UpdatedAt";
    const sortOrder =
      options.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Phân trang
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    request.input("offset", db.sql.Int, offset);
    request.input("limit", db.sql.Int, limit);

    const result = await request.query(query);
    return result.recordset;
  }

  /**
   * Tìm inventory theo ID
   */
  static async findById(id) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, id)
      .query(`
        SELECT 
          bi.Id,
          bi.BranchId,
          bi.ProductId,
          bi.QuantityOnHand,
          bi.QuantityReserved,
          bi.QuantityAvailable,
          bi.MinimumStockLevel,
          bi.LastRestockDate,
          bi.CreatedAt,
          bi.UpdatedAt,
          b.Name as BranchName,
          b.Location as BranchLocation
        FROM BranchInventory bi
        LEFT JOIN Branches b ON bi.BranchId = b.Id
        WHERE bi.Id = @id
      `);

    return result.recordset[0] || null;
  }

  /**
   * Tìm inventory theo BranchId và ProductId
   */
  static async findByBranchAndProduct(branchId, productId) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("branchId", db.sql.Int, branchId)
      .input("productId", db.sql.Int, productId)
      .query(`
        SELECT *
        FROM BranchInventory
        WHERE BranchId = @branchId AND ProductId = @productId
      `);

    return result.recordset[0] || null;
  }

  /**
   * Tạo inventory mới
   */
  static async create(inventoryData) {
    const pool = await db.getPool();
    const id = uuidv4();

    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, id)
      .input("branchId", db.sql.Int, inventoryData.branchId)
      .input("productId", db.sql.Int, inventoryData.productId)
      .input("quantityOnHand", db.sql.Int, inventoryData.quantityOnHand || 0)
      .input("quantityReserved", db.sql.Int, inventoryData.quantityReserved || 0)
      .input("minimumStockLevel", db.sql.Int, inventoryData.minimumStockLevel || 10)
      .input("lastRestockDate", db.sql.DateTime, new Date())
      .query(`
        INSERT INTO BranchInventory 
        (Id, BranchId, ProductId, QuantityOnHand, QuantityReserved, QuantityAvailable, MinimumStockLevel, LastRestockDate)
        OUTPUT INSERTED.*
        VALUES (@id, @branchId, @productId, @quantityOnHand, @quantityReserved, @quantityOnHand, @minimumStockLevel, @lastRestockDate)
      `);

    return result.recordset[0];
  }

  /**
   * Cập nhật inventory
   */
  static async update(id, updateData) {
    const pool = await db.getPool();

    let query = "UPDATE BranchInventory SET ";
    const request = pool.request().input("id", db.sql.NVarChar, id);

    const updates = [];
    if (updateData.quantityOnHand !== undefined) {
      updates.push("QuantityOnHand = @quantityOnHand");
      request.input("quantityOnHand", db.sql.Int, updateData.quantityOnHand);
    }
    if (updateData.quantityReserved !== undefined) {
      updates.push("QuantityReserved = @quantityReserved");
      request.input("quantityReserved", db.sql.Int, updateData.quantityReserved);
    }
    if (updateData.minimumStockLevel !== undefined) {
      updates.push("MinimumStockLevel = @minimumStockLevel");
      request.input("minimumStockLevel", db.sql.Int, updateData.minimumStockLevel);
    }

    updates.push("UpdatedAt = GETUTCDATE()");

    query += updates.join(", ");
    query += " WHERE Id = @id";

    const result = await request.query(query + " SELECT * FROM BranchInventory WHERE Id = @id");
    return result.recordset[0] || null;
  }

  /**
   * Xóa inventory
   */
  static async delete(id) {
    const pool = await db.getPool();
    await pool
      .request()
      .input("id", db.sql.NVarChar, id)
      .query("DELETE FROM BranchInventory WHERE Id = @id");

    return true;
  }

  /**
   * Lấy availability của sản phẩm trên tất cả chi nhánh
   */
  static async getProductAvailability(productId) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("productId", db.sql.Int, productId)
      .query(`
        SELECT 
          bi.BranchId,
          b.Name as BranchName,
          bi.QuantityOnHand,
          bi.QuantityReserved,
          bi.QuantityAvailable,
          bi.MinimumStockLevel
        FROM BranchInventory bi
        LEFT JOIN Branches b ON bi.BranchId = b.Id
        WHERE bi.ProductId = @productId
        ORDER BY bi.BranchId
      `);

    return result.recordset;
  }
}

module.exports = BranchInventoryModel;
