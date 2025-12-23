const db = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class ReviewModel {
  /**
   * Convert UUID to uppercase string
   */
  static normalizeId(id) {
    if (!id) return null;
    if (Buffer.isBuffer(id)) {
      return id.toString("hex").toUpperCase();
    }
    if (typeof id === "object" && id.toString) {
      return id.toString().toUpperCase();
    }
    return String(id).trim().toUpperCase();
  }

  /**
   * Find all reviews for a product
   */
  static async findByProductId(productId, options = {}) {
    const pool = await db.getPool();
    const productIdStr = ReviewModel.normalizeId(productId);
    let query = `
      SELECT * FROM Reviews
      WHERE ProductId = CONVERT(UNIQUEIDENTIFIER, @productId)
    `;
    const request = pool.request().input("productId", db.sql.NVarChar, productIdStr);

    if (options.isApproved !== undefined) {
      query += " AND IsApproved = @isApproved";
      request.input("isApproved", db.sql.Bit, options.isApproved);
    }

    query += " ORDER BY CreatedAt DESC";

    // Pagination
    if (options.page && options.limit) {
      const offset = (options.page - 1) * options.limit;
      query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
      request.input("offset", db.sql.Int, offset);
      request.input("limit", db.sql.Int, options.limit);
    }

    const result = await request.query(query);

    return result.recordset.map((review) => ({
      ...review,
      Id: ReviewModel.normalizeId(review.Id),
      ProductId: ReviewModel.normalizeId(review.ProductId),
      UserId: ReviewModel.normalizeId(review.UserId),
    }));
  }

  /**
   * Count reviews for a product
   */
  static async countByProductId(productId, options = {}) {
    const pool = await db.getPool();
    const productIdStr = ReviewModel.normalizeId(productId);
    let query = `
      SELECT COUNT(*) as total FROM Reviews
      WHERE ProductId = CONVERT(UNIQUEIDENTIFIER, @productId)
    `;
    const request = pool.request().input("productId", db.sql.NVarChar, productIdStr);

    if (options.isApproved !== undefined) {
      query += " AND IsApproved = @isApproved";
      request.input("isApproved", db.sql.Bit, options.isApproved);
    }

    const result = await request.query(query);
    return result.recordset[0].total;
  }

  /**
   * Get average rating for a product
   */
  static async getAverageRating(productId) {
    const pool = await db.getPool();
    const productIdStr = ReviewModel.normalizeId(productId);
    const result = await pool
      .request()
      .input("productId", db.sql.NVarChar, productIdStr)
      .query(`
        SELECT 
          AVG(CAST(Rating AS FLOAT)) as averageRating,
          COUNT(*) as totalReviews
        FROM Reviews
        WHERE ProductId = CONVERT(UNIQUEIDENTIFIER, @productId)
          AND IsApproved = 1
      `);

    return {
      averageRating: result.recordset[0].averageRating ? parseFloat(result.recordset[0].averageRating.toFixed(2)) : 0,
      totalReviews: result.recordset[0].totalReviews || 0,
    };
  }

  /**
   * Get rating distribution for a product
   */
  static async getRatingDistribution(productId) {
    const pool = await db.getPool();
    const productIdStr = ReviewModel.normalizeId(productId);
    const result = await pool
      .request()
      .input("productId", db.sql.NVarChar, productIdStr)
      .query(`
        SELECT 
          Rating,
          COUNT(*) as count
        FROM Reviews
        WHERE ProductId = CONVERT(UNIQUEIDENTIFIER, @productId)
          AND IsApproved = 1
        GROUP BY Rating
        ORDER BY Rating DESC
      `);

    return result.recordset;
  }

  /**
   * Find review by ID
   */
  static async findById(id) {
    const pool = await db.getPool();
    const idStr = ReviewModel.normalizeId(id);
    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, idStr)
      .query("SELECT * FROM Reviews WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)");

    if (result.recordset[0]) {
      result.recordset[0].Id = ReviewModel.normalizeId(result.recordset[0].Id);
      result.recordset[0].ProductId = ReviewModel.normalizeId(result.recordset[0].ProductId);
      result.recordset[0].UserId = ReviewModel.normalizeId(result.recordset[0].UserId);
    }

    return result.recordset[0] || null;
  }

  /**
   * Create new review
   */
  static async create(reviewData) {
    const pool = await db.getPool();
    const reviewId = uuidv4().toUpperCase();
    const productIdStr = ReviewModel.normalizeId(reviewData.productId);
    const userIdStr = ReviewModel.normalizeId(reviewData.userId);

    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, reviewId)
      .input("productId", db.sql.NVarChar, productIdStr)
      .input("userId", db.sql.NVarChar, userIdStr)
      .input("rating", db.sql.Int, reviewData.rating)
      .input("title", db.sql.NVarChar, reviewData.title || null)
      .input("comment", db.sql.NVarChar, reviewData.comment || null)
      .input("isVerifiedPurchase", db.sql.Bit, reviewData.isVerifiedPurchase || false)
      .input("isApproved", db.sql.Bit, reviewData.isApproved || false)
      .query(`
        INSERT INTO Reviews (Id, ProductId, UserId, Rating, Title, Comment, IsVerifiedPurchase, IsApproved)
        OUTPUT INSERTED.*
        VALUES (CONVERT(UNIQUEIDENTIFIER, @id), CONVERT(UNIQUEIDENTIFIER, @productId), CONVERT(UNIQUEIDENTIFIER, @userId), @rating, @title, @comment, @isVerifiedPurchase, @isApproved)
      `);

    if (result.recordset[0]) {
      result.recordset[0].Id = ReviewModel.normalizeId(result.recordset[0].Id);
      result.recordset[0].ProductId = ReviewModel.normalizeId(result.recordset[0].ProductId);
      result.recordset[0].UserId = ReviewModel.normalizeId(result.recordset[0].UserId);
    }

    return result.recordset[0];
  }

  /**
   * Update review
   */
  static async update(id, reviewData) {
    const pool = await db.getPool();
    const idStr = ReviewModel.normalizeId(id);
    const updates = [];
    const request = pool.request().input("id", db.sql.NVarChar, idStr);

    if (reviewData.rating !== undefined) {
      updates.push("Rating = @rating");
      request.input("rating", db.sql.Int, reviewData.rating);
    }
    if (reviewData.title !== undefined) {
      updates.push("Title = @title");
      request.input("title", db.sql.NVarChar, reviewData.title);
    }
    if (reviewData.comment !== undefined) {
      updates.push("Comment = @comment");
      request.input("comment", db.sql.NVarChar, reviewData.comment);
    }
    if (reviewData.isApproved !== undefined) {
      updates.push("IsApproved = @isApproved");
      request.input("isApproved", db.sql.Bit, reviewData.isApproved);
    }
    if (reviewData.isHelpful !== undefined) {
      updates.push("IsHelpful = @isHelpful");
      request.input("isHelpful", db.sql.Int, reviewData.isHelpful);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    // Không thể dùng OUTPUT INSERTED.* khi có trigger, nên UPDATE trước rồi SELECT lại
    const updateQuery = `
      UPDATE Reviews
      SET ${updates.join(", ")}
      WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)
    `;

    await request.query(updateQuery);
    
    // SELECT lại để lấy dữ liệu đã cập nhật
    return await this.findById(id);
  }

  /**
   * Delete review
   */
  static async delete(id) {
    const pool = await db.getPool();
    const idStr = ReviewModel.normalizeId(id);
    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, idStr)
      .query("DELETE FROM Reviews WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)");

    return result.rowsAffected[0] > 0;
  }
}

module.exports = ReviewModel;




