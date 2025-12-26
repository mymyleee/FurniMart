# Inventory Service - API Contract Documentation

**Version:** 1.0.0  
**Last Updated:** December 26, 2024  
**Base URL:** `http://localhost:5003/api/inventory`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Endpoints](#endpoints)
5. [Data Models](#data-models)
6. [Examples](#examples)

---

## Overview

### Purpose

The Inventory Service manages stock levels across multiple branches, handles inventory reservations for orders, tracks stock movements, and generates alerts for low stock situations.

### Key Features

- Multi-branch inventory tracking
- Real-time stock availability checking
- Automatic low stock alerts
- Order reservation management
- Inter-branch inventory transfers
- Complete audit trail with stock movements
- Service integration with Catalog and Order services

### Service Port

- **Development:** `http://localhost:5003`
- **Docker:** `http://inventory-service:5003`

---

## Authentication

All endpoints except health check require JWT authentication via **Bearer Token**.

### Token Format

```
Authorization: Bearer <JWT_TOKEN>
```

### Token Acquisition

```http
POST /api/auth/login HTTP/1.1
Host: localhost:5001
Content-Type: application/json

{
  "email": "admin@furnimart.com",
  "password": "Admin@123"
}
```

### Token Claims

- `userId` - User ID (UUID)
- `email` - User email
- `fullName` - User full name
- `roleId` - Role ID
- `roleName` - Role name (ADMIN, BRANCH_MANAGER, WAREHOUSE_STAFF, ORDER_MANAGER, REPORT_VIEWER)

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field error message"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successfully retrieved data |
| 201 | Created | Resource created |
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | No token provided |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Database error |

### Common Error Messages

| Error | Status | Cause |
|-------|--------|-------|
| Insufficient inventory | 400 | Not enough stock available |
| Inventory not found | 404 | Invalid branch/product ID |
| Invalid token | 401 | Token expired or malformed |
| Insufficient permissions | 403 | User role not allowed |

---

## Endpoints

### Health Check

#### `GET /health`

Check if service is running.

**Authentication:** ❌ Not required

**Response:**

```json
{
  "status": "OK",
  "service": "inventory-service",
  "timestamp": "2024-12-26T10:00:00.000Z"
}
```

---

### Branch Inventory

#### `GET /:branchId/products`

Get inventory of a specific branch.

**Authentication:** ✅ Required  
**Role:** Any  
**Method:** GET

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| branchId | number | ✅ | Branch ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number for pagination |
| limit | number | 20 | Items per page |
| lowStockOnly | boolean | false | Show only low stock items |

**Example Request:**

```http
GET /api/inventory/1/products?page=1&limit=20&lowStockOnly=false HTTP/1.1
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "Id": "550e8400-e29b-41d4-a716-446655440000",
        "BranchId": 1,
        "ProductId": 101,
        "QuantityOnHand": 100,
        "QuantityReserved": 20,
        "QuantityAvailable": 80,
        "MinimumStockLevel": 30,
        "LastRestockDate": "2024-12-25T10:00:00.000Z",
        "BranchName": "Chi nhánh TP.HCM",
        "UpdatedAt": "2024-12-26T10:00:00.000Z"
      }
    ],
    "count": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

#### `GET /product/:productId/availability`

Check product availability across all branches.

**Authentication:** ✅ Required  
**Role:** Any  
**Method:** GET

**URL Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| productId | number | ✅ |

**Example Request:**

```http
GET /api/inventory/product/101/availability HTTP/1.1
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "productId": 101,
    "totalAvailable": 280,
    "branches": [
      {
        "BranchId": 1,
        "BranchName": "Chi nhánh TP.HCM",
        "QuantityOnHand": 100,
        "QuantityReserved": 20,
        "QuantityAvailable": 80
      },
      {
        "BranchId": 2,
        "BranchName": "Chi nhánh Hà Nội",
        "QuantityOnHand": 200,
        "QuantityReserved": 0,
        "QuantityAvailable": 200
      }
    ]
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Product not found in any branch"
}
```

---

### Stock Updates

#### `PUT /:branchId/products/:productId`

Update stock level for a product.

**Authentication:** ✅ Required  
**Roles:** ADMIN, BRANCH_MANAGER, WAREHOUSE_STAFF  
**Method:** PUT

**URL Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| branchId | number | ✅ |
| productId | number | ✅ |

**Request Body:**

```json
{
  "quantityOnHand": 150,
  "reason": "Received new shipment from supplier"
}
```

**Validation Rules:**

- `quantityOnHand`: Must be non-negative integer
- `reason`: Optional, max 500 characters

**Example Request:**

```http
PUT /api/inventory/1/products/101 HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantityOnHand": 150,
  "reason": "Received shipment"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    "inventory": {
      "Id": "550e8400-e29b-41d4-a716-446655440000",
      "BranchId": 1,
      "ProductId": 101,
      "QuantityOnHand": 150,
      "QuantityReserved": 20,
      "QuantityAvailable": 130,
      "UpdatedAt": "2024-12-26T10:30:00.000Z"
    }
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "quantityOnHand",
      "message": "Quantity must be a non-negative integer"
    }
  ]
}
```

---

#### `POST /transfer`

Transfer inventory between branches.

**Authentication:** ✅ Required  
**Roles:** ADMIN, BRANCH_MANAGER, WAREHOUSE_STAFF  
**Method:** POST

**Request Body:**

```json
{
  "fromBranchId": 1,
  "toBranchId": 2,
  "productId": 101,
  "quantity": 50,
  "reason": "Balance inventory between branches"
}
```

**Validation Rules:**

- `fromBranchId`: Must be integer
- `toBranchId`: Must be integer, cannot equal fromBranchId
- `productId`: Must be integer
- `quantity`: Must be positive integer
- `reason`: Optional, max 500 characters

**Example Request:**

```http
POST /api/inventory/transfer HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "fromBranchId": 1,
  "toBranchId": 2,
  "productId": 101,
  "quantity": 50
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Inventory transferred successfully",
  "data": {
    "transfer": {
      "from": {
        "Id": "550e8400-e29b-41d4-a716-446655440000",
        "QuantityOnHand": 50,
        "QuantityAvailable": 30
      },
      "to": {
        "Id": "660e8400-e29b-41d4-a716-446655440001",
        "QuantityOnHand": 150,
        "QuantityAvailable": 150
      },
      "quantity": 50
    }
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "message": "Insufficient inventory for transfer",
  "available": 30,
  "requested": 50
}
```

---

### Order Integration

#### `POST /reserve`

Reserve inventory for an order.

**Authentication:** ✅ Required  
**Roles:** ADMIN, ORDER_MANAGER, WAREHOUSE_STAFF  
**Method:** POST

**Request Body:**

```json
{
  "branchId": 1,
  "productId": 101,
  "quantity": 5,
  "orderId": "ORD-2024-001"
}
```

**Validation Rules:**

- All fields required
- `quantity`: Must be positive integer
- `orderId`: Must be non-empty string

**Example Request:**

```http
POST /api/inventory/reserve HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "branchId": 1,
  "productId": 101,
  "quantity": 5,
  "orderId": "ORD-2024-001"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Inventory reserved successfully",
  "data": {
    "inventory": {
      "Id": "550e8400-e29b-41d4-a716-446655440000",
      "BranchId": 1,
      "ProductId": 101,
      "QuantityOnHand": 100,
      "QuantityReserved": 25,
      "QuantityAvailable": 75
    }
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "message": "Insufficient inventory for reservation",
  "available": 3,
  "requested": 5
}
```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Inventory not found"
}
```

