-- Catalog Database Schema
-- FurniMart Catalog Service

USE master;
GO

-- Create Catalog Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'catalog_db')
BEGIN
    CREATE DATABASE catalog_db;
END
GO

USE catalog_db;
GO

-- Enable UUID generation
-- Categories Table
CREATE TABLE Categories (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) NOT NULL,
    Description NVARCHAR(1000) NULL,
    ParentCategoryId INT NULL,
    Slug NVARCHAR(255) NOT NULL UNIQUE,
    IsActive BIT NOT NULL DEFAULT 1,
    DisplayOrder INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(255) NULL,
    UpdatedBy NVARCHAR(255) NULL,
    CONSTRAINT FK_Categories_ParentCategory FOREIGN KEY (ParentCategoryId) REFERENCES Categories(Id)
);
GO

-- Indexes for Categories
CREATE INDEX IX_Categories_ParentCategoryId ON Categories(ParentCategoryId);
CREATE INDEX IX_Categories_Slug ON Categories(Slug);
CREATE INDEX IX_Categories_IsActive ON Categories(IsActive);
GO

-- Products Table
CREATE TABLE Products (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    ShortDescription NVARCHAR(500) NULL,
    SKU NVARCHAR(100) NOT NULL UNIQUE,
    CategoryId INT NOT NULL,
    BasePrice DECIMAL(18,2) NOT NULL CHECK (BasePrice >= 0),
    SalePrice DECIMAL(18,2) NULL CHECK (SalePrice IS NULL OR SalePrice >= 0),
    IsActive BIT NOT NULL DEFAULT 1,
    IsFeatured BIT NOT NULL DEFAULT 0,
    StockStatus NVARCHAR(50) NOT NULL DEFAULT 'IN_STOCK', -- IN_STOCK, OUT_OF_STOCK, BACKORDER, PREORDER
    Weight DECIMAL(10,2) NULL, -- in kg
    Length DECIMAL(10,2) NULL, -- in cm
    Width DECIMAL(10,2) NULL, -- in cm
    Height DECIMAL(10,2) NULL, -- in cm
    Material NVARCHAR(255) NULL,
    Color NVARCHAR(100) NULL,
    Brand NVARCHAR(255) NULL,
    WarrantyPeriod INT NULL, -- in months
    MetaTitle NVARCHAR(255) NULL,
    MetaDescription NVARCHAR(500) NULL,
    Slug NVARCHAR(255) NOT NULL UNIQUE,
    ViewCount INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(255) NULL,
    UpdatedBy NVARCHAR(255) NULL,
    CONSTRAINT FK_Products_Category FOREIGN KEY (CategoryId) REFERENCES Categories(Id),
    CONSTRAINT CHK_Products_SalePrice CHECK (SalePrice IS NULL OR SalePrice <= BasePrice)
);
GO

-- Indexes for Products
CREATE INDEX IX_Products_CategoryId ON Products(CategoryId);
CREATE INDEX IX_Products_SKU ON Products(SKU);
CREATE INDEX IX_Products_Slug ON Products(Slug);
CREATE INDEX IX_Products_IsActive ON Products(IsActive);
CREATE INDEX IX_Products_IsFeatured ON Products(IsFeatured);
CREATE INDEX IX_Products_StockStatus ON Products(StockStatus);
CREATE INDEX IX_Products_CreatedAt ON Products(CreatedAt DESC);
GO

-- ProductImages Table
CREATE TABLE ProductImages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ProductId UNIQUEIDENTIFIER NOT NULL,
    ImageUrl NVARCHAR(500) NOT NULL,
    AltText NVARCHAR(255) NULL,
    DisplayOrder INT NOT NULL DEFAULT 0,
    IsPrimary BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_ProductImages_Product FOREIGN KEY (ProductId) REFERENCES Products(Id) ON DELETE CASCADE
);
GO

-- Indexes for ProductImages
CREATE INDEX IX_ProductImages_ProductId ON ProductImages(ProductId);
CREATE INDEX IX_ProductImages_DisplayOrder ON ProductImages(DisplayOrder);
GO

-- Product3DModels Table
CREATE TABLE Product3DModels (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ProductId UNIQUEIDENTIFIER NOT NULL UNIQUE,
    ModelUrl NVARCHAR(500) NOT NULL, -- URL to .glb, .gltf file
    ThumbnailUrl NVARCHAR(500) NULL,
    FileSize BIGINT NULL, -- in bytes
    Format NVARCHAR(50) NOT NULL DEFAULT 'glb', -- glb, gltf
    Version NVARCHAR(50) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_Product3DModels_Product FOREIGN KEY (ProductId) REFERENCES Products(Id) ON DELETE CASCADE
);
GO

