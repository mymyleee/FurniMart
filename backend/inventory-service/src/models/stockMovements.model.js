const db = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class StockMovementsModel {
  /**
   * Tìm tất cả stock movements với bộ lọc
   */
  static async findAll(options = {}) {
    const pool = await db.getPool();
    let query = `
      SELECT 
        sm.Id,
        sm.BranchId,
        sm.ProductId,
        sm.MovementType,
        sm.Quantity,
        sm.Reason,
        sm.ReferenceId,
        sm.BalanceBefore,
        sm.BalanceAfter,
        sm.CreatedBy,
        sm.CreatedAt,
        b.Name as BranchName,
        u.Email as CreatedByEmail
      FROM StockMovements sm
      LEFT JOIN Branches b ON sm.BranchId = b.Id
      LEFT JOIN Users u ON sm.CreatedBy = u.Id
      WHERE 1=1
    `;
    const request = pool.request();

    if (options.branchId) {
      query += " AND sm.BranchId = @branchId";
      request.input("branchId", db.sql.Int, options.branchId);
    }

    if (options.productId) {
      query += " AND sm.ProductId = @productId";
      request.input("productId", db.sql.Int, options.productId);
    }

    if (options.movementType) {
      query += " AND sm.MovementType = @movementType";
      request.input("movementType", db.sql.NVarChar, options.movementType);
    }

    if (options.startDate) {
      query += " AND sm.CreatedAt >= @startDate";
      request.input("startDate", db.sql.DateTime, options.startDate);
    }

    if (options.endDate) {
      query += " AND sm.CreatedAt <= @endDate";
      request.input("endDate", db.sql.DateTime, options.endDate);
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
   * Tìm stock movement theo ID
   */
  static async findById(id) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, id)
      .query(`
        SELECT 
          sm.*,
          b.Name as BranchName,
          u.Email as CreatedByEmail
        FROM StockMovements sm
        LEFT JOIN Branches b ON sm.BranchId = b.Id
        LEFT JOIN Users u ON sm.CreatedBy = u.Id
        WHERE sm.Id = @id
      `);

    return result.recordset[0] || null;
  }

  /**
   * Tạo stock movement record
   */
  static async create(movementData) {
    const pool = await db.getPool();
    const id = uuidv4();

    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, id)
      .input("branchId", db.sql.Int, movementData.branchId)
      .input("productId", db.sql.Int, movementData.productId)
      .input("movementType", db.sql.NVarChar, movementData.movementType)
      .input("quantity", db.sql.Int, movementData.quantity)
      .input("reason", db.sql.NVarChar, movementData.reason || null)
      .input("referenceId", db.sql.NVarChar, movementData.referenceId || null)
      .input("balanceBefore", db.sql.Int, movementData.balanceBefore || 0)
      .input("balanceAfter", db.sql.Int, movementData.balanceAfter || 0)
      .input("createdBy", db.sql.NVarChar, movementData.createdBy || null)
      .query(`
        INSERT INTO StockMovements 
        (Id, BranchId, ProductId, MovementType, Quantity, Reason, ReferenceId, BalanceBefore, BalanceAfter, CreatedBy)
        OUTPUT INSERTED.*
        VALUES (@id, @branchId, @productId, @movementType, @quantity, @reason, @referenceId, @balanceBefore, @balanceAfter, @createdBy)
      `);

    return result.recordset[0];
  }

  /**
   * Lấy lịch sử movement của một sản phẩm
   */
  static async getProductHistory(productId, options = {}) {
    const pool = await db.getPool();
    const limit = options.limit || 50;

    const result = await pool
      .request()
      .input("productId", db.sql.Int, productId)
      .input("limit", db.sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          sm.Id,
          sm.BranchId,
          sm.MovementType,
          sm.Quantity,
          sm.Reason,
          sm.BalanceBefore,
          sm.BalanceAfter,
          sm.CreatedAt,
          b.Name as BranchName,
          u.Email as CreatedBy
        FROM StockMovements sm
        LEFT JOIN Branches b ON sm.BranchId = b.Id
        LEFT JOIN Users u ON sm.CreatedBy = u.Id
        WHERE sm.ProductId = @productId
        ORDER BY sm.CreatedAt DESC
      `);

    return result.recordset;
  }

  /**
   * Lấy report theo branch
   */
  static async getBranchMovementReport(branchId, startDate, endDate) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("branchId", db.sql.Int, branchId)
      .input("startDate", db.sql.DateTime, startDate)
      .input("endDate", db.sql.DateTime, endDate)
      .query(`
        SELECT 
          MovementType,
          COUNT(*) as TotalMovements,
          SUM(Quantity) as TotalQuantity
        FROM StockMovements
        WHERE BranchId = @branchId
          AND CreatedAt BETWEEN @startDate AND @endDate
        GROUP BY MovementType
      `);

    return result.recordset;
  }
}

module.exports = StockMovementsModel;
