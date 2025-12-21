-- Order Database Schema
-- FurniMart Order Service

USE master;
GO

-- Create Order Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'order_db')
BEGIN
    CREATE DATABASE order_db;
END
GO

USE order_db;
GO

-- Note: This is a placeholder schema
-- Actual tables will be created during service implementation

-- Example structure (to be implemented):
-- Orders table
-- OrderItems table
-- OrderStatusHistory table
-- Invoices table
-- etc.

PRINT 'Order database initialized (placeholder)';
GO


