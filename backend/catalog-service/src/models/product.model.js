const db = require("../config/database");
const { v4: uuidv4 } = require("uuid");

class ProductModel {
  /**
   * Chuyển đổi UUID sang uppercase string
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
   * Tìm tất cả sản phẩm với bộ lọc
   */
  static async findAll(options = {}) {
    const pool = await db.getPool();
    let query = `
      SELECT 
        p.*,
        c.Name as CategoryName,
        c.Slug as CategorySlug
      FROM Products p
      INNER JOIN Categories c ON p.CategoryId = c.Id
      WHERE 1=1
    `;
    const request = pool.request();

    if (options.isActive !== undefined) {
      query += " AND p.IsActive = @isActive";
      request.input("isActive", db.sql.Bit, options.isActive);
    }

    if (options.categoryId) {
      query += " AND p.CategoryId = @categoryId";
      request.input("categoryId", db.sql.Int, options.categoryId);
    }

    if (options.stockStatus) {
      query += " AND p.StockStatus = @stockStatus";
      request.input("stockStatus", db.sql.NVarChar, options.stockStatus);
    }

    if (options.isFeatured !== undefined) {
      query += " AND p.IsFeatured = @isFeatured";
      request.input("isFeatured", db.sql.Bit, options.isFeatured);
    }

    if (options.search) {
      query +=
        " AND (p.Name LIKE @search OR p.Description LIKE @search OR p.SKU LIKE @search)";
      request.input("search", db.sql.NVarChar, `%${options.search}%`);
    }

    if (options.minPrice !== undefined) {
      query +=
        " AND (p.SalePrice IS NOT NULL AND p.SalePrice >= @minPrice OR p.SalePrice IS NULL AND p.BasePrice >= @minPrice)";
      request.input("minPrice", db.sql.Decimal(18, 2), options.minPrice);
    }

    if (options.maxPrice !== undefined) {
      query +=
        " AND (p.SalePrice IS NOT NULL AND p.SalePrice <= @maxPrice OR p.SalePrice IS NULL AND p.BasePrice <= @maxPrice)";
      request.input("maxPrice", db.sql.Decimal(18, 2), options.maxPrice);
    }

    // Sắp xếp - Whitelist các field được phép để chống SQL injection
    const allowedSortFields = {
      CreatedAt: "p.CreatedAt",
      Name: "p.Name",
      BasePrice: "p.BasePrice",
      SalePrice: "p.SalePrice",
      ViewCount: "p.ViewCount",
      UpdatedAt: "p.UpdatedAt",
    };
    const sortBy =
      allowedSortFields[options.sortBy] || allowedSortFields.CreatedAt;
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
   * Đếm tổng số sản phẩm khớp với bộ lọc
   */
  static async count(options = {}) {
    const pool = await db.getPool();
    let query = "SELECT COUNT(*) as total FROM Products p WHERE 1=1";
    const request = pool.request();

    if (options.isActive !== undefined) {
      query += " AND p.IsActive = @isActive";
      request.input("isActive", db.sql.Bit, options.isActive);
    }

    if (options.categoryId) {
      query += " AND p.CategoryId = @categoryId";
      request.input("categoryId", db.sql.Int, options.categoryId);
    }

    if (options.stockStatus) {
      query += " AND p.StockStatus = @stockStatus";
      request.input("stockStatus", db.sql.NVarChar, options.stockStatus);
    }

    if (options.isFeatured !== undefined) {
      query += " AND p.IsFeatured = @isFeatured";
      request.input("isFeatured", db.sql.Bit, options.isFeatured);
    }

    if (options.search) {
      query +=
        " AND (p.Name LIKE @search OR p.Description LIKE @search OR p.SKU LIKE @search)";
      request.input("search", db.sql.NVarChar, `%${options.search}%`);
    }

    if (options.minPrice !== undefined) {
      query +=
        " AND (p.SalePrice IS NOT NULL AND p.SalePrice >= @minPrice OR p.SalePrice IS NULL AND p.BasePrice >= @minPrice)";
      request.input("minPrice", db.sql.Decimal(18, 2), options.minPrice);
    }

    if (options.maxPrice !== undefined) {
      query +=
        " AND (p.SalePrice IS NOT NULL AND p.SalePrice <= @maxPrice OR p.SalePrice IS NULL AND p.BasePrice <= @maxPrice)";
      request.input("maxPrice", db.sql.Decimal(18, 2), options.maxPrice);
    }

    const result = await request.query(query);
    return result.recordset[0].total;
  }

  /**
   * Tìm sản phẩm theo ID
   */
  static async findById(id) {
    const pool = await db.getPool();
    const idStr = this.normalizeId(id);
    const result = await pool.request().input("id", db.sql.NVarChar, idStr)
      .query(`
        SELECT 
          p.*,
          c.Name as CategoryName,
          c.Slug as CategorySlug
        FROM Products p
        INNER JOIN Categories c ON p.CategoryId = c.Id
        WHERE p.Id = CONVERT(UNIQUEIDENTIFIER, @id)
      `);

    if (result.recordset[0]) {
      result.recordset[0].Id = this.normalizeId(result.recordset[0].Id);
    }

    return result.recordset[0] || null;
  }

  /**
   * Tìm sản phẩm theo SKU
   */
  static async findBySKU(sku) {
    const pool = await db.getPool();
    const result = await pool.request().input("sku", db.sql.NVarChar, sku)
      .query(`
        SELECT 
          p.*,
          c.Name as CategoryName,
          c.Slug as CategorySlug
        FROM Products p
        INNER JOIN Categories c ON p.CategoryId = c.Id
        WHERE p.SKU = @sku
      `);

    if (result.recordset[0]) {
      result.recordset[0].Id = this.normalizeId(result.recordset[0].Id);
    }

    return result.recordset[0] || null;
  }

  /**
   * Find product by slug
   */
  static async findBySlug(slug) {
    const pool = await db.getPool();
    const result = await pool.request().input("slug", db.sql.NVarChar, slug)
      .query(`
        SELECT 
          p.*,
          c.Name as CategoryName,
          c.Slug as CategorySlug
        FROM Products p
        INNER JOIN Categories c ON p.CategoryId = c.Id
        WHERE p.Slug = @slug
      `);

    if (result.recordset[0]) {
      result.recordset[0].Id = this.normalizeId(result.recordset[0].Id);
    }

    return result.recordset[0] || null;
  }

  /**
   * Create new product
   */
  static async create(productData) {
    const pool = await db.getPool();
    const productId = uuidv4().toUpperCase();

    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, productId)
      .input("name", db.sql.NVarChar, productData.name)
      .input("description", db.sql.NVarChar, productData.description || null)
      .input(
        "shortDescription",
        db.sql.NVarChar,
        productData.shortDescription || null
      )
      .input("sku", db.sql.NVarChar, productData.sku)
      .input("categoryId", db.sql.Int, productData.categoryId)
      .input("basePrice", db.sql.Decimal(18, 2), productData.basePrice)
      .input("salePrice", db.sql.Decimal(18, 2), productData.salePrice || null)
      .input(
        "isActive",
        db.sql.Bit,
        productData.isActive !== undefined ? productData.isActive : true
      )
      .input(
        "isFeatured",
        db.sql.Bit,
        productData.isFeatured !== undefined ? productData.isFeatured : false
      )
      .input(
        "stockStatus",
        db.sql.NVarChar,
        productData.stockStatus || "IN_STOCK"
      )
      .input("weight", db.sql.Decimal(10, 2), productData.weight || null)
      .input("length", db.sql.Decimal(10, 2), productData.length || null)
      .input("width", db.sql.Decimal(10, 2), productData.width || null)
      .input("height", db.sql.Decimal(10, 2), productData.height || null)
      .input("material", db.sql.NVarChar, productData.material || null)
      .input("color", db.sql.NVarChar, productData.color || null)
      .input("brand", db.sql.NVarChar, productData.brand || null)
      .input("warrantyPeriod", db.sql.Int, productData.warrantyPeriod || null)
      .input("metaTitle", db.sql.NVarChar, productData.metaTitle || null)
      .input(
        "metaDescription",
        db.sql.NVarChar,
        productData.metaDescription || null
      )
      .input("slug", db.sql.NVarChar, productData.slug)
      .input("createdBy", db.sql.NVarChar, productData.createdBy || null)
      .query(`
        INSERT INTO Products (
          Id, Name, Description, ShortDescription, SKU, CategoryId, BasePrice, SalePrice,
          IsActive, IsFeatured, StockStatus, Weight, Length, Width, Height,
          Material, Color, Brand, WarrantyPeriod, MetaTitle, MetaDescription, Slug, CreatedBy
        )
        OUTPUT INSERTED.*
        VALUES (
          CONVERT(UNIQUEIDENTIFIER, @id), @name, @description, @shortDescription, @sku, @categoryId,
          @basePrice, @salePrice, @isActive, @isFeatured, @stockStatus, @weight, @length, @width, @height,
          @material, @color, @brand, @warrantyPeriod, @metaTitle, @metaDescription, @slug, @createdBy
        )
      `);

    if (result.recordset[0]) {
      result.recordset[0].Id = this.normalizeId(result.recordset[0].Id);
    }

    return result.recordset[0];
  }

