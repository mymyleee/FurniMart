-- Sample Inventory Data for Testing
-- This script inserts sample product inventory for each branch

USE inventory_db;

SET QUOTED_IDENTIFIER ON;
SET ARITHABORT ON;

-- Step 1: Insert sample products (for testing only)
-- Note: In production, these should come from catalog_db
INSERT INTO Products (Name, SKU, CategoryId, IsActive)
VALUES
  (N'Sofa Da', 'SOFA-001', 1, 1),
  (N'Ghế Gỗ', 'CHAIR-001', 1, 1),
  (N'Bàn Ăn', 'TABLE-001', 2, 1),
  (N'Tủ Kệ', 'SHELF-001', 3, 1);

-- Step 2: Insert inventory for each branch
-- HCMC Branch (BranchId = 1)
INSERT INTO BranchInventory 
  (Id, BranchId, ProductId, QuantityOnHand, QuantityReserved, MinimumStockLevel, LastRestockDate)
VALUES
  (NEWID(), 1, 1, 150, 10, 20, GETDATE()),     -- Sofa: 150 units, 10 reserved
  (NEWID(), 1, 2, 75, 5, 15, GETDATE()),       -- Chair: 75 units, 5 reserved
  (NEWID(), 1, 3, 200, 20, 30, GETDATE()),     -- Table: 200 units, 20 reserved
  (NEWID(), 1, 4, 45, 0, 10, GETDATE());       -- Shelf: 45 units, none reserved

-- Hanoi Branch (BranchId = 2)
INSERT INTO BranchInventory 
  (Id, BranchId, ProductId, QuantityOnHand, QuantityReserved, MinimumStockLevel, LastRestockDate)
VALUES
  (NEWID(), 2, 1, 120, 8, 20, GETDATE()),      -- Sofa: 120 units, 8 reserved
  (NEWID(), 2, 2, 60, 0, 15, GETDATE()),       -- Chair: 60 units, none reserved
  (NEWID(), 2, 3, 180, 15, 30, GETDATE()),     -- Table: 180 units, 15 reserved
  (NEWID(), 2, 4, 50, 5, 10, GETDATE());       -- Shelf: 50 units, 5 reserved

-- Da Nang Branch (BranchId = 3)
INSERT INTO BranchInventory 
  (Id, BranchId, ProductId, QuantityOnHand, QuantityReserved, MinimumStockLevel, LastRestockDate)
VALUES
  (NEWID(), 3, 1, 100, 5, 20, GETDATE()),      -- Sofa: 100 units, 5 reserved
  (NEWID(), 3, 2, 90, 12, 15, GETDATE()),      -- Chair: 90 units, 12 reserved
  (NEWID(), 3, 3, 150, 0, 30, GETDATE()),      -- Table: 150 units, none reserved
  (NEWID(), 3, 4, 35, 0, 10, GETDATE());       -- Shelf: 35 units, none reserved

-- Step 3: Verify inserted data
SELECT 'Total Inventory Records:' as DataPoint, COUNT(*) as Count FROM BranchInventory;

SELECT 
  bi.BranchId,
  b.Name as BranchName,
  bi.ProductId,
  bi.QuantityOnHand,
  bi.QuantityReserved,
  bi.QuantityAvailable,
  bi.MinimumStockLevel,
  CASE 
    WHEN bi.QuantityAvailable <= bi.MinimumStockLevel THEN 'LOW STOCK'
    ELSE 'NORMAL'
  END as StockStatus
FROM BranchInventory bi
JOIN Branches b ON bi.BranchId = b.Id
ORDER BY b.Name, bi.ProductId;

-- Step 4: Create sample stock movements
INSERT INTO StockMovements 
  (Id, BranchId, ProductId, MovementType, Quantity, Reason, BalanceBefore, BalanceAfter, CreatedBy)
VALUES
  (NEWID(), 1, 1, 'RESTOCK', 150, 'Initial stock', 0, 150, '550e8400-e29b-41d4-a716-446655440000'),
  (NEWID(), 1, 2, 'RESTOCK', 75, 'Initial stock', 0, 75, '550e8400-e29b-41d4-a716-446655440000'),
  (NEWID(), 1, 3, 'RESTOCK', 200, 'Initial stock', 0, 200, '550e8400-e29b-41d4-a716-446655440000'),
  (NEWID(), 1, 4, 'RESTOCK', 45, 'Initial stock', 0, 45, '550e8400-e29b-41d4-a716-446655440000'),
  (NEWID(), 2, 1, 'RESTOCK', 120, 'Initial stock', 0, 120, '550e8400-e29b-41d4-a716-446655440000'),
  (NEWID(), 2, 2, 'RESTOCK', 60, 'Initial stock', 0, 60, '550e8400-e29b-41d4-a716-446655440000'),
  (NEWID(), 2, 3, 'RESTOCK', 180, 'Initial stock', 0, 180, '550e8400-e29b-41d4-a716-446655440000'),
  (NEWID(), 2, 4, 'RESTOCK', 50, 'Initial stock', 0, 50, '550e8400-e29b-41d4-a716-446655440000'),
  (NEWID(), 3, 1, 'RESTOCK', 100, 'Initial stock', 0, 100, '550e8400-e29b-41d4-a716-446655440000'),
  (NEWID(), 3, 2, 'RESTOCK', 90, 'Initial stock', 0, 90, '550e8400-e29b-41d4-a716-446655440000'),
  (NEWID(), 3, 3, 'RESTOCK', 150, 'Initial stock', 0, 150, '550e8400-e29b-41d4-a716-446655440000'),
  (NEWID(), 3, 4, 'RESTOCK', 35, 'Initial stock', 0, 35, '550e8400-e29b-41d4-a716-446655440000');

-- Step 5: Create sample stock alerts for low stock items
INSERT INTO StockAlerts 
  (Id, BranchId, ProductId, AlertType, CurrentStock, ThresholdLevel, Status)
VALUES
  (NEWID(), 1, 4, 'LOW_STOCK', 45, 10, 'Active'),
  (NEWID(), 2, 4, 'LOW_STOCK', 50, 10, 'Active');

-- Step 6: Verify all data
PRINT '===== INVENTORY SUMMARY ====='
SELECT 'BranchInventory Records' as [Data], COUNT(*) as [Count] FROM BranchInventory
UNION ALL
SELECT 'StockMovements Records', COUNT(*) FROM StockMovements
UNION ALL
SELECT 'StockAlerts Records', COUNT(*) FROM StockAlerts;

PRINT '===== AVAILABILITY BY BRANCH ====='
SELECT 
  b.Name as Branch,
  SUM(bi.QuantityOnHand) as TotalOnHand,
  SUM(bi.QuantityReserved) as TotalReserved,
  SUM(bi.QuantityAvailable) as TotalAvailable,
  COUNT(DISTINCT bi.ProductId) as ProductCount
FROM BranchInventory bi
JOIN Branches b ON bi.BranchId = b.Id
GROUP BY b.Id, b.Name
ORDER BY b.Name;

PRINT '===== LOW STOCK ITEMS ====='
SELECT 
  b.Name as Branch,
  bi.ProductId,
  bi.QuantityOnHand,
  bi.MinimumStockLevel,
  CAST(bi.QuantityAvailable as NUMERIC(10,2)) as Available
FROM BranchInventory bi
JOIN Branches b ON bi.BranchId = b.Id
WHERE bi.QuantityAvailable <= bi.MinimumStockLevel
ORDER BY bi.QuantityAvailable ASC;

PRINT '===== SAMPLE DATA INSERTION COMPLETE ====='
