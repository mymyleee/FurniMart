const db = require("../config/database");

class RefreshTokenModel {
  /**
   * Create refresh token
   */
  static async create(tokenData) {
    const pool = await db.getPool();

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Ensure userId is a valid UUID string
    let userId = tokenData.userId;

    // Convert to string if needed
    if (Buffer.isBuffer(userId)) {
      // Convert Buffer to UUID string format
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

    // Trim whitespace and ensure valid UUID format
    userId = userId.trim();

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error(`Invalid UUID format: ${userId}`);
    }

    // Debug logging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log(
        "Creating refresh token with userId:",
        userId,
        "Type:",
        typeof userId
      );
    }

    // Use CONVERT in SQL to convert string to UniqueIdentifier (more reliable than CAST)
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
   * Find refresh token
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
      // Ensure UserId is properly set and converted to string if needed
      // SQL Server UniqueIdentifier can be returned as Buffer or string
      let userId = tokenData.UserId || tokenData.UserIdValue;

      if (Buffer.isBuffer(userId)) {
        // Convert Buffer to UUID string format
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
        // If it's a GUID type object from mssql, convert to string
        userId = userId.toString();
      } else if (typeof userId !== "string") {
        userId = String(userId);
      }

      // Ensure it's a valid UUID format string
      userId = userId.trim();

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (userId && !uuidRegex.test(userId)) {
        console.warn("Warning: userId does not match UUID format:", userId);
      }

      tokenData.UserId = userId;

      // Remove the duplicate field if exists
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
   * Revoke refresh token
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
   * Revoke all refresh tokens for user
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
   * Delete expired tokens (cleanup)
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
