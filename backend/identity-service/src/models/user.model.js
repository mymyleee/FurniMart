const db = require("../config/database");
const { hashPassword } = require("../utils/password.utils");

class UserModel {
  /**
   * Tìm user theo email
   */
  static async findByEmail(email) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("email", db.sql.NVarChar, email)
      .query(`
        SELECT 
          u.Id,
          u.Email,
          u.PasswordHash,
          u.FullName,
          u.Phone,
          u.RoleId,
          u.Status,
          u.EmailVerified,
          u.PhoneVerified,
          u.LastLoginAt,
          u.CreatedAt,
          u.UpdatedAt,
          r.Name as RoleName,
          r.Description as RoleDescription
        FROM Users u
        INNER JOIN Roles r ON u.RoleId = r.Id
        WHERE u.Email = @email
      `);

    const user = result.recordset[0];
    if (user && user.Id) {
      // Normalize user.Id to string if needed
      let userId = user.Id;
      if (Buffer.isBuffer(userId)) {
        const hex = userId.toString('hex');
        userId = [
          hex.substr(0, 8),
          hex.substr(8, 4),
          hex.substr(12, 4),
          hex.substr(16, 4),
          hex.substr(20, 12)
        ].join('-').toUpperCase();
      } else if (typeof userId !== 'string') {
        userId = String(userId).toUpperCase();
      } else {
        userId = userId.toUpperCase();
      }
      user.Id = userId;
    }

