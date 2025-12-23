/**
 * Middleware xử lý lỗi
 */
function errorHandler(err, req, res, next) {
  console.error("Error:", err);

  // Lỗi validation
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors || err.message,
    });
  }

  // Lỗi database
  if (err.name === "RequestError" || err.code === "EREQUEST") {
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    });
  }

  // Lỗi mặc định
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
}

module.exports = {
  errorHandler,
};
