const db = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class StockAlertsModel {
  /**
   * Tìm tất cả stock alerts với bộ lọc
   */
  static async findAll(options = {}) {
    const pool = await db.getPool();
    let query = `
      SELECT 
        sa.Id,
        sa.BranchId,
        sa.ProductId,
        sa.AlertType,
        sa.CurrentStock,
        sa.ThresholdLevel,
        sa.Status,
        sa.CreatedAt,
        sa.ResolvedAt,
        b.Name as BranchName,
        bi.MinimumStockLevel
      FROM StockAlerts sa
      LEFT JOIN Branches b ON sa.BranchId = b.Id
      LEFT JOIN BranchInventory bi ON sa.BranchId = bi.BranchId AND sa.ProductId = bi.ProductId
      WHERE 1=1
    `;
    const request = pool.request();

    if (options.branchId) {
      query += " AND sa.BranchId = @branchId";
      request.input("branchId", db.sql.Int, options.branchId);
    }

    if (options.productId) {
      query += " AND sa.ProductId = @productId";
      request.input("productId", db.sql.Int, options.productId);
    }

    if (options.alertType) {
      query += " AND sa.AlertType = @alertType";
      request.input("alertType", db.sql.NVarChar, options.alertType);
    }

    if (options.status) {
      query += " AND sa.Status = @status";
      request.input("status", db.sql.NVarChar, options.status);
    }

    if (options.unResolvedOnly) {
      query += " AND sa.Status = 'Active'";
    }

    // Sắp xếp
    const sortBy = options.sortBy || "CreatedAt";
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
   * Tìm stock alert theo ID
   */
  static async findById(id) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, id)
      .query(`
        SELECT 
          sa.*,
          b.Name as BranchName,
          bi.MinimumStockLevel
        FROM StockAlerts sa
        LEFT JOIN Branches b ON sa.BranchId = b.Id
        LEFT JOIN BranchInventory bi ON sa.BranchId = bi.BranchId AND sa.ProductId = bi.ProductId
        WHERE sa.Id = @id
      `);

    return result.recordset[0] || null;
  }

  /**
   * Tạo stock alert mới
   */
  static async create(alertData) {
    const pool = await db.getPool();
    const id = uuidv4();

    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, id)
      .input("branchId", db.sql.Int, alertData.branchId)
      .input("productId", db.sql.Int, alertData.productId)
      .input("alertType", db.sql.NVarChar, alertData.alertType) // 'LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK'
      .input("currentStock", db.sql.Int, alertData.currentStock)
      .input("thresholdLevel", db.sql.Int, alertData.thresholdLevel)
      .input("status", db.sql.NVarChar, "Active")
      .query(`
        INSERT INTO StockAlerts 
        (Id, BranchId, ProductId, AlertType, CurrentStock, ThresholdLevel, Status)
        OUTPUT INSERTED.*
        VALUES (@id, @branchId, @productId, @alertType, @currentStock, @thresholdLevel, @status)
      `);

    return result.recordset[0];
  }

  /**
   * Cập nhật stock alert
   */
  static async update(id, updateData) {
    const pool = await db.getPool();

    let query = "UPDATE StockAlerts SET ";
    const request = pool.request().input("id", db.sql.NVarChar, id);

    const updates = [];
    if (updateData.status !== undefined) {
      updates.push("Status = @status");
      request.input("status", db.sql.NVarChar, updateData.status);
    }
    if (updateData.currentStock !== undefined) {
      updates.push("CurrentStock = @currentStock");
      request.input("currentStock", db.sql.Int, updateData.currentStock);
    }

    if (updateData.status === "Resolved") {
      updates.push("ResolvedAt = GETUTCDATE()");
    }

    query += updates.join(", ");
    query += " WHERE Id = @id";

    const result = await request.query(query + " SELECT * FROM StockAlerts WHERE Id = @id");
    return result.recordset[0] || null;
  }

  /**
   * Kiểm tra và tạo alerts cho low stock inventory
   */
  static async checkAndCreateLowStockAlerts() {
    const pool = await db.getPool();

    // Tìm tất cả inventory có stock thấp hơn minimum level
    const result = await pool.request().query(`
      SELECT 
        bi.Id,
        bi.BranchId,
        bi.ProductId,
        bi.QuantityAvailable,
        bi.MinimumStockLevel
      FROM BranchInventory bi
      WHERE bi.QuantityAvailable <= bi.MinimumStockLevel
        AND NOT EXISTS (
          SELECT 1 FROM StockAlerts sa
          WHERE sa.BranchId = bi.BranchId 
            AND sa.ProductId = bi.ProductId
            AND sa.Status = 'Active'
            AND sa.AlertType = 'LOW_STOCK'
        )
    `);

    // Tạo alerts cho mỗi inventory thấp
    for (const inventory of result.recordset) {
      await this.create({
        branchId: inventory.BranchId,
        productId: inventory.ProductId,
        alertType: "LOW_STOCK",
        currentStock: inventory.QuantityAvailable,
        thresholdLevel: inventory.MinimumStockLevel,
      });
    }

    return result.recordset.length;
  }

  /**
   * Lấy active alerts
   */
  static async getActiveAlerts(options = {}) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("status", db.sql.NVarChar, "Active")
      .query(`
        SELECT TOP 100
          sa.Id,
          sa.BranchId,
          sa.ProductId,
          sa.AlertType,
          sa.CurrentStock,
          sa.ThresholdLevel,
          sa.CreatedAt,
          b.Name as BranchName
        FROM StockAlerts sa
        LEFT JOIN Branches b ON sa.BranchId = b.Id
        WHERE sa.Status = @status
        ORDER BY sa.CreatedAt DESC
      `);

    return result.recordset;
  }

  /**
   * Xóa alert
   */
  static async delete(id) {
    const pool = await db.getPool();
    await pool
      .request()
      .input("id", db.sql.NVarChar, id)
      .query("DELETE FROM StockAlerts WHERE Id = @id");

    return true;
  }
}

module.exports = StockAlertsModel;
