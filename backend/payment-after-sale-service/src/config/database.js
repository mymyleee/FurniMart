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
  async query(queryString, params = {}) {
    try {
      const pool = this.getPool();
      const request = pool.request();

      // Add parameters
      Object.keys(params).forEach(key => {
        request.input(key, params[key]);
      });

      const result = await request.query(queryString);
      return result;
    } catch (error) {
      console.error('❌ Lỗi thực thi query:', error);
      throw error;
    }
  }

  /**
   * Đóng kết nối
   */
  async close() {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
        console.log('✅ Đã đóng kết nối database');
      }
    } catch (error) {
      console.error('❌ Lỗi đóng kết nối:', error);
      throw error;
    }
  }
}

// Export singleton instance
const database = new Database();
module.exports = database;
