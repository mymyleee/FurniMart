# Database Design Documentation

## Overview
FurniMart uses a shared SQL Server instance with multiple logical databases, one per microservice.

## Database List

### 1. identity_db
**Service**: Identity Service  
**Purpose**: User authentication, authorization, and profiles  
**Key Entities**:
- Users
- Roles
- Permissions
- Sessions

### 2. catalog_db
**Service**: Catalog Service  
**Purpose**: Product catalog and product information  
**Key Entities**:
- Products
- Categories
- ProductImages
- Product3DModels
- Reviews
- Ratings

### 3. inventory_db
**Service**: Inventory Service  
**Purpose**: Multi-branch inventory tracking  
**Key Entities**:
- BranchInventory
- StockMovements
- StockAlerts
- Branches

### 4. order_db
**Service**: Order Service  
**Purpose**: Order management and lifecycle  
**Key Entities**:
- Orders
- OrderItems
- OrderStatusHistory
- Invoices

### 5. delivery_db
**Service**: Delivery Service  
**Purpose**: Delivery operations and tracking  
**Key Entities**:
- Deliveries
- DeliveryStaff
- DeliveryStatus
- ProofOfDelivery
- DeliveryRoutes

### 6. payment_db
**Service**: Payment & After-Sale Service  
**Purpose**: Payments and after-sale services  
**Key Entities**:
- Payments
- PaymentTransactions
- Returns
- Refunds
- WarrantyClaims
- AssemblyBookings

### 7. reporting_db
**Service**: Reporting Service  
**Purpose**: Analytics and reporting data  
**Key Entities**:
- ReportConfigs
- ReportHistory
- AnalyticsCache

## Design Principles
- **Logical Separation**: Each service has its own database
- **Service Ownership**: Each service owns its database schema
- **No Cross-Database Queries**: Services communicate via APIs, not direct DB queries
- **Eventual Consistency**: For cross-service data consistency (if needed)

## Status
🚧 **Placeholder** - Detailed schema will be designed during implementation phase


