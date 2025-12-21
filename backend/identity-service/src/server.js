require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const db = require("./config/database");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const { errorHandler } = require("./middleware/error.middleware");

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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
    service: "identity-service",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Debug logging middleware (only for development)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
  });
}

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);

  // Provide helpful message for common mistakes
  let hint = "";
  if (req.url === "/api/auth/refresh" && req.method === "GET") {
    hint = "Hint: /api/auth/refresh requires POST method, not GET";
  } else if (req.url.startsWith("/api/auth/") && !req.url.includes("/me")) {
    const expectedMethod =
      req.url.includes("/refresh") ||
      req.url.includes("/logout") ||
      req.url.includes("/login") ||
      req.url.includes("/register")
        ? "POST"
        : "";
    if (expectedMethod && req.method !== expectedMethod) {
      hint = `Hint: This endpoint requires ${expectedMethod} method, not ${req.method}`;
    }
  }

  res.status(404).json({
    success: false,
    message: "Route not found" + (hint ? ` - ${hint}` : ""),
    path: req.url,
    method: req.method,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to database
    await db.connect();

    // Start listening
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Identity Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
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
