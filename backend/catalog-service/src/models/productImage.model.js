const db = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class ProductImageModel {
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
   * Find all images for a product
   */
  static async findByProductId(productId) {
    const pool = await db.getPool();
    const productIdStr = ProductImageModel.normalizeId(productId);
    const result = await pool
      .request()
      .input("productId", db.sql.NVarChar, productIdStr)
      .query(`
        SELECT * FROM ProductImages
        WHERE ProductId = CONVERT(UNIQUEIDENTIFIER, @productId)
        ORDER BY DisplayOrder ASC, CreatedAt ASC
      `);

    return result.recordset.map((img) => ({
      ...img,
      Id: ProductImageModel.normalizeId(img.Id),
      ProductId: ProductImageModel.normalizeId(img.ProductId),
    }));
  }

  /**
   * Find image by ID
   */
  static async findById(id) {
    const pool = await db.getPool();
    const idStr = ProductImageModel.normalizeId(id);
    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, idStr)
      .query("SELECT * FROM ProductImages WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)");

    if (result.recordset[0]) {
      result.recordset[0].Id = ProductImageModel.normalizeId(result.recordset[0].Id);
      result.recordset[0].ProductId = ProductImageModel.normalizeId(result.recordset[0].ProductId);
    }

    return result.recordset[0] || null;
  }

  /**
   * Create new product image
   */
  static async create(imageData) {
    const pool = await db.getPool();
    const imageId = uuidv4().toUpperCase();
    const productIdStr = ProductImageModel.normalizeId(imageData.productId);

    // If this is set as primary, unset other primary images
    if (imageData.isPrimary) {
      await pool
        .request()
        .input("productId", db.sql.NVarChar, productIdStr)
        .query(`
          UPDATE ProductImages
          SET IsPrimary = 0
          WHERE ProductId = CONVERT(UNIQUEIDENTIFIER, @productId)
        `);
    }

    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, imageId)
      .input("productId", db.sql.NVarChar, productIdStr)
      .input("imageUrl", db.sql.NVarChar, imageData.imageUrl)
      .input("altText", db.sql.NVarChar, imageData.altText || null)
      .input("displayOrder", db.sql.Int, imageData.displayOrder || 0)
      .input("isPrimary", db.sql.Bit, imageData.isPrimary || false)
      .query(`
        INSERT INTO ProductImages (Id, ProductId, ImageUrl, AltText, DisplayOrder, IsPrimary)
        OUTPUT INSERTED.*
        VALUES (CONVERT(UNIQUEIDENTIFIER, @id), CONVERT(UNIQUEIDENTIFIER, @productId), @imageUrl, @altText, @displayOrder, @isPrimary)
      `);

    if (result.recordset[0]) {
      result.recordset[0].Id = ProductImageModel.normalizeId(result.recordset[0].Id);
      result.recordset[0].ProductId = ProductImageModel.normalizeId(result.recordset[0].ProductId);
    }

    return result.recordset[0];
  }

  /**
   * Update product image
   */
  static async update(id, imageData) {
    const pool = await db.getPool();
    const idStr = ProductImageModel.normalizeId(id);
    const updates = [];
    const request = pool.request().input("id", db.sql.NVarChar, idStr);

    if (imageData.imageUrl !== undefined) {
      updates.push("ImageUrl = @imageUrl");
      request.input("imageUrl", db.sql.NVarChar, imageData.imageUrl);
    }
    if (imageData.altText !== undefined) {
      updates.push("AltText = @altText");
      request.input("altText", db.sql.NVarChar, imageData.altText);
    }
    if (imageData.displayOrder !== undefined) {
      updates.push("DisplayOrder = @displayOrder");
      request.input("displayOrder", db.sql.Int, imageData.displayOrder);
    }
    if (imageData.isPrimary !== undefined) {
      updates.push("IsPrimary = @isPrimary");
      request.input("isPrimary", db.sql.Bit, imageData.isPrimary);

      // If setting as primary, unset others
      if (imageData.isPrimary) {
        const image = await this.findById(id);
        if (image) {
          const productIdStr = ProductImageModel.normalizeId(image.ProductId);
          await pool
            .request()
            .input("productId", db.sql.NVarChar, productIdStr)
            .input("currentId", db.sql.NVarChar, idStr)
            .query(`
              UPDATE ProductImages
              SET IsPrimary = 0
              WHERE ProductId = CONVERT(UNIQUEIDENTIFIER, @productId)
                AND Id != CONVERT(UNIQUEIDENTIFIER, @currentId)
            `);
        }
      }
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    // Không thể dùng OUTPUT INSERTED.* khi có trigger, nên UPDATE trước rồi SELECT lại
    const updateQuery = `
      UPDATE ProductImages
      SET ${updates.join(", ")}
      WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)
    `;

    await request.query(updateQuery);
    
    // SELECT lại để lấy dữ liệu đã cập nhật
    return await this.findById(id);
  }

  /**
   * Delete product image
   */
  static async delete(id) {
    const pool = await db.getPool();
    const idStr = ProductImageModel.normalizeId(id);
    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, idStr)
      .query("DELETE FROM ProductImages WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)");

    return result.rowsAffected[0] > 0;
  }

  /**
   * Delete all images for a product
   */
  static async deleteByProductId(productId) {
    const pool = await db.getPool();
    const productIdStr = ProductImageModel.normalizeId(productId);
    const result = await pool
      .request()
      .input("productId", db.sql.NVarChar, productIdStr)
      .query("DELETE FROM ProductImages WHERE ProductId = CONVERT(UNIQUEIDENTIFIER, @productId)");

    return result.rowsAffected[0] > 0;
  }
}

module.exports = ProductImageModel;




