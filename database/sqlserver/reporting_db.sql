-- Reporting Database Schema
-- FurniMart Reporting Service

USE master;
GO

-- Create Reporting Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'reporting_db')
BEGIN
    CREATE DATABASE reporting_db;
END
GO

USE reporting_db;
GO

-- Note: This is a placeholder schema
-- Actual tables will be created during service implementation

-- Example structure (to be implemented):
-- ReportConfigs table
-- ReportHistory table
-- AnalyticsCache table
-- etc.

PRINT 'Reporting database initialized (placeholder)';
GO


