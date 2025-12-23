const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Lỗi SQL Server
  if (err.number) {
    if (err.number === 2627) {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry",
        error: err.message,
      });
    }
    if (err.number === 547) {
      return res.status(409).json({
        success: false,
        message: "Cannot perform operation due to foreign key constraints",
        error: err.message,
      });
    }
  }

  // Lỗi validation
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      error: err.message,
    });
  }

  // Lỗi mặc định
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