    return user || null;
  }

  /**
   * Tìm user theo ID
   */
  static async findById(userId) {
    const pool = await db.getPool();
    
    // Đảm bảo userId là UUID string hợp lệ
    let userIdStr = userId;
    if (Buffer.isBuffer(userIdStr)) {
      const hex = userIdStr.toString('hex');
      userIdStr = [
        hex.substr(0, 8),
        hex.substr(8, 4),
        hex.substr(12, 4),
        hex.substr(16, 4),
        hex.substr(20, 12)
      ].join('-');
    } else if (typeof userIdStr !== 'string') {
      userIdStr = String(userIdStr);
    }
    
    // Trim và đảm bảo uppercase (SQL Server UniqueIdentifier không phân biệt hoa thường nhưng nên chuẩn hóa)
    userIdStr = userIdStr.trim().toUpperCase();
    
    // Sử dụng CONVERT để đảm bảo xử lý UUID đúng cách
    const result = await pool
      .request()
      .input("idStr", db.sql.NVarChar(36), userIdStr)
      .query(`
        SELECT 
          u.Id,
          u.Email,
          u.FullName,
          u.Phone,
          u.RoleId,
          u.Status,
          u.EmailVerified,
          u.PhoneVerified,
          u.LastLoginAt,
          u.CreatedAt,
          u.UpdatedAt,
          r.Name as RoleName,
          r.Description as RoleDescription
        FROM Users u
        INNER JOIN Roles r ON u.RoleId = r.Id
        WHERE u.Id = CONVERT(UNIQUEIDENTIFIER, @idStr)
      `);

    const user = result.recordset[0];
    if (user && user.Id) {
      // Normalize user.Id to string if needed
      let userId = user.Id;
      if (Buffer.isBuffer(userId)) {
        const hex = userId.toString('hex');
        userId = [
          hex.substr(0, 8),
          hex.substr(8, 4),
          hex.substr(12, 4),
          hex.substr(16, 4),
          hex.substr(20, 12)
        ].join('-').toUpperCase();
      } else if (typeof userId !== 'string') {
        userId = String(userId).toUpperCase();
      } else {
        userId = userId.toUpperCase();
      }
      user.Id = userId;
    }

    return user || null;
  }

  /**
   * Tạo user mới
   */
  static async create(userData) {
    const pool = await db.getPool();
    const passwordHash = await hashPassword(userData.password);

    // Lấy role ID theo tên
    const roleResult = await pool
      .request()
      .input("roleName", db.sql.NVarChar, userData.role || "CUSTOMER")
      .query("SELECT Id FROM Roles WHERE Name = @roleName");

    if (roleResult.recordset.length === 0) {
      throw new Error("Invalid role");
    }

    const roleId = roleResult.recordset[0].Id;

    const result = await pool
      .request()
      .input("email", db.sql.NVarChar, userData.email)
      .input("passwordHash", db.sql.NVarChar, passwordHash)
      .input("fullName", db.sql.NVarChar, userData.fullName)
      .input("phone", db.sql.NVarChar, userData.phone || null)
      .input("roleId", db.sql.Int, roleId)
      .input("status", db.sql.NVarChar, userData.status || "ACTIVE")
      .query(`
        INSERT INTO Users (Email, PasswordHash, FullName, Phone, RoleId, Status)
        OUTPUT INSERTED.Id, INSERTED.Email, INSERTED.FullName, INSERTED.Phone, 
               INSERTED.RoleId, INSERTED.Status, INSERTED.CreatedAt
        VALUES (@email, @passwordHash, @fullName, @phone, @roleId, @status)
      `);

    const user = result.recordset[0];

    // Chuẩn hóa user.Id thành string nếu cần (SQL Server UniqueIdentifier có thể là Buffer)
    if (user && user.Id) {
      let userId = user.Id;
      if (Buffer.isBuffer(userId)) {
        const hex = userId.toString('hex');
        userId = [
          hex.substr(0, 8),
          hex.substr(8, 4),
          hex.substr(12, 4),
          hex.substr(16, 4),
          hex.substr(20, 12)
        ].join('-').toUpperCase();
      } else if (typeof userId !== 'string') {
        userId = String(userId).toUpperCase();
      } else {
        userId = userId.toUpperCase();
      }
      user.Id = userId;
    }

    // Lấy tên role
    const roleNameResult = await pool
      .request()
      .input("roleId", db.sql.Int, roleId)
      .query("SELECT Name FROM Roles WHERE Id = @roleId");

    return {
      ...user,
      roleName: roleNameResult.recordset[0].Name,
    };
  }

  /**
   * Cập nhật thời gian đăng nhập cuối cùng
   */
  static async updateLastLogin(userId) {
    const pool = await db.getPool();
    await pool
      .request()
      .input("id", db.sql.UniqueIdentifier, userId)
      .query("UPDATE Users SET LastLoginAt = GETUTCDATE() WHERE Id = @id");
  }

  /**
   * Cập nhật trạng thái user
   */
  static async updateStatus(userId, status) {
    const pool = await db.getPool();
    
    // Chuẩn hóa userId
    let userIdStr = userId;
    if (typeof userIdStr !== "string") {
      userIdStr = String(userIdStr);
    }
    userIdStr = userIdStr.trim().toUpperCase();
    
    await pool
      .request()
      .input("idStr", db.sql.NVarChar(36), userIdStr)
      .input("status", db.sql.NVarChar, status)
      .query(`
        UPDATE Users 
        SET Status = @status 
        WHERE Id = CONVERT(UNIQUEIDENTIFIER, @idStr)
      `);
  }

  /**
   * Cập nhật mật khẩu user
   */
  static async updatePassword(userId, newPassword) {
    const pool = await db.getPool();
    const passwordHash = await hashPassword(newPassword);
    await pool
      .request()
      .input("id", db.sql.UniqueIdentifier, userId)
      .input("passwordHash", db.sql.NVarChar, passwordHash)
      .query("UPDATE Users SET PasswordHash = @passwordHash WHERE Id = @id");
  }

  /**
   * Kiểm tra email đã tồn tại chưa
   */
  static async emailExists(email) {
    const pool = await db.getPool();
    const result = await pool
      .request()
      .input("email", db.sql.NVarChar, email)
      .query("SELECT COUNT(*) as count FROM Users WHERE Email = @email");

    return result.recordset[0].count > 0;
  }
}

module.exports = UserModel;

