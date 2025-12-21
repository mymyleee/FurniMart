-- Payment Database Schema
-- FurniMart Payment & After-Sale Service

USE master;
GO

-- Create Payment Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'payment_db')
BEGIN
    CREATE DATABASE payment_db;
END
GO

USE payment_db;
GO

-- ================================================
-- Bảng Payments: Lưu thông tin thanh toán
-- ================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Payments]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Payments] (
        [payment_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [order_id] UNIQUEIDENTIFIER NOT NULL,
        [user_id] UNIQUEIDENTIFIER NOT NULL,
        [payment_method] NVARCHAR(50) NOT NULL, -- VNPAY, ZaloPay, MoMo, COD
        [amount] DECIMAL(18, 2) NOT NULL,
        [currency] NVARCHAR(10) DEFAULT 'VND',
        [status] NVARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, CANCELLED
        [transaction_id] NVARCHAR(255) NULL, -- ID từ payment gateway
        [gateway_response] NVARCHAR(MAX) NULL, -- Response từ gateway (JSON)
        [payment_url] NVARCHAR(500) NULL, -- URL redirect
        [callback_data] NVARCHAR(MAX) NULL, -- Callback data từ IPN (JSON)
        [verified_at] DATETIME2 NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        
        INDEX idx_order_id (order_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_transaction_id (transaction_id)
    );
END
GO

-- ================================================
-- Bảng PaymentTransactions: Log tất cả giao dịch
-- ================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PaymentTransactions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PaymentTransactions] (
        [transaction_log_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [payment_id] UNIQUEIDENTIFIER NOT NULL,
        [action] NVARCHAR(100) NOT NULL, -- CREATE, CALLBACK, VERIFY, UPDATE_STATUS
        [request_data] NVARCHAR(MAX) NULL, -- Request data (JSON)
        [response_data] NVARCHAR(MAX) NULL, -- Response data (JSON)
        [ip_address] NVARCHAR(50) NULL,
        [user_agent] NVARCHAR(500) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        
        FOREIGN KEY (payment_id) REFERENCES Payments(payment_id),
        INDEX idx_payment_id (payment_id),
        INDEX idx_created_at (created_at)
    );
END
GO

-- ================================================
-- Bảng AfterSaleRequests: Yêu cầu hậu mãi
-- ================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AfterSaleRequests]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AfterSaleRequests] (
        [request_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [order_id] UNIQUEIDENTIFIER NOT NULL,
        [user_id] UNIQUEIDENTIFIER NOT NULL,
        [request_type] NVARCHAR(50) NOT NULL, -- WARRANTY, RETURN, REFUND, EXCHANGE, ASSEMBLY
        [reason] NVARCHAR(500) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [attachments] NVARCHAR(MAX) NULL, -- JSON array of image URLs
        [status] NVARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED
        [priority] NVARCHAR(20) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
        [assigned_to] UNIQUEIDENTIFIER NULL, -- Staff ID xử lý
        [resolution_notes] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        [resolved_at] DATETIME2 NULL,
        
        INDEX idx_order_id (order_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
    );
END
GO

-- ================================================
-- Bảng AfterSaleStatusLogs: Log thay đổi trạng thái
-- ================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AfterSaleStatusLogs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AfterSaleStatusLogs] (
        [log_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [request_id] UNIQUEIDENTIFIER NOT NULL,
        [old_status] NVARCHAR(50) NULL,
        [new_status] NVARCHAR(50) NOT NULL,
        [changed_by] UNIQUEIDENTIFIER NOT NULL, -- User ID hoặc Staff ID
        [notes] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        
        FOREIGN KEY (request_id) REFERENCES AfterSaleRequests(request_id),
        INDEX idx_request_id (request_id),
        INDEX idx_created_at (created_at)
    );
END
GO

-- ================================================
-- Bảng Refunds: Hoàn tiền
-- ================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Refunds]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Refunds] (
        [refund_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [payment_id] UNIQUEIDENTIFIER NOT NULL,
        [request_id] UNIQUEIDENTIFIER NULL, -- Liên kết với yêu cầu hậu mãi (nếu có)
        [amount] DECIMAL(18, 2) NOT NULL,
        [reason] NVARCHAR(500) NOT NULL,
        [refund_method] NVARCHAR(50) NULL, -- ORIGINAL_PAYMENT, BANK_TRANSFER
        [bank_account] NVARCHAR(MAX) NULL, -- JSON: bank details
        [status] NVARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
        [processed_at] DATETIME2 NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        
        FOREIGN KEY (payment_id) REFERENCES Payments(payment_id),
        FOREIGN KEY (request_id) REFERENCES AfterSaleRequests(request_id),
        INDEX idx_payment_id (payment_id),
        INDEX idx_request_id (request_id),
        INDEX idx_status (status)
    );
END
GO

PRINT 'Payment database schema created successfully!';
GO