---

#### `POST /release-reserve`

Release a reservation when order is cancelled.

**Authentication:** ✅ Required  
**Roles:** ADMIN, ORDER_MANAGER, WAREHOUSE_STAFF  
**Method:** POST

**Request Body:**

```json
{
  "branchId": 1,
  "productId": 101,
  "quantity": 5,
  "orderId": "ORD-2024-001"
}
```

**Example Request:**

```http
POST /api/inventory/release-reserve HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "branchId": 1,
  "productId": 101,
  "quantity": 5,
  "orderId": "ORD-2024-001"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Reservation released successfully",
  "data": {
    "inventory": {
      "Id": "550e8400-e29b-41d4-a716-446655440000",
      "QuantityReserved": 20,
      "QuantityAvailable": 80
    }
  }
}
```

---

### Stock Alerts

#### `GET /alerts`

Get all stock alerts.

**Authentication:** ✅ Required  
**Role:** Any  
**Method:** GET

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| branchId | number | - | Filter by branch |
| productId | number | - | Filter by product |
| status | string | Active | Active/Resolved/Ignored |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |

**Example Request:**

```http
GET /api/inventory/alerts?status=Active&page=1&limit=10 HTTP/1.1
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "Id": "550e8400-e29b-41d4-a716-446655440002",
        "BranchId": 1,
        "ProductId": 101,
        "AlertType": "LOW_STOCK",
        "CurrentStock": 15,
        "ThresholdLevel": 30,
        "Status": "Active",
        "CreatedAt": "2024-12-26T10:00:00.000Z",
        "BranchName": "Chi nhánh TP.HCM"
      }
    ],
    "count": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

#### `GET /alerts/:alertId`

Get alert details.

**Authentication:** ✅ Required  
**Role:** Any  
**Method:** GET

**URL Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| alertId | string | ✅ |

**Example Request:**

```http
GET /api/inventory/alerts/550e8400-e29b-41d4-a716-446655440002 HTTP/1.1
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "alert": {
      "Id": "550e8400-e29b-41d4-a716-446655440002",
      "BranchId": 1,
      "ProductId": 101,
      "AlertType": "LOW_STOCK",
      "CurrentStock": 15,
      "ThresholdLevel": 30,
      "Status": "Active",
      "CreatedAt": "2024-12-26T10:00:00.000Z",
      "ResolvedAt": null
    }
  }
}
```

---

#### `PUT /alerts/:alertId`

Update alert status.

**Authentication:** ✅ Required  
**Roles:** ADMIN, BRANCH_MANAGER, WAREHOUSE_STAFF  
**Method:** PUT

**URL Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| alertId | string | ✅ |

**Request Body:**

```json
{
  "status": "Resolved"
}
```

**Valid Status Values:**

- `Active` - Alert is active
- `Resolved` - Alert has been resolved
- `Ignored` - Alert has been ignored

**Example Request:**

```http
PUT /api/inventory/alerts/550e8400-e29b-41d4-a716-446655440002 HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "Resolved"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Alert updated successfully",
  "data": {
    "alert": {
      "Id": "550e8400-e29b-41d4-a716-446655440002",
      "Status": "Resolved",
      "ResolvedAt": "2024-12-26T11:00:00.000Z"
    }
  }
}
```

---

### History & Reports

#### `GET /products/:productId/history`

Get stock movement history for a product.

**Authentication:** ✅ Required  
**Role:** Any  
**Method:** GET

**URL Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| productId | number | ✅ |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Max records to return |

**Example Request:**

```http
GET /api/inventory/products/101/history?limit=20 HTTP/1.1
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "productId": 101,
    "history": [
      {
        "Id": "550e8400-e29b-41d4-a716-446655440003",
        "BranchId": 1,
        "MovementType": "RESTOCK",
        "Quantity": 50,
        "Reason": "Received shipment",
        "BalanceBefore": 50,
        "BalanceAfter": 100,
        "CreatedAt": "2024-12-26T10:00:00.000Z",
        "CreatedBy": "admin@furnimart.com"
      }
    ],
    "count": 1
  }
}
```

---

#### `GET /branches/:branchId/report`

Get inventory movement report for a branch.

**Authentication:** ✅ Required  
**Roles:** ADMIN, BRANCH_MANAGER, REPORT_VIEWER  
**Method:** GET

**URL Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| branchId | number | ✅ |

**Query Parameters:**

| Parameter | Type | Required | Format |
|-----------|------|----------|--------|
| startDate | string | ✅ | YYYY-MM-DD |
| endDate | string | ✅ | YYYY-MM-DD |

**Example Request:**

```http
GET /api/inventory/branches/1/report?startDate=2024-12-01&endDate=2024-12-31 HTTP/1.1
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "branchId": 1,
    "period": {
      "startDate": "2024-12-01",
      "endDate": "2024-12-31"
    },
    "report": [
      {
        "MovementType": "RESTOCK",
        "TotalMovements": 12,
        "TotalQuantity": 600
      },
      {
        "MovementType": "SALE",
        "TotalMovements": 45,
        "TotalQuantity": 120
      }
    ]
  }
}
```

---

## Data Models

### BranchInventory

```typescript
interface BranchInventory {
  Id: string;                    // UUID
  BranchId: number;              // Foreign key to Branches
  ProductId: number;             // Foreign key to Products
  QuantityOnHand: number;        // Physical quantity
  QuantityReserved: number;      // Reserved for orders
  QuantityAvailable: number;     // Calculated: OnHand - Reserved
  MinimumStockLevel: number;     // Threshold for alerts
  LastRestockDate: DateTime;     // Last restock date
  CreatedAt: DateTime;
  UpdatedAt: DateTime;
}
```

### StockMovement

```typescript
interface StockMovement {
  Id: string;                    // UUID
  BranchId: number;
  ProductId: number;
  MovementType: string;          // RESTOCK, SALE, RESERVE, TRANSFER_IN, TRANSFER_OUT
  Quantity: number;              // Amount moved
  Reason: string | null;         // Why it was moved
  ReferenceId: string | null;    // Order ID, Transfer ID, etc.
  BalanceBefore: number;
  BalanceAfter: number;
  CreatedBy: string;             // User UUID
  CreatedAt: DateTime;
}
```

### StockAlert

```typescript
interface StockAlert {
  Id: string;                    // UUID
  BranchId: number;
  ProductId: number;
  AlertType: string;             // LOW_STOCK, OUT_OF_STOCK, OVERSTOCK
  CurrentStock: number;
  ThresholdLevel: number;
  Status: string;                // Active, Resolved, Ignored
  CreatedAt: DateTime;
  ResolvedAt: DateTime | null;
}
```

---

## Examples

### Complete Workflow Example

#### 1. Check Product Availability

```http
GET /api/inventory/product/101/availability HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "success": true,
  "data": {
    "totalAvailable": 350,
    "branches": [
      {
        "BranchId": 1,
        "QuantityAvailable": 100
      },
      {
        "BranchId": 2,
        "QuantityAvailable": 250
      }
    ]
  }
}
```

#### 2. Reserve for Order

```http
POST /api/inventory/reserve HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "branchId": 2,
  "productId": 101,
  "quantity": 50,
  "orderId": "ORD-2024-001"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "inventory": {
      "QuantityReserved": 50,
      "QuantityAvailable": 200
    }
  }
}
```

#### 3. Check Alerts

```http
GET /api/inventory/alerts?status=Active HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12-26 | Initial release |

---

## Support

For issues or questions, contact the development team or refer to [README.md](./README.md)
