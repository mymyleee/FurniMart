require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const db = require("./config/database");
const { errorHandler } = require("./middleware/error.middleware");
const inventoryRoutes = require("./routes/inventory.routes");

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware bảo mật
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

// Giới hạn tốc độ request
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // giới hạn mỗi IP 100 requests trong windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "inventory-service",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/inventory", inventoryRoutes);

// Global error handler
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Server startup
async function start() {
  try {
    // Kết nối database
    await db.connect();

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════╗
║       Inventory Service                    ║
║       Running on port ${PORT}              ║
║       Environment: ${process.env.NODE_ENV || "development"}     ║
╚════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  await db.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server");
  await db.disconnect();
  process.exit(0);
});

start();

module.exports = app;
