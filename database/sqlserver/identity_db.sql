-- Identity Database Schema
-- FurniMart Identity Service

USE master;
GO

-- Create Identity Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'identity_db')
BEGIN
    CREATE DATABASE identity_db;
END
GO

USE identity_db;
GO

-- =============================================
-- Roles Table
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Roles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Roles] (
        [Id] INT PRIMARY KEY IDENTITY(1,1),
        [Name] NVARCHAR(50) NOT NULL UNIQUE,
        [Description] NVARCHAR(255) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [CK_Roles_Name] CHECK ([Name] IN ('CUSTOMER', 'SELLER', 'BRANCH_MANAGER', 'DELIVERY_STAFF', 'ADMIN'))
    );
    
    -- Insert default roles
    INSERT INTO [dbo].[Roles] ([Name], [Description]) VALUES
        ('CUSTOMER', 'Regular customer who can browse and purchase products'),
        ('SELLER', 'Store staff who manage products and inventory'),
        ('BRANCH_MANAGER', 'Branch manager who manages branch operations and deliveries'),
        ('DELIVERY_STAFF', 'Delivery staff who handle order deliveries'),
        ('ADMIN', 'System administrator with full access');
END
GO

-- =============================================
-- Users Table
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Users] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [Email] NVARCHAR(255) NOT NULL UNIQUE,
        [PasswordHash] NVARCHAR(255) NOT NULL,
        [FullName] NVARCHAR(255) NOT NULL,
        [Phone] NVARCHAR(20) NULL,
        [RoleId] INT NOT NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED, PENDING_APPROVAL
        [EmailVerified] BIT NOT NULL DEFAULT 0,
        [PhoneVerified] BIT NOT NULL DEFAULT 0,
        [LastLoginAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [FK_Users_Roles] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[Roles]([Id]),
        CONSTRAINT [CK_Users_Status] CHECK ([Status] IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_APPROVAL')),
        CONSTRAINT [CK_Users_Email] CHECK ([Email] LIKE '%@%.%')
    );
    
    CREATE INDEX [IX_Users_Email] ON [dbo].[Users]([Email]);
    CREATE INDEX [IX_Users_RoleId] ON [dbo].[Users]([RoleId]);
    CREATE INDEX [IX_Users_Status] ON [dbo].[Users]([Status]);
END
GO

-- =============================================
-- UserProfiles Table (Extended user information)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserProfiles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserProfiles] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL UNIQUE,
        [DateOfBirth] DATE NULL,
        [Gender] NVARCHAR(10) NULL, -- MALE, FEMALE, OTHER
        [Address] NVARCHAR(500) NULL,
        [City] NVARCHAR(100) NULL,
        [District] NVARCHAR(100) NULL,
        [Ward] NVARCHAR(100) NULL,
        [PostalCode] NVARCHAR(10) NULL,
        [ProfileImageUrl] NVARCHAR(500) NULL,
        [BranchId] UNIQUEIDENTIFIER NULL, -- For SELLER, BRANCH_MANAGER, DELIVERY_STAFF
        [EmployeeId] NVARCHAR(50) NULL, -- Employee ID for staff roles
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [FK_UserProfiles_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
        CONSTRAINT [CK_UserProfiles_Gender] CHECK ([Gender] IN ('MALE', 'FEMALE', 'OTHER') OR [Gender] IS NULL)
    );
    
    CREATE INDEX [IX_UserProfiles_UserId] ON [dbo].[UserProfiles]([UserId]);
    CREATE INDEX [IX_UserProfiles_BranchId] ON [dbo].[UserProfiles]([BranchId]);
END
GO

-- =============================================
-- RefreshTokens Table
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RefreshTokens]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[RefreshTokens] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Token] NVARCHAR(500) NOT NULL UNIQUE,
        [ExpiresAt] DATETIME2 NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [RevokedAt] DATETIME2 NULL,
        [RevokedByIp] NVARCHAR(45) NULL,
        [ReplacedByToken] NVARCHAR(500) NULL,
        [CreatedByIp] NVARCHAR(45) NULL,
        CONSTRAINT [FK_RefreshTokens_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
    );
    
    CREATE INDEX [IX_RefreshTokens_UserId] ON [dbo].[RefreshTokens]([UserId]);
    CREATE INDEX [IX_RefreshTokens_Token] ON [dbo].[RefreshTokens]([Token]);
    CREATE INDEX [IX_RefreshTokens_ExpiresAt] ON [dbo].[RefreshTokens]([ExpiresAt]);
END
GO

-- =============================================
-- PasswordResetTokens Table
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PasswordResetTokens]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PasswordResetTokens] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Token] NVARCHAR(500) NOT NULL UNIQUE,
        [ExpiresAt] DATETIME2 NOT NULL,
        [Used] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [FK_PasswordResetTokens_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
    );
    
    CREATE INDEX [IX_PasswordResetTokens_Token] ON [dbo].[PasswordResetTokens]([Token]);
    CREATE INDEX [IX_PasswordResetTokens_UserId] ON [dbo].[PasswordResetTokens]([UserId]);
END
GO

-- =============================================
-- EmailVerificationTokens Table
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[EmailVerificationTokens]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[EmailVerificationTokens] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Token] NVARCHAR(500) NOT NULL UNIQUE,
        [ExpiresAt] DATETIME2 NOT NULL,
        [Used] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [FK_EmailVerificationTokens_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
    );
    
    CREATE INDEX [IX_EmailVerificationTokens_Token] ON [dbo].[EmailVerificationTokens]([Token]);
    CREATE INDEX [IX_EmailVerificationTokens_UserId] ON [dbo].[EmailVerificationTokens]([UserId]);
END
GO

-- =============================================
-- Stored Procedures: Update UpdatedAt timestamp
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_UpdateUsersUpdatedAt]') AND type in (N'P'))
    DROP PROCEDURE [dbo].[sp_UpdateUsersUpdatedAt];
GO

CREATE TRIGGER [trg_Users_UpdatedAt]
ON [dbo].[Users]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [dbo].[Users]
    SET [UpdatedAt] = GETUTCDATE()
    FROM [dbo].[Users] u
    INNER JOIN inserted i ON u.[Id] = i.[Id];
END;
GO

CREATE TRIGGER [trg_UserProfiles_UpdatedAt]
ON [dbo].[UserProfiles]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [dbo].[UserProfiles]
    SET [UpdatedAt] = GETUTCDATE()
    FROM [dbo].[UserProfiles] up
    INNER JOIN inserted i ON up.[Id] = i.[Id];
END;
GO

PRINT 'Identity database schema created successfully!';
GO