-- Indexes for Product3DModels
CREATE INDEX IX_Product3DModels_ProductId ON Product3DModels(ProductId);
CREATE INDEX IX_Product3DModels_IsActive ON Product3DModels(IsActive);
GO

-- ProductAttributes Table (for additional product properties)
CREATE TABLE ProductAttributes (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ProductId UNIQUEIDENTIFIER NOT NULL,
    AttributeName NVARCHAR(100) NOT NULL, -- e.g., "Color", "Material", "Size"
    AttributeValue NVARCHAR(500) NOT NULL,
    DisplayOrder INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_ProductAttributes_Product FOREIGN KEY (ProductId) REFERENCES Products(Id) ON DELETE CASCADE
);
GO

-- Indexes for ProductAttributes
CREATE INDEX IX_ProductAttributes_ProductId ON ProductAttributes(ProductId);
CREATE INDEX IX_ProductAttributes_AttributeName ON ProductAttributes(AttributeName);
GO

-- Reviews Table
CREATE TABLE Reviews (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ProductId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL, -- Reference to Users table in identity_db (stored as string)
    Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    Title NVARCHAR(255) NULL,
    Comment NVARCHAR(2000) NULL,
    IsVerifiedPurchase BIT NOT NULL DEFAULT 0,
    IsApproved BIT NOT NULL DEFAULT 0,
    IsHelpful INT NOT NULL DEFAULT 0, -- Count of helpful votes
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_Reviews_Product FOREIGN KEY (ProductId) REFERENCES Products(Id) ON DELETE CASCADE
);
GO

-- Indexes for Reviews
CREATE INDEX IX_Reviews_ProductId ON Reviews(ProductId);
CREATE INDEX IX_Reviews_UserId ON Reviews(UserId);
CREATE INDEX IX_Reviews_Rating ON Reviews(Rating);
CREATE INDEX IX_Reviews_IsApproved ON Reviews(IsApproved);
CREATE INDEX IX_Reviews_CreatedAt ON Reviews(CreatedAt DESC);
GO

-- ReviewImages Table (for review photos)
CREATE TABLE ReviewImages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ReviewId UNIQUEIDENTIFIER NOT NULL,
    ImageUrl NVARCHAR(500) NOT NULL,
    DisplayOrder INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_ReviewImages_Review FOREIGN KEY (ReviewId) REFERENCES Reviews(Id) ON DELETE CASCADE
);
GO

-- Indexes for ReviewImages
CREATE INDEX IX_ReviewImages_ReviewId ON ReviewImages(ReviewId);
GO

-- Triggers for UpdatedAt
CREATE TRIGGER TR_Categories_UpdatedAt
ON Categories
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Categories
    SET UpdatedAt = GETUTCDATE()
    FROM Categories c
    INNER JOIN inserted i ON c.Id = i.Id;
END;
GO

CREATE TRIGGER TR_Products_UpdatedAt
ON Products
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Products
    SET UpdatedAt = GETUTCDATE()
    FROM Products p
    INNER JOIN inserted i ON p.Id = i.Id;
END;
GO

CREATE TRIGGER TR_Product3DModels_UpdatedAt
ON Product3DModels
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Product3DModels
    SET UpdatedAt = GETUTCDATE()
    FROM Product3DModels p3d
    INNER JOIN inserted i ON p3d.Id = i.Id;
END;
GO

CREATE TRIGGER TR_Reviews_UpdatedAt
ON Reviews
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Reviews
    SET UpdatedAt = GETUTCDATE()
    FROM Reviews r
    INNER JOIN inserted i ON r.Id = i.Id;
END;
GO

-- Seed some default categories
INSERT INTO Categories (Name, Description, Slug, IsActive, DisplayOrder)
VALUES 
    ('Sofa & Armchairs', 'Living room seating furniture', 'sofa-armchairs', 1, 1),
    ('Tables & Chairs', 'Dining and office furniture', 'tables-chairs', 1, 2),
    ('Beds & Bedroom', 'Bedroom furniture sets', 'beds-bedroom', 1, 3),
    ('Storage & Cabinets', 'Wardrobes, cabinets, and storage solutions', 'storage-cabinets', 1, 4),
    ('Decorative Items', 'Home decor and accessories', 'decorative-items', 1, 5);
GO

PRINT 'Catalog database schema created successfully!';
GO