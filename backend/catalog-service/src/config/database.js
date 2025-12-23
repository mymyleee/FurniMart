const sql = require("mssql");

const config = {
  user: process.env.SQL_SERVER_USER || "sa",
  password: process.env.SQL_SERVER_PASSWORD || "FurniMart@2024",
  server: process.env.SQL_SERVER_HOST || "sqlserver",
  database: "catalog_db",
  port: parseInt(process.env.SQL_SERVER_PORT || "1433"),
  options: {
    encrypt: false, // Đặt true cho Azure
    trustServerCertificate: true, // Cho local development
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

async function connect() {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log("✅ Connected to SQL Server - catalog_db");
    }
    return pool;
  } catch (error) {
    console.error("❌ Database connection error:", error);
    throw error;
  }
}

async function getPool() {
  if (!pool) {
    await connect();
  }
  return pool;
}

async function disconnect() {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log("✅ Database connection closed");
    }
  } catch (error) {
    console.error("❌ Error closing database connection:", error);
    throw error;
  }
}

module.exports = {
  connect,
  getPool,
  disconnect,
  sql,
};
