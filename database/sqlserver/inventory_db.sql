-- Inventory Database Schema
-- FurniMart Inventory Service

SET QUOTED_IDENTIFIER ON;
GO

USE master;
GO

-- Drop database if exists and recreate
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'inventory_db')
BEGIN
    ALTER DATABASE inventory_db SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE inventory_db;
END
GO

-- Create Inventory Database
CREATE DATABASE inventory_db;
GO

USE inventory_db;
GO

-- ============================================
-- BRANCHES TABLE (Reference)
-- ============================================
CREATE TABLE Branches (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) NOT NULL,
    Location NVARCHAR(500) NOT NULL,
    Address NVARCHAR(500) NULL,
    Phone NVARCHAR(20) NULL,
    Email NVARCHAR(255) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ============================================
-- PRODUCTS TABLE (Reference)
-- ============================================
CREATE TABLE Products (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) NOT NULL,
    SKU NVARCHAR(100) NOT NULL UNIQUE,
    CategoryId INT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ============================================
-- USERS TABLE (Reference for audit)
-- ============================================
CREATE TABLE Users (
    Id NVARCHAR(36) PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    FullName NVARCHAR(255) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ============================================
-- BRANCH INVENTORY TABLE
-- ============================================
CREATE TABLE BranchInventory (
    Id NVARCHAR(36) PRIMARY KEY,
    BranchId INT NOT NULL,
    ProductId INT NOT NULL,
    QuantityOnHand INT NOT NULL DEFAULT 0 CHECK (QuantityOnHand >= 0),
    QuantityReserved INT NOT NULL DEFAULT 0 CHECK (QuantityReserved >= 0),
    MinimumStockLevel INT NOT NULL DEFAULT 10 CHECK (MinimumStockLevel >= 0),
    LastRestockDate DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_BranchInventory_Branch FOREIGN KEY (BranchId) REFERENCES Branches(Id),
    CONSTRAINT FK_BranchInventory_Product FOREIGN KEY (ProductId) REFERENCES Products(Id),
    CONSTRAINT UQ_BranchInventory_BranchProduct UNIQUE(BranchId, ProductId)
);
GO

-- Add computed column
ALTER TABLE BranchInventory 
ADD QuantityAvailable AS (QuantityOnHand - QuantityReserved) PERSISTED;
GO

-- Indexes for BranchInventory
CREATE INDEX IX_BranchInventory_BranchId ON BranchInventory(BranchId);
GO
CREATE INDEX IX_BranchInventory_ProductId ON BranchInventory(ProductId);
GO
CREATE INDEX IX_BranchInventory_QuantityAvailable ON BranchInventory(QuantityAvailable);
GO
CREATE INDEX IX_BranchInventory_UpdatedAt ON BranchInventory(UpdatedAt DESC);
GO

-- ============================================
-- STOCK MOVEMENTS TABLE
-- ============================================
CREATE TABLE StockMovements (
    Id NVARCHAR(36) PRIMARY KEY,
    BranchId INT NOT NULL,
    ProductId INT NOT NULL,
    MovementType NVARCHAR(50) NOT NULL,
    Quantity INT NOT NULL CHECK (Quantity > 0),
    Reason NVARCHAR(500) NULL,
    ReferenceId NVARCHAR(100) NULL,
    BalanceBefore INT NOT NULL,
    BalanceAfter INT NOT NULL,
    CreatedBy NVARCHAR(36) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_StockMovements_Branch FOREIGN KEY (BranchId) REFERENCES Branches(Id),
    CONSTRAINT FK_StockMovements_Product FOREIGN KEY (ProductId) REFERENCES Products(Id),
    CONSTRAINT FK_StockMovements_User FOREIGN KEY (CreatedBy) REFERENCES Users(Id)
);
GO

-- Indexes for StockMovements
CREATE INDEX IX_StockMovements_BranchId ON StockMovements(BranchId);
GO
CREATE INDEX IX_StockMovements_ProductId ON StockMovements(ProductId);
GO
CREATE INDEX IX_StockMovements_MovementType ON StockMovements(MovementType);
GO
CREATE INDEX IX_StockMovements_CreatedAt ON StockMovements(CreatedAt DESC);
GO
CREATE INDEX IX_StockMovements_ReferenceId ON StockMovements(ReferenceId);
GO

-- ============================================
-- STOCK ALERTS TABLE
-- ============================================
CREATE TABLE StockAlerts (
    Id NVARCHAR(36) PRIMARY KEY,
    BranchId INT NOT NULL,
    ProductId INT NOT NULL,
    AlertType NVARCHAR(50) NOT NULL,
    CurrentStock INT NOT NULL,
    ThresholdLevel INT NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Active',
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ResolvedAt DATETIME2 NULL,
    CONSTRAINT FK_StockAlerts_Branch FOREIGN KEY (BranchId) REFERENCES Branches(Id),
    CONSTRAINT FK_StockAlerts_Product FOREIGN KEY (ProductId) REFERENCES Products(Id)
);
GO

-- Indexes for StockAlerts
CREATE INDEX IX_StockAlerts_BranchId ON StockAlerts(BranchId);
GO
CREATE INDEX IX_StockAlerts_ProductId ON StockAlerts(ProductId);
GO
CREATE INDEX IX_StockAlerts_Status ON StockAlerts(Status);
GO
CREATE INDEX IX_StockAlerts_AlertType ON StockAlerts(AlertType);
GO
CREATE INDEX IX_StockAlerts_CreatedAt ON StockAlerts(CreatedAt DESC);
GO

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Get Low Stock Inventory
CREATE PROCEDURE sp_GetLowStockInventory
    @BranchId INT = NULL
AS
BEGIN
    SELECT 
        bi.Id,
        bi.BranchId,
        b.Name as BranchName,
        bi.ProductId,
        p.Name as ProductName,
        bi.QuantityOnHand,
        bi.QuantityReserved,
        bi.QuantityAvailable,
        bi.MinimumStockLevel,
        (bi.MinimumStockLevel - bi.QuantityAvailable) as ShortageQuantity
    FROM BranchInventory bi
    INNER JOIN Branches b ON bi.BranchId = b.Id
    INNER JOIN Products p ON bi.ProductId = p.Id
    WHERE bi.QuantityAvailable <= bi.MinimumStockLevel
        AND (@BranchId IS NULL OR bi.BranchId = @BranchId)
    ORDER BY ShortageQuantity DESC, bi.UpdatedAt DESC;
END
GO

-- Get Product Availability Summary
CREATE PROCEDURE sp_GetProductAvailabilitySummary
    @ProductId INT
AS
BEGIN
    SELECT 
        bi.ProductId,
        p.Name as ProductName,
        p.SKU,
        SUM(bi.QuantityOnHand) as TotalOnHand,
        SUM(bi.QuantityReserved) as TotalReserved,
        SUM(bi.QuantityAvailable) as TotalAvailable,
        COUNT(DISTINCT bi.BranchId) as BranchesWithStock
    FROM BranchInventory bi
    INNER JOIN Products p ON bi.ProductId = p.Id
    WHERE bi.ProductId = @ProductId
    GROUP BY bi.ProductId, p.Name, p.SKU;
END
GO

-- Get Branch Inventory Report
CREATE PROCEDURE sp_GetBranchInventoryReport
    @BranchId INT,
    @StartDate DATETIME2,
    @EndDate DATETIME2
AS
BEGIN
    SELECT 
        sm.MovementType,
        COUNT(*) as TotalMovements,
        SUM(sm.Quantity) as TotalQuantity,
        CAST(AVG(CAST(sm.Quantity as DECIMAL(10,2))) as DECIMAL(10,2)) as AvgQuantity
    FROM StockMovements sm
    WHERE sm.BranchId = @BranchId
        AND sm.CreatedAt >= @StartDate
        AND sm.CreatedAt <= @EndDate
    GROUP BY sm.MovementType
    ORDER BY TotalQuantity DESC;
END
GO

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Insert Branches
INSERT INTO Branches (Name, Location, Address, Phone, Email, IsActive)
VALUES 
    (N'Chi nhánh TP.HCM', N'TP. Hồ Chí Minh', N'123 Nguyễn Hue, Q.1, TP.HCM', '028-3822-5555', 'tphcm@furnimart.com', 1),
    (N'Chi nhánh Hà Nội', N'Hà Nội', N'456 Hai Bà Trưng, Q. Hoàn Kiếm, Hà Nội', '024-3933-5555', 'hanoi@furnimart.com', 1),
    (N'Chi nhánh Đà Nẵng', N'Đà Nẵng', N'789 Trần Phú, Q. Hải Châu, Đà Nẵng', '0236-381-5555', 'danang@furnimart.com', 1);
GO

-- Insert Users
INSERT INTO Users (Id, Email, FullName, IsActive)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'admin@furnimart.com', 'Admin User', 1),
    ('550e8400-e29b-41d4-a716-446655440001', 'warehouse@furnimart.com', 'Warehouse Staff', 1),
    ('550e8400-e29b-41d4-a716-446655440002', 'manager@furnimart.com', 'Branch Manager', 1);
GO

PRINT 'Inventory database schema created successfully!';
PRINT 'Tables created: Branches, Products, Users, BranchInventory, StockMovements, StockAlerts';
PRINT 'Computed column QuantityAvailable added to BranchInventory table';
PRINT 'Sample data inserted: 3 Branches, 3 Users';
PRINT 'All indexes created for optimal query performance';
PRINT 'Stored procedures created: sp_GetLowStockInventory, sp_GetProductAvailabilitySummary, sp_GetBranchInventoryReport';


