require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const db = require("./config/database");
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");
const productImageRoutes = require("./routes/productImage.routes");
const product3DModelRoutes = require("./routes/product3DModel.routes");
const productAttributeRoutes = require("./routes/productAttribute.routes");
const reviewRoutes = require("./routes/review.routes");
const { errorHandler } = require("./middleware/error.middleware");

const app = express();
const PORT = process.env.PORT || 5002;

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
    service: "catalog-service",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/products", productImageRoutes);
app.use("/api/products", product3DModelRoutes);
app.use("/api/products", productAttributeRoutes);
app.use("/api/products", reviewRoutes);

// Debug logging middleware (chỉ cho development)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
  });
}

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.url,
    method: req.method,
  });
});

// Error handling middleware
app.use(errorHandler);

// Khởi động server
async function startServer() {
  try {
    // Kết nối database
    await db.connect();

    // Bắt đầu lắng nghe
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Catalog Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });

    // Tắt server một cách graceful
    process.on("SIGTERM", async () => {
      console.log("SIGTERM received, shutting down gracefully");
      await db.disconnect();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      console.log("SIGINT received, shutting down gracefully");
      await db.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
