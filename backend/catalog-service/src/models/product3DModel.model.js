const db = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class Product3DModelModel {
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
   * Find 3D model by product ID
   */
  static async findByProductId(productId) {
    const pool = await db.getPool();
    const productIdStr = Product3DModelModel.normalizeId(productId);
    const result = await pool
      .request()
      .input("productId", db.sql.NVarChar, productIdStr)
      .query(`
        SELECT * FROM Product3DModels
        WHERE ProductId = CONVERT(UNIQUEIDENTIFIER, @productId)
          AND IsActive = 1
      `);

    if (result.recordset[0]) {
      result.recordset[0].Id = Product3DModelModel.normalizeId(result.recordset[0].Id);
      result.recordset[0].ProductId = Product3DModelModel.normalizeId(result.recordset[0].ProductId);
    }

    return result.recordset[0] || null;
  }

  /**
   * Find 3D model by ID
   */
  static async findById(id) {
    const pool = await db.getPool();
    const idStr = Product3DModelModel.normalizeId(id);
    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, idStr)
      .query("SELECT * FROM Product3DModels WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)");

    if (result.recordset[0]) {
      result.recordset[0].Id = Product3DModelModel.normalizeId(result.recordset[0].Id);
      result.recordset[0].ProductId = Product3DModelModel.normalizeId(result.recordset[0].ProductId);
    }

    return result.recordset[0] || null;
  }

  /**
   * Create new 3D model
   */
  static async create(modelData) {
    const pool = await db.getPool();
    const modelId = uuidv4().toUpperCase();
    const productIdStr = Product3DModelModel.normalizeId(modelData.productId);

    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, modelId)
      .input("productId", db.sql.NVarChar, productIdStr)
      .input("modelUrl", db.sql.NVarChar, modelData.modelUrl)
      .input("thumbnailUrl", db.sql.NVarChar, modelData.thumbnailUrl || null)
      .input("fileSize", db.sql.BigInt, modelData.fileSize || null)
      .input("format", db.sql.NVarChar, modelData.format || "glb")
      .input("version", db.sql.NVarChar, modelData.version || null)
      .input("isActive", db.sql.Bit, modelData.isActive !== undefined ? modelData.isActive : true)
      .query(`
        INSERT INTO Product3DModels (Id, ProductId, ModelUrl, ThumbnailUrl, FileSize, Format, Version, IsActive)
        OUTPUT INSERTED.*
        VALUES (CONVERT(UNIQUEIDENTIFIER, @id), CONVERT(UNIQUEIDENTIFIER, @productId), @modelUrl, @thumbnailUrl, @fileSize, @format, @version, @isActive)
      `);

    if (result.recordset[0]) {
      result.recordset[0].Id = Product3DModelModel.normalizeId(result.recordset[0].Id);
      result.recordset[0].ProductId = Product3DModelModel.normalizeId(result.recordset[0].ProductId);
    }

    return result.recordset[0];
  }

  /**
   * Update 3D model
   */
  static async update(id, modelData) {
    const pool = await db.getPool();
    const idStr = Product3DModelModel.normalizeId(id);
    const updates = [];
    const request = pool.request().input("id", db.sql.NVarChar, idStr);

    if (modelData.modelUrl !== undefined) {
      updates.push("ModelUrl = @modelUrl");
      request.input("modelUrl", db.sql.NVarChar, modelData.modelUrl);
    }
    if (modelData.thumbnailUrl !== undefined) {
      updates.push("ThumbnailUrl = @thumbnailUrl");
      request.input("thumbnailUrl", db.sql.NVarChar, modelData.thumbnailUrl);
    }
    if (modelData.fileSize !== undefined) {
      updates.push("FileSize = @fileSize");
      request.input("fileSize", db.sql.BigInt, modelData.fileSize);
    }
    if (modelData.format !== undefined) {
      updates.push("Format = @format");
      request.input("format", db.sql.NVarChar, modelData.format);
    }
    if (modelData.version !== undefined) {
      updates.push("Version = @version");
      request.input("version", db.sql.NVarChar, modelData.version);
    }
    if (modelData.isActive !== undefined) {
      updates.push("IsActive = @isActive");
      request.input("isActive", db.sql.Bit, modelData.isActive);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    // Không thể dùng OUTPUT INSERTED.* khi có trigger, nên UPDATE trước rồi SELECT lại
    const updateQuery = `
      UPDATE Product3DModels
      SET ${updates.join(", ")}
      WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)
    `;

    await request.query(updateQuery);
    
    // SELECT lại để lấy dữ liệu đã cập nhật
    return await this.findById(id);
  }

  /**
   * Delete 3D model
   */
  static async delete(id) {
    const pool = await db.getPool();
    const idStr = Product3DModelModel.normalizeId(id);
    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, idStr)
      .query("DELETE FROM Product3DModels WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)");

    return result.rowsAffected[0] > 0;
  }
}

module.exports = Product3DModelModel;




