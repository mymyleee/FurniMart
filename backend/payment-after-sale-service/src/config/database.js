/**
 * Database Connection cho Payment & After-Sale Service
 * Kết nối đến SQL Server sử dụng mssql
 */

const sql = require('mssql');
const config = require('./index');

class Database {
  constructor() {
    this.pool = null;
    this.config = config.database;
  }

  /**
   * Khởi tạo connection pool
   */
  async connect() {
    try {
      if (this.pool) {
        return this.pool;
      }

      console.log('🔌 Đang kết nối đến database...');
      this.pool = await sql.connect(this.config);
      console.log('✅ Kết nối database thành công!');
      
      return this.pool;
    } catch (error) {
      console.error('❌ Lỗi kết nối database:', error);
      throw error;
    }
  }

  /**
   * Lấy pool hiện tại
   */
  getPool() {
    if (!this.pool) {
      throw new Error('Database chưa được kết nối. Vui lòng gọi connect() trước.');
    }
    return this.pool;
  }

  /**
   * Thực thi query
   */
