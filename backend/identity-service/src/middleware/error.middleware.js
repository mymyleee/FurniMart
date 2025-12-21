/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error("Error:", err);

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors || err.message,
    });
  }

  // Database errors
  if (err.name === "RequestError" || err.code === "EREQUEST") {
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
}

module.exports = {
  errorHandler,
};
