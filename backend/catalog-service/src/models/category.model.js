const db = require("../config/database");

class CategoryModel {
  /**
   * Tìm tất cả danh mục
   */
  static async findAll(options = {}) {
    const pool = await db.getPool();
    let query = "SELECT * FROM Categories WHERE 1=1";
    const request = pool.request();

    if (options.isActive !== undefined) {
      query += " AND IsActive = @isActive";
      request.input("isActive", db.sql.Bit, options.isActive);
    }

    if (options.parentCategoryId !== undefined) {
      query += " AND ParentCategoryId = @parentCategoryId";
      request.input("parentCategoryId", db.sql.Int, options.parentCategoryId);
    }

    query += " ORDER BY DisplayOrder ASC, Name ASC";

    const result = await request.query(query);
    return result.recordset;
  }

  /**
   * Tìm danh mục theo ID
   */
  static async findById(id) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("id", db.sql.Int, id)
      .query("SELECT * FROM Categories WHERE Id = @id");

    return result.recordset[0] || null;
  }

  /**
   * Tìm danh mục theo slug
   */
  static async findBySlug(slug) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("slug", db.sql.NVarChar, slug)
      .query("SELECT * FROM Categories WHERE Slug = @slug");

    return result.recordset[0] || null;
  }

  /**
   * Tạo danh mục mới
   */
  static async create(categoryData) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("name", db.sql.NVarChar, categoryData.name)
      .input("description", db.sql.NVarChar, categoryData.description || null)
      .input(
        "parentCategoryId",
        db.sql.Int,
        categoryData.parentCategoryId || null
      )
      .input("slug", db.sql.NVarChar, categoryData.slug)
      .input(
        "isActive",
        db.sql.Bit,
        categoryData.isActive !== undefined ? categoryData.isActive : true
      )
      .input("displayOrder", db.sql.Int, categoryData.displayOrder || 0)
      .input("createdBy", db.sql.NVarChar, categoryData.createdBy || null)
      .query(`
        INSERT INTO Categories (Name, Description, ParentCategoryId, Slug, IsActive, DisplayOrder, CreatedBy)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @parentCategoryId, @slug, @isActive, @displayOrder, @createdBy)
      `);

    return result.recordset[0];
  }

  /**
   * Cập nhật danh mục
   */
  static async update(id, categoryData) {
    const pool = await db.getPool();
    const updates = [];
    const request = pool.request().input("id", db.sql.Int, id);

    if (categoryData.name !== undefined) {
      updates.push("Name = @name");
      request.input("name", db.sql.NVarChar, categoryData.name);
    }
    if (categoryData.description !== undefined) {
      updates.push("Description = @description");
      request.input("description", db.sql.NVarChar, categoryData.description);
    }
    if (categoryData.parentCategoryId !== undefined) {
      updates.push("ParentCategoryId = @parentCategoryId");
      request.input(
        "parentCategoryId",
        db.sql.Int,
        categoryData.parentCategoryId
      );
    }
    if (categoryData.slug !== undefined) {
      updates.push("Slug = @slug");
      request.input("slug", db.sql.NVarChar, categoryData.slug);
    }
    if (categoryData.isActive !== undefined) {
      updates.push("IsActive = @isActive");
      request.input("isActive", db.sql.Bit, categoryData.isActive);
    }
    if (categoryData.displayOrder !== undefined) {
      updates.push("DisplayOrder = @displayOrder");
      request.input("displayOrder", db.sql.Int, categoryData.displayOrder);
    }
    if (categoryData.updatedBy !== undefined) {
      updates.push("UpdatedBy = @updatedBy");
      request.input("updatedBy", db.sql.NVarChar, categoryData.updatedBy);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    // Không thể dùng OUTPUT INSERTED.* khi có trigger, nên UPDATE trước rồi SELECT lại
    const updateQuery = `
      UPDATE Categories
      SET ${updates.join(", ")}
      WHERE Id = @id
    `;

    await request.query(updateQuery);
    
    // SELECT lại để lấy dữ liệu đã cập nhật
    return await this.findById(id);
  }

  /**
   * Xóa danh mục
   */
  static async delete(id) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("id", db.sql.Int, id)
      .query("DELETE FROM Categories WHERE Id = @id");

    return result.rowsAffected[0] > 0;
  }
}

module.exports = CategoryModel;
