const db = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class ProductAttributeModel {
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
   * Find all attributes for a product
   */
  static async findByProductId(productId) {
    const pool = await db.getPool();
    const productIdStr = ProductAttributeModel.normalizeId(productId);
    const result = await pool
      .request()
      .input("productId", db.sql.NVarChar, productIdStr)
      .query(`
        SELECT * FROM ProductAttributes
        WHERE ProductId = CONVERT(UNIQUEIDENTIFIER, @productId)
        ORDER BY DisplayOrder ASC, AttributeName ASC
      `);

    return result.recordset.map((attr) => ({
      ...attr,
      Id: ProductAttributeModel.normalizeId(attr.Id),
      ProductId: ProductAttributeModel.normalizeId(attr.ProductId),
    }));
  }

  /**
   * Find attribute by ID
   */
  static async findById(id) {
    const pool = await db.getPool();
    const idStr = ProductAttributeModel.normalizeId(id);
    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, idStr)
      .query("SELECT * FROM ProductAttributes WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)");

    if (result.recordset[0]) {
      result.recordset[0].Id = ProductAttributeModel.normalizeId(result.recordset[0].Id);
      result.recordset[0].ProductId = ProductAttributeModel.normalizeId(result.recordset[0].ProductId);
    }

    return result.recordset[0] || null;
  }

  /**
   * Create new product attribute
   */
  static async create(attributeData) {
    const pool = await db.getPool();
    const attributeId = uuidv4().toUpperCase();
    const productIdStr = ProductAttributeModel.normalizeId(attributeData.productId);

    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, attributeId)
      .input("productId", db.sql.NVarChar, productIdStr)
      .input("attributeName", db.sql.NVarChar, attributeData.attributeName)
      .input("attributeValue", db.sql.NVarChar, attributeData.attributeValue)
      .input("displayOrder", db.sql.Int, attributeData.displayOrder || 0)
      .query(`
        INSERT INTO ProductAttributes (Id, ProductId, AttributeName, AttributeValue, DisplayOrder)
        OUTPUT INSERTED.*
        VALUES (CONVERT(UNIQUEIDENTIFIER, @id), CONVERT(UNIQUEIDENTIFIER, @productId), @attributeName, @attributeValue, @displayOrder)
      `);

    if (result.recordset[0]) {
      result.recordset[0].Id = ProductAttributeModel.normalizeId(result.recordset[0].Id);
      result.recordset[0].ProductId = ProductAttributeModel.normalizeId(result.recordset[0].ProductId);
    }

    return result.recordset[0];
  }

  /**
   * Update product attribute
   */
  static async update(id, attributeData) {
    const pool = await db.getPool();
    const idStr = ProductAttributeModel.normalizeId(id);
    const updates = [];
    const request = pool.request().input("id", db.sql.NVarChar, idStr);

    if (attributeData.attributeName !== undefined) {
      updates.push("AttributeName = @attributeName");
      request.input("attributeName", db.sql.NVarChar, attributeData.attributeName);
    }
    if (attributeData.attributeValue !== undefined) {
      updates.push("AttributeValue = @attributeValue");
      request.input("attributeValue", db.sql.NVarChar, attributeData.attributeValue);
    }
    if (attributeData.displayOrder !== undefined) {
      updates.push("DisplayOrder = @displayOrder");
      request.input("displayOrder", db.sql.Int, attributeData.displayOrder);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    // Không thể dùng OUTPUT INSERTED.* khi có trigger, nên UPDATE trước rồi SELECT lại
    const updateQuery = `
      UPDATE ProductAttributes
      SET ${updates.join(", ")}
      WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)
    `;

    await request.query(updateQuery);
    
    // SELECT lại để lấy dữ liệu đã cập nhật
    return await this.findById(id);
  }

  /**
   * Delete product attribute
   */
  static async delete(id) {
    const pool = await db.getPool();
    const idStr = ProductAttributeModel.normalizeId(id);
    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, idStr)
      .query("DELETE FROM ProductAttributes WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)");

    return result.rowsAffected[0] > 0;
  }

  /**
   * Delete all attributes for a product
   */
  static async deleteByProductId(productId) {
    const pool = await db.getPool();
    const productIdStr = ProductAttributeModel.normalizeId(productId);
    const result = await pool
      .request()
      .input("productId", db.sql.NVarChar, productIdStr)
      .query("DELETE FROM ProductAttributes WHERE ProductId = CONVERT(UNIQUEIDENTIFIER, @productId)");

    return result.rowsAffected[0] > 0;
  }

  /**
   * Bulk create attributes
   */
  static async bulkCreate(productId, attributes) {
    const pool = await db.getPool();
    const productIdStr = ProductAttributeModel.normalizeId(productId);
    const results = [];

    for (const attr of attributes) {
      const attributeId = uuidv4().toUpperCase();
      const result = await pool
        .request()
        .input("id", db.sql.NVarChar, attributeId)
        .input("productId", db.sql.NVarChar, productIdStr)
        .input("attributeName", db.sql.NVarChar, attr.attributeName)
        .input("attributeValue", db.sql.NVarChar, attr.attributeValue)
        .input("displayOrder", db.sql.Int, attr.displayOrder || 0)
        .query(`
          INSERT INTO ProductAttributes (Id, ProductId, AttributeName, AttributeValue, DisplayOrder)
          OUTPUT INSERTED.*
          VALUES (CONVERT(UNIQUEIDENTIFIER, @id), CONVERT(UNIQUEIDENTIFIER, @productId), @attributeName, @attributeValue, @displayOrder)
        `);

      if (result.recordset[0]) {
        result.recordset[0].Id = ProductAttributeModel.normalizeId(result.recordset[0].Id);
        result.recordset[0].ProductId = ProductAttributeModel.normalizeId(result.recordset[0].ProductId);
        results.push(result.recordset[0]);
      }
    }

    return results;
  }
}

module.exports = ProductAttributeModel;




