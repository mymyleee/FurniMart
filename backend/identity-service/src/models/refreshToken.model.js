const db = require("../config/database");

class RefreshTokenModel {
  /**
   * Tạo refresh token
   */
  static async create(tokenData) {
    const pool = await db.getPool();

    // Tính toán ngày hết hạn
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 ngày

    // Đảm bảo userId là UUID string hợp lệ
    let userId = tokenData.userId;

    // Chuyển đổi sang string nếu cần
    if (Buffer.isBuffer(userId)) {
      // Chuyển đổi Buffer sang định dạng UUID string
      const hex = userId.toString("hex");
      userId = [
        hex.substr(0, 8),
        hex.substr(8, 4),
        hex.substr(12, 4),
        hex.substr(16, 4),
        hex.substr(20, 12),
      ].join("-");
    } else if (
      userId &&
      typeof userId === "object" &&
      userId.constructor &&
      userId.constructor.name === "TYPES"
    ) {
      // If it's a GUID type object, convert to string
      userId = userId.toString();
    } else if (typeof userId !== "string") {
      userId = String(userId);
    }

    // Trim khoảng trắng và đảm bảo format UUID hợp lệ
    userId = userId.trim();

    // Kiểm tra format UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error(`Invalid UUID format: ${userId}`);
    }

    // Debug logging (chỉ trong development)
    if (process.env.NODE_ENV === "development") {
      console.log(
        "Creating refresh token with userId:",
        userId,
        "Type:",
        typeof userId
      );
    }

    // Sử dụng CONVERT trong SQL để chuyển string sang UniqueIdentifier (đáng tin cậy hơn CAST)
    const result = await pool
      .request()
      .input("userIdStr", db.sql.NVarChar(36), userId)
      .input("token", db.sql.NVarChar, tokenData.token)
      .input("expiresAt", db.sql.DateTime2, expiresAt)
      .input("createdByIp", db.sql.NVarChar, tokenData.ip || null).query(`
        INSERT INTO RefreshTokens (UserId, Token, ExpiresAt, CreatedByIp)
        OUTPUT INSERTED.Id, INSERTED.Token, INSERTED.ExpiresAt, INSERTED.CreatedAt
        VALUES (CONVERT(UNIQUEIDENTIFIER, @userIdStr), @token, @expiresAt, @createdByIp)
      `);

    return result.recordset[0];
  }

  /**
   * Tìm refresh token
   */
  static async findByToken(token) {
    const pool = await db.getPool();
    const result = await pool.request().input("token", db.sql.NVarChar, token)
      .query(`
        SELECT 
          rt.Id,
          rt.UserId,
          rt.Token,
          rt.ExpiresAt,
          rt.CreatedAt,
          rt.RevokedAt,
          rt.RevokedByIp,
          rt.ReplacedByToken,
          u.Id as UserIdValue,
          u.Email,
          u.RoleId,
          r.Name as RoleName
        FROM RefreshTokens rt
        INNER JOIN Users u ON rt.UserId = u.Id
        INNER JOIN Roles r ON u.RoleId = r.Id
        WHERE rt.Token = @token 
          AND rt.RevokedAt IS NULL
          AND rt.ExpiresAt > GETUTCDATE()
      `);

    const tokenData = result.recordset[0];
    if (tokenData) {
      // Đảm bảo UserId được set đúng và chuyển đổi sang string nếu cần
      // SQL Server UniqueIdentifier có thể được trả về dưới dạng Buffer hoặc string
      let userId = tokenData.UserId || tokenData.UserIdValue;

      if (Buffer.isBuffer(userId)) {
        // Chuyển đổi Buffer sang định dạng UUID string
        const hex = userId.toString("hex");
        userId = [
          hex.substr(0, 8),
          hex.substr(8, 4),
          hex.substr(12, 4),
          hex.substr(16, 4),
          hex.substr(20, 12),
        ].join("-");
      } else if (
        userId &&
        typeof userId === "object" &&
        userId.constructor &&
        userId.constructor.name === "TYPES"
      ) {
        // Nếu là object kiểu GUID từ mssql, chuyển đổi sang string
        userId = userId.toString();
      } else if (typeof userId !== "string") {
        userId = String(userId);
      }

      // Đảm bảo là UUID format string hợp lệ
      userId = userId.trim();

      // Kiểm tra format UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (userId && !uuidRegex.test(userId)) {
        console.warn("Warning: userId does not match UUID format:", userId);
      }

      tokenData.UserId = userId;

      // Xóa field trùng lặp nếu có
      if (tokenData.UserIdValue) {
        delete tokenData.UserIdValue;
      }

      if (process.env.NODE_ENV === "development") {
        console.log(
          "Found refresh token, converted userId:",
          userId,
          "Type:",
          typeof userId
        );
      }
    }

    return tokenData || null;
  }

  /**
   * Hủy refresh token
   */
  static async revoke(token, replacedByToken = null, revokedByIp = null) {
    const pool = await db.getPool();
    await pool
      .request()
      .input("token", db.sql.NVarChar, token)
      .input("replacedByToken", db.sql.NVarChar, replacedByToken)
      .input("revokedByIp", db.sql.NVarChar, revokedByIp).query(`
        UPDATE RefreshTokens 
        SET RevokedAt = GETUTCDATE(),
            RevokedByIp = @revokedByIp,
            ReplacedByToken = @replacedByToken
        WHERE Token = @token
      `);
  }

  /**
   * Hủy tất cả refresh tokens của user
   */
  static async revokeAllForUser(userId, revokedByIp = null) {
    const pool = await db.getPool();
    await pool
      .request()
      .input("userId", db.sql.UniqueIdentifier, userId)
      .input("revokedByIp", db.sql.NVarChar, revokedByIp).query(`
        UPDATE RefreshTokens 
        SET RevokedAt = GETUTCDATE(),
            RevokedByIp = @revokedByIp
        WHERE UserId = @userId AND RevokedAt IS NULL
      `);
  }

  /**
   * Xóa tokens đã hết hạn (dọn dẹp)
   */
  static async deleteExpired() {
    const pool = await db.getPool();
    await pool.query(`
      DELETE FROM RefreshTokens 
      WHERE ExpiresAt < GETUTCDATE() 
        OR (RevokedAt IS NOT NULL AND RevokedAt < DATEADD(day, -30, GETUTCDATE()))
    `);
  }
}

module.exports = RefreshTokenModel;