  /**
   * Update product
   */
  static async update(id, productData) {
    const pool = await db.getPool();
    const idStr = this.normalizeId(id);
    const updates = [];
    const request = pool.request().input("id", db.sql.NVarChar, idStr);

    const fields = [
      "name",
      "description",
      "shortDescription",
      "sku",
      "categoryId",
      "basePrice",
      "salePrice",
      "isActive",
      "isFeatured",
      "stockStatus",
      "weight",
      "length",
      "width",
      "height",
      "material",
      "color",
      "brand",
      "warrantyPeriod",
      "metaTitle",
      "metaDescription",
      "slug",
      "viewCount",
      "updatedBy",
    ];

    const fieldMap = {
      categoryId: { type: db.sql.Int, dbField: "CategoryId" },
      basePrice: { type: db.sql.Decimal(18, 2), dbField: "BasePrice" },
      salePrice: { type: db.sql.Decimal(18, 2), dbField: "SalePrice" },
      isActive: { type: db.sql.Bit, dbField: "IsActive" },
      isFeatured: { type: db.sql.Bit, dbField: "IsFeatured" },
      stockStatus: { type: db.sql.NVarChar, dbField: "StockStatus" },
      weight: { type: db.sql.Decimal(10, 2), dbField: "Weight" },
      length: { type: db.sql.Decimal(10, 2), dbField: "Length" },
      width: { type: db.sql.Decimal(10, 2), dbField: "Width" },
      height: { type: db.sql.Decimal(10, 2), dbField: "Height" },
      warrantyPeriod: { type: db.sql.Int, dbField: "WarrantyPeriod" },
      viewCount: { type: db.sql.Int, dbField: "ViewCount" },
    };

    fields.forEach((field) => {
      if (productData[field] !== undefined) {
        const mapping = fieldMap[field];
        if (mapping) {
          updates.push(`${mapping.dbField} = @${field}`);
          request.input(field, mapping.type, productData[field]);
        } else {
          const dbField =
            field.charAt(0).toUpperCase() +
            field.slice(1).replace(/([A-Z])/g, "$1");
          updates.push(`${dbField} = @${field}`);
          request.input(field, db.sql.NVarChar, productData[field]);
        }
      }
    });

    if (updates.length === 0) {
      return await this.findById(id);
    }

    // Không thể dùng OUTPUT INSERTED.* khi có trigger, nên UPDATE trước rồi SELECT lại
    const updateQuery = `
      UPDATE Products
      SET ${updates.join(", ")}
      WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)
    `;

    await request.query(updateQuery);
    
    // SELECT lại để lấy dữ liệu đã cập nhật
    return await this.findById(id);
  }

  /**
   * Delete product
   */
  static async delete(id) {
    const pool = await db.getPool();
    const idStr = this.normalizeId(id);
    const result = await pool
      .request()
      .input("id", db.sql.NVarChar, idStr)
      .query("DELETE FROM Products WHERE Id = CONVERT(UNIQUEIDENTIFIER, @id)");

    return result.rowsAffected[0] > 0;
  }
}

module.exports = ProductModel;
